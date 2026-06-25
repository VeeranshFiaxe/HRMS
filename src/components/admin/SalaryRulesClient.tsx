// src/components/admin/SalaryRulesClient.tsx
"use client";

import { useState } from "react";
import { Plus, DollarSign, Save, Loader2, Trash2, CheckCircle2, Copy, Info } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Props { initialRules: any[]; }

export function SalaryRulesClient({ initialRules }: Props) {
  const router = useRouter();
  const [rules, setRules] = useState<any[]>(initialRules);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (baseRule?: any) => {
    setLoading(true);
    try {
      const payload = baseRule ? {
        ...baseRule,
        id: undefined,
        name: baseRule.name + " (Copy)",
        isDefault: false
      } : {
        name: "New Salary Rule",
        baseSalary: 0,
        halfDayDeductionFactor: 0.5,
        lateDeductionPerDay: 0,
        absentDeductionFactor: 1,
        paidLeaveDaysPerMonth: 1,
        note: ""
      };

      const res = await fetch("/api/salary-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setRules(prev => [...prev, data.data]);
        setExpandedId(data.data.id);
        toast.success("Salary rule created");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to create rule");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, updates: any) => {
    setLoading(true);
    try {
      // Parse floats to avoid string saving in db
      const payload = {
        ...updates,
        baseSalary: parseFloat(updates.baseSalary) || 0,
        halfDayDeductionFactor: parseFloat(updates.halfDayDeductionFactor) || 0,
        lateDeductionPerDay: parseFloat(updates.lateDeductionPerDay) || 0,
        absentDeductionFactor: parseFloat(updates.absentDeductionFactor) || 0,
        paidLeaveDaysPerMonth: parseInt(updates.paidLeaveDaysPerMonth) || 0,
      };

      const res = await fetch(`/api/salary-rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setRules(prev => prev.map(r => r.id === id ? data.data : (payload.isDefault ? { ...r, isDefault: false } : r)));
        toast.success("Salary rule updated");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to update rule");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this salary rule?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/salary-rules/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setRules(prev => prev.filter(r => r.id !== id));
        if (expandedId === id) setExpandedId(null);
        toast.success("Salary rule deleted");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to delete rule");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateLocalRule = (id: string, field: string, value: any) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-slate-900">All Salary Rules</h2>
        <button onClick={() => handleCreate()} disabled={loading} className="btn-primary">
          <Plus size={16} /> Add Salary Rule
        </button>
      </div>

      <div className="space-y-4">
        {rules.length === 0 && (
          <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
            No salary rules defined. Click the button above to add one.
          </div>
        )}
        
        {rules.map(rule => {
          const isExpanded = expandedId === rule.id;
          
          // Preview logic for expanded state
          const baseSalaryPreview = parseFloat(rule.baseSalary) || 0;
          const payableDays = 26;
          const perDay = baseSalaryPreview / payableDays;
          const exampleDeduction = (1 * parseFloat(rule.absentDeductionFactor) + 1 * parseFloat(rule.halfDayDeductionFactor)) * perDay;
          const exampleNet = baseSalaryPreview - exampleDeduction;

          return (
            <div key={rule.id} className="card overflow-hidden transition-all duration-200">
              {/* Header / Summary Card */}
              <div 
                className={`p-5 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between ${isExpanded ? 'border-b border-slate-100 bg-slate-50/50' : ''}`}
                onClick={() => setExpandedId(isExpanded ? null : rule.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-lg ${rule.isDefault ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900">{rule.name}</h3>
                      {rule.isDefault && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide flex items-center gap-1">
                          <CheckCircle2 size={10} /> Default
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-3">
                      <span>Base: ₹{rule.baseSalary?.toLocaleString() || 0}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>{rule.paidLeaveDaysPerMonth} Paid Leaves</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCreate(rule); }} 
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Duplicate"
                  >
                    <Copy size={16} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(rule.id, e)} 
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Expanded Form */}
              {isExpanded && (
                <div className="p-6 bg-white space-y-5 animate-in slide-in-from-top-2 duration-200">
                  <div>
                    <label className="label">Rule Name</label>
                    <input className="input" value={rule.name} onChange={e => updateLocalRule(rule.id, 'name', e.target.value)} />
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 space-y-1">
                    <p className="font-semibold">Formula: Net = Base Salary × (Effective Days / Payable Working Days)</p>
                    <p className="text-blue-600">Payable working days excludes Sundays, non-working Saturdays, and holidays.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Default Base Salary (₹/month)</label>
                      <input type="number" min="0" className="input" value={rule.baseSalary} onChange={e => updateLocalRule(rule.id, 'baseSalary', e.target.value)} />
                      <p className="text-xs text-slate-400 mt-1">Rule default base salary</p>
                    </div>
                    <div>
                      <label className="label">Absent Deduction Factor</label>
                      <input type="number" step="0.1" min="0" max="2" className="input" value={rule.absentDeductionFactor} onChange={e => updateLocalRule(rule.id, 'absentDeductionFactor', e.target.value)} />
                      <p className="text-xs text-slate-400 mt-1">1.0 = deduct one full day's pay per absent day</p>
                    </div>
                    <div>
                      <label className="label">Half-Day Deduction Factor</label>
                      <input type="number" step="0.1" min="0" max="1" className="input" value={rule.halfDayDeductionFactor} onChange={e => updateLocalRule(rule.id, 'halfDayDeductionFactor', e.target.value)} />
                      <p className="text-xs text-slate-400 mt-1">0.5 = deduct half a day's pay per half-day</p>
                    </div>
                    <div>
                      <label className="label">Late Deduction Per Day (₹)</label>
                      <input type="number" step="50" min="0" className="input" value={rule.lateDeductionPerDay} onChange={e => updateLocalRule(rule.id, 'lateDeductionPerDay', e.target.value)} />
                      <p className="text-xs text-slate-400 mt-1">Fixed amount deducted per late day</p>
                    </div>
                    <div>
                      <label className="label">Paid Leave Days / Month</label>
                      <input type="number" min="0" max="30" className="input" value={rule.paidLeaveDaysPerMonth} onChange={e => updateLocalRule(rule.id, 'paidLeaveDaysPerMonth', e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className="label">Notes / Description</label>
                    <input className="input" value={rule.note || ""} onChange={e => updateLocalRule(rule.id, 'note', e.target.value)} placeholder="e.g. For contract staff..." />
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={14} className="text-slate-400" />
                      <h4 className="text-xs font-semibold text-slate-700">Preview: 26 payable days, 1 absent, 1 half-day</h4>
                    </div>
                    <div className="text-xs font-mono text-slate-600 flex justify-between">
                      <span>Base: ₹{baseSalaryPreview.toLocaleString()}</span>
                      <span>Absent: -₹{(1 * parseFloat(rule.absentDeductionFactor || 1) * perDay).toFixed(0)}</span>
                      <span>Half: -₹{(1 * parseFloat(rule.halfDayDeductionFactor || 0.5) * perDay).toFixed(0)}</span>
                      <span className="font-bold text-emerald-600">Net: ₹{exampleNet.toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={rule.isDefault} 
                        onChange={e => updateLocalRule(rule.id, 'isDefault', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Set as global default salary rule</span>
                    </label>
                    
                    <div className="flex gap-2">
                      <button onClick={() => setExpandedId(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
                      <button onClick={() => handleUpdate(rule.id, rule)} disabled={loading} className="btn-primary">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
