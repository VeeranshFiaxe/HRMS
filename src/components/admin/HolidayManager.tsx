// src/components/admin/HolidayManager.tsx
"use client";
import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, Loader2, PartyPopper } from "lucide-react";
import toast from "react-hot-toast";

interface Holiday { id: string; name: string; date: string; isOptional: boolean; }
interface Props { holidays: Holiday[]; }

export function HolidayManager({ holidays: initial }: Props) {
  const [holidays, setHolidays] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", isOptional: false });

  const handleAdd = async () => {
    if (!form.name || !form.date) { toast.error("Name and date required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setHolidays(h => [...h, data.data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setForm({ name: "", date: "", isOptional: false });
        toast.success("Holiday added");
      } else {
        toast.error(data.error || "Failed to add");
      }
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this holiday?")) return;
    const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setHolidays(h => h.filter(x => x.id !== id));
      toast.success("Holiday removed");
    } else {
      toast.error("Failed to remove");
    }
  };

  const currentYear = new Date().getFullYear();
  const thisYear = holidays.filter(h => new Date(h.date).getFullYear() === currentYear);
  const nextYear = holidays.filter(h => new Date(h.date).getFullYear() === currentYear + 1);

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Add Holiday</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="label">Holiday Name</label>
            <input className="input" placeholder="Diwali" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isOptional} onChange={e => setForm(f => ({ ...f, isOptional: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
          <span className="text-sm text-slate-700">Optional holiday (employees may choose to work)</span>
        </label>
        <button onClick={handleAdd} disabled={loading} className="btn-primary">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Add Holiday
        </button>
      </div>

      {/* Holiday lists */}
      {[{ year: currentYear, list: thisYear }, { year: currentYear + 1, list: nextYear }].map(({ year, list }) => list.length > 0 && (
        <div key={year} className="card overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700">{year}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {list.map(h => (
              <div key={h.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <PartyPopper size={14} className="text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{h.name}</p>
                  <p className="text-xs text-slate-400" suppressHydrationWarning>
                    {format(new Date(h.date), "EEEE, MMMM do yyyy")}
                    {h.isOptional && <span className="ml-2 text-blue-500">Optional</span>}
                  </p>
                </div>
                <button onClick={() => handleDelete(h.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {holidays.length === 0 && (
        <div className="card p-12 text-center text-slate-400">
          <PartyPopper size={32} className="mx-auto mb-3 opacity-40" />
          <p>No holidays defined yet</p>
        </div>
      )}
    </div>
  );
}
