// src/components/admin/ScheduleSettingsForm.tsx
"use client";
import { useState } from "react";
import { Save, Loader2, Clock } from "lucide-react";
import toast from "react-hot-toast";

interface Props { schedule: any | null; }

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;

export function ScheduleSettingsForm({ schedule }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: schedule?.name || "Default Schedule",
    startTime: schedule?.startTime || "11:00",
    endTime: schedule?.endTime || "18:00",
    overrideLateAfter: schedule?.overrideLateAfter ?? false,
    lateAfter: schedule?.lateAfter || "11:15",
    halfDayAfter: schedule?.halfDayAfter || "14:00",
    monday: schedule?.monday ?? true,
    tuesday: schedule?.tuesday ?? true,
    wednesday: schedule?.wednesday ?? true,
    thursday: schedule?.thursday ?? true,
    friday: schedule?.friday ?? true,
    saturday: schedule?.saturday ?? false,
    sunday: schedule?.sunday ?? false,
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const endpoint = schedule?.id ? `/api/schedules/${schedule.id}` : "/api/schedules";
      const method = schedule?.id ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) toast.success("Schedule saved");
      else toast.error(data.error || "Failed to save");
    } finally { setLoading(false); }
  };

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Clock size={18} className="text-blue-500" />
        <h3 className="font-semibold text-slate-900">Working Hours</h3>
      </div>

      <div>
        <label className="label">Schedule Name</label>
        <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { key: "startTime", label: "Start Time" },
          { key: "endTime", label: "End Time" },
          { key: "halfDayAfter", label: "Half-Day After" },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="label">{label}</label>
            <input
              type="time"
              className="input"
              value={(form as any)[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
        
        <div>
          <label className="label flex items-center justify-between">
            Late After
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.overrideLateAfter}
                onChange={e => setForm(f => ({ ...f, overrideLateAfter: e.target.checked }))}
                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-normal text-slate-500">Manual Override</span>
            </label>
          </label>
          {form.overrideLateAfter ? (
            <input
              type="time"
              className="input"
              value={form.lateAfter}
              onChange={e => setForm(f => ({ ...f, lateAfter: e.target.value }))}
            />
          ) : (
            <div className="input bg-slate-50 text-slate-400 text-sm flex items-center select-none cursor-not-allowed">
              Calculated via Grace Time
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="label">Working Days</label>
        <div className="flex flex-wrap gap-3">
          {DAYS.map(day => (
            <label key={day} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={(form as any)[day]}
                onChange={e => setForm(f => ({ ...f, [day]: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 capitalize">{day.slice(0, 3)}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Employees without a custom schedule will follow these working days.
        </p>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 mb-4">
          <strong>How timings work:</strong> Checking in after <strong>{form.overrideLateAfter ? form.lateAfter : "Start Time + Grace Time"}</strong> marks the record as Late.
          Checking in after <strong>{form.halfDayAfter}</strong> marks it as Half Day.
          Sundays and non-working days are automatically excluded from attendance calculations.
        </div>
        <button onClick={handleSave} disabled={loading} className="btn-primary">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Schedule
        </button>
      </div>
    </div>
  );
}
