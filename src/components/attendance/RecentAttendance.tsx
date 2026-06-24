// src/components/attendance/RecentAttendance.tsx
import { format } from "date-fns";
import { cn, getStatusColor, getStatusLabel } from "@/lib/utils";
import { Clock } from "lucide-react";

interface RecentAttendanceProps {
  records: Array<{
    id: string;
    date: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    status: string;
    isLate: boolean;
    lateMinutes: number;
  }>;
  timeFormat?: "12h" | "24h";
  timezone?: string;
}

export function RecentAttendance({ records, timeFormat = "24h", timezone = "Asia/Kolkata" }: RecentAttendanceProps) {
  if (records.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Recent Attendance</h3>
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Clock size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No attendance records yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-5 pb-0">
        <h3 className="font-semibold text-slate-900">Recent Attendance</h3>
      </div>
      <div className="divide-y divide-slate-100 mt-3">
        {records.map((record) => {
          // Add formatTime import above if not present
          const { formatTime } = require("@/lib/utils");
          const checkInTime = record.checkInAt ? formatTime(new Date(record.checkInAt), timeFormat, timezone) : null;
          const checkOutTime = record.checkOutAt ? formatTime(new Date(record.checkOutAt), timeFormat, timezone) : null;

          // Duration
          let duration: string | null = null;
          if (record.checkInAt && record.checkOutAt) {
            const mins = Math.round(
              (new Date(record.checkOutAt).getTime() - new Date(record.checkInAt).getTime()) / 60000
            );
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
          }

          return (
            <div key={record.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {format(new Date(record.date), "EEE, MMM do")}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {checkInTime ? `In: ${checkInTime}` : "No check-in"}
                  {checkOutTime ? ` · Out: ${checkOutTime}` : ""}
                  {duration ? ` · ${duration}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {record.isLate && record.lateMinutes > 0 && (
                  <span className="text-xs text-amber-500 font-medium">+{record.lateMinutes}m</span>
                )}
                <span className={cn("badge text-xs", getStatusColor(record.status))}>
                  {getStatusLabel(record.status)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
