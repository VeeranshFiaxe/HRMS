// src/app/dashboard/calendar/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttendanceSummary } from "@/lib/attendance-engine";
import { AttendanceCalendar } from "@/components/attendance/AttendanceCalendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: { month?: string; year?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const now = new Date();
  const year = parseInt(searchParams.year || now.getFullYear().toString());
  const month = parseInt(searchParams.month || (now.getMonth() + 1).toString());

  const summary = await getAttendanceSummary(session.user.id, year, month);

  // Fetch announcement events
  const announcementEvents = await prisma.announcement.findMany({
    where: { isActive: true, reflectOnCalendar: true, eventDate: { not: null } },
    select: { eventDate: true, eventName: true, title: true },
  });

  const events = announcementEvents
    .filter((a) => a.eventDate !== null)
    .map((a) => ({
      date: (a.eventDate as Date).toISOString(),
      label: a.eventName || a.title,
    }));

  // Fetch leave requests for this user (to show on calendar)
  const leaveRequests = await prisma.leaveRequest.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["APPROVED", "PENDING"] },
      // Show if overlaps with current month view
      fromDate: { lte: new Date(year, month, 0) },
      toDate: { gte: new Date(year, month - 1, 1) },
    },
    select: { fromDate: true, toDate: true, status: true, leaveType: true, totalDays: true },
  });

  const leaves = leaveRequests.map(l => ({
    fromDate: l.fromDate.toISOString(),
    toDate: l.toDate.toISOString(),
    status: l.status,
    leaveType: l.leaveType,
    totalDays: l.totalDays,
  }));

  return (
    <div className="space-y-6 max-w-lg">
      <div className="page-header">
        <h1 className="page-title">Attendance Calendar</h1>
        <p className="page-subtitle">Visual overview of your attendance — click a date to apply leave</p>
      </div>
      <AttendanceCalendar
        records={summary.records.map((r: any) => ({
          date: new Date(r.date).toISOString(),
          status: r.status,
          checkInAt: r.checkInAt,
          checkOutAt: r.checkOutAt,
          hoursWorked: r.hoursWorked,
        }))}
        year={year}
        month={month}
        events={events}
        leaves={leaves}
        showLeaveApply={true}
      />
    </div>
  );
}
