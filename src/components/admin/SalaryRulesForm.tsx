// src/components/admin/SalaryRulesForm.tsx
"use client";
import { useState } from "react";
import { Save, Loader2, DollarSign, Info } from "lucide-react";
import toast from "react-hot-toast";

interface Props { rules: any | null; }

export function SalaryRulesForm({ rules }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    baseSalary: rules?.baseSalary?.toString() || "0",
    halfDayDeductionFactor: rules?.halfDayDeductionFactor?.toString() || "0.5",
    lateDeductionPerDay: rules?.lateDeductionPerDay?.toString() || "0",
    absentDeductionFactor: rules?.absentDeductionFactor?.toString() || "1",
    paidLeaveDaysPerMonth: rules?.paidLeaveDaysPerMonth?.toString() || "1",
    note: rules?.note || "",
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/salary-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseSalary: parseFloat(form.baseSalary),
          halfDayDeductionFactor: parseFloat(form.halfDayDeductionFactor),
          lateDeductionPerDay: parseFloat(form.lateDeductionPerDay),
          absentDeductionFactor: parseFloat(form.absentDeductionFactor),
          paidLeaveDaysPerMonth: parseInt(form.paidLeaveDaysPerMonth),
          note: form.note,
        }),
      });
      const data = await res.json();
      if (data.success) toast.success("Salary rules saved");
      else toast.error(data.error || "Failed");
    } finally { setLoading(false); }
  };

  // Example calculation preview
  const baseSalaryPreview = parseFloat(form.baseSalary) || 0;
  const payableDays = 26;
  const perDay = baseSalaryPreview / payableDays;
  const exampleDeduction = (1 * parseFloat(form.absentDeductionFactor) + 1 * parseFloat(form.halfDayDeductionFactor)) * perDay;
  const exampleNet = baseSalaryPreview - exampleDeduction;

  return (
    <div className="space-y-4">
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <DollarSign size={18} className="text-blue-500" />
          <h3 className="font-semibold text-slate-900">Default Salary Formula</h3>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 space-y-1">
          <p className="font-semibold">Formula: Net = Base Salary × (Effective Days / Payable Working Days)</p>
          <p className="text-blue-600">Payable working days excludes Sundays, non-working Saturdays, and holidays.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Default Base Salary (₹/month)</label>
            <input type="number" min="0" className="input" value={form.baseSalary}
              onChange={e => setForm(f => ({ ...f, baseSalary: e.target.value }))} />
            <p className="text-xs text-slate-400 mt-1">Company-wide default base salary</p>
          </div>
          <div>
            <label className="label">Absent Deduction Factor</label>
            <input type="number" step="0.1" min="0" max="2" className="input" value={form.absentDeductionFactor}
              onChange={e => setForm(f => ({ ...f, absentDeductionFactor: e.target.value }))} />
            <p className="text-xs text-slate-400 mt-1">1.0 = deduct one full day's pay per absent day</p>
          </div>
          <div>
            <label className="label">Half-Day Deduction Factor</label>
            <input type="number" step="0.1" min="0" max="1" className="input" value={form.halfDayDeductionFactor}
              onChange={e => setForm(f => ({ ...f, halfDayDeductionFactor: e.target.value }))} />
            <p className="text-xs text-slate-400 mt-1">0.5 = deduct half a day's pay per half-day</p>
          </div>
          <div>
            <label className="label">Late Deduction Per Day (₹)</label>
            <input type="number" step="50" min="0" className="input" value={form.lateDeductionPerDay}
              onChange={e => setForm(f => ({ ...f, lateDeductionPerDay: e.target.value }))} />
            <p className="text-xs text-slate-400 mt-1">Fixed amount deducted per late day (0 = no deduction)</p>
          </div>
          <div>
            <label className="label">Paid Leave Days / Month</label>
            <input type="number" min="0" max="30" className="input" value={form.paidLeaveDaysPerMonth}
              onChange={e => setForm(f => ({ ...f, paidLeaveDaysPerMonth: e.target.value }))} />
            <p className="text-xs text-slate-400 mt-1">Absent days up to this count are paid (casual leave)</p>
          </div>
        </div>

        <div>
          <label className="label">Notes / Formula Description</label>
          <textarea className="input" rows={3} value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="e.g. Standard salary policy — basic salary divided by payable working days..." />
        </div>

        <button onClick={handleSave} disabled={loading} className="btn-primary">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Rules
        </button>
      </div>

      {/* Live preview */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info size={16} className="text-slate-400" />
          <h3 className="font-semibold text-slate-900 text-sm">Example Calculation Preview</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          For an employee with ₹{baseSalaryPreview.toLocaleString()} base salary, 26 payable working days, 1 absent day, and 1 half-day:
        </p>
        <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1 font-mono">
          <p>Base Salary: <span className="text-slate-900 font-semibold">₹{baseSalaryPreview.toLocaleString()}</span></p>
          <p>Per Day Rate: <span className="text-slate-900">₹{perDay.toFixed(2)}</span></p>
          <p>Absent Deduction (1 day × {form.absentDeductionFactor}): <span className="text-red-600">-₹{(1 * parseFloat(form.absentDeductionFactor) * perDay).toFixed(2)}</span></p>
          <p>Half-Day Deduction (1 × {form.halfDayDeductionFactor}): <span className="text-orange-600">-₹{(1 * parseFloat(form.halfDayDeductionFactor) * perDay).toFixed(2)}</span></p>
          <div className="border-t border-slate-200 pt-1 mt-1">
            <p>Net Salary: <span className="text-emerald-600 font-bold">₹{exampleNet.toFixed(2)}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
