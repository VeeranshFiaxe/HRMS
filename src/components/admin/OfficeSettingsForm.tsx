// src/components/admin/OfficeSettingsForm.tsx
"use client";

import { useState } from "react";
import { Save, Loader2, MapPin, Wifi, Shield, Plus, X, Trash2, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  settings: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    geofenceEnabled: boolean;
    allowedIps: string[];
    ipCheckEnabled: boolean;
    name: string;
    timezone?: string;
    whatsappNotifyEnabled?: boolean;
    whatsappCheckInTemplate?: string;
    whatsappCheckOutTemplate?: string;
  } | null;
  rules: {
    lateStreakDays: number;
    lateStreakPenalty: string;
    graceMinutes: number;
    autoAbsentAfter: string;
    autoCheckoutAfter: string;
    minHoursFullDay: number;
    minHoursHalfDay: number;
  } | null;
  defaultSalaryRule?: {
    id: string;
    baseSalary: number;
    lateDeductionFactor: number;
    halfDayDeductionFactor: number;
    absentDeductionFactor: number;
    paidLeaveDaysPerMonth: number;
    name: string;
    isDefault: boolean;
  } | null;
}

export function OfficeSettingsForm({ settings, rules, defaultSalaryRule }: Props) {
  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [tab, setTab] = useState<"geofence" | "ip" | "rules" | "whatsapp">("geofence");

  // Geofence & General state
  const [geo, setGeo] = useState({
    name: settings?.name || "Main Office",
    timezone: settings?.timezone || "Asia/Kolkata",
    latitude: settings?.latitude?.toString() || "0",
    longitude: settings?.longitude?.toString() || "0",
    radiusMeters: settings?.radiusMeters?.toString() || "200",
    geofenceEnabled: settings?.geofenceEnabled ?? true,
  });

  // IP state
  const [ipEnabled, setIpEnabled] = useState(settings?.ipCheckEnabled ?? false);
  const [allowedIps, setAllowedIps] = useState<string[]>(settings?.allowedIps || ["127.0.0.1"]);
  const [newIp, setNewIp] = useState("");

  // Rules state
  const [attendRules, setAttendRules] = useState({
    lateStreakDays: rules?.lateStreakDays?.toString() || "3",
    lateStreakPenalty: rules?.lateStreakPenalty || "HALF_DAY",
    graceMinutes: rules?.graceMinutes?.toString() || "0",
    autoAbsentAfter: rules?.autoAbsentAfter || "15:00",
    autoCheckoutAfter: rules?.autoCheckoutAfter || "21:00",
    minHoursFullDay: rules?.minHoursFullDay?.toString() || "8",
    minHoursHalfDay: rules?.minHoursHalfDay?.toString() || "4",
  });

  // WhatsApp notification state
  const [whatsapp, setWhatsapp] = useState({
    enabled: settings?.whatsappNotifyEnabled ?? false,
    checkInTemplate: settings?.whatsappCheckInTemplate || "✅ {name} checked in at {time}",
    checkOutTemplate: settings?.whatsappCheckOutTemplate || "❌ {name} checked out at {time}",
  });

  // Linked Default Salary Rule state
  const [salaryRuleState, setSalaryRuleState] = useState({
    baseSalary: defaultSalaryRule?.baseSalary?.toString() || "7500",
    lateDeductionFactor: defaultSalaryRule?.lateDeductionFactor?.toString() || "0.33",
    halfDayDeductionFactor: defaultSalaryRule?.halfDayDeductionFactor?.toString() || "0.5",
    absentDeductionFactor: defaultSalaryRule?.absentDeductionFactor?.toString() || "1.0",
    paidLeaveDaysPerMonth: defaultSalaryRule?.paidLeaveDaysPerMonth?.toString() || "1",
  });

  const getCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo(g => ({
          ...g,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        toast.success("Location captured");
      },
      () => toast.error("Could not get location")
    );
  };

  const saveGeofence = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/office-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: geo.name,
          timezone: geo.timezone,
          latitude: parseFloat(geo.latitude),
          longitude: parseFloat(geo.longitude),
          radiusMeters: parseFloat(geo.radiusMeters),
          geofenceEnabled: geo.geofenceEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) toast.success("Geofence settings saved");
      else toast.error(data.error || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const saveIpSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/office-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipCheckEnabled: ipEnabled, allowedIps }),
      });
      const data = await res.json();
      if (data.success) toast.success("IP settings saved");
      else toast.error(data.error || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const saveRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lateStreakDays: parseInt(attendRules.lateStreakDays),
          lateStreakPenalty: attendRules.lateStreakPenalty,
          graceMinutes: parseInt(attendRules.graceMinutes),
          autoAbsentAfter: attendRules.autoAbsentAfter,
          autoCheckoutAfter: attendRules.autoCheckoutAfter,
          minHoursFullDay: parseFloat(attendRules.minHoursFullDay),
          minHoursHalfDay: parseFloat(attendRules.minHoursHalfDay),
        }),
      });
      const data = await res.json();

      // Linked Default Salary Rule update
      const salaryPayload = {
        name: defaultSalaryRule?.name || "Default Salary Rule",
        isDefault: true,
        baseSalary: parseFloat(salaryRuleState.baseSalary) || 0,
        lateDeductionFactor: parseFloat(salaryRuleState.lateDeductionFactor) || 0.33,
        halfDayDeductionFactor: parseFloat(salaryRuleState.halfDayDeductionFactor) || 0.5,
        absentDeductionFactor: parseFloat(salaryRuleState.absentDeductionFactor) || 1.0,
        paidLeaveDaysPerMonth: parseInt(salaryRuleState.paidLeaveDaysPerMonth) || 1,
      };

      if (defaultSalaryRule?.id) {
        await fetch(`/api/salary-rules/${defaultSalaryRule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(salaryPayload),
        });
      } else {
        await fetch("/api/salary-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(salaryPayload),
        });
      }

      if (data.success) toast.success("Attendance & linked default salary rules saved");
      else toast.error(data.error || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const saveWhatsapp = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/office-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNotifyEnabled: whatsapp.enabled,
          whatsappCheckInTemplate: whatsapp.checkInTemplate,
          whatsappCheckOutTemplate: whatsapp.checkOutTemplate,
        }),
      });
      const data = await res.json();
      if (data.success) toast.success("WhatsApp notification settings saved");
      else toast.error(data.error || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = (template: string) =>
    template.replace(/\{name\}/g, "Priya Sharma").replace(/\{time\}/g, "09:42 AM");

  const addIp = () => {
    const trimmed = newIp.trim();
    if (!trimmed) return;
    if (allowedIps.includes(trimmed)) {
      toast.error("IP already in list");
      return;
    }
    setAllowedIps(ips => [...ips, trimmed]);
    setNewIp("");
  };

  const fixWeekendAttendance = async () => {
    setCleanupLoading(true);
    try {
      const res = await fetch(`/api/admin/cleanup-attendance`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Cleaned up ${data.totalDeleted} incorrect attendance record(s) across all months`);
      } else {
        toast.error(data.error || "Cleanup failed");
      }
    } catch {
      toast.error("Cleanup request failed");
    } finally {
      setCleanupLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["geofence", "ip", "rules", "whatsapp"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "ip" ? "IP Allowlist" : t === "rules" ? "Attendance Rules" : t === "whatsapp" ? "WhatsApp" : "General"}
          </button>
        ))}
      </div>

      {/* Geofence tab */}
      {tab === "geofence" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={18} className="text-blue-500" />
            <h3 className="font-semibold text-slate-900">General Settings</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Office Name</label>
              <input className="input" value={geo.name} onChange={e => setGeo(g => ({ ...g, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Company Timezone</label>
              <select className="input" value={geo.timezone} onChange={e => setGeo(g => ({ ...g, timezone: e.target.value }))}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="geoEnabled" checked={geo.geofenceEnabled} onChange={e => setGeo(g => ({ ...g, geofenceEnabled: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
            <label htmlFor="geoEnabled" className="text-sm text-slate-700">Enable geofence validation</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Latitude</label>
              <input type="number" step="any" className="input font-mono" value={geo.latitude} onChange={e => setGeo(g => ({ ...g, latitude: e.target.value }))} placeholder="19.076090" />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input type="number" step="any" className="input font-mono" value={geo.longitude} onChange={e => setGeo(g => ({ ...g, longitude: e.target.value }))} placeholder="72.877426" />
            </div>
          </div>

          <div>
            <label className="label">Radius (meters)</label>
            <input type="number" className="input" value={geo.radiusMeters} onChange={e => setGeo(g => ({ ...g, radiusMeters: e.target.value }))} />
            <p className="text-xs text-slate-400 mt-1">Employees within this distance from office can check in</p>
          </div>

          <button type="button" onClick={getCurrentLocation} className="btn-secondary text-sm">
            <MapPin size={14} />
            Use My Current Location as Office
          </button>

          <button onClick={saveGeofence} disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Geofence
          </button>
        </div>
      )}

      {/* IP tab */}
      {tab === "ip" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Wifi size={18} className="text-blue-500" />
            <h3 className="font-semibold text-slate-900">IP Allowlist</h3>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="ipEnabled" checked={ipEnabled} onChange={e => setIpEnabled(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
            <label htmlFor="ipEnabled" className="text-sm text-slate-700">Enable IP validation</label>
          </div>

          <p className="text-sm text-slate-500">
            Only requests from these IPs/ranges will be allowed. Supports exact IPs, CIDR (192.168.1.0/24), and wildcards (192.168.1.*).
          </p>

          {/* Existing IPs */}
          <div className="space-y-2">
            {allowedIps.map((ip, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 font-mono text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  {ip}
                </div>
                <button onClick={() => setAllowedIps(ips => ips.filter((_, j) => j !== i))} className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add new IP */}
          <div className="flex gap-2">
            <input
              className="input font-mono"
              placeholder="192.168.1.0/24 or 203.0.113.5"
              value={newIp}
              onChange={e => setNewIp(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addIp()}
            />
            <button onClick={addIp} className="btn-secondary px-3">
              <Plus size={16} />
            </button>
          </div>

          <button onClick={saveIpSettings} disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save IP Settings
          </button>
        </div>
      )}

      {/* Rules tab */}
      {tab === "rules" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} className="text-blue-500" />
            <h3 className="font-semibold text-slate-900">Attendance Rules</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Late Streak Days</label>
              <input type="number" className="input" value={attendRules.lateStreakDays} onChange={e => setAttendRules(r => ({ ...r, lateStreakDays: e.target.value }))} />
              <p className="text-xs text-slate-400 mt-1">Consecutive late days before penalty</p>
            </div>
            <div>
              <label className="label">Streak Penalty</label>
              <select className="input" value={attendRules.lateStreakPenalty} onChange={e => setAttendRules(r => ({ ...r, lateStreakPenalty: e.target.value }))}>
                <option value="NONE">No Penalty</option>
                <option value="HALF_DAY">Half Day Deduction</option>
                <option value="WARNING">Warning</option>
              </select>
            </div>
            <div>
              <label className="label">Grace Minutes</label>
              <input type="number" className="input" value={attendRules.graceMinutes} onChange={e => setAttendRules(r => ({ ...r, graceMinutes: e.target.value }))} />
            </div>
            <div>
              <label className="label">Auto-Absent After</label>
              <input type="time" className="input" value={attendRules.autoAbsentAfter} onChange={e => setAttendRules(r => ({ ...r, autoAbsentAfter: e.target.value }))} />
            </div>
            <div>
              <label className="label">Auto-Checkout After</label>
              <input type="time" className="input" value={attendRules.autoCheckoutAfter} onChange={e => setAttendRules(r => ({ ...r, autoCheckoutAfter: e.target.value }))} />
            </div>
            <div>
              <label className="label">Min Hours (Full Day)</label>
              <input type="number" step="0.5" className="input" value={attendRules.minHoursFullDay} onChange={e => setAttendRules(r => ({ ...r, minHoursFullDay: e.target.value }))} />
            </div>
            <div>
              <label className="label">Min Hours (Half Day)</label>
              <input type="number" step="0.5" className="input" value={attendRules.minHoursHalfDay} onChange={e => setAttendRules(r => ({ ...r, minHoursHalfDay: e.target.value }))} />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5 mt-5 space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-900 text-sm">Linked Default Salary Rule</h4>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Synced with /admin/salary</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Default Base Salary (₹/month)</label>
                <input type="number" min="0" className="input" value={salaryRuleState.baseSalary} onChange={e => setSalaryRuleState(s => ({ ...s, baseSalary: e.target.value }))} />
              </div>
              <div>
                <label className="label">Late Deduction Factor</label>
                <input type="number" step="0.05" min="0" max="2" className="input" value={salaryRuleState.lateDeductionFactor} onChange={e => setSalaryRuleState(s => ({ ...s, lateDeductionFactor: e.target.value }))} />
                <p className="text-xs text-slate-400 mt-1">0.33 = deduct 0.33 day's pay per late day</p>
              </div>
              <div>
                <label className="label">Half-Day Deduction Factor</label>
                <input type="number" step="0.1" min="0" max="1" className="input" value={salaryRuleState.halfDayDeductionFactor} onChange={e => setSalaryRuleState(s => ({ ...s, halfDayDeductionFactor: e.target.value }))} />
              </div>
              <div>
                <label className="label">Absent Deduction Factor</label>
                <input type="number" step="0.1" min="0" max="2" className="input" value={salaryRuleState.absentDeductionFactor} onChange={e => setSalaryRuleState(s => ({ ...s, absentDeductionFactor: e.target.value }))} />
              </div>
            </div>
          </div>

          <button onClick={saveRules} disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Rules & Default Salary
          </button>
          <button
            onClick={fixWeekendAttendance}
            disabled={cleanupLoading}
            className="btn-secondary flex items-center gap-2"
            title="Removes incorrectly auto-backfilled ABSENT records on weekends/holidays across all months"
          >
            {cleanupLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Fix Weekend Attendance
          </button>
        </div>
      )}

      {/* WhatsApp tab */}
      {tab === "whatsapp" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle size={18} className="text-blue-500" />
            <h3 className="font-semibold text-slate-900">WhatsApp Notifications</h3>
          </div>

          <p className="text-sm text-slate-500">
            Sends a WhatsApp message straight from the server (via Evolution API) whenever an employee checks in or out — no external workflow tool involved.
            The Evolution API connection is configured via server environment variables; everything below only controls whether notifications fire and what the message says.
          </p>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="whatsappEnabled"
              checked={whatsapp.enabled}
              onChange={e => setWhatsapp(w => ({ ...w, enabled: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 text-blue-600"
            />
            <label htmlFor="whatsappEnabled" className="text-sm text-slate-700">Enable WhatsApp check-in/out notifications</label>
          </div>

          <div>
            <label className="label">Check-in message</label>
            <input
              className="input font-mono text-sm"
              value={whatsapp.checkInTemplate}
              onChange={e => setWhatsapp(w => ({ ...w, checkInTemplate: e.target.value }))}
            />
            <p className="text-xs text-slate-400 mt-1">
              Preview: {renderPreview(whatsapp.checkInTemplate)}
            </p>
          </div>

          <div>
            <label className="label">Check-out message</label>
            <input
              className="input font-mono text-sm"
              value={whatsapp.checkOutTemplate}
              onChange={e => setWhatsapp(w => ({ ...w, checkOutTemplate: e.target.value }))}
            />
            <p className="text-xs text-slate-400 mt-1">
              Preview: {renderPreview(whatsapp.checkOutTemplate)}
            </p>
          </div>

          <p className="text-xs text-slate-400">
            Available placeholders: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{"{name}"}</code> and{" "}
            <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{"{time}"}</code>.
          </p>

          <button onClick={saveWhatsapp} disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save WhatsApp Settings
          </button>
        </div>
      )}
    </div>
  );
}
