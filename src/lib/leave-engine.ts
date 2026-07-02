// src/lib/leave-engine.ts
// Leave management business logic — apply, approve, reject, cancel, balance

import { prisma } from "@/lib/prisma";
import { startOfDay, eachDayOfInterval, parseISO } from "date-fns";
import { isWorkingDay } from "@/lib/utils";
import { getEffectiveSchedule } from "@/lib/attendance-engine";

// ─── Types ──────────────────────────────────────────────────────

export type LeaveTypeValue = "CASUAL" | "SICK" | "ANNUAL" | "UNPAID";
export type LeaveStatusValue = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface ApplyLeaveRequest {
  userId: string;
  fromDate: Date;
  toDate: Date;
  reason?: string;
  leaveType?: LeaveTypeValue;
}

export interface ApplyLeaveResult {
  success: boolean;
  error?: string;
  request?: any;
}

// ─── Helpers ────────────────────────────────────────────────────

/** Count working days in a date range for a user (excluding weekends per schedule) */
async function countWorkingDays(userId: string, from: Date, to: Date): Promise<number> {
  const schedule = await getEffectiveSchedule(userId);
  const sched = schedule || {
    monday: true, tuesday: true, wednesday: true, thursday: true,
    friday: true, saturday: false, sunday: false,
  } as any;

  const days = eachDayOfInterval({ start: startOfDay(from), end: startOfDay(to) });

  // Fetch holidays in range
  const holidays = await prisma.holiday.findMany({
    where: { date: { gte: startOfDay(from), lte: startOfDay(to) } },
  });
  const holidayDates = holidays.map((h) => h.date.toDateString());

  let count = 0;
  for (const day of days) {
    if (holidayDates.includes(day.toDateString())) continue;
    if (isWorkingDay(day, sched)) count++;
  }
  return count;
}

/** Determine if a leave type is paid based on leaveType string */
function isPaidLeave(leaveType: LeaveTypeValue): boolean {
  return leaveType !== "UNPAID";
}

// ─── Get or initialize leave balance ─────────────────────────────

export async function getOrCreateLeaveBalance(userId: string, year: number): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { salaryRules: true, salaryRuleOverride: true },
  });
  if (!user) throw new Error("User not found");

  // Determine entitlement per year
  // Intern: 2/month = 24/year, Full-time: 24/year, others: 12/year (1/month)
  let allocated = 12; // default
  if (user.employmentType === "FULL_TIME") allocated = 24;
  else if (user.employmentType === "INTERN") allocated = 24; // 2/month tracked annually
  else if (user.employmentType === "CONTRACT") allocated = 12;
  else if (user.employmentType === "PART_TIME") allocated = 12;

  // Use salary rule override if set
  const override = user.salaryRuleOverride;
  const rule = user.salaryRules;
  if (override?.paidLeaveDaysPerMonth != null) {
    allocated = override.paidLeaveDaysPerMonth * 12;
  } else if (rule?.paidLeaveDaysPerMonth != null) {
    allocated = rule.paidLeaveDaysPerMonth * 12;
  }

  // Check existing balance
  const existing = await prisma.leaveBalance.findFirst({
    where: { userId, year, month: null },
  });

  if (existing) return existing;

  // Check prior year for rollover (full-time only)
  let carried = 0;
  if (user.employmentType === "FULL_TIME" || user.employmentType === "CONTRACT") {
    const prior = await prisma.leaveBalance.findFirst({
      where: { userId, year: year - 1, month: null },
    });
    if (prior) {
      const leftover = prior.allocated + prior.carried - prior.used;
      carried = Math.max(0, leftover);
    }
  }

  return prisma.leaveBalance.create({
    data: { userId, year, month: null, allocated, carried, used: 0 },
  });
}

/** Get effective monthly entitlement for intern (cap to 2/month) */
export async function getMonthlyEntitlement(userId: string, year: number, month: number): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { salaryRules: true, salaryRuleOverride: true },
  });
  if (!user) return 0;

  if (user.employmentType === "INTERN") {
    // Interns: 2 paid leaves per month, no rollover
    const override = user.salaryRuleOverride;
    const rule = user.salaryRules;
    if (override?.paidLeaveDaysPerMonth != null) return override.paidLeaveDaysPerMonth;
    if (rule?.paidLeaveDaysPerMonth != null) return rule.paidLeaveDaysPerMonth;
    return 2;
  }

  // For others, return annual balance remaining ÷ remaining months (or full allocated)
  const balance = await getOrCreateLeaveBalance(userId, year);
  return Math.max(0, balance.allocated + balance.carried - balance.used);
}

// ─── Apply for Leave ─────────────────────────────────────────────

export async function applyForLeave(req: ApplyLeaveRequest): Promise<ApplyLeaveResult> {
  try {
    const { userId, fromDate, toDate, reason, leaveType = "CASUAL" } = req;
    const isPaid = isPaidLeave(leaveType);

    // Validate dates
    if (startOfDay(fromDate) > startOfDay(toDate)) {
      return { success: false, error: "From date must be before or equal to to date." };
    }

    // Count working days
    const totalDays = await countWorkingDays(userId, fromDate, toDate);
    if (totalDays === 0) {
      return { success: false, error: "The selected date range contains no working days." };
    }

    // Check for overlapping leave requests (PENDING or APPROVED)
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        userId,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          { fromDate: { lte: toDate }, toDate: { gte: fromDate } },
        ],
      },
    });
    if (overlapping) {
      return { success: false, error: "You already have a leave request for this period." };
    }

    // Check paid leave balance
    if (isPaid) {
      const now = new Date();
      const year = fromDate.getFullYear();
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (user?.employmentType === "INTERN") {
        // Check monthly cap
        const month = fromDate.getMonth() + 1;
        const usedThisMonth = await getUsedLeavesForMonth(userId, year, month);
        const entitlement = await getMonthlyEntitlement(userId, year, month);
        if (usedThisMonth + totalDays > entitlement) {
          return {
            success: false,
            error: `You have insufficient paid leaves. Used: ${usedThisMonth}, Entitlement: ${entitlement}/month.`,
          };
        }
      } else {
        // Annual balance check
        const balance = await getOrCreateLeaveBalance(userId, year);
        const available = balance.allocated + balance.carried - balance.used;
        if (available < totalDays) {
          return {
            success: false,
            error: `Insufficient paid leave balance. Available: ${available} days, Requested: ${totalDays} days.`,
          };
        }
      }
    }

    // Create leave request
    const request = await prisma.leaveRequest.create({
      data: {
        userId,
        fromDate: startOfDay(fromDate),
        toDate: startOfDay(toDate),
        reason,
        leaveType: leaveType as any,
        isPaid,
        totalDays,
        status: "PENDING",
      },
    });

    // Create inbox notification for admin
    await prisma.inboxItem.create({
      data: {
        type: "LEAVE_REQUEST",
        title: `Leave request from employee`,
        description: `${totalDays} day(s) of ${leaveType} leave from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)}${reason ? `. Reason: ${reason}` : ""}`,
        relatedId: request.id,
        status: "PENDING",
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "LEAVE_REQUEST_CREATE",
        description: `Leave request submitted: ${totalDays} days (${leaveType}) from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)}`,
        metadata: { requestId: request.id, totalDays, leaveType, isPaid },
      },
    });

    return { success: true, request };
  } catch (error) {
    console.error("applyForLeave error:", error);
    return { success: false, error: "An internal error occurred." };
  }
}

// ─── Approve Leave ────────────────────────────────────────────────

export async function approveLeave(requestId: string, adminId: string, note?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) return { success: false, error: "Leave request not found." };
    if (request.status !== "PENDING") return { success: false, error: "Only pending requests can be approved." };

    const now = new Date();
    const from = request.fromDate;
    const to = request.toDate;
    const year = from.getFullYear();

    // Update leave request status
    await prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        approvedBy: adminId,
        approvedAt: now,
        adminNote: note,
      },
    });

    // Update inbox item
    await prisma.inboxItem.updateMany({
      where: { relatedId: requestId, type: "LEAVE_REQUEST" },
      data: { status: "APPROVED" },
    });

    // Deduct from leave balance if paid
    if (request.isPaid) {
      if (request.user.employmentType !== "INTERN") {
        // Annual balance deduction
        const balance = await getOrCreateLeaveBalance(request.userId, year);
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { used: { increment: request.totalDays } },
        });
      }
      // For interns, the monthly cap is enforced at application time; no separate ledger
    }

    // Mark attendance records as ON_LEAVE for working days in the range
    const days = eachDayOfInterval({ start: startOfDay(from), end: startOfDay(to) });
    const schedule = await getEffectiveSchedule(request.userId);
    const sched = schedule || {
      monday: true, tuesday: true, wednesday: true, thursday: true,
      friday: true, saturday: false, sunday: false,
    } as any;

    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: startOfDay(from), lte: startOfDay(to) } },
    });
    const holidayDates = holidays.map((h) => h.date.toDateString());

    for (const day of days) {
      if (holidayDates.includes(day.toDateString())) continue;
      if (!isWorkingDay(day, sched)) continue;

      // Upsert attendance record as ON_LEAVE
      await prisma.attendanceRecord.upsert({
        where: { userId_date: { userId: request.userId, date: day } },
        create: {
          userId: request.userId,
          date: day,
          status: "ON_LEAVE",
          isLate: false,
          isHalfDay: false,
          lateMinutes: 0,
          overrideNote: `Approved leave: ${request.leaveType}${request.isPaid ? " (Paid)" : " (Unpaid)"}`,
          overriddenBy: adminId,
          overriddenAt: now,
        },
        update: {
          status: "ON_LEAVE",
          overrideNote: `Approved leave: ${request.leaveType}${request.isPaid ? " (Paid)" : " (Unpaid)"}`,
          overriddenBy: adminId,
          overriddenAt: now,
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "LEAVE_REQUEST_APPROVE",
        description: `Leave approved for ${request.user.name}: ${request.totalDays} days (${request.leaveType})`,
        metadata: { requestId, userId: request.userId, totalDays: request.totalDays },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("approveLeave error:", error);
    return { success: false, error: "An internal error occurred." };
  }
}

// ─── Reject Leave ─────────────────────────────────────────────────

export async function rejectLeave(requestId: string, adminId: string, note?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) return { success: false, error: "Leave request not found." };
    if (request.status !== "PENDING") return { success: false, error: "Only pending requests can be rejected." };

    await prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", adminNote: note, approvedBy: adminId, approvedAt: new Date() },
    });

    await prisma.inboxItem.updateMany({
      where: { relatedId: requestId, type: "LEAVE_REQUEST" },
      data: { status: "REJECTED" },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "LEAVE_REQUEST_REJECT",
        description: `Leave rejected for ${request.user.name}${note ? `: ${note}` : ""}`,
        metadata: { requestId, userId: request.userId },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("rejectLeave error:", error);
    return { success: false, error: "An internal error occurred." };
  }
}

// ─── Cancel Leave ─────────────────────────────────────────────────

export async function cancelLeave(requestId: string, actorId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) return { success: false, error: "Leave request not found." };
    if (!["PENDING", "APPROVED"].includes(request.status)) {
      return { success: false, error: "Only pending or approved requests can be cancelled." };
    }

    const now = new Date();

    await prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED", cancelledBy: actorId, cancelledAt: now },
    });

    await prisma.inboxItem.updateMany({
      where: { relatedId: requestId, type: "LEAVE_REQUEST" },
      data: { status: "CANCELLED" },
    });

    // If was APPROVED: restore leave balance + revert attendance records
    if (request.status === "APPROVED") {
      if (request.isPaid && request.user.employmentType !== "INTERN") {
        const year = request.fromDate.getFullYear();
        const balance = await getOrCreateLeaveBalance(request.userId, year);
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { used: { decrement: request.totalDays } },
        });
      }

      // Revert ON_LEAVE attendance records to ABSENT (admin can override later)
      await prisma.attendanceRecord.updateMany({
        where: {
          userId: request.userId,
          date: { gte: startOfDay(request.fromDate), lte: startOfDay(request.toDate) },
          status: "ON_LEAVE",
        },
        data: {
          status: "ABSENT",
          overrideNote: "Leave cancelled",
          overriddenBy: actorId,
          overriddenAt: now,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: "LEAVE_REQUEST_CANCEL",
        description: `Leave cancelled for ${request.user.name}`,
        metadata: { requestId, userId: request.userId, wasApproved: request.status === "APPROVED" },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("cancelLeave error:", error);
    return { success: false, error: "An internal error occurred." };
  }
}

// ─── Get used leaves for a specific month ────────────────────────

export async function getUsedLeavesForMonth(userId: string, year: number, month: number): Promise<number> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: "APPROVED",
      isPaid: true,
      fromDate: { lte: monthEnd },
      toDate: { gte: monthStart },
    },
  });

  let total = 0;
  for (const l of leaves) {
    // Count only days within this month
    const from = l.fromDate < monthStart ? monthStart : l.fromDate;
    const to = l.toDate > monthEnd ? monthEnd : l.toDate;
    const days = await countWorkingDays(userId, from, to);
    total += days;
  }
  return total;
}

// ─── Summary for payroll ──────────────────────────────────────────

export async function getLeaveSummaryForPayroll(userId: string, year: number, month: number) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: "APPROVED",
      fromDate: { lte: monthEnd },
      toDate: { gte: monthStart },
    },
  });

  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;

  for (const l of leaves) {
    const from = l.fromDate < monthStart ? monthStart : l.fromDate;
    const to = l.toDate > monthEnd ? monthEnd : l.toDate;
    const days = await countWorkingDays(userId, from, to);
    if (l.isPaid) paidLeaveDays += days;
    else unpaidLeaveDays += days;
  }

  return { paidLeaveDays, unpaidLeaveDays };
}
