// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveSchedule, getAttendanceSummary } from "@/lib/attendance-engine";
import { AttendanceCard } from "@/components/attendance/AttendanceCard";
import { StatsCards } from "@/components/employee/StatsCards";
import { AttendanceCalendar } from "@/components/attendance/AttendanceCalendar";
import { RecentAttendance } from "@/components/attendance/RecentAttendance";
import { format, startOfDay } from "date-fns";
import { LiveClock } from "@/components/layout/LiveClock";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");
  if (session.user.role === "ADMIN") redirect("/admin");

  const userId = session.user.id;
  const today = startOfDay(new Date());
  const now = new Date();

  // Today's record
  const todayRecord = await prisma.attendanceRecord.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  // This month's summary
  const summary = await getAttendanceSummary(userId, now.getFullYear(), now.getMonth() + 1);

  // Schedule
  const schedule = await getEffectiveSchedule(userId);

  // Recent records (last 10)
  const recentRecords = await prisma.attendanceRecord.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 10,
  });

  // User info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, designation: true, department: true, joiningDate: true, timeFormat: true },
  });

  const officeSettings = await prisma.officeSettings.findFirst();
  const timezone = officeSettings?.timezone || "Asia/Kolkata";
  const timeFormat = (user?.timeFormat as "12h" | "24h") || "24h";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Good {getGreeting(timezone)}, {session.user.name.split(" ")[0]}! 👋</h1>
            <p className="page-subtitle">
              {format(now, "EEEE, MMMM do yyyy")} •{" "}
              {user?.designation && user?.department
                ? `${user.designation} · ${user.department}`
                : user?.designation || user?.department || "Employee"}
            </p>
          </div>
          <div className="text-left md:text-right text-sm text-slate-500">
            <LiveClock timeFormat={timeFormat} timezone={timezone} />
          </div>
        </div>
      </div>

      {/* Attendance Card (Check In/Out) */}
      <AttendanceCard
        todayRecord={todayRecord ? JSON.parse(JSON.stringify(todayRecord)) : null}
        schedule={JSON.parse(JSON.stringify(schedule))}
        timeFormat={timeFormat}
        timezone={timezone}
      />

      {/* Stats */}
      <StatsCards summary={summary} />

      {/* Calendar + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceCalendar
          records={summary.records.map(r => JSON.parse(JSON.stringify(r)))}
          year={now.getFullYear()}
          month={now.getMonth() + 1}
          timeFormat={timeFormat}
          timezone={timezone}
        />
        <RecentAttendance 
          records={recentRecords.map(r => JSON.parse(JSON.stringify(r)))} 
          timeFormat={timeFormat}
          timezone={timezone}
        />
      </div>
    </div>
  );
}

function getGreeting(timezone: string): string {
  const { toZonedTime } = require("date-fns-tz");
  const localDate = toZonedTime(new Date(), timezone);
  const hour = localDate.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
