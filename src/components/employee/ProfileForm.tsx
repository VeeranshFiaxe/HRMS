// src/components/employee/ProfileForm.tsx
"use client";
import { useState } from "react";
import { format } from "date-fns";
import { Save, Loader2, User, Clock, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

interface Props { user: any; schedule: any; isCustomSchedule: boolean; }

export function ProfileForm({ user, schedule, isCustomSchedule }: Props) {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"profile"|"schedule"|"password">("profile");
  const [form, setForm] = useState({ name: user.name||"", phone: user.phone||"" });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);

  const saveProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, phone: form.phone }),
      });
      const data = await res.json();
      if (data.success) toast.success("Profile updated");
      else toast.error(data.error || "Failed");
    } finally { setLoading(false); }
  };

  const changePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { toast.error("Passwords do not match"); return; }
    if (pwForm.next.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Password changed"); setPwForm({ current:"", next:"", confirm:"" }); }
      else toast.error(data.error || "Failed to change password");
    } finally { setLoading(false); }
  };

  const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["profile","schedule","password"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${tab===t?"bg-white shadow-sm text-slate-900":"text-slate-500 hover:text-slate-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-lg">{user.name}</p>
              <p className="text-slate-500 text-sm">{user.email}</p>
              <p className="text-slate-400 text-xs mt-0.5" suppressHydrationWarning>
                {user.designation} · {user.department} · Joined {format(new Date(user.joiningDate), "MMM yyyy")}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({...f,phone:e.target.value}))} placeholder="+91 9876543210" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 opacity-60 pointer-events-none">
            <div>
              <label className="label">Email (read-only)</label>
              <input className="input" value={user.email} readOnly />
            </div>
            <div>
              <label className="label">Employment Type (read-only)</label>
              <input className="input" value={user.employmentType.replace("_"," ")} readOnly />
            </div>
          </div>
          <button onClick={saveProfile} disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
            Save Profile
          </button>
        </div>
      )}

      {tab === "schedule" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-blue-500" />
            <div>
              <h3 className="font-medium text-slate-900">Your Working Schedule</h3>
              <p className="text-xs text-slate-400">{isCustomSchedule ? "Custom schedule (set by admin)" : "Company default schedule"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[["Start Time", schedule?.startTime], ["End Time", schedule?.endTime], ["Late After", schedule?.lateAfter], ["Half-Day After", schedule?.halfDayAfter]].map(([label, val]) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="font-semibold text-slate-900 mt-0.5">{val || "—"}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Working Days</p>
            <div className="flex flex-wrap gap-2">
              {days.map(day => (
                <span key={day} className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${(schedule as any)?.[day] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400 line-through"}`}>
                  {day.slice(0,3)}
                </span>
              ))}
            </div>
          </div>
          {!isCustomSchedule && <p className="text-xs text-slate-400">Contact your admin to request schedule changes.</p>}
        </div>
      )}

      {tab === "password" && (
        <div className="card p-6 space-y-4">
          {!user.password && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg p-3">
              Your account uses Google sign-in. Password change is not available.
            </div>
          )}
          <div className="space-y-3">
            {["current","next","confirm"].map(f => (
              <div key={f}>
                <label className="label capitalize">{f === "next" ? "New Password" : f === "confirm" ? "Confirm New Password" : "Current Password"}</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} className="input pr-10" value={(pwForm as any)[f]}
                    onChange={e => setPwForm(p => ({...p,[f]:e.target.value}))} disabled={!user.password} />
                  {f === "next" && (
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={changePassword} disabled={loading || !user.password} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin"/> : null}
            Change Password
          </button>
        </div>
      )}
    </div>
  );
}
