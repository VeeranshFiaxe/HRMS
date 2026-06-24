// src/app/dashboard/calendar/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAttendanceSummary } from "@/lib/attendance-engine";
import { AttendanceCalendar } from "@/components/attendance/AttendanceCalendar";

export default async function CalendarPage({ searchParams }: { searchParams: { month?: string; year?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const now = new Date();
  const year = parseInt(searchParams.year || now.getFullYear().toString());
  const month = parseInt(searchParams.month || (now.getMonth() + 1).toString());

  const summary = await getAttendanceSummary(session.user.id, year, month);

  return (
    <div className="space-y-6 max-w-lg">
      <div className="page-header">
        <h1 className="page-title">Attendance Calendar</h1>
        <p className="page-subtitle">Visual overview of your monthly attendance</p>
      </div>
      <AttendanceCalendar
        records={summary.records.map((r: any) => ({
          date: new Date(r.date).toISOString(),
          status: r.status,
          checkInAt: r.checkInAt,
          checkOutAt: r.checkOutAt,
        }))}
        year={year}
        month={month}
      />
    </div>
  );
}
