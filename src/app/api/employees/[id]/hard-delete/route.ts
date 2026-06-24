import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  try {
    // Delete attendance records, schedules, audit logs, then the user
    await prisma.$transaction([
      prisma.attendanceRecord.deleteMany({ where: { userId: params.id } }),
      prisma.auditLog.deleteMany({ where: { userId: params.id } }),
      prisma.employeeSchedule.deleteMany({ where: { userId: params.id } }),
      prisma.salaryRuleOverride.deleteMany({ where: { userId: params.id } }),
      prisma.user.delete({ where: { id: params.id } }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EMPLOYEE_DELETE",
        description: `Admin permanently deleted employee ID: ${params.id}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Hard delete error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
