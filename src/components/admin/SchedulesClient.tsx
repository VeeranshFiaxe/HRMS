// src/components/admin/SchedulesClient.tsx
"use client";

import { useState } from "react";
import { Plus, Clock, Save, Loader2, CalendarDays, Trash2, CheckCircle2, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Props { initialSchedules: any[]; }

export function SchedulesClient({ initialSchedules }: Props) {
  const router = useRouter();
  const [schedules, setSchedules] = useState<any[]>(initialSchedules);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

  const handleCreate = async (baseSchedule?: any) => {
    setLoading(true);
    try {
      const payload = baseSchedule ? {
        ...baseSchedule,
        id: undefined,
        name: baseSchedule.name + " (Copy)",
        isDefault: false
      } : {
        name: "New Schedule",
        startTime: "09:00",
        endTime: "18:00",
        lateAfter: "09:15",
        halfDayAfter: "14:00",
        monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false
      };

      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSchedules(prev => [...prev, data.data]);
        setExpandedId(data.data.id);
        toast.success("Schedule created");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to create schedule");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, updates: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setSchedules(prev => prev.map(s => s.id === id ? data.data : (updates.isDefault ? { ...s, isDefault: false } : s)));
        toast.success("Schedule updated");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to update schedule");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this schedule?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSchedules(prev => prev.filter(s => s.id !== id));
        if (expandedId === id) setExpandedId(null);
        toast.success("Schedule deleted");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to delete schedule");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateLocalSchedule = (id: string, field: string, value: any) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-slate-900">All Schedules</h2>
        <button onClick={() => handleCreate()} disabled={loading} className="btn-primary">
          <Plus size={16} /> Add Schedule
        </button>
      </div>

      <div className="space-y-4">
        {schedules.length === 0 && (
          <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
            No schedules defined. Click the button above to add one.
          </div>
        )}
        
        {schedules.map(schedule => (
          <div key={schedule.id} className="card overflow-hidden transition-all duration-200">
            {/* Header / Summary Card */}
            <div 
              className={`p-5 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between ${expandedId === schedule.id ? 'border-b border-slate-100 bg-slate-50/50' : ''}`}
              onClick={() => setExpandedId(expandedId === schedule.id ? null : schedule.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg ${schedule.isDefault ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                  <Clock size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-900">{schedule.name}</h3>
                    {schedule.isDefault && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide flex items-center gap-1">
                        <CheckCircle2 size={10} /> Default
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-3">
                    <span>{schedule.startTime} - {schedule.endTime}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span>{days.filter(d => schedule[d]).length} working days</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCreate(schedule); }} 
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Duplicate"
                >
                  <Copy size={16} />
                </button>
                <button 
                  onClick={(e) => handleDelete(schedule.id, e)} 
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Expanded Form */}
            {expandedId === schedule.id && (
              <div className="p-6 bg-white space-y-5 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="label">Schedule Name</label>
                  <input className="input" value={schedule.name} onChange={e => updateLocalSchedule(schedule.id, 'name', e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Start Time</label>
                    <input type="time" className="input" value={schedule.startTime} onChange={e => updateLocalSchedule(schedule.id, 'startTime', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">End Time</label>
                    <input type="time" className="input" value={schedule.endTime} onChange={e => updateLocalSchedule(schedule.id, 'endTime', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Late After</label>
                    <input type="time" className="input" value={schedule.lateAfter} onChange={e => updateLocalSchedule(schedule.id, 'lateAfter', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Half Day After</label>
                    <input type="time" className="input" value={schedule.halfDayAfter} onChange={e => updateLocalSchedule(schedule.id, 'halfDayAfter', e.target.value)} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays size={16} className="text-slate-400" />
                    <label className="label !mb-0">Working Days</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {days.map(day => (
                      <label key={day} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={schedule[day]}
                          onChange={e => updateLocalSchedule(schedule.id, day, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-700 capitalize">{day.slice(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={schedule.isDefault} 
                      onChange={e => updateLocalSchedule(schedule.id, 'isDefault', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Set as global default schedule</span>
                  </label>
                  
                  <div className="flex gap-2">
                    <button onClick={() => setExpandedId(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
                    <button onClick={() => handleUpdate(schedule.id, schedule)} disabled={loading} className="btn-primary">
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
