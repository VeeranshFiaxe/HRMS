import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { action, employeeIds, payload } = body;

    if (!action || !employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid request payload" }, { status: 400 });
    }

    let updatedCount = 0;

    switch (action) {
      case "DEACTIVATE":
        const deactivateResult = await prisma.user.updateMany({
          where: { id: { in: employeeIds } },
          data: { isActive: false },
        });
        updatedCount = deactivateResult.count;
        break;

      case "DELETE":
        const deleteResult = await prisma.user.deleteMany({
          where: { id: { in: employeeIds } },
        });
        updatedCount = deleteResult.count;
        break;

      case "CHANGE_TYPE":
        if (!payload || !payload.employmentType) {
           return NextResponse.json({ success: false, error: "Employment type is required" }, { status: 400 });
        }
        const changeTypeResult = await prisma.user.updateMany({
          where: { id: { in: employeeIds } },
          data: { employmentType: payload.employmentType },
        });
        updatedCount = changeTypeResult.count;
        break;

      case "CHANGE_SCHEDULE":
        // Delete any custom EmployeeSchedule overrides to revert to company default
        await prisma.employeeSchedule.deleteMany({
           where: { userId: { in: employeeIds } }
        });
        updatedCount = employeeIds.length;
        break;

      case "CHANGE_SALARY_RULE":
        // Delete SalaryRuleOverrides to revert to company default
        await prisma.salaryRuleOverride.deleteMany({
           where: { userId: { in: employeeIds } }
        });
        updatedCount = employeeIds.length;
        break;

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EMPLOYEE_UPDATE",
        description: `Admin performed bulk action: ${action} on ${updatedCount} employees`,
        metadata: { action, employeeIds, payload },
      },
    });

    return NextResponse.json({ success: true, count: updatedCount });
  } catch (error) {
    console.error("Bulk employee action error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
