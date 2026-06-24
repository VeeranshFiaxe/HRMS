// src/components/admin/OfficeSettingsForm.tsx
"use client";

import { useState } from "react";
import { Save, Loader2, MapPin, Wifi, Shield, Plus, X } from "lucide-react";
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
  } | null;
  rules: {
    lateStreakDays: number;
    lateStreakPenalty: string;
    graceMinutes: number;
    autoAbsentAfter: string;
    minHoursFullDay: number;
    minHoursHalfDay: number;
  } | null;
}

export function OfficeSettingsForm({ settings, rules }: Props) {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"geofence" | "ip" | "rules">("geofence");

  // Geofence state
  const [geo, setGeo] = useState({
    name: settings?.name || "Main Office",
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
    minHoursFullDay: rules?.minHoursFullDay?.toString() || "8",
    minHoursHalfDay: rules?.minHoursHalfDay?.toString() || "4",
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
          minHoursFullDay: parseFloat(attendRules.minHoursFullDay),
          minHoursHalfDay: parseFloat(attendRules.minHoursHalfDay),
        }),
      });
      const data = await res.json();
      if (data.success) toast.success("Attendance rules saved");
      else toast.error(data.error || "Failed");
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["geofence", "ip", "rules"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "ip" ? "IP Allowlist" : t === "rules" ? "Attendance Rules" : "Geofence"}
          </button>
        ))}
      </div>

      {/* Geofence tab */}
      {tab === "geofence" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={18} className="text-blue-500" />
            <h3 className="font-semibold text-slate-900">Office Geofence</h3>
          </div>

          <div>
            <label className="label">Office Name</label>
            <input className="input" value={geo.name} onChange={e => setGeo(g => ({ ...g, name: e.target.value }))} />
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
              <label className="label">Min Hours (Full Day)</label>
              <input type="number" step="0.5" className="input" value={attendRules.minHoursFullDay} onChange={e => setAttendRules(r => ({ ...r, minHoursFullDay: e.target.value }))} />
            </div>
            <div>
              <label className="label">Min Hours (Half Day)</label>
              <input type="number" step="0.5" className="input" value={attendRules.minHoursHalfDay} onChange={e => setAttendRules(r => ({ ...r, minHoursHalfDay: e.target.value }))} />
            </div>
          </div>

          <button onClick={saveRules} disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Rules
          </button>
        </div>
      )}
    </div>
  );
}
