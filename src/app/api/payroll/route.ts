// src/app/api/payroll/route.ts
// Admin only: GET payroll calculations for month/dept/employee

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateSalary } from "@/lib/salary-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") || now.getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (now.getMonth() + 1).toString());
  const userId = searchParams.get("userId");
  const department = searchParams.get("department");

  // Fetch employees
  const where: any = { isActive: true, role: "EMPLOYEE" };
  if (userId) where.id = userId;
  if (department) where.department = department;

  const employees = await prisma.user.findMany({
    where,
    include: { salaryRules: true, salaryRuleOverride: true },
    orderBy: { name: "asc" },
  });

  // Calculate salary for each employee
  const results = await Promise.all(
    employees.map(async (emp) => {
      try {
        const result = await calculateSalary(emp.id, year, month);
        return {
          employeeId: emp.id,
          name: emp.name,
          department: emp.department,
          designation: emp.designation,
          employmentType: emp.employmentType,
          salaryRuleName: emp.salaryRules?.name ?? emp.salaryRuleOverride ? "Custom Override" : "No Rule",
          ...(result.success ? result.data : {
            error: result.error,
            baseSalary: 0,
            netSalary: 0,
            totalDeductions: 0,
          }),
        };
      } catch (e) {
        return {
          employeeId: emp.id,
          name: emp.name,
          department: emp.department,
          designation: emp.designation,
          employmentType: emp.employmentType,
          error: "Calculation failed",
          baseSalary: 0,
          netSalary: 0,
          totalDeductions: 0,
        };
      }
    })
  );

  return NextResponse.json({ year, month, results });
}
