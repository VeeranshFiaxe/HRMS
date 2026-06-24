// src/lib/attendance-engine.ts
// Core attendance logic — validation, status calculation, streak detection

import { prisma } from "@/lib/prisma";
import {
  isWithinGeofence,
  isIpAllowed,
  determineAttendanceStatus,
  isWorkingDay,
  timeStrToDate,
} from "@/lib/utils";
import { startOfDay, subDays, format } from "date-fns";

// ─── Types ─────────────────────────────────────────────────────

export interface CheckInRequest {
  userId: string;
  clientIp: string;
  lat?: number;
  lng?: number;
  clientOffset?: number;
  userAgent?: string;
}

export interface CheckInResult {
  success: boolean;
  error?: string;
  errorCode?:
    | "ALREADY_CHECKED_IN"
    | "IP_NOT_ALLOWED"
    | "OUTSIDE_GEOFENCE"
    | "GEO_REQUIRED"
    | "NOT_WORKING_DAY"
    | "HOLIDAY"
    | "INTERNAL_ERROR";
  record?: any;
  isLate?: boolean;
  lateMinutes?: number;
  status?: string;
}

export interface CheckOutRequest {
  userId: string;
  clientIp: string;
  lat?: number;
  lng?: number;
}

export interface CheckOutResult {
  success: boolean;
  error?: string;
  errorCode?: "NOT_CHECKED_IN" | "ALREADY_CHECKED_OUT" | "IP_NOT_ALLOWED" | "OUTSIDE_GEOFENCE" | "INTERNAL_ERROR";
  record?: any;
}

// ─── Effective schedule ────────────────────────────────────────

export async function getEffectiveSchedule(userId: string) {
  // Prefer employee-specific schedule, fall back to company default
  const custom = await prisma.employeeSchedule.findUnique({ where: { userId } });
  if (custom) return custom;

  const company = await prisma.companySchedule.findFirst();
  if (!company) {
    // Absolute fallback
    return {
      startTime: "11:00",
      endTime: "20:00",
      lateAfter: "11:15",
      halfDayAfter: "14:00",
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    };
  }
  return company;
}

// ─── Holiday check ─────────────────────────────────────────────

async function isHoliday(date: Date): Promise<string | null> {
  const holiday = await prisma.holiday.findUnique({
    where: { date: startOfDay(date) },
  });
  return holiday?.name ?? null;
}

// ─── Office settings (cached per request) ─────────────────────

async function getOfficeSettings() {
  const settings = await prisma.officeSettings.findFirst();
  return settings;
}

// ─── CHECK-IN ──────────────────────────────────────────────────

export async function processCheckIn(req: CheckInRequest): Promise<CheckInResult> {
  // SERVER TIME — this is the canonical attendance timestamp
  const now = new Date();
  const today = startOfDay(now);

  try {
    // 1. Get office settings
    const office = await getOfficeSettings();

    // 2. IP validation
    if (office?.ipCheckEnabled && office.allowedIps) {
      const allowedIps = office.allowedIps as string[];
      if (!isIpAllowed(req.clientIp, allowedIps)) {
        await createAuditLog(req.userId, "CHECK_IN", `IP blocked: ${req.clientIp}`, {
          ip: req.clientIp,
          reason: "IP_NOT_ALLOWED",
        });
        return {
          success: false,
          error: `Check-in blocked: your IP address (${req.clientIp}) is not on the approved list. Please connect to the office network.`,
          errorCode: "IP_NOT_ALLOWED",
        };
      }
    }

    // 3. Geofence validation
    const ipValid = !office?.ipCheckEnabled || isIpAllowed(req.clientIp, office.allowedIps as string[]);
    let geoValid: boolean | null = null;

    if (office?.geofenceEnabled) {
      if (req.lat == null || req.lng == null) {
        return {
          success: false,
          error: "Location access is required for attendance. Please allow location permissions and try again.",
          errorCode: "GEO_REQUIRED",
        };
      }
      geoValid = isWithinGeofence(
        req.lat,
        req.lng,
        office.latitude,
        office.longitude,
        office.radiusMeters
      );
      if (!geoValid) {
        await createAuditLog(req.userId, "CHECK_IN", `Geofence blocked: ${req.lat},${req.lng}`, {
          lat: req.lat,
          lng: req.lng,
          officeLat: office.latitude,
          officeLng: office.longitude,
          radius: office.radiusMeters,
          reason: "OUTSIDE_GEOFENCE",
        });
        return {
          success: false,
          error: `Check-in blocked: you appear to be outside the office premises (${Math.round(
            office.radiusMeters
          )}m radius). Please check in from the office.`,
          errorCode: "OUTSIDE_GEOFENCE",
        };
      }
    } else if (req.lat != null && req.lng != null && office) {
      // Geofence disabled but we still store coordinates
      geoValid = true;
    }

    // 4. Schedule validation
    const schedule = await getEffectiveSchedule(req.userId);

    // Check if today is a working day
    if (!isWorkingDay(now, schedule)) {
      // Still allow admin override later, but record the attempt
      return {
        success: false,
        error: "Today is not a working day per your schedule.",
        errorCode: "NOT_WORKING_DAY",
      };
    }

    // 5. Holiday check
    const holidayName = await isHoliday(today);
    if (holidayName) {
      return {
        success: false,
        error: `Today is a holiday: ${holidayName}. No attendance required.`,
        errorCode: "HOLIDAY",
      };
    }

    // 6. Duplicate check-in prevention
    const existing = await prisma.attendanceRecord.findUnique({
      where: { userId_date: { userId: req.userId, date: today } },
    });

    if (existing?.checkInAt) {
      return {
        success: false,
        error: "You have already checked in today.",
        errorCode: "ALREADY_CHECKED_IN",
        record: existing,
      };
    }

    // 7. Calculate attendance status
    const timezone = office?.timezone || "Asia/Kolkata";
    const { status, isLate, lateMinutes } = determineAttendanceStatus(now, schedule, timezone);

    // 8. Create or update attendance record (upsert to handle edge cases)
    const record = await prisma.attendanceRecord.upsert({
      where: { userId_date: { userId: req.userId, date: today } },
      create: {
        userId: req.userId,
        date: today,
        checkInAt: now,           // SERVER TIME
        checkInIp: req.clientIp,
        checkInLat: req.lat ?? null,
        checkInLng: req.lng ?? null,
        checkInIpValid: ipValid,
        checkInGeoValid: geoValid,
        status,
        isLate,
        isHalfDay: status === "HALF_DAY",
        lateMinutes,
      },
      update: {
        // Only update if no check-in exists yet (safety)
        checkInAt: existing?.checkInAt ?? now,
      },
    });

    // 9. Audit log
    await createAuditLog(req.userId, "CHECK_IN", `Check-in at ${format(now, "HH:mm:ss")} — ${status}`, {
      recordId: record.id,
      checkInAt: now.toISOString(),
      ip: req.clientIp,
      lat: req.lat,
      lng: req.lng,
      status,
      isLate,
      lateMinutes,
    });

    // 10. Check and apply late streak penalty
    if (isLate) {
      await checkLateStreakPenalty(req.userId, today);
    }

    return { success: true, record, isLate, lateMinutes, status };
  } catch (error) {
    console.error("CheckIn error:", error);
    return { success: false, error: "An internal error occurred.", errorCode: "INTERNAL_ERROR" };
  }
}

// ─── CHECK-OUT ─────────────────────────────────────────────────

export async function processCheckOut(req: CheckOutRequest): Promise<CheckOutResult> {
  const now = new Date(); // SERVER TIME
  const today = startOfDay(now);

  try {
    const office = await getOfficeSettings();

    // 1. IP check
    if (office?.ipCheckEnabled && office.allowedIps) {
      if (!isIpAllowed(req.clientIp, office.allowedIps as string[])) {
        return {
          success: false,
          error: `Check-out blocked: your IP address (${req.clientIp}) is not on the approved list.`,
          errorCode: "IP_NOT_ALLOWED",
        };
      }
    }

    // 2. Geofence check
    if (office?.geofenceEnabled && req.lat != null && req.lng != null) {
      const inRange = isWithinGeofence(req.lat, req.lng, office.latitude, office.longitude, office.radiusMeters);
      if (!inRange) {
        return {
          success: false,
          error: "Check-out blocked: you appear to be outside the office premises.",
          errorCode: "OUTSIDE_GEOFENCE",
        };
      }
    }

    // 3. Find today's record
    const record = await prisma.attendanceRecord.findUnique({
      where: { userId_date: { userId: req.userId, date: today } },
    });

    if (!record || !record.checkInAt) {
      return {
        success: false,
        error: "You haven't checked in today. Please check in first.",
        errorCode: "NOT_CHECKED_IN",
      };
    }

    if (record.checkOutAt) {
      return {
        success: false,
        error: "You have already checked out today.",
        errorCode: "ALREADY_CHECKED_OUT",
        record,
      };
    }

    // 4. Update record with check-out time
    const updated = await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        checkOutAt: now,           // SERVER TIME
        checkOutIp: req.clientIp,
        checkOutLat: req.lat ?? null,
        checkOutLng: req.lng ?? null,
        checkOutIpValid: !office?.ipCheckEnabled || isIpAllowed(req.clientIp, office.allowedIps as string[]),
        checkOutGeoValid: req.lat != null ? true : null,
      },
    });

    // 5. Audit log
    await createAuditLog(req.userId, "CHECK_OUT", `Check-out at ${format(now, "HH:mm:ss")}`, {
      recordId: record.id,
      checkOutAt: now.toISOString(),
      ip: req.clientIp,
    });

    return { success: true, record: updated };
  } catch (error) {
    console.error("CheckOut error:", error);
    return { success: false, error: "An internal error occurred.", errorCode: "INTERNAL_ERROR" };
  }
}

// ─── Late streak detection ─────────────────────────────────────

async function checkLateStreakPenalty(userId: string, today: Date) {
  try {
    const rules = await prisma.attendanceRules.findFirst();
    if (!rules || rules.lateStreakPenalty === "NONE") return;

    const streakDays = rules.lateStreakDays;

    // Get last N working days
    const recentRecords = await prisma.attendanceRecord.findMany({
      where: {
        userId,
        date: { lte: today },
        status: { in: ["LATE", "PRESENT"] },
      },
      orderBy: { date: "desc" },
      take: streakDays,
    });

    if (recentRecords.length < streakDays) return;

    const allLate = recentRecords.every((r) => r.isLate);
    if (!allLate) return;

    // Apply penalty
    if (rules.lateStreakPenalty === "HALF_DAY") {
      await prisma.attendanceRecord.update({
        where: { id: recentRecords[0].id },
        data: {
          isHalfDay: true,
          status: "HALF_DAY",
          overrideNote: `Auto-penalty: ${streakDays} consecutive late check-ins`,
        },
      });

      await createAuditLog(userId, "CHECK_IN", `Late streak penalty applied (${streakDays} consecutive late days → Half Day)`, {
        streakDays,
        penalty: "HALF_DAY",
      });
    }
  } catch (e) {
    // Non-blocking
    console.error("Late streak check failed:", e);
  }
}

// ─── Attendance summary ────────────────────────────────────────

export async function getAttendanceSummary(userId: string, year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day of month

  const records = await prisma.attendanceRecord.findMany({
    where: {
      userId,
      date: { gte: start, lte: end },
    },
    orderBy: { date: "asc" },
  });

  const schedule = await getEffectiveSchedule(userId);
  const holidays = await prisma.holiday.findMany({
    where: { date: { gte: start, lte: end } },
  });

  // Count working days
  let totalWorkingDays = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const dow = cursor.getDay();
    const isHol = holidays.some(
      (h) => h.date.toDateString() === cursor.toDateString()
    );
    const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dow] as keyof typeof schedule;
    if (!isHol && schedule[dayName]) totalWorkingDays++;
    cursor.setDate(cursor.getDate() + 1);
  }

  const presentDays = records.filter((r) => r.status === "PRESENT").length;
  const lateDays = records.filter((r) => r.status === "LATE").length;
  const halfDays = records.filter((r) => r.status === "HALF_DAY").length;
  const absentDays = records.filter((r) => r.status === "ABSENT").length;

  // Effective present = present + late + half_day*0.5
  const effectivePresent = presentDays + lateDays + halfDays * 0.5;
  const attendancePercentage = totalWorkingDays > 0
    ? Math.round((effectivePresent / totalWorkingDays) * 100)
    : 0;

  // Current late streak
  const recentLate = await prisma.attendanceRecord.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 10,
  });
  let lateStreak = 0;
  for (const r of recentLate) {
    if (r.isLate) lateStreak++;
    else break;
  }

  return {
    totalWorkingDays,
    presentDays,
    absentDays,
    lateDays,
    halfDays,
    attendancePercentage,
    lateStreak,
    records,
  };
}

// ─── Audit log helper ─────────────────────────────────────────

async function createAuditLog(
  userId: string,
  action: any,
  description: string,
  metadata?: object
) {
  return prisma.auditLog.create({
    data: { userId, action, description, metadata },
  }).catch(() => {}); // non-blocking
}
