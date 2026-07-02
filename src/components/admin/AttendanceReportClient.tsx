// src/components/admin/AttendanceReportClient.tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, startOfMonth, endOfMonth } from "date-fns";
import {
  Download, Filter, ChevronLeft, ChevronRight, ChevronDown,
  X, Calendar, LayoutList, BarChart2
} from "lucide-react";
import { cn, getStatusColor, getStatusLabel } from "@/lib/utils";
import { MultiSelect } from "@/components/ui/MultiSelect";
import toast from "react-hot-toast";

interface Employee {
  id: string;
  name: string;
  department: string | null;
  designation: string | null;
  employmentType: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  hoursWorked: number | null;
  status: string;
  isLate: boolean;
  lateMinutes: number;
  isHalfDay: boolean;
  checkInIp: string | null;
  overrideNote: string | null;
  user: { id: string; name: string; department: string | null; designation: string | null; employmentType: string };
}

interface Props {
  employees: Employee[];
  records: AttendanceRecord[];
  year: number;
  month: number;
  selectedUserId: string;
  selectedDept: string;
  selectedStatus: string;
  selectedEmploymentType: string;
  viewMode: "day" | "week" | "month";
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const STATUSES = ["PRESENT","LATE","HALF_DAY","ABSENT","ON_LEAVE","HOLIDAY","WEEKEND"];
const EMPLOYMENT_TYPES = ["FULL_TIME","PART_TIME","INTERN","CONTRACT"];

export function AttendanceReportClient({
  employees, records, year, month,
  selectedUserId, selectedDept, selectedStatus, selectedEmploymentType, viewMode
}: Props) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<string[]>(selectedStatus ? selectedStatus.split(",") : []);
  const [localDept, setLocalDept] = useState<string[]>(selectedDept ? selectedDept.split(",") : []);
  const [localEmpType, setLocalEmpType] = useState<string[]>(selectedEmploymentType ? selectedEmploymentType.split(",") : []);
  const [localUserId, setLocalUserId] = useState<string[]>(selectedUserId ? selectedUserId.split(",") : []);
  const [localView, setLocalView] = useState<"day" | "week" | "month">(viewMode);

  // Build navigation URL
  const buildUrl = useCallback((overrides: Record<string, string> = {}) => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      ...(localUserId.length > 0 && { userId: localUserId.join(",") }),
      ...(localDept.length > 0 && { dept: localDept.join(",") }),
      ...(localStatus.length > 0 && { status: localStatus.join(",") }),
      ...(localEmpType.length > 0 && { empType: localEmpType.join(",") }),
      view: localView,
      ...overrides,
    });
    // Remove empty params
    [...params.entries()].forEach(([k, v]) => { if (!v) params.delete(k); });
    return `/admin/attendance?${params}`;
  }, [year, month, localUserId, localDept, localStatus, localEmpType, localView]);

  const navigate = (overrides: Record<string, string> = {}) => {
    router.push(buildUrl(overrides));
  };

  const applyFilters = () => navigate({
    userId: localUserId.join(","),
    dept: localDept.join(","),
    status: localStatus.join(","),
    empType: localEmpType.join(","),
    view: localView,
  });

  const clearFilters = () => {
    setLocalUserId([]);
    setLocalDept([]);
    setLocalStatus([]);
    setLocalEmpType([]);
    router.push(`/admin/attendance?year=${year}&month=${month}&view=${localView}`);
  };

  const prevMonth = () => {
    const [ny, nm] = month === 1 ? [year - 1, 12] : [year, month - 1];
    navigate({ year: String(ny), month: String(nm) });
  };
  const nextMonth = () => {
    const [ny, nm] = month === 12 ? [year + 1, 1] : [year, month + 1];
    navigate({ year: String(ny), month: String(nm) });
  };



  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        year: String(year), month: String(month),
        ...(selectedUserId && { userId: selectedUserId }),
        ...(selectedDept && { dept: selectedDept }),
        ...(selectedStatus && { status: selectedStatus }),
      });
      const res = await fetch(`/api/reports/export?${params}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `attendance_${year}_${String(month).padStart(2, "0")}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Report exported");
    } catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/attendance/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
      router.refresh();
    } catch { toast.error("Failed to update status"); }
    finally { setUpdatingId(null); }
  };

  // Active filter chips
  const activeFilters = [
    ...localUserId.map(id => ({ key: `userId-${id}`, type: "userId", val: id, label: `Employee: ${employees.find(e => e.id === id)?.name}` })),
    ...localDept.map(d => ({ key: `dept-${d}`, type: "dept", val: d, label: `Dept: ${d}` })),
    ...localStatus.map(s => ({ key: `status-${s}`, type: "status", val: s, label: `Status: ${getStatusLabel(s)}` })),
    ...localEmpType.map(t => ({ key: `empType-${t}`, type: "empType", val: t, label: `Type: ${t.replace("_", " ")}` })),
  ];

  const removeFilter = (key: string, type: string, val: string) => {
    let newUserId = localUserId;
    let newDept = localDept;
    let newStatus = localStatus;
    let newEmpType = localEmpType;

    if (type === "userId") { newUserId = localUserId.filter(v => v !== val); setLocalUserId(newUserId); }
    if (type === "dept") { newDept = localDept.filter(v => v !== val); setLocalDept(newDept); }
    if (type === "status") { newStatus = localStatus.filter(v => v !== val); setLocalStatus(newStatus); }
    if (type === "empType") { newEmpType = localEmpType.filter(v => v !== val); setLocalEmpType(newEmpType); }
    
    navigate({
      userId: newUserId.join(","),
      dept: newDept.join(","),
      status: newStatus.join(","),
      empType: newEmpType.join(","),
    });
  };

  // Summary stats
  const stats = useMemo(() => ({
    total: records.length,
    present: records.filter(r => r.status === "PRESENT").length,
    late: records.filter(r => r.status === "LATE").length,
    halfDay: records.filter(r => r.status === "HALF_DAY").length,
    absent: records.filter(r => r.status === "ABSENT").length,
    onLeave: records.filter(r => r.status === "ON_LEAVE").length,
    avgHours: records.filter(r => r.hoursWorked != null).length > 0
      ? (records.filter(r => r.hoursWorked != null).reduce((s, r) => s + (r.hoursWorked ?? 0), 0) /
         records.filter(r => r.hoursWorked != null).length).toFixed(1)
      : "—",
  }), [records]);

  // Departments from employees list
  const departments = useMemo(() => {
    const all = employees.map(e => e.department).filter(Boolean) as string[];
    return [...new Set(all)].sort();
  }, [employees]);

  // ─── Week view ───────────────────────────────────────────────
  const weekView = useMemo(() => {
    if (localView !== "week") return [];
    const monthStart = startOfMonth(new Date(year, month - 1, 1));
    const monthEnd = endOfMonth(monthStart);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekRecords = records.filter((r) => {
        const d = new Date(r.date);
        return d >= weekStart && d <= weekEnd;
      });

      // Group by employee
      const byEmployee = new Map<string, { name: string; dept: string | null; records: AttendanceRecord[] }>();
      for (const r of weekRecords) {
        const key = r.user.id;
        if (!byEmployee.has(key)) byEmployee.set(key, { name: r.user.name, dept: r.user.department, records: [] });
        byEmployee.get(key)!.records.push(r);
      }

      return {
        weekLabel: `${format(weekStart, "MMM dd")} – ${format(weekEnd, "MMM dd")}`,
        employees: [...byEmployee.entries()].map(([uid, data]) => ({
          userId: uid,
          name: data.name,
          dept: data.dept,
          present: data.records.filter(r => r.status === "PRESENT").length,
          late: data.records.filter(r => r.status === "LATE").length,
          halfDay: data.records.filter(r => r.status === "HALF_DAY").length,
          absent: data.records.filter(r => r.status === "ABSENT").length,
          onLeave: data.records.filter(r => r.status === "ON_LEAVE").length,
          totalHours: data.records.reduce((s, r) => s + (r.hoursWorked ?? 0), 0).toFixed(1),
        })),
      };
    });
  }, [records, year, month, localView]);

  // ─── Month summary view ────────────────────────────────────
  const monthSummary = useMemo(() => {
    if (localView !== "month") return [];
    const byEmployee = new Map<string, { name: string; dept: string | null; empType: string; records: AttendanceRecord[] }>();
    for (const r of records) {
      const key = r.user.id;
      if (!byEmployee.has(key)) byEmployee.set(key, { name: r.user.name, dept: r.user.department, empType: r.user.employmentType, records: [] });
      byEmployee.get(key)!.records.push(r);
    }
    return [...byEmployee.entries()].map(([uid, data]) => ({
      userId: uid,
      name: data.name,
      dept: data.dept,
      empType: data.empType,
      present: data.records.filter(r => r.status === "PRESENT").length,
      late: data.records.filter(r => r.status === "LATE").length,
      halfDay: data.records.filter(r => r.status === "HALF_DAY").length,
      absent: data.records.filter(r => r.status === "ABSENT").length,
      onLeave: data.records.filter(r => r.status === "ON_LEAVE").length,
      totalHours: data.records.reduce((s, r) => s + (r.hoursWorked ?? 0), 0).toFixed(1),
    }));
  }, [records, localView]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Attendance Report</h1>
          <p className="page-subtitle">{MONTHS[month - 1]} {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting} className="btn-secondary text-sm">
            <Download size={14} />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="card p-4 space-y-3">
        {/* Row 1: Month nav + Quick filters + View mode */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month navigation */}
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft size={16} /></button>
            <span className="font-medium text-slate-900 min-w-[110px] text-center text-sm">{MONTHS[month - 1]} {year}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight size={16} /></button>
          </div>



          {/* View mode */}
          <div className="flex items-center gap-1 ml-auto">
            {([
              { mode: "day", icon: LayoutList, label: "Day" },
              { mode: "week", icon: Calendar, label: "Week" },
              { mode: "month", icon: BarChart2, label: "Month" },
            ] as const).map(({ mode, icon: Icon, label }) => (
              <button key={mode} onClick={() => { setLocalView(mode); navigate({ view: mode }); }}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  localView === mode ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50")}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Dropdowns */}
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="label text-xs mb-1 block">Employee</label>
            <MultiSelect
              options={employees.map(e => ({ label: e.name, value: e.id }))}
              value={localUserId}
              onChange={setLocalUserId}
              placeholder="All Employees"
            />
          </div>
          <div>
            <label className="label text-xs mb-1 block">Department</label>
            <MultiSelect
              options={departments.map(d => ({ label: d, value: d }))}
              value={localDept}
              onChange={setLocalDept}
              placeholder="All Departments"
            />
          </div>
          <div>
            <label className="label text-xs mb-1 block">Employment Type</label>
            <MultiSelect
              options={EMPLOYMENT_TYPES.map(t => ({ label: t.replace("_", " "), value: t }))}
              value={localEmpType}
              onChange={setLocalEmpType}
              placeholder="All Types"
            />
          </div>
          <div>
            <label className="label text-xs mb-1 block">Status</label>
            <MultiSelect
              options={STATUSES.map(s => ({ label: getStatusLabel(s), value: s }))}
              value={localStatus}
              onChange={setLocalStatus}
              placeholder="All Statuses"
            />
          </div>
          <button onClick={applyFilters} className="btn-primary text-sm py-2">
            <Filter size={14} />Apply
          </button>
          {activeFilters.length > 0 && (
            <button onClick={clearFilters} className="btn-secondary text-sm py-2 text-slate-500">
              <X size={14} />Clear All
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map(f => (
              <span key={f.key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                {f.label}
                <button onClick={() => removeFilter(f.key, f.type, f.val)} className="hover:text-blue-900 transition-colors">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        {[
          { label: "Total Records", value: stats.total, color: "text-slate-900" },
          { label: "Present", value: stats.present, color: "text-emerald-600" },
          { label: "Late", value: stats.late, color: "text-amber-600" },
          { label: "Half Day", value: stats.halfDay, color: "text-orange-600" },
          { label: "Absent", value: stats.absent, color: "text-red-600" },
          { label: "On Leave", value: stats.onLeave, color: "text-blue-600" },
          { label: "Avg Hours", value: stats.avgHours, color: "text-purple-600" },
        ].map(stat => (
          <div key={stat.label} className="card p-3 text-center">
            <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ─── DAY VIEW ─── */}
      {localView === "day" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                  <th>Late By</th>
                  <th>IP</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400">No records for this period</td></tr>
                )}
                {records.map(record => {
                  const checkIn = record.checkInAt ? new Date(record.checkInAt) : null;
                  const checkOut = record.checkOutAt ? new Date(record.checkOutAt) : null;
                  const hoursStr = record.hoursWorked != null
                    ? `${record.hoursWorked.toFixed(1)}h`
                    : checkIn && !checkOut ? "In Progress" : "—";

                  return (
                    <tr key={record.id}>
                      <td className="font-medium" suppressHydrationWarning>{format(new Date(record.date), "dd MMM, EEE")}</td>
                      <td>
                        <p className="font-medium text-slate-900">{record.user.name}</p>
                        <p className="text-xs text-slate-400">{record.user.department}</p>
                      </td>
                      <td className="font-mono text-sm" suppressHydrationWarning>{checkIn ? format(checkIn, "HH:mm:ss") : "—"}</td>
                      <td className="font-mono text-sm" suppressHydrationWarning>{checkOut ? format(checkOut, "HH:mm:ss") : "—"}</td>
                      <td className={cn("text-sm font-medium",
                        record.hoursWorked != null && record.hoursWorked >= 7.5 ? "text-emerald-600" :
                        record.hoursWorked != null && record.hoursWorked >= 4 ? "text-amber-600" :
                        record.hoursWorked != null ? "text-red-600" : "text-slate-400")}>
                        {hoursStr}
                      </td>
                      <td>
                        <div className="relative">
                          <select value={record.status}
                            onChange={(e) => handleStatusChange(record.id, e.target.value)}
                            disabled={updatingId === record.id}
                            className={cn("badge appearance-none cursor-pointer pr-5 border-transparent focus:ring-2 focus:ring-blue-500",
                              getStatusColor(record.status), updatingId === record.id && "opacity-50")}>
                            <option value="PRESENT">Present</option>
                            <option value="LATE">Late</option>
                            <option value="HALF_DAY">Half Day</option>
                            <option value="ABSENT">Absent</option>
                            <option value="ON_LEAVE">On Leave</option>
                          </select>
                          <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                        </div>
                      </td>
                      <td className="text-sm">{record.lateMinutes > 0 ? <span className="text-amber-600 font-medium">+{record.lateMinutes}m</span> : "—"}</td>
                      <td className="text-xs font-mono text-slate-400">{record.checkInIp || "—"}</td>
                      <td className="text-xs text-slate-400 max-w-[120px] truncate" title={record.overrideNote || ""}>{record.overrideNote || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── WEEK VIEW ─── */}
      {localView === "week" && (
        <div className="space-y-4">
          {weekView.length === 0 && (
            <div className="card p-12 text-center text-slate-400">No records for this period</div>
          )}
          {weekView.map((week) => (
            <div key={week.weekLabel} className="card overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">{week.weekLabel}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Present</th>
                      <th>Late</th>
                      <th>Half Day</th>
                      <th>Absent</th>
                      <th>On Leave</th>
                      <th>Total Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.employees.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-6 text-slate-400">No records</td></tr>
                    )}
                    {week.employees.map(emp => (
                      <tr key={emp.userId}>
                        <td>
                          <p className="font-medium text-slate-900">{emp.name}</p>
                          <p className="text-xs text-slate-400">{emp.dept}</p>
                        </td>
                        <td><span className="font-semibold text-emerald-600">{emp.present}</span></td>
                        <td><span className="font-semibold text-amber-600">{emp.late}</span></td>
                        <td><span className="font-semibold text-orange-600">{emp.halfDay}</span></td>
                        <td><span className="font-semibold text-red-600">{emp.absent}</span></td>
                        <td><span className="font-semibold text-blue-600">{emp.onLeave}</span></td>
                        <td><span className="font-semibold text-purple-600">{emp.totalHours}h</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MONTH SUMMARY VIEW ─── */}
      {localView === "month" && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Monthly Summary — {MONTHS[month - 1]} {year}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Present</th>
                  <th>Late</th>
                  <th>Half Day</th>
                  <th>Absent</th>
                  <th>On Leave</th>
                  <th>Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {monthSummary.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">No records for this month</td></tr>
                )}
                {monthSummary.map(emp => (
                  <tr key={emp.userId}>
                    <td>
                      <p className="font-medium text-slate-900">{emp.name}</p>
                      <p className="text-xs text-slate-400">{emp.dept}</p>
                    </td>
                    <td><span className="badge text-slate-600 bg-slate-100 text-xs">{emp.empType.replace("_", " ")}</span></td>
                    <td><span className="font-semibold text-emerald-600">{emp.present}</span></td>
                    <td><span className="font-semibold text-amber-600">{emp.late}</span></td>
                    <td><span className="font-semibold text-orange-600">{emp.halfDay}</span></td>
                    <td><span className="font-semibold text-red-600">{emp.absent}</span></td>
                    <td><span className="font-semibold text-blue-600">{emp.onLeave}</span></td>
                    <td><span className="font-semibold text-purple-600">{emp.totalHours}h</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
