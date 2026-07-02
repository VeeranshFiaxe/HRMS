// src/components/employee/ProfileTabs.tsx
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { cn, getStatusColor, getStatusLabel } from "@/lib/utils";
import { User, Clock, CalendarDays, DollarSign, Settings } from "lucide-react";

interface ProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    department: string | null;
    designation: string | null;
    employmentType: string;
    joiningDate: string;
    phone: string | null;
  };
  attendanceSummary: {
    totalWorkingDays: number;
    presentDays: number;
    lateDays: number;
    halfDays: number;
    absentDays: number;
    onLeaveDays: number;
    totalHoursWorked: number;
    attendancePercentage: number;
  };
  leaveBalance: {
    allocated: number;
    used: number;
    carried: number;
    available: number;
  } | null;
  recentLeaves: Array<{
    id: string;
    fromDate: string;
    toDate: string;
    totalDays: number;
    leaveType: string;
    status: string;
    isPaid: boolean;
  }>;
  schedule: {
    name?: string;
    startTime: string;
    endTime: string;
    isCustom: boolean;
  } | null;
  salaryRule: {
    name: string;
    baseSalary: number;
    paidLeaveDaysPerMonth: number;
  } | null;
  payrollPreview: {
    netSalary: number;
    baseSalary: number;
    totalDeductions: number;
    workedDays: number;
    month: number;
    year: number;
  } | null;
}

const TABS = [
  { id: "overview", label: "Overview", icon: User },
  { id: "attendance", label: "Attendance", icon: Clock },
  { id: "leave", label: "Leave", icon: CalendarDays },
  { id: "payroll", label: "Payroll", icon: DollarSign },
  { id: "schedule", label: "Schedule", icon: Settings },
];

const STATUS_STYLE: Record<string, string> = {
  PENDING:   "text-amber-700 bg-amber-50",
  APPROVED:  "text-emerald-700 bg-emerald-50",
  REJECTED:  "text-red-700 bg-red-50",
  CANCELLED: "text-slate-500 bg-slate-100",
};

export function ProfileTabs({ data }: { data: ProfileData }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Overview Tab ─── */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-slate-900">Personal Information</h3>
            {[
              { label: "Full Name", value: data.user.name },
              { label: "Email", value: data.user.email },
              { label: "Phone", value: data.user.phone || "—" },
              { label: "Department", value: data.user.department || "—" },
              { label: "Designation", value: data.user.designation || "—" },
              { label: "Employment Type", value: data.user.employmentType?.replace("_", " ") || "—" },
              { label: "Joining Date", value: format(new Date(data.user.joiningDate), "dd MMM yyyy") },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-500">{item.label}</span>
                <span className="text-sm font-medium text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{data.attendanceSummary.attendancePercentage}%</p>
              <p className="text-xs text-slate-500 mt-1">This Month Attendance</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{data.attendanceSummary.totalHoursWorked}h</p>
              <p className="text-xs text-slate-500 mt-1">Hours Worked (Month)</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{data.leaveBalance?.available ?? "—"}</p>
              <p className="text-xs text-slate-500 mt-1">Leave Balance</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {data.payrollPreview ? `₹${data.payrollPreview.netSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Est. Net Pay</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Attendance Tab ─── */}
      {activeTab === "attendance" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Working Days", value: data.attendanceSummary.totalWorkingDays, color: "text-slate-900" },
              { label: "Present", value: data.attendanceSummary.presentDays, color: "text-emerald-600" },
              { label: "Late", value: data.attendanceSummary.lateDays, color: "text-amber-600" },
              { label: "Half Days", value: data.attendanceSummary.halfDays, color: "text-orange-600" },
              { label: "Absent", value: data.attendanceSummary.absentDays, color: "text-red-600" },
              { label: "On Leave", value: data.attendanceSummary.onLeaveDays, color: "text-blue-600" },
            ].map(stat => (
              <div key={stat.label} className="card p-4 text-center">
                <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Attendance Rate</span>
              <span className="font-bold text-blue-600">{data.attendanceSummary.attendancePercentage}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${data.attendanceSummary.attendancePercentage}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-slate-500">Total Hours Worked</span>
              <span className="font-bold text-purple-600">{data.attendanceSummary.totalHoursWorked}h</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Leave Tab ─── */}
      {activeTab === "leave" && (
        <div className="space-y-4">
          {data.leaveBalance && (
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{data.leaveBalance.allocated}</p>
                <p className="text-xs text-slate-500 mt-1">Allocated</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{data.leaveBalance.used}</p>
                <p className="text-xs text-slate-500 mt-1">Used</p>
              </div>
              <div className="card p-4 text-center">
                <p className={cn("text-2xl font-bold",
                  data.leaveBalance.available > 5 ? "text-emerald-600" :
                  data.leaveBalance.available > 0 ? "text-amber-600" : "text-red-600")}>
                  {data.leaveBalance.available}
                </p>
                <p className="text-xs text-slate-500 mt-1">Available</p>
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">Recent Leave Requests</h3>
            </div>
            {data.recentLeaves.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">No leave requests</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentLeaves.map(req => (
                  <div key={req.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("badge text-xs", STATUS_STYLE[req.status])}>{req.status}</span>
                        <span className={cn("badge text-xs", req.isPaid ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50")}>
                          {req.isPaid ? "Paid" : "Unpaid"}
                        </span>
                        <span className="text-xs text-slate-600">{req.leaveType}</span>
                      </div>
                      <p className="text-sm text-slate-700 mt-0.5">
                        {format(new Date(req.fromDate), "dd MMM")}
                        {req.fromDate !== req.toDate && ` – ${format(new Date(req.toDate), "dd MMM yyyy")}`}
                        {req.fromDate === req.toDate && ` ${new Date(req.fromDate).getFullYear()}`}
                        {" "}· {req.totalDays} day{req.totalDays !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Payroll Tab ─── */}
      {activeTab === "payroll" && (
        <div className="space-y-4">
          {data.payrollPreview ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">₹{data.payrollPreview.baseSalary.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">Base Salary</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">₹{data.payrollPreview.totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-slate-500 mt-1">Deductions</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">₹{data.payrollPreview.netSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-slate-500 mt-1">Est. Net Pay</p>
                </div>
              </div>
              <div className="card p-5">
                <p className="text-xs text-slate-500 text-center">
                  Estimate for {new Date(data.payrollPreview.year, data.payrollPreview.month - 1).toLocaleString("default", { month: "long" })} {data.payrollPreview.year}
                  · {data.payrollPreview.workedDays} days worked
                </p>
              </div>
            </>
          ) : (
            <div className="card p-10 text-center">
              <p className="text-slate-400 text-sm">No salary information configured</p>
            </div>
          )}
          {data.salaryRule && (
            <div className="card p-5 space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm">Salary Rule: {data.salaryRule.name}</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Base Salary</span>
                <span className="font-medium">₹{data.salaryRule.baseSalary.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Paid Leaves/Month</span>
                <span className="font-medium">{data.salaryRule.paidLeaveDaysPerMonth}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Schedule Tab ─── */}
      {activeTab === "schedule" && (
        <div className="card p-5 space-y-3">
          {data.schedule ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-900">
                  {data.schedule.name || "Work Schedule"}
                </h3>
                <span className={cn("badge text-xs",
                  data.schedule.isCustom ? "text-blue-700 bg-blue-50" : "text-slate-500 bg-slate-100")}>
                  {data.schedule.isCustom ? "Custom" : "Company Default"}
                </span>
              </div>
              {[
                { label: "Start Time", value: data.schedule.startTime },
                { label: "End Time", value: data.schedule.endTime },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-500">{item.label}</span>
                  <span className="text-sm font-medium text-slate-900">{item.value}</span>
                </div>
              ))}
            </>
          ) : (
            <p className="text-slate-400 text-sm text-center py-4">No schedule assigned</p>
          )}
        </div>
      )}
    </div>
  );
}
