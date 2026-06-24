// src/app/admin/attendance/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AttendanceReportClient } from "@/components/admin/AttendanceReportClient";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default async function AttendanceReportPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string; userId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const now = new Date();
  const year = parseInt(searchParams.year || now.getFullYear().toString());
  const month = parseInt(searchParams.month || (now.getMonth() + 1).toString());
  const userId = searchParams.userId || "";

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", isActive: true },
    select: { id: true, name: true, department: true, designation: true },
    orderBy: { name: "asc" },
  });

  const whereClause: any = {
    date: { gte: monthStart, lte: monthEnd },
  };
  if (userId) whereClause.userId = userId;

  const records = await prisma.attendanceRecord.findMany({
    where: whereClause,
    include: {
      user: { select: { id: true, name: true, department: true, designation: true } },
    },
    orderBy: [{ date: "desc" }, { user: { name: "asc" } }],
  });

  return (
    <AttendanceReportClient
      employees={employees}
      records={JSON.parse(JSON.stringify(records))}
      year={year}
      month={month}
      selectedUserId={userId}
    />
  );
}
