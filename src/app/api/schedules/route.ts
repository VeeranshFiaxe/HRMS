// src/app/api/schedules/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const schedules = await prisma.companySchedule.findMany({
    orderBy: { createdAt: 'asc' }
  });
  return NextResponse.json({ success: true, data: schedules });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    
    // If setting as default, unset others first
    if (body.isDefault) {
      await prisma.companySchedule.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const schedule = await prisma.companySchedule.create({ data: body });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "SCHEDULE_UPDATE", description: `Created new schedule: ${schedule.name}`, metadata: body },
    });

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
