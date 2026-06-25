// src/components/admin/EditEmployeeForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface EditEmployeeFormProps {
  employee: any;
  companySchedule: any;
  salaryRules: any;
}

export function EditEmployeeForm({ employee, companySchedule, salaryRules }: EditEmployeeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"profile" | "schedule" | "salary">("profile");
  const [salaryBreakup, setSalaryBreakup] = useState<any>(null);
  const [breakupLoading, setBreakupLoading] = useState(false);

  // Profile form
  const [profile, setProfile] = useState({
    name: employee.name || "",
    designation: employee.designation || "",
    department: employee.department || "",
    phone: employee.phone || "",
    role: employee.role || "EMPLOYEE",
    employmentType: employee.employmentType || "FULL_TIME",
    isActive: employee.isActive,
  });

  // Schedule form — use custom if exists, else company defaults
  const sched = employee.customSchedule || companySchedule || {};
  const [schedule, setSchedule] = useState({
    enabled: !!employee.customSchedule,
    startTime: sched.startTime || "11:00",
    endTime: sched.endTime || "20:00",
    lateAfter: sched.lateAfter || "11:15",
    halfDayAfter: sched.halfDayAfter || "14:00",
    monday: sched.monday ?? true,
    tuesday: sched.tuesday ?? true,
    wednesday: sched.wednesday ?? true,
    thursday: sched.thursday ?? true,
    friday: sched.friday ?? true,
    saturday: sched.saturday ?? false,
    sunday: sched.sunday ?? false,
    note: employee.customSchedule?.note || "",
  });

  // Salary form
  const so = employee.salaryRuleOverride || {};
  const [salary, setSalary] = useState({
    enabled: !!employee.salaryRuleOverride,
    baseSalary: so.baseSalary?.toString() || "",
    halfDayDeductionFactor: so.halfDayDeductionFactor?.toString() || (salaryRules?.halfDayDeductionFactor?.toString() || "0.5"),
    absentDeductionFactor: so.absentDeductionFactor?.toString() || (salaryRules?.absentDeductionFactor?.toString() || "1"),
    paidLeaveDaysPerMonth: so.paidLeaveDaysPerMonth?.toString() || (salaryRules?.paidLeaveDaysPerMonth?.toString() || "1"),
    note: so.note || "",
  });

  const saveProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Profile updated");
        router.refresh();
      }
      else toast.error(data.error || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const setEmployeeStatus = async (active: boolean) => {
    if (!confirm(active ? `Reactivate ${employee.name}?` : `Deactivate ${employee.name}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: active }),
      });
      if (res.ok) {
        toast.success(active ? "Employee reactivated" : "Employee deactivated");
        setProfile(p => ({ ...p, isActive: active }));
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const hardDeleteEmployee = async () => {
    if (!confirm(`Permanently delete ${employee.name}? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/hard-delete`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`Deleted ${employee.name}`);
        router.push("/admin/employees");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryBreakup = async () => {
    setBreakupLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/salary`);
      const data = await res.json();
      if (data.success) setSalaryBreakup(data.data);
      else toast.error(data.error || "Failed to load salary breakup");
    } finally {
      setBreakupLoading(false);
    }
  };

  if (tab === "salary" && !salaryBreakup && !breakupLoading) {
    fetchSalaryBreakup();
  }

  const saveSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/schedule`, {
        method: schedule.enabled ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: schedule.enabled ? JSON.stringify(schedule) : undefined,
      });
      const data = await res.json();
      if (data.success) toast.success(schedule.enabled ? "Custom schedule saved" : "Reverted to company schedule");
      else toast.error(data.error || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const saveSalary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/salary`, {
        method: salary.enabled ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: salary.enabled ? JSON.stringify({
          baseSalary: parseFloat(salary.baseSalary) || null,
          halfDayDeductionFactor: parseFloat(salary.halfDayDeductionFactor),
          absentDeductionFactor: parseFloat(salary.absentDeductionFactor),
          paidLeaveDaysPerMonth: parseInt(salary.paidLeaveDaysPerMonth),
          note: salary.note,
        }) : undefined,
      });
      const data = await res.json();
      if (data.success) toast.success(salary.enabled ? "Salary override saved" : "Reverted to default");
      else toast.error(data.error || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <Link href="/admin/employees" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft size={14} />
          Back to employees
        </Link>
        <h1 className="page-title">{employee.name}</h1>
        <p className="page-subtitle">{employee.email} · {employee.employmentType.replace("_", " ")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["profile", "schedule", "salary"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === "profile" && (
        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={profile.role} onChange={e => setProfile(p => ({ ...p, role: e.target.value }))}>
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Department</label>
              <input className="input" value={profile.department} onChange={e => setProfile(p => ({ ...p, department: e.target.value }))} />
            </div>
            <div>
              <label className="label">Designation</label>
              <input className="input" value={profile.designation} onChange={e => setProfile(p => ({ ...p, designation: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Employment Type</label>
              <select className="input" value={profile.employmentType} onChange={e => setProfile(p => ({ ...p, employmentType: e.target.value }))}>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="INTERN">Intern</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 border-b border-slate-100 pb-4 mb-4">
            <button onClick={saveProfile} disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Profile
            </button>
            {profile.isActive ? (
              <button onClick={() => setEmployeeStatus(false)} disabled={loading} className="px-4 py-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-sm font-medium transition-colors">
                Deactivate
              </button>
            ) : (
              <button onClick={() => setEmployeeStatus(true)} disabled={loading} className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors">
                Reactivate
              </button>
            )}
            <button onClick={hardDeleteEmployee} disabled={loading} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5">
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Schedule tab */}
      {tab === "schedule" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-900">Custom Schedule</h3>
              <p className="text-sm text-slate-500">Override the company-wide default schedule</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={schedule.enabled} onChange={e => setSchedule(s => ({ ...s, enabled: e.target.checked }))} className="sr-only peer" />
              <div className="w-10 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>

          {schedule.enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Time</label>
                  <input type="time" className="input" value={schedule.startTime} onChange={e => setSchedule(s => ({ ...s, startTime: e.target.value }))} />
                </div>
                <div>
                  <label className="label">End Time</label>
                  <input type="time" className="input" value={schedule.endTime} onChange={e => setSchedule(s => ({ ...s, endTime: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Late After</label>
                  <input type="time" className="input" value={schedule.lateAfter} onChange={e => setSchedule(s => ({ ...s, lateAfter: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Half Day After</label>
                  <input type="time" className="input" value={schedule.halfDayAfter} onChange={e => setSchedule(s => ({ ...s, halfDayAfter: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="label">Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {days.map(day => (
                    <label key={day} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(schedule as any)[day]}
                        onChange={e => setSchedule(s => ({ ...s, [day]: e.target.checked }))}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600"
                      />
                      <span className="text-sm text-slate-700 capitalize">{day.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Note (optional)</label>
                <input className="input" placeholder="e.g. Intern schedule" value={schedule.note} onChange={e => setSchedule(s => ({ ...s, note: e.target.value }))} />
              </div>
            </>
          )}

          <button onClick={saveSchedule} disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {schedule.enabled ? "Save Custom Schedule" : "Revert to Company Default"}
          </button>
        </div>
      )}

      {/* Salary tab */}
      {tab === "salary" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-900">Salary Override</h3>
              <p className="text-sm text-slate-500">Override company-wide salary rules for this employee</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={salary.enabled} onChange={e => setSalary(s => ({ ...s, enabled: e.target.checked }))} className="sr-only peer" />
              <div className="w-10 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>

          {salary.enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Base Salary (₹/month)</label>
                  <input type="number" className="input" placeholder={`Default: ₹${salaryRules?.baseSalary || 0}`} value={salary.baseSalary} onChange={e => setSalary(s => ({ ...s, baseSalary: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Paid Leave Days/Month</label>
                  <input type="number" className="input" value={salary.paidLeaveDaysPerMonth} onChange={e => setSalary(s => ({ ...s, paidLeaveDaysPerMonth: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Half-Day Deduction Factor</label>
                  <input type="number" step="0.1" className="input" value={salary.halfDayDeductionFactor} onChange={e => setSalary(s => ({ ...s, halfDayDeductionFactor: e.target.value }))} />
                  <p className="text-xs text-slate-400 mt-1">0.5 = deduct half day's pay</p>
                </div>
                <div>
                  <label className="label">Absent Deduction Factor</label>
                  <input type="number" step="0.1" className="input" value={salary.absentDeductionFactor} onChange={e => setSalary(s => ({ ...s, absentDeductionFactor: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Note</label>
                <input className="input" placeholder="Reason for override..." value={salary.note} onChange={e => setSalary(s => ({ ...s, note: e.target.value }))} />
              </div>
            </>
          )}

          <button onClick={saveSalary} disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {salary.enabled ? "Save Salary Override" : "Use Company Default"}
          </button>

          {/* Salary Breakup */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-slate-900">Current Month Salary Breakup</h3>
              <button onClick={fetchSalaryBreakup} className="text-sm text-blue-600 hover:text-blue-700">Refresh</button>
            </div>
            
            {breakupLoading ? (
              <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading breakup...</div>
            ) : salaryBreakup ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-white">
                      <td className="px-4 py-3 font-medium text-slate-700">Base Salary</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-900">₹{salaryBreakup.baseSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-slate-600">Total Working Days</td>
                      <td className="px-4 py-3 text-right font-mono">{salaryBreakup.totalWorkingDays}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-4 py-3 text-slate-600">Per Day Rate</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">₹{salaryBreakup.perDayRate.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-slate-600">Days Present (Full)</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">{salaryBreakup.presentFullDays}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-4 py-3 text-slate-600">Days Half</td>
                      <td className="px-4 py-3 text-right font-mono text-orange-600">{salaryBreakup.halfDays}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-slate-600">Days Late</td>
                      <td className="px-4 py-3 text-right font-mono text-amber-600">{salaryBreakup.lateDays}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-4 py-3 text-slate-600">Late Penalty Deductions (Days)</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">-{salaryBreakup.latePenalty}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-slate-600">Days Absent</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">{salaryBreakup.absentDays}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-4 py-3 text-slate-600">Effective Days Worked</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-900">{salaryBreakup.daysWorked}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-slate-600">Paid Leaves Utilized</td>
                      <td className="px-4 py-3 text-right font-mono text-blue-600">{salaryBreakup.paidLeavesUtilized} / {salaryBreakup.paidLeavesAllowed}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-4 py-3 font-semibold text-slate-900">Total Payable Days</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">{salaryBreakup.totalPaidDays}</td>
                    </tr>
                    <tr className="bg-slate-100">
                      <td className="px-4 py-4 font-bold text-slate-900 text-base">Net Earned So Far</td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-emerald-700 text-lg">₹{salaryBreakup.netEarned.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">No salary rules configured.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
