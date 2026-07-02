// src/app/api/employees/[id]/schedule/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { startTime, endTime, overrideLateAfter, lateAfter, halfDayAfter, monday, tuesday, wednesday, thursday, friday, saturday, sunday, note } = body;

    const schedule = await prisma.employeeSchedule.upsert({
      where: { userId: params.id },
      create: { userId: params.id, startTime, endTime, overrideLateAfter, lateAfter, halfDayAfter, monday, tuesday, wednesday, thursday, friday, saturday, sunday, note },
      update: { startTime, endTime, overrideLateAfter, lateAfter, halfDayAfter, monday, tuesday, wednesday, thursday, friday, saturday, sunday, note },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "SCHEDULE_UPDATE", description: `Custom schedule set for employee ${params.id}`, metadata: body },
    });

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  await prisma.employeeSchedule.deleteMany({ where: { userId: params.id } });
  return NextResponse.json({ success: true });
}
