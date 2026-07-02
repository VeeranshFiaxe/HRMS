// src/lib/salary-engine.ts
// Salary calculation using attendance, leave, schedule and salary rules

import { prisma } from "@/lib/prisma";
import { getAttendanceSummary } from "@/lib/attendance-engine";
import { getLeaveSummaryForPayroll } from "@/lib/leave-engine";

export async function calculateSalary(userId: string, year: number, month: number) {
  // 1. Fetch attendance summary
  const summary = await getAttendanceSummary(userId, year, month);

  // 2. Fetch leave data for the month
  const leaveSummary = await getLeaveSummaryForPayroll(userId, year, month);

  // 3. Fetch User & effective rules
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { salaryRuleOverride: true, salaryRules: true },
  });
  const globalDefaultRules = await prisma.salaryRules.findFirst({ where: { isDefault: true } });
  const fallbackRules = await prisma.salaryRules.findFirst();

  if (!user) throw new Error("User not found");

  // Determine effective rules (override > assigned rule > default > fallback)
  const override = user.salaryRuleOverride;
  const assignedRule = user.salaryRules;
  const effectiveRule = assignedRule || globalDefaultRules || fallbackRules;

  const baseSalary = override?.baseSalary ?? effectiveRule?.baseSalary ?? 0;

  if (!baseSalary) {
    return {
      success: false,
      error: "No base salary configured for this employee or company default.",
    };
  }

  // Effective deduction factors (override > rule > hardcoded defaults)
  const halfDayDeductionFactor = override?.halfDayDeductionFactor ?? effectiveRule?.halfDayDeductionFactor ?? 0.5;
  const lateDeductionFactor = override?.lateDeductionFactor ?? effectiveRule?.lateDeductionFactor ?? 0.33;
  const absentDeductionFactor = override?.absentDeductionFactor ?? effectiveRule?.absentDeductionFactor ?? 1.0;

  // 4. Build attendance counts from records
  // ON_LEAVE records should NOT count as absent — they are handled via leave summary
  const presentFull = summary.records.filter(
    (r) => r.status === "PRESENT" && !r.isLate
  ).length;
  const lateDays = summary.records.filter((r) => r.isLate && r.status !== "ABSENT").length;
  const halfDays = summary.records.filter((r) => r.status === "HALF_DAY").length;
  const absentDays = summary.records.filter((r) => r.status === "ABSENT").length;
  const onLeaveDays = summary.records.filter((r) => r.status === "ON_LEAVE").length;

  const { paidLeaveDays, unpaidLeaveDays } = leaveSummary;

  // Total working days in the month (schedule-aware, holidays excluded)
  const totalWorkingDays = summary.totalWorkingDays;

  const perDayRate = totalWorkingDays > 0 ? baseSalary / totalWorkingDays : 0;

  // 5. Calculate deductions
  // Late: each late day deducts lateDeductionFactor of a day's pay
  const lateDeduction = lateDays * lateDeductionFactor * perDayRate;

  // Half day: 0.5 day deducted (halfDayDeductionFactor)
  const halfDayDeduction = halfDays * halfDayDeductionFactor * perDayRate;

  // Absent (unpaid): each absent day deducts absentDeductionFactor of a day's pay
  const absentDeduction = absentDays * absentDeductionFactor * perDayRate;

  // Unpaid leave: treated same as absent
  const unpaidLeaveDeduction = unpaidLeaveDays * absentDeductionFactor * perDayRate;

  // Paid leave: no deduction — treated as worked days

  const totalDeductions = lateDeduction + halfDayDeduction + absentDeduction + unpaidLeaveDeduction;

  // Net salary
  let netSalary = Math.max(0, baseSalary - totalDeductions);

  // Cap at base salary
  if (netSalary > baseSalary) netSalary = baseSalary;

  // Effective worked days for reference
  const workedDays = presentFull + lateDays + halfDays * 0.5 + paidLeaveDays;

  return {
    success: true,
    data: {
      // Identity
      userId,
      year,
      month,
      // Rule info
      baseSalary,
      salaryRuleName: effectiveRule?.name ?? "Default",
      perDayRate: Math.round(perDayRate * 100) / 100,
      // Attendance breakdown
      totalWorkingDays,
      presentFull,
      lateDays,
      halfDays,
      absentDays,
      onLeaveDays,
      // Leave breakdown
      paidLeaveDays,
      unpaidLeaveDays,
      // Deduction details
      lateDeductionFactor,
      halfDayDeductionFactor,
      absentDeductionFactor,
      lateDeduction: Math.round(lateDeduction * 100) / 100,
      halfDayDeduction: Math.round(halfDayDeduction * 100) / 100,
      absentDeduction: Math.round(absentDeduction * 100) / 100,
      unpaidLeaveDeduction: Math.round(unpaidLeaveDeduction * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      // Summary
      workedDays: Math.round(workedDays * 10) / 10,
      netSalary: Math.round(netSalary * 100) / 100,
      currency: "₹",
    },
  };
}
