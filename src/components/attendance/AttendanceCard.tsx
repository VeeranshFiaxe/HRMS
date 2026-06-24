// src/components/attendance/AttendanceCard.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  MapPin,
  Loader2,
  CheckCircle,
  AlertTriangle,
  LogIn,
  LogOut,
  Navigation,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatTime, getStatusColor, getStatusLabel } from "@/lib/utils";
import { format } from "date-fns";

interface AttendanceCardProps {
  todayRecord: {
    id: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    status: string;
    isLate: boolean;
    lateMinutes: number;
    isHalfDay: boolean;
  } | null;
  schedule: {
    startTime: string;
    endTime: string;
    lateAfter: string;
  };
  timeFormat?: "12h" | "24h";
  timezone?: string;
}

type GeoStatus = "idle" | "fetching" | "granted" | "denied" | "unavailable";

export function AttendanceCard({ todayRecord, schedule, timeFormat = "24h", timezone = "Asia/Kolkata" }: AttendanceCardProps) {
  const router = useRouter();
  const [record, setRecord] = useState(todayRecord);
  const [loading, setLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  // Live clock
  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Request geolocation on mount
  const requestGeolocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoStatus("unavailable");
      return;
    }

    setGeoStatus("fetching");
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("granted");
      },
      (err) => {
        setGeoStatus("denied");
        setGeoError(
          err.code === 1
            ? "Location permission denied."
            : "Could not get your location."
        );
      },
      { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    requestGeolocation();
  }, [requestGeolocation]);

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const body: any = { clientOffset: new Date().getTimezoneOffset() };
      if (coords) {
        body.lat = coords.lat;
        body.lng = coords.lng;
      }

      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        setRecord(data.record);
        toast.success(
          data.isLate
            ? `Checked in (${data.lateMinutes}m late)`
            : "Checked in successfully! Have a great day 🎉"
        );
        router.refresh();
      } else {
        toast.error(data.error || "Check-in failed");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const body: any = { clientOffset: new Date().getTimezoneOffset() };
      if (coords) {
        body.lat = coords.lat;
        body.lng = coords.lng;
      }

      const res = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        setRecord(data.record);
        toast.success("Checked out! See you tomorrow 👋");
        router.refresh();
      } else {
        toast.error(data.error || "Check-out failed");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const hasCheckedIn = !!record?.checkInAt;
  const hasCheckedOut = !!record?.checkOutAt;
  const isComplete = hasCheckedIn && hasCheckedOut;

  return (
    <div className="card p-6">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        {/* Left: time display */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-blue-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Today's Attendance
            </span>
          </div>

          {/* Live time */}
          <p className="text-4xl font-bold text-slate-900 font-mono tracking-tight" suppressHydrationWarning>
            {mounted ? (require("date-fns-tz").formatInTimeZone(currentTime, timezone, timeFormat === "12h" ? "hh:mm:ss a" : "HH:mm:ss")) : "--:--:--"}
          </p>
          <p className="text-sm text-slate-500 mt-0.5" suppressHydrationWarning>
            {mounted ? (require("date-fns-tz").formatInTimeZone(currentTime, timezone, "EEEE, MMMM do")) : "Loading date..."}
          </p>

          {/* Schedule info */}
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              Start: {schedule.startTime}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              Late after: {schedule.lateAfter}
            </div>
          </div>

          {/* Geo status */}
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <Navigation
              size={12}
              className={cn(
                geoStatus === "granted" ? "text-emerald-500" :
                geoStatus === "denied" || geoStatus === "unavailable" ? "text-red-500" :
                "text-slate-400"
              )}
            />
            <span className={cn(
              geoStatus === "granted" ? "text-emerald-600" :
              geoStatus === "denied" || geoStatus === "unavailable" ? "text-red-500" :
              "text-slate-400"
            )}>
              {geoStatus === "fetching" && "Getting location..."}
              {geoStatus === "granted" && `Location acquired (${coords?.lat.toFixed(4)}, ${coords?.lng.toFixed(4)})`}
              {geoStatus === "denied" && "Location denied"}
              {geoStatus === "unavailable" && "Geolocation not supported"}
              {geoStatus === "idle" && "Location not yet requested"}
            </span>
            {(geoStatus === "denied" || geoStatus === "unavailable") && (
              <button
                onClick={requestGeolocation}
                className="text-blue-500 hover:text-blue-600 underline text-xs"
              >
                Retry
              </button>
            )}
          </div>
          {geoError && (
            <p className="text-xs text-red-500 mt-1 flex items-start gap-1">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              {geoError}
            </p>
          )}
        </div>

        {/* Right: status + buttons */}
        <div className="flex flex-col items-center gap-4 md:min-w-[200px]">
          {/* Status badge */}
          {record ? (
            <div className={cn("badge px-4 py-1.5 text-sm font-semibold", getStatusColor(record.status))}>
              {getStatusLabel(record.status)}
              {record.isLate && record.lateMinutes > 0 && (
                <span className="ml-1 opacity-75">· {record.lateMinutes}m late</span>
              )}
            </div>
          ) : (
            <div className="badge px-4 py-1.5 text-sm bg-slate-100 text-slate-500">
              Not checked in
            </div>
          )}

          {/* Check in/out times */}
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Check In</p>
              <p className="text-lg font-bold text-slate-900" suppressHydrationWarning>
                {record?.checkInAt ? formatTime(new Date(record.checkInAt), timeFormat, timezone) : "—"}
              </p>
            </div>
            <div className="w-px bg-slate-200" />
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Check Out</p>
              <p className="text-lg font-bold text-slate-900" suppressHydrationWarning>
                {record?.checkOutAt ? formatTime(new Date(record.checkOutAt), timeFormat, timezone) : "—"}
              </p>
            </div>
          </div>

          {/* Action button */}
          {isComplete ? (
            <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
              <CheckCircle size={18} />
              Attendance complete
            </div>
          ) : !hasCheckedIn ? (
            <button
              onClick={handleCheckIn}
              disabled={loading || geoStatus === "fetching"}
              className="btn-primary px-8 py-3 text-base w-full"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Checking in...</>
              ) : (
                <><LogIn size={18} /> Check In</>
              )}
            </button>
          ) : (
            <button
              onClick={handleCheckOut}
              disabled={loading || geoStatus === "fetching"}
              className="bg-slate-800 hover:bg-slate-900 text-white inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium rounded-lg w-full transition-colors disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Checking out...</>
              ) : (
                <><LogOut size={18} /> Check Out</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
