// src/components/admin/PayrollClient.tsx
"use client";

import { useState, useEffect } from "react";
import { Download, Filter, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface PayrollRow {
  employeeId: string;
  name: string;
  department: string | null;
  designation: string | null;
  employmentType: string;
  salaryRuleName: string;
  baseSalary: number;
  totalWorkingDays: number;
  workedDays: number;
  presentFull: number;
  lateDays: number;
  halfDays: number;
  absentDays: number;
  onLeaveDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  lateDeduction: number;
  halfDayDeduction: number;
  absentDeduction: number;
  unpaidLeaveDeduction: number;
  totalDeductions: number;
  netSalary: number;
  currency: string;
  error?: string;
}

interface Props {
  employees: Array<{ id: string; name: string; department: string | null }>;
  year: number;
  month: number;
  department: string;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function PayrollClient({ employees, year, month, department }: Props) {
  const [data, setData] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [localYear, setLocalYear] = useState(year);
  const [localMonth, setLocalMonth] = useState(month);
  const [localDept, setLocalDept] = useState(department);
  const [localEmpId, setLocalEmpId] = useState("");
  const [exporting, setExporting] = useState(false);

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[];

  const fetchPayroll = async (y = localYear, m = localMonth, dept = localDept, empId = localEmpId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: String(y), month: String(m),
        ...(dept && { department: dept }),
        ...(empId && { userId: empId }),
      });
      const res = await fetch(`/api/payroll?${params}`);
      if (!res.ok) throw new Error("Failed to load payroll");
      const json = await res.json();
      setData(json.results || []);
    } catch (e) {
      toast.error("Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayroll(); }, []);

  const prevMonth = () => {
    const [ny, nm] = localMonth === 1 ? [localYear - 1, 12] : [localYear, localMonth - 1];
    setLocalYear(ny); setLocalMonth(nm);
    fetchPayroll(ny, nm);
  };

  const nextMonth = () => {
    const [ny, nm] = localMonth === 12 ? [localYear + 1, 1] : [localYear, localMonth + 1];
    setLocalYear(ny); setLocalMonth(nm);
    fetchPayroll(ny, nm);
  };

  const applyFilters = () => fetchPayroll(localYear, localMonth, localDept, localEmpId);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        year: String(localYear), month: String(localMonth),
        ...(localDept && { department: localDept }),
      });
      const res = await fetch(`/api/payroll/export?${params}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll_${localYear}_${String(localMonth).padStart(2, "0")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Payroll exported");
    } catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  };

  // Totals
  const totals = data.filter(r => !r.error).reduce((acc, r) => ({
    baseSalary: acc.baseSalary + r.baseSalary,
    totalDeductions: acc.totalDeductions + r.totalDeductions,
    netSalary: acc.netSalary + r.netSalary,
  }), { baseSalary: 0, totalDeductions: 0, netSalary: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">{MONTHS[localMonth - 1]} {localYear} · Calculated from attendance, leave, and salary rules</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchPayroll()} disabled={loading} className="btn-secondary text-sm">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Recalculate
          </button>
          <button onClick={handleExport} disabled={exporting} className="btn-secondary text-sm">
            <Download size={14} />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Month navigation */}
          <div>
            <label className="label text-xs">Period</label>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"><ChevronLeft size={16} /></button>
              <span className="font-medium text-slate-900 min-w-[130px] text-center text-sm">{MONTHS[localMonth - 1]} {localYear}</span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div>
            <label className="label text-xs">Employee</label>
            <select className="input !w-auto text-sm" value={localEmpId} onChange={e => setLocalEmpId(e.target.value)}>
              <option value="">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Department</label>
            <select className="input !w-auto text-sm" value={localDept} onChange={e => setLocalDept(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button onClick={applyFilters} className="btn-primary text-sm py-2">
            <Filter size={14} />Apply
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Base Salary", value: `₹${totals.baseSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "text-slate-900" },
          { label: "Total Deductions", value: `₹${totals.totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "text-red-600" },
          { label: "Total Net Payable", value: `₹${totals.netSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "text-emerald-600" },
        ].map(card => (
          <div key={card.label} className="card p-5">
            <p className={cn("text-2xl font-bold", card.color)}>{card.value}</p>
            <p className="text-sm text-slate-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Payroll table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            Calculating payroll…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Salary Rule</th>
                  <th>Base</th>
                  <th>Working Days</th>
                  <th>Worked</th>
                  <th>Present</th>
                  <th>Late</th>
                  <th>Half Day</th>
                  <th>Absent</th>
                  <th>Paid Leave</th>
                  <th>Unpaid Leave</th>
                  <th>Deductions</th>
                  <th>Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan={13} className="text-center py-12 text-slate-400">No employees found</td></tr>
                )}
                {data.map(row => (
                  <tr key={row.employeeId}>
                    <td>
                      <p className="font-medium text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-400">{row.department} · {row.employmentType?.replace("_", " ")}</p>
                    </td>
                    <td>
                      {row.error ? (
                        <span className="text-xs text-red-500">{row.error}</span>
                      ) : (
                        <span className="badge text-slate-600 bg-slate-100 text-xs">{row.salaryRuleName}</span>
                      )}
                    </td>
                    <td className="font-medium">₹{(row.baseSalary || 0).toLocaleString()}</td>
                    <td className="text-center">{row.totalWorkingDays ?? "—"}</td>
                    <td className="text-center font-medium text-slate-700">{row.workedDays ?? "—"}</td>
                    <td className="text-center text-emerald-600">{row.presentFull ?? "—"}</td>
                    <td className="text-center text-amber-600">{row.lateDays ?? "—"}</td>
                    <td className="text-center text-orange-600">{row.halfDays ?? "—"}</td>
                    <td className="text-center text-red-600">{row.absentDays ?? "—"}</td>
                    <td className="text-center text-blue-600">{row.paidLeaveDays ?? "—"}</td>
                    <td className="text-center text-purple-600">{row.unpaidLeaveDays ?? "—"}</td>
                    <td className="text-red-600 font-medium">
                      {row.error ? "—" : `₹${(row.totalDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    </td>
                    <td className="font-bold text-emerald-700">
                      {row.error ? "—" : `₹${(row.netSalary || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    </td>
                  </tr>
                ))}
              </tbody>
              {data.length > 0 && !data.some(r => r.error) && (
                <tfoot>
                  <tr className="bg-slate-50 font-semibold">
                    <td colSpan={11} className="px-4 py-3 text-right text-slate-700">Total</td>
                    <td className="px-4 py-3 text-red-600">₹{totals.totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3 text-emerald-700">₹{totals.netSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
