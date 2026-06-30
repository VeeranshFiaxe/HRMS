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

  // Fetch announcements that should reflect on the calendar
  const announcementEvents = await prisma.announcement.findMany({
    where: {
      isActive: true,
      reflectOnCalendar: true,
      eventDate: { not: null },
    },
    select: { eventDate: true, eventName: true, title: true },
  });

  const events = announcementEvents
    .filter((a) => a.eventDate !== null)
    .map((a) => ({
      date: (a.eventDate as Date).toISOString(),
      label: a.eventName || a.title,
    }));

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
        events={events}
      />
    </div>
  );
}
