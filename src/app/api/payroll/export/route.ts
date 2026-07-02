// src/app/api/payroll/export/route.ts
// Admin only: CSV export of payroll data

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
  const department = searchParams.get("department");

  const where: any = { isActive: true, role: "EMPLOYEE" };
  if (department) where.department = department;

  const employees = await prisma.user.findMany({
    where,
    include: { salaryRules: true },
    orderBy: { name: "asc" },
  });

  const rows: string[] = [];
  const headers = [
    "Employee Name", "Department", "Designation", "Employment Type",
    "Salary Rule", "Base Salary", "Total Working Days", "Worked Days",
    "Present (Full)", "Late Days", "Half Days", "Absent Days",
    "Paid Leave Days", "Unpaid Leave Days",
    "Late Deduction", "Half Day Deduction", "Absent Deduction", "Unpaid Leave Deduction",
    "Total Deductions", "Net Salary", "Currency"
  ];
  rows.push(headers.join(","));

  for (const emp of employees) {
    try {
      const result = await calculateSalary(emp.id, year, month);
      if (result.success && result.data) {
        const d = result.data;
        const row = [
          emp.name, emp.department || "", emp.designation || "", emp.employmentType,
          d.salaryRuleName, d.baseSalary, d.totalWorkingDays, d.workedDays,
          d.presentFull, d.lateDays, d.halfDays, d.absentDays,
          d.paidLeaveDays, d.unpaidLeaveDays,
          d.lateDeduction, d.halfDayDeduction, d.absentDeduction, d.unpaidLeaveDeduction,
          d.totalDeductions, d.netSalary, d.currency
        ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
        rows.push(row);
      } else {
        rows.push(`"${emp.name}","${emp.department || ""}","","","","N/A - ${result.error || "No salary configured"}","","","","","","","","","","","","","",""`);
      }
    } catch {
      rows.push(`"${emp.name}","${emp.department || ""}","","","","Error","","","","","","","","","","","","","",""`);
    }
  }

  const csv = rows.join("\n");
  const filename = `payroll_${year}_${String(month).padStart(2, "0")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
