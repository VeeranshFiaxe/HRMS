// src/app/dashboard/attendance/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAttendanceSummary } from "@/lib/attendance-engine";
import { format } from "date-fns";
import { cn, getStatusColor, getStatusLabel } from "@/lib/utils";

export default async function AttendancePage({ searchParams }: { searchParams: { month?: string; year?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const now = new Date();
  const year = parseInt(searchParams.year || now.getFullYear().toString());
  const month = parseInt(searchParams.month || (now.getMonth() + 1).toString());

  const summary = await getAttendanceSummary(session.user.id, year, month);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="space-y-6">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">My Attendance</h1>
          <p className="page-subtitle">{MONTHS[month-1]} {year} · {summary.totalWorkingDays} working days</p>
        </div>
        <div className="flex gap-2">
          <a href={`?year=${month===1?year-1:year}&month=${month===1?12:month-1}`} className="btn-secondary text-sm px-3 py-2">← Prev</a>
          <a href={`?year=${month===12?year+1:year}&month=${month===12?1:month+1}`} className="btn-secondary text-sm px-3 py-2">Next →</a>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Attendance %", value: `${summary.attendancePercentage}%`, color: "text-blue-600" },
          { label: "Present", value: summary.presentDays, color: "text-emerald-600" },
          { label: "Late", value: summary.lateDays, color: "text-amber-600" },
          { label: "Half Days", value: summary.halfDays, color: "text-orange-600" },
          { label: "Absent", value: summary.absentDays, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Records table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Daily Records</h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Late By</th>
            </tr>
          </thead>
          <tbody>
            {summary.records.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">No records for this month</td></tr>
            )}
            {summary.records.map((r: any) => {
              const ci = r.checkInAt ? new Date(r.checkInAt) : null;
              const co = r.checkOutAt ? new Date(r.checkOutAt) : null;
              const mins = ci && co ? Math.round((co.getTime()-ci.getTime())/60000) : null;
              return (
                <tr key={r.id}>
                  <td className="font-medium">{format(new Date(r.date),"EEE, MMM do")}</td>
                  <td className="font-mono text-sm">{ci ? format(ci,"HH:mm:ss") : "—"}</td>
                  <td className="font-mono text-sm">{co ? format(co,"HH:mm:ss") : "—"}</td>
                  <td className="text-slate-500 text-sm">{mins!=null ? `${Math.floor(mins/60)}h ${mins%60}m` : "—"}</td>
                  <td><span className={cn("badge",getStatusColor(r.status))}>{getStatusLabel(r.status)}</span></td>
                  <td className="text-sm">{r.lateMinutes>0 ? <span className="text-amber-600 font-medium">+{r.lateMinutes}m</span> : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
