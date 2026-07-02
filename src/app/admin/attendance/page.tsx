// src/app/admin/attendance/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AttendanceReportClient } from "@/components/admin/AttendanceReportClient";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

export const dynamic = "force-dynamic";

export default async function AttendanceReportPage({
  searchParams,
}: {
  searchParams: {
    month?: string; year?: string; userId?: string;
    dept?: string; status?: string; empType?: string;
    view?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const now = new Date();
  const year = parseInt(searchParams.year || now.getFullYear().toString());
  const month = parseInt(searchParams.month || (now.getMonth() + 1).toString());
  const parseArrayParams = (param: string) => param ? param.split(",") : [];

  const userId = searchParams.userId || "";
  const dept = searchParams.dept || "";
  const status = searchParams.status || "";
  const empType = searchParams.empType || "";
  const viewMode = (searchParams.view || "day") as "day" | "week" | "month";

  const userIdArray = parseArrayParams(userId);
  const deptArray = parseArrayParams(dept);
  const statusArray = parseArrayParams(status);
  const empTypeArray = parseArrayParams(empType);

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);

  // Employees for filter dropdown (all active employees)
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", isActive: true },
    select: { id: true, name: true, department: true, designation: true, employmentType: true },
    orderBy: { name: "asc" },
  });

  // Build where clause
  const whereClause: any = {
    date: { gte: monthStart, lte: monthEnd },
  };
  if (userIdArray.length > 0) whereClause.userId = { in: userIdArray };
  if (statusArray.length > 0) whereClause.status = { in: statusArray };
  if (deptArray.length > 0 || empTypeArray.length > 0) {
    whereClause.user = {};
    if (deptArray.length > 0) whereClause.user.department = { in: deptArray };
    if (empTypeArray.length > 0) whereClause.user.employmentType = { in: empTypeArray };
  }

  const records = await prisma.attendanceRecord.findMany({
    where: whereClause,
    include: {
      user: { select: { id: true, name: true, department: true, designation: true, employmentType: true } },
    },
    orderBy: [{ date: "desc" }, { user: { name: "asc" } }],
  });

  return (
    <AttendanceReportClient
      employees={JSON.parse(JSON.stringify(employees))}
      records={JSON.parse(JSON.stringify(records))}
      year={year}
      month={month}
      selectedUserId={userId}
      selectedDept={dept}
      selectedStatus={status}
      selectedEmploymentType={empType}
      viewMode={viewMode}
    />
  );
}
