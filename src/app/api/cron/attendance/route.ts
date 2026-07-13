import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveSchedule } from "@/lib/attendance-engine";
import { isWorkingDay } from "@/lib/utils";
import { startOfDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export async function GET(req: Request) {
  // Simple auth check for CRON_SECRET if it exists
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = startOfDay(now);

  const office = await prisma.officeSettings.findFirst();
  const tz = office?.timezone || "Asia/Kolkata";
  const currentTimeStr = formatInTimeZone(now, tz, "HH:mm");

  const rules = await prisma.attendanceRules.findFirst();
  const autoAbsentAfter = rules?.autoAbsentAfter || "18:00";
  const autoCheckoutAfter = rules?.autoCheckoutAfter || "21:00";
  const minHoursFullDay = rules?.minHoursFullDay ?? 7.5;
  const minHoursHalfDay = rules?.minHoursHalfDay ?? 4.0;

  let absentMarked = 0;
  let autoCheckedOut = 0;

  try {
    const activeUsers = await prisma.user.findMany({
      where: { role: { in: ["EMPLOYEE", "ADMIN"] }, isActive: true },
    });

    const holiday = await prisma.holiday.findUnique({
      where: { date: today },
    });

    for (const user of activeUsers) {
      // 1. Check if user is on approved leave today
      const leave = await prisma.leaveRequest.findFirst({
        where: {
          userId: user.id,
          status: "APPROVED",
          fromDate: { lte: today },
          toDate: { gte: today }
        }
      });

      if (leave || holiday) continue;

      const schedule = await getEffectiveSchedule(user.id);
      if (!schedule || !isWorkingDay(now, schedule)) continue;

      const record = await prisma.attendanceRecord.findUnique({
        where: { userId_date: { userId: user.id, date: today } }
      });

      // AUTO-ABSENT
      if (!record && currentTimeStr >= autoAbsentAfter) {
        await prisma.attendanceRecord.create({
          data: {
            userId: user.id,
            date: today,
            status: "ABSENT",
            overrideNote: "Auto-marked absent by system",
          }
        });
        absentMarked++;
      }
      
      // AUTO-CHECKOUT
      if (record && record.checkInAt && !record.checkOutAt && currentTimeStr >= autoCheckoutAfter) {
        const durationMs = now.getTime() - record.checkInAt.getTime();
        const hoursWorked = durationMs / (1000 * 60 * 60);

        let newStatus = record.status;
        let newIsHalfDay = record.isHalfDay;
        let note = "Auto-checkout by system at " + autoCheckoutAfter;

        if (record.status !== "ON_LEAVE" && record.status !== "HOLIDAY" && record.status !== "WEEKEND") {
          if (hoursWorked < minHoursHalfDay) {
            newStatus = "ABSENT";
            newIsHalfDay = false;
            note += ` | Insufficient hours (${hoursWorked.toFixed(1)}h)`;
          } else if (hoursWorked < minHoursFullDay) {
            newStatus = "HALF_DAY";
            newIsHalfDay = true;
            note += ` | Partial day (${hoursWorked.toFixed(1)}h)`;
          }
        }

        await prisma.attendanceRecord.update({
          where: { id: record.id },
          data: {
            checkOutAt: now,
            status: newStatus,
            isHalfDay: newIsHalfDay,
            hoursWorked: Math.round(hoursWorked * 100) / 100,
            overrideNote: record.overrideNote ? `${record.overrideNote} | ${note}` : note,
          }
        });
        autoCheckedOut++;
      }
    }

    return NextResponse.json({ success: true, absentMarked, autoCheckedOut });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
