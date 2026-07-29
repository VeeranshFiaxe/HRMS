// src/app/api/admin/cleanup-attendance/route.ts
// Removes ABSENT records that fall on non-working days (weekends, holidays)
// across all employees based on their effective schedule.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveSchedule } from "@/lib/attendance-engine";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // No year/month given: clean up ALL ABSENT records, all-time, for every active user.
  const holidays = await prisma.holiday.findMany({ select: { date: true } });
  const holidaySet = new Set(holidays.map(h => h.date.toDateString()));

  const allUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  let totalDeleted = 0;
  const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const;

  for (const user of allUsers) {
    const schedule = await getEffectiveSchedule(user.id) || {
      monday: true, tuesday: true, wednesday: true,
      thursday: true, friday: true, saturday: false, sunday: false,
    };

    const badRecords = await prisma.attendanceRecord.findMany({
      where: { userId: user.id, status: "ABSENT" },
      select: { id: true, date: true },
    });

    const toDelete = badRecords
      .filter(r => {
        const d = new Date(r.date);
        const dayName = dayNames[d.getDay()] as keyof typeof schedule;
        return holidaySet.has(d.toDateString()) || !schedule[dayName];
      })
      .map(r => r.id);

    if (toDelete.length > 0) {
      await prisma.attendanceRecord.deleteMany({ where: { id: { in: toDelete } } });
      totalDeleted += toDelete.length;
    }
  }

  return NextResponse.json({ success: true, totalDeleted });
}
