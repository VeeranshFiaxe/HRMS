// src/components/admin/AttendanceReportClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Download, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, getStatusColor, getStatusLabel } from "@/lib/utils";
import toast from "react-hot-toast";

interface Props {
  employees: Array<{ id: string; name: string; department: string | null; designation: string | null }>;
  records: Array<{
    id: string;
    date: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    status: string;
    isLate: boolean;
    lateMinutes: number;
    isHalfDay: boolean;
    checkInIp: string | null;
    checkInLat: number | null;
    checkInLng: number | null;
    user: { id: string; name: string; department: string | null; designation: string | null };
  }>;
  year: number;
  month: number;
  selectedUserId: string;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function AttendanceReportClient({ employees, records, year, month, selectedUserId }: Props) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  const navigate = (newYear: number, newMonth: number, uid: string) => {
    const params = new URLSearchParams({
      year: newYear.toString(),
      month: newMonth.toString(),
      ...(uid && { userId: uid }),
    });
    router.push(`/admin/attendance?${params}`);
  };

  const prevMonth = () => {
    if (month === 1) navigate(year - 1, 12, selectedUserId);
    else navigate(year, month - 1, selectedUserId);
  };

  const nextMonth = () => {
    if (month === 12) navigate(year + 1, 1, selectedUserId);
    else navigate(year, month + 1, selectedUserId);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ year: year.toString(), month: month.toString(), ...(selectedUserId && { userId: selectedUserId }) });
      const res = await fetch(`/api/reports/export?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${year}_${month.toString().padStart(2, "0")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Report exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  // Summary stats
  const total = records.length;
  const present = records.filter(r => r.status === "PRESENT").length;
  const late = records.filter(r => r.status === "LATE").length;
  const halfDay = records.filter(r => r.status === "HALF_DAY").length;
  const absent = records.filter(r => r.status === "ABSENT").length;

  return (
    <div className="space-y-6">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Attendance Report</h1>
          <p className="page-subtitle">{MONTHS[month - 1]} {year}</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-secondary">
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-4 items-center">
        {/* Month nav */}
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft size={16} /></button>
          <span className="font-medium text-slate-900 min-w-[120px] text-center">{MONTHS[month - 1]} {year}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight size={16} /></button>
        </div>

        {/* Employee filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select
            className="input !w-auto text-sm"
            value={selectedUserId}
            onChange={e => navigate(year, month, e.target.value)}
          >
            <option value="">All Employees</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: total, color: "text-slate-900" },
          { label: "Present", value: present, color: "text-emerald-600" },
          { label: "Late", value: late, color: "text-amber-600" },
          { label: "Half Day", value: halfDay, color: "text-orange-600" },
          { label: "Absent", value: absent, color: "text-red-600" },
        ].map(stat => (
          <div key={stat.label} className="card p-4 text-center">
            <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Late By</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No attendance records for this period
                  </td>
                </tr>
              )}
              {records.map(record => {
                const checkIn = record.checkInAt ? new Date(record.checkInAt) : null;
                const checkOut = record.checkOutAt ? new Date(record.checkOutAt) : null;
                const mins = checkIn && checkOut
                  ? Math.round((checkOut.getTime() - checkIn.getTime()) / 60000)
                  : null;
                const duration = mins != null
                  ? `${Math.floor(mins / 60)}h ${mins % 60}m`
                  : "—";

                return (
                  <tr key={record.id}>
                    <td className="font-medium" suppressHydrationWarning>{format(new Date(record.date), "dd MMM")}</td>
                    <td>
                      <p className="font-medium text-slate-900">{record.user.name}</p>
                      <p className="text-xs text-slate-400">{record.user.department}</p>
                    </td>
                    <td className="font-mono text-sm" suppressHydrationWarning>{checkIn ? format(checkIn, "HH:mm:ss") : "—"}</td>
                    <td className="font-mono text-sm" suppressHydrationWarning>{checkOut ? format(checkOut, "HH:mm:ss") : "—"}</td>
                    <td className="text-slate-500">{duration}</td>
                    <td>
                      <span className={cn("badge", getStatusColor(record.status))}>
                        {getStatusLabel(record.status)}
                      </span>
                    </td>
                    <td className="text-sm">
                      {record.lateMinutes > 0 ? (
                        <span className="text-amber-600 font-medium">+{record.lateMinutes}m</span>
                      ) : "—"}
                    </td>
                    <td className="text-xs font-mono text-slate-400">{record.checkInIp || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
