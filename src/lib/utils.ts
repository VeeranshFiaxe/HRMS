// src/lib/utils.ts
// Shared utility functions for the HRMS

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  parseISO,
  differenceInMinutes,
  startOfDay,
  isSameDay,
} from "date-fns";

// ─── Tailwind class merge ──────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Geofence ─────────────────────────────────────────────────

/**
 * Calculate distance between two lat/lng points using Haversine formula.
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if coordinates are within office geofence.
 */
export function isWithinGeofence(
  lat: number,
  lng: number,
  officeLat: number,
  officeLng: number,
  radiusMeters: number
): boolean {
  const distance = haversineDistance(lat, lng, officeLat, officeLng);
  return distance <= radiusMeters;
}

// ─── IP Validation ────────────────────────────────────────────

/**
 * Normalize an IPv6 loopback to IPv4 for comparison.
 */
export function normalizeIp(ip: string): string {
  if (ip === "::1") return "127.0.0.1";
  if (ip?.startsWith("::ffff:")) return ip.substring(7);
  return ip;
}

/**
 * Check if a given IP matches an allowed IP or CIDR range.
 * Supports exact match and simple /24, /16, /8 CIDR notation.
 */
export function isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
  const normalized = normalizeIp(clientIp);

  for (const allowed of allowedIps) {
    if (allowed.trim() === "") continue;

    // Exact match
    if (normalizeIp(allowed) === normalized) return true;

    // CIDR range — simple prefix match for /8, /16, /24
    if (allowed.includes("/")) {
      const [network, prefixStr] = allowed.split("/");
      const prefix = parseInt(prefixStr);

      if (prefix === 24) {
        const net = network.split(".").slice(0, 3).join(".");
        const cli = normalized.split(".").slice(0, 3).join(".");
        if (net === cli) return true;
      } else if (prefix === 16) {
        const net = network.split(".").slice(0, 2).join(".");
        const cli = normalized.split(".").slice(0, 2).join(".");
        if (net === cli) return true;
      } else if (prefix === 8) {
        const net = network.split(".")[0];
        const cli = normalized.split(".")[0];
        if (net === cli) return true;
      }
    }

    // Wildcard: 192.168.1.*
    if (allowed.endsWith(".*")) {
      const prefix = allowed.slice(0, -2);
      if (normalized.startsWith(prefix)) return true;
    }
  }
  return false;
}

/**
 * Extract client IP from Next.js request headers.
 * Handles proxies, Vercel, Cloudflare etc.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return normalizeIp(forwarded.split(",")[0].trim());
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return normalizeIp(realIp.trim());
  return "127.0.0.1";
}

// ─── Attendance / Time helpers ────────────────────────────────

/**
 * Parse a "HH:mm" time string and return a Date object set to that time
 * on the given date (default: today).
 */
export function timeStrToDate(timeStr: string, baseDate: Date = new Date()): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Format a Date to "HH:mm" string in local time.
 */
export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

/**
 * Get working days in a month excluding weekends and holidays.
 */
export function getPayableWorkingDays(
  year: number,
  month: number, // 1-indexed
  holidays: Date[],
  schedule: { saturday: boolean; sunday: boolean }
): number {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });

  return days.filter((day) => {
    const dow = day.getDay(); // 0=Sun, 6=Sat
    if (dow === 0 && !schedule.sunday) return false;
    if (dow === 6 && !schedule.saturday) return false;
    const isHoliday = holidays.some((h) => isSameDay(h, day));
    return !isHoliday;
  }).length;
}

/**
 * Calculate attendance percentage for a user.
 */
export function calculateAttendancePercentage(
  present: number,
  totalWorkingDays: number
): number {
  if (totalWorkingDays === 0) return 0;
  return Math.round((present / totalWorkingDays) * 100);
}

/**
 * Determine attendance status based on check-in time.
 */
export function determineAttendanceStatus(
  checkInAt: Date,
  schedule: { startTime: string; lateAfter: string; halfDayAfter: string },
  clientOffset?: number
): { status: "PRESENT" | "LATE" | "HALF_DAY"; isLate: boolean; lateMinutes: number } {
  const offset = clientOffset ?? checkInAt.getTimezoneOffset();
  const localDate = new Date(checkInAt.getTime() - offset * 60000);

  const parseLocalTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const targetLocal = new Date(
      Date.UTC(
        localDate.getUTCFullYear(),
        localDate.getUTCMonth(),
        localDate.getUTCDate(),
        hours,
        minutes,
        0,
        0
      )
    );
    return new Date(targetLocal.getTime() + offset * 60000);
  };

  const lateAfterDate = parseLocalTime(schedule.lateAfter);
  const halfDayAfterDate = parseLocalTime(schedule.halfDayAfter);

  const isLate = checkInAt > lateAfterDate;
  const isHalfDay = checkInAt > halfDayAfterDate;
  const lateMinutes = isLate ? differenceInMinutes(checkInAt, lateAfterDate) : 0;

  if (isHalfDay) {
    return { status: "HALF_DAY", isLate: true, lateMinutes };
  }
  if (isLate) {
    return { status: "LATE", isLate: true, lateMinutes };
  }
  return { status: "PRESENT", isLate: false, lateMinutes: 0 };
}

/**
 * Get the day name for a given Date.
 */
export function getDayName(
  date: Date
): "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday" {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;
  return days[date.getDay()];
}

/**
 * Check if a date is a working day per a schedule.
 */
export function isWorkingDay(
  date: Date,
  schedule: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  }
): boolean {
  const dayName = getDayName(date);
  return schedule[dayName];
}

// ─── Formatting ───────────────────────────────────────────────

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy");
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy, HH:mm");
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Status color helpers ─────────────────────────────────────

export function getStatusColor(status: string): string {
  switch (status) {
    case "PRESENT":
      return "text-emerald-600 bg-emerald-50";
    case "LATE":
      return "text-amber-600 bg-amber-50";
    case "HALF_DAY":
      return "text-orange-600 bg-orange-50";
    case "ABSENT":
      return "text-red-600 bg-red-50";
    case "ON_LEAVE":
      return "text-blue-600 bg-blue-50";
    case "HOLIDAY":
      return "text-purple-600 bg-purple-50";
    case "WEEKEND":
      return "text-slate-500 bg-slate-50";
    default:
      return "text-slate-500 bg-slate-50";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "PRESENT":
      return "Present";
    case "LATE":
      return "Late";
    case "HALF_DAY":
      return "Half Day";
    case "ABSENT":
      return "Absent";
    case "ON_LEAVE":
      return "On Leave";
    case "HOLIDAY":
      return "Holiday";
    case "WEEKEND":
      return "Weekend";
    default:
      return status;
  }
}

// ─── Salary calculation ───────────────────────────────────────

export interface SalaryCalculationInput {
  baseSalary: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  payableWorkingDays: number;
  halfDayDeductionFactor: number;
  absentDeductionFactor: number;
  paidLeaveDays: number;
}

export interface SalaryCalculationResult {
  grossSalary: number;
  deductions: number;
  netSalary: number;
  effectiveDays: number;
  breakdown: {
    presentDays: number;
    halfDays: number;
    absentDays: number;
    paidLeaveDays: number;
    deductedDays: number;
  };
}

export function calculateNetSalary(input: SalaryCalculationInput): SalaryCalculationResult {
  const {
    baseSalary,
    presentDays,
    halfDays,
    absentDays,
    payableWorkingDays,
    halfDayDeductionFactor,
    absentDeductionFactor,
    paidLeaveDays,
  } = input;

  const halfDayDeductions = halfDays * halfDayDeductionFactor;
  const absentDeductions = Math.max(0, absentDays - paidLeaveDays) * absentDeductionFactor;
  const deductedDays = halfDayDeductions + absentDeductions;

  const effectiveDays = Math.min(
    payableWorkingDays,
    presentDays + halfDays * 0.5 + paidLeaveDays
  );

  const perDayRate = baseSalary / payableWorkingDays;
  const deductions = deductedDays * perDayRate;
  const netSalary = Math.max(0, baseSalary - deductions);

  return {
    grossSalary: baseSalary,
    deductions: Math.round(deductions * 100) / 100,
    netSalary: Math.round(netSalary * 100) / 100,
    effectiveDays: Math.round(effectiveDays * 10) / 10,
    breakdown: {
      presentDays,
      halfDays,
      absentDays,
      paidLeaveDays: Math.min(paidLeaveDays, absentDays),
      deductedDays: Math.round(deductedDays * 10) / 10,
    },
  };
}
