// src/types/index.ts
// Shared TypeScript types for the HRMS application

export type UserRole = "ADMIN" | "EMPLOYEE";
export type EmploymentType = "FULL_TIME" | "PART_TIME" | "INTERN" | "CONTRACT";
export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "HALF_DAY"
  | "ON_LEAVE"
  | "HOLIDAY"
  | "WEEKEND";

// ─── User ────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employmentType: EmploymentType;
  department?: string | null;
  designation?: string | null;
  phone?: string | null;
  avatar?: string | null;
  joiningDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithSchedule extends User {
  customSchedule?: EmployeeSchedule | null;
}

// ─── Schedule ────────────────────────────────────────────────

export interface WorkSchedule {
  startTime: string;   // "HH:mm"
  endTime: string;
  lateAfter: string;
  halfDayAfter: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface CompanySchedule extends WorkSchedule {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeSchedule extends WorkSchedule {
  id: string;
  userId: string;
  note?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Attendance ───────────────────────────────────────────────

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: Date;
  checkInAt?: Date | null;
  checkOutAt?: Date | null;
  checkInIp?: string | null;
  checkOutIp?: string | null;
  checkInLat?: number | null;
  checkInLng?: number | null;
  checkOutLat?: number | null;
  checkOutLng?: number | null;
  checkInIpValid?: boolean | null;
  checkInGeoValid?: boolean | null;
  checkOutIpValid?: boolean | null;
  checkOutGeoValid?: boolean | null;
  status: AttendanceStatus;
  isLate: boolean;
  isHalfDay: boolean;
  lateMinutes: number;
  overriddenBy?: string | null;
  overrideNote?: string | null;
  overriddenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export interface AttendanceWithUser extends AttendanceRecord {
  user: User;
}

// ─── Office Settings ──────────────────────────────────────────

export interface OfficeSettings {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  geofenceEnabled: boolean;
  allowedIps: string[];
  ipCheckEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Attendance Rules ─────────────────────────────────────────

export interface AttendanceRules {
  id: string;
  lateStreakDays: number;
  lateStreakPenalty: string;
  graceMinutes: number;
  autoAbsentAfter: string;
  minHoursFullDay: number;
  minHoursHalfDay: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Salary Rules ──────────────────────────────────────────────

export interface SalaryRules {
  id: string;
  halfDayDeductionFactor: number;
  lateDeductionPerDay: number;
  absentDeductionFactor: number;
  paidLeaveDaysPerMonth: number;
  note?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalaryRuleOverride {
  id: string;
  userId: string;
  baseSalary?: number | null;
  halfDayDeductionFactor?: number | null;
  absentDeductionFactor?: number | null;
  paidLeaveDaysPerMonth?: number | null;
  customFormula?: string | null;
  note?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Holiday ───────────────────────────────────────────────────

export interface Holiday {
  id: string;
  name: string;
  date: Date;
  isOptional: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Audit Log ─────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  user?: User;
}

// ─── API Responses ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CheckInPayload {
  lat?: number;
  lng?: number;
}

export interface CheckOutPayload {
  lat?: number;
  lng?: number;
}

export interface AttendanceSummary {
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  attendancePercentage: number;
  lateStreak: number;
}

export interface DashboardStats {
  totalEmployees: number;
  checkedInToday: number;
  absentToday: number;
  lateToday: number;
}

// ─── Form Types ───────────────────────────────────────────────

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface CreateEmployeeFormData {
  email: string;
  name: string;
  role: UserRole;
  employmentType: EmploymentType;
  department: string;
  designation: string;
  phone?: string;
  joiningDate: string;
  password: string;
}

export interface UpdateEmployeeFormData {
  name?: string;
  role?: UserRole;
  employmentType?: EmploymentType;
  department?: string;
  designation?: string;
  phone?: string;
  isActive?: boolean;
}
