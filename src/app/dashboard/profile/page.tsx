// src/app/dashboard/profile/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/employee/ProfileForm";
import { ProfileTabs } from "@/components/employee/ProfileTabs";
import { getAttendanceSummary } from "@/lib/attendance-engine";
import { getOrCreateLeaveBalance } from "@/lib/leave-engine";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { customSchedule: true },
  });

  if (!user) redirect("/auth/login");

  const companySchedule = await prisma.companySchedule.findFirst();
  const attendanceRules = await prisma.attendanceRules.findFirst();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Attendance summary
  const attendanceSummary = await getAttendanceSummary(userId, year, month);

  // Leave balance (non-blocking)
  let leaveBalance = null;
  try {
    const balance = await getOrCreateLeaveBalance(userId, year);
    leaveBalance = {
      allocated: balance.allocated,
      used: balance.used,
      carried: balance.carried,
      available: balance.allocated + balance.carried - balance.used,
    };
  } catch { /* ignore */ }

  // Recent leave requests
  const recentLeaves = await prisma.leaveRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Schedule
  const schedule = user.customSchedule || companySchedule;
  const scheduleData = schedule ? {
    name: companySchedule?.name,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    isCustom: !!user.customSchedule,
  } : null;

  const profileData = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      designation: user.designation,
      employmentType: user.employmentType,
      joiningDate: user.joiningDate.toISOString(),
      phone: user.phone,
    },
    attendanceSummary: {
      totalWorkingDays: attendanceSummary.totalWorkingDays,
      presentDays: attendanceSummary.presentDays,
      lateDays: attendanceSummary.lateDays,
      halfDays: attendanceSummary.halfDays,
      absentDays: attendanceSummary.absentDays,
      onLeaveDays: attendanceSummary.onLeaveDays ?? 0,
      totalHoursWorked: attendanceSummary.totalHoursWorked ?? 0,
      attendancePercentage: attendanceSummary.attendancePercentage,
    },
    leaveBalance,
    recentLeaves: recentLeaves.map(r => ({
      id: r.id,
      fromDate: r.fromDate.toISOString(),
      toDate: r.toDate.toISOString(),
      totalDays: r.totalDays,
      leaveType: r.leaveType,
      status: r.status,
      isPaid: r.isPaid,
    })),
    schedule: scheduleData,
    attendanceRules: attendanceRules ? {
      graceMinutes: attendanceRules.graceMinutes,
      minHoursFullDay: attendanceRules.minHoursFullDay,
      minHoursHalfDay: attendanceRules.minHoursHalfDay,
      lateStreakDays: attendanceRules.lateStreakDays,
      lateStreakPenalty: attendanceRules.lateStreakPenalty,
      regularisationLimit: attendanceRules.regularizationLimitPerMonth,
    } : null,
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Your account, attendance and leave summary</p>
      </div>

      {/* Edit form still available at top */}
      <ProfileForm
        user={JSON.parse(JSON.stringify(user))}
        schedule={schedule ? JSON.parse(JSON.stringify(schedule)) : null}
        isCustomSchedule={!!user.customSchedule}
      />

      {/* Summary tabs */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Summaries</h2>
        <ProfileTabs data={JSON.parse(JSON.stringify(profileData))} />
      </div>
    </div>
  );
}
