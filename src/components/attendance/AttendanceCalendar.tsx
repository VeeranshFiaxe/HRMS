// src/components/attendance/AttendanceCalendar.tsx
"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, getStatusColor } from "@/lib/utils";

interface AttendanceCalendarProps {
  records: Array<{
    date: string;
    status: string;
    checkInAt: string | null;
    checkOutAt: string | null;
  }>;
  year: number;
  month: number;
}

const STATUS_DOT: Record<string, string> = {
  PRESENT: "bg-emerald-500",
  LATE: "bg-amber-500",
  HALF_DAY: "bg-orange-500",
  ABSENT: "bg-red-500",
  ON_LEAVE: "bg-blue-500",
  HOLIDAY: "bg-purple-500",
  WEEKEND: "bg-slate-300",
};

export function AttendanceCalendar({ records, year, month }: AttendanceCalendarProps) {
  const [viewDate, setViewDate] = useState(new Date(year, month - 1, 1));

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getRecord = (date: Date) =>
    records.find((r) => isSameDay(new Date(r.date), date));

  const [tooltip, setTooltip] = useState<{ record: any; date: Date } | null>(null);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">
          {format(viewDate, "MMMM yyyy")}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const record = getRecord(day);
          const inMonth = isSameMonth(day, viewDate);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "relative aspect-square flex flex-col items-center justify-center rounded-lg cursor-default transition-colors",
                inMonth ? "hover:bg-slate-50" : "opacity-30",
                today && "ring-2 ring-blue-500 ring-offset-1"
              )}
              onMouseEnter={() => record && setTooltip({ record, date: day })}
              onMouseLeave={() => setTooltip(null)}
            >
              <span className={cn(
                "text-xs font-medium",
                today ? "text-blue-600" : "text-slate-700",
                !inMonth && "text-slate-300"
              )}>
                {format(day, "d")}
              </span>
              {record && inMonth && (
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full mt-0.5",
                  STATUS_DOT[record.status] || "bg-slate-400"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <p className="font-semibold text-slate-900">{format(tooltip.date, "EEEE, MMMM do")}</p>
          <p className={cn("mt-1 font-medium", getStatusColor(tooltip.record.status).split(" ")[0])}>
            {tooltip.record.status.replace("_", " ")}
          </p>
          {tooltip.record.checkInAt && (
            <p className="text-slate-500 mt-0.5">
              In: {format(new Date(tooltip.record.checkInAt), "HH:mm")}
              {tooltip.record.checkOutAt && ` · Out: ${format(new Date(tooltip.record.checkOutAt), "HH:mm")}`}
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
        {[
          { label: "Present", dot: "bg-emerald-500" },
          { label: "Late", dot: "bg-amber-500" },
          { label: "Half Day", dot: "bg-orange-500" },
          { label: "Absent", dot: "bg-red-500" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className={cn("w-2 h-2 rounded-full", item.dot)} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
