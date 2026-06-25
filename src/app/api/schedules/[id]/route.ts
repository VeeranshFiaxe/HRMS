// src/app/api/schedules/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();

    if (body.isDefault) {
      await prisma.companySchedule.updateMany({
        where: { isDefault: true, id: { not: params.id } },
        data: { isDefault: false }
      });
    }

    const schedule = await prisma.companySchedule.update({
      where: { id: params.id },
      data: body
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "SCHEDULE_UPDATE", description: `Updated schedule: ${schedule.name}`, metadata: body },
    });

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  try {
    const existingUsers = await prisma.user.count({ where: { companyScheduleId: params.id } });
    if (existingUsers > 0) {
      return NextResponse.json({ success: false, error: `Cannot delete schedule. It is assigned to ${existingUsers} users.` }, { status: 400 });
    }

    await prisma.companySchedule.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
