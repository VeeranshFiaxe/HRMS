// src/app/api/schedules/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const schedule = await prisma.companySchedule.findFirst();
  return NextResponse.json({ success: true, data: schedule });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const existing = await prisma.companySchedule.findFirst();

    const schedule = existing
      ? await prisma.companySchedule.update({ where: { id: existing.id }, data: body })
      : await prisma.companySchedule.create({ data: { id: "default", ...body } });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "SCHEDULE_UPDATE", description: "Company schedule updated", metadata: body },
    });

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
