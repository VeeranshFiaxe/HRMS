// src/components/attendance/AttendanceCalendar.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay, parseISO
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { cn, getStatusColor } from "@/lib/utils";
import { LeaveRequestForm } from "@/components/employee/LeaveRequestForm";

interface AttendanceRecord {
  date: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  hoursWorked?: number | null;
}

interface LeaveEvent {
  fromDate: string;
  toDate: string;
  status: string; // PENDING | APPROVED | REJECTED | CANCELLED
  leaveType: string;
  totalDays: number;
}

interface AttendanceCalendarProps {
  records: AttendanceRecord[];
  year: number;
  month: number;
  timeFormat?: "12h" | "24h";
  timezone?: string;
  events?: Array<{ date: string; label: string }>;
  leaves?: LeaveEvent[];
  showLeaveApply?: boolean;
}

const STATUS_DOT: Record<string, string> = {
  PRESENT:  "bg-emerald-500",
  LATE:     "bg-amber-500",
  HALF_DAY: "bg-orange-500",
  ABSENT:   "bg-red-500",
  ON_LEAVE: "bg-blue-500",
  HOLIDAY:  "bg-purple-500",
  WEEKEND:  "bg-slate-300",
};

const LEAVE_DOT: Record<string, string> = {
  APPROVED: "bg-blue-500",
  PENDING:  "bg-yellow-400",
  REJECTED: "bg-red-300",
};

export function AttendanceCalendar({
  records, year, month,
  timeFormat = "24h", timezone = "Asia/Kolkata",
  events = [], leaves = [], showLeaveApply = false
}: AttendanceCalendarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [viewDate, setViewDate] = useState(new Date(year, month - 1, 1));
  const [tooltip, setTooltip] = useState<{ record: any; date: Date; dayEvents: typeof events; dayLeaves: LeaveEvent[] } | null>(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | undefined>();

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getRecord = useCallback((date: Date) =>
    records.find((r) => isSameDay(parseISO(r.date), date)), [records]);

  const getEvents = useCallback((date: Date) =>
    events.filter((e) => isSameDay(parseISO(e.date), date)), [events]);

  const getDayLeaves = useCallback((date: Date) => {
    return leaves.filter(l => {
      const from = parseISO(l.fromDate);
      const to = parseISO(l.toDate);
      return date >= from && date <= to;
    });
  }, [leaves]);

  const handleDayClick = (day: Date) => {
    if (!showLeaveApply) return;
    const inMonth = isSameMonth(day, viewDate);
    if (!inMonth) return;
    setPrefillDate(format(day, "yyyy-MM-dd"));
    setShowLeaveForm(true);
    setTooltip(null);
  };

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">{format(viewDate, "MMMM yyyy")}</h3>
        <div className="flex gap-1 items-center">
          {showLeaveApply && (
            <button
              onClick={() => { setPrefillDate(undefined); setShowLeaveForm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors mr-2"
            >
              <Plus size={13} />Apply Leave
            </button>
          )}
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const record = getRecord(day);
          const dayEvents = getEvents(day);
          const dayLeaves = getDayLeaves(day);
          const inMonth = isSameMonth(day, viewDate);
          const todayFlag = mounted ? isToday(day) : false;
          const hasLeave = dayLeaves.length > 0;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "relative aspect-square flex flex-col items-center justify-center rounded-lg transition-colors",
                inMonth ? (showLeaveApply ? "hover:bg-blue-50 cursor-pointer" : "hover:bg-slate-50 cursor-default") : "opacity-30 cursor-default",
                todayFlag && "ring-2 ring-blue-500 ring-offset-1"
              )}
              onMouseEnter={() => (record || dayEvents.length > 0 || dayLeaves.length > 0) && setTooltip({ record, date: day, dayEvents, dayLeaves })}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => handleDayClick(day)}
            >
              <span className={cn(
                "text-xs font-medium",
                todayFlag ? "text-blue-600" : "text-slate-700",
                !inMonth && "text-slate-300"
              )}>
                {format(day, "d")}
              </span>

              {/* Status dots */}
              <div className="flex items-center gap-0.5 mt-0.5">
                {record && inMonth && (
                  <div className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[record.status] || "bg-slate-400")} />
                )}
                {hasLeave && inMonth && !record && (
                  <div className={cn("w-1.5 h-1.5 rounded-full",
                    LEAVE_DOT[dayLeaves[0].status] || "bg-blue-400")} />
                )}
                {dayEvents.length > 0 && inMonth && (
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <p className="font-semibold text-slate-900">{format(tooltip.date, "EEEE, MMMM do")}</p>
          {tooltip.record && (
            <>
              <p className={cn("mt-1 font-medium", getStatusColor(tooltip.record.status).split(" ")[0])}>
                {tooltip.record.status.replace("_", " ")}
              </p>
              {tooltip.record.hoursWorked != null && (
                <p className="text-slate-500 mt-0.5">Hours worked: {tooltip.record.hoursWorked}h</p>
              )}
              {tooltip.record.checkInAt && (
                <p className="text-slate-500 mt-0.5">
                  {(() => {
                    const { formatTime } = require("@/lib/utils");
                    const ci = formatTime(new Date(tooltip.record.checkInAt), timeFormat, timezone);
                    const co = tooltip.record.checkOutAt ? formatTime(new Date(tooltip.record.checkOutAt), timeFormat, timezone) : null;
                    return `In: ${ci}${co ? ` · Out: ${co}` : " · (No checkout)"}`;
                  })()}
                </p>
              )}
            </>
          )}
          {tooltip.dayLeaves.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {tooltip.dayLeaves.map((l, i) => (
                <p key={i} className={cn("font-medium",
                  l.status === "APPROVED" ? "text-blue-600" :
                  l.status === "PENDING" ? "text-amber-600" : "text-slate-400")}>
                  🏖 Leave ({l.leaveType}) · {l.status}
                </p>
              ))}
            </div>
          )}
          {tooltip.dayEvents.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {tooltip.dayEvents.map((ev, i) => (
                <p key={i} className="text-purple-600 font-medium">📌 {ev.label}</p>
              ))}
            </div>
          )}
          {showLeaveApply && isSameMonth(tooltip.date, viewDate) && (
            <button
              onClick={() => handleDayClick(tooltip.date)}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              + Apply leave for this date
            </button>
          )}
        </div>
      )}

      {/* Leave apply form */}
      {showLeaveForm && (
        <div className="mt-4">
          <LeaveRequestForm
            prefillDate={prefillDate}
            onSuccess={() => { setShowLeaveForm(false); window.location.reload(); }}
            onClose={() => setShowLeaveForm(false)}
          />
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
        {[
          { label: "Present", dot: "bg-emerald-500" },
          { label: "Late", dot: "bg-amber-500" },
          { label: "Half Day", dot: "bg-orange-500" },
          { label: "Absent", dot: "bg-red-500" },
          { label: "On Leave", dot: "bg-blue-500" },
          { label: "Leave Pending", dot: "bg-yellow-400" },
          { label: "Event", dot: "bg-purple-500" },
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
