// src/app/admin/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import {
  Users, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, UserCheck
} from "lucide-react";
import Link from "next/link";
import { cn, getStatusColor, getStatusLabel } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const today = startOfDay(new Date());
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { timeFormat: true } });
  const timeFormat = (user?.timeFormat as "12h" | "24h") || "24h";
  const officeSettings = await prisma.officeSettings.findFirst();
  const timezone = officeSettings?.timezone || "Asia/Kolkata";
  const { formatTime } = require("@/lib/utils");

  // Total active employees
  const totalEmployees = await prisma.user.count({
    where: { isActive: true, role: "EMPLOYEE" },
  });

  // Today's attendance records
  const todayRecords = await prisma.attendanceRecord.findMany({
    where: { date: today },
    include: { user: { select: { id: true, name: true, designation: true, department: true } } },
    orderBy: { checkInAt: "desc" },
  });

  const checkedIn = todayRecords.filter((r) => r.checkInAt && !r.checkOutAt).length;
  const checkedOut = todayRecords.filter((r) => r.checkInAt && r.checkOutAt).length;
  const lateToday = todayRecords.filter((r) => r.isLate).length;
  const absentToday = totalEmployees - todayRecords.filter((r) => r.checkInAt).length;

  // Recent audit logs
  const auditLogs = await prisma.auditLog.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  // Month overview
  const monthRecords = await prisma.attendanceRecord.groupBy({
    by: ["status"],
    where: { date: { gte: monthStart, lte: monthEnd } },
    _count: { status: true },
  });

  const statusMap = Object.fromEntries(monthRecords.map((r) => [r.status, r._count.status]));

  // All employees with today's status
  const allEmployees = await prisma.user.findMany({
    where: { isActive: true, role: "EMPLOYEE" },
    include: {
      attendanceRecords: {
        where: { date: today },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">
          {format(now, "EEEE, MMMM do yyyy")} · Overview
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Employees", value: totalEmployees, icon: Users, color: "text-blue-600 bg-blue-100" },
          { label: "Currently In", value: checkedIn, icon: UserCheck, color: "text-emerald-600 bg-emerald-100" },
          { label: "Absent Today", value: absentToday, icon: XCircle, color: "text-red-600 bg-red-100" },
          { label: "Late Today", value: lateToday, icon: Clock, color: "text-amber-600 bg-amber-100" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.color)}>
                <Icon size={20} />
              </div>
              <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live employee status */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Today's Status</h2>
            <Link href="/admin/attendance" className="text-sm text-blue-600 hover:text-blue-700">
              View report →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {allEmployees.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">No employees found</div>
            )}
            {allEmployees.map((emp) => {
              const record = emp.attendanceRecords[0];
              const status = record?.status || "ABSENT";
              const isCheckedIn = record?.checkInAt && !record?.checkOutAt;

              return (
                <div key={emp.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {emp.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{emp.name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {emp.designation} · {emp.department}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-right flex-shrink-0">
                    {record?.checkInAt && (
                      <span className="text-xs text-slate-400">
                        {formatTime(new Date(record.checkInAt), timeFormat, timezone)}
                        {record.checkOutAt && ` → ${formatTime(new Date(record.checkOutAt), timeFormat, timezone)}`}
                      </span>
                    )}
                    <span className={cn("badge text-xs", getStatusColor(record ? status : "ABSENT"))}>
                      {isCheckedIn ? "In Office" : getStatusLabel(record ? status : "ABSENT")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick links + month summary */}
        <div className="space-y-4">
          {/* Month summary */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">This Month</h3>
            <div className="space-y-2">
              {[
                { status: "PRESENT", label: "Present Days", color: "text-emerald-600" },
                { status: "LATE", label: "Late Days", color: "text-amber-600" },
                { status: "HALF_DAY", label: "Half Days", color: "text-orange-600" },
                { status: "ABSENT", label: "Absent Days", color: "text-red-600" },
              ].map((item) => (
                <div key={item.status} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{item.label}</span>
                  <span className={cn("font-bold", item.color)}>
                    {statusMap[item.status] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { href: "/admin/employees/new", label: "Add Employee" },
                { href: "/admin/holidays", label: "Manage Holidays" },
                { href: "/admin/office", label: "Office Settings" },
                { href: "/admin/attendance?export=true", label: "Export Report" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-sm text-slate-700 transition-colors"
                >
                  {link.label}
                  <span className="text-slate-400">→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent audit logs */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent Activity</h2>
          <Link href="/admin/audit" className="text-sm text-blue-600 hover:text-blue-700">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {auditLogs.map((log) => (
            <div key={log.id} className="px-5 py-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0 mt-0.5">
                {log.user?.name?.[0] ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">{log.description}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {log.user?.name ?? "System"} · {formatTime(new Date(log.createdAt), timeFormat, timezone)}
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 flex-shrink-0">
                {log.action}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
