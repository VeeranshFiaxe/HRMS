import { prisma } from "@/lib/prisma";
import { getAttendanceSummary } from "@/lib/attendance-engine";

export async function calculateSalary(userId: string, year: number, month: number) {
  // 1. Fetch Summary
  const summary = await getAttendanceSummary(userId, year, month);

  // 2. Fetch User & Rules
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { salaryRuleOverride: true },
  });
  const defaultRules = await prisma.salaryRules.findFirst();

  if (!user) throw new Error("User not found");

  // Determine Effective Rules
  const override = user.salaryRuleOverride;
  const baseSalary = override?.baseSalary || 0;
  
  if (!baseSalary) {
    return {
      success: false,
      error: "No base salary configured for this employee or company default.",
    };
  }

  const paidLeaveDaysPerMonth = override?.paidLeaveDaysPerMonth ?? defaultRules?.paidLeaveDaysPerMonth ?? 0;

  // 3. Calculation logic as defined by user:
  // Days Worked: full day = +1, half day = +0.5, three late days = +3-0.5
  
  const presentFullDays = summary.records.filter(r => r.status === "PRESENT" && !r.isLate).length;
  const lateDays = summary.records.filter(r => r.isLate).length;
  const halfDays = summary.records.filter(r => r.status === "HALF_DAY").length;
  const absentDays = summary.records.filter(r => r.status === "ABSENT").length;

  // Each late day counts as a worked day, but there is a penalty:
  const latePenalty = Math.floor(lateDays / 3) * 0.5;

  // Paid Leaves calculation:
  // Absences and half days are subtracted from Paid Leaves if available
  let remainingPaidLeaves = paidLeaveDaysPerMonth;
  
  let unpaidAbsences = 0;
  for (let i = 0; i < absentDays; i++) {
    if (remainingPaidLeaves >= 1) {
      remainingPaidLeaves -= 1;
    } else {
      unpaidAbsences += 1;
    }
  }

  // We consider Half Days as 0.5 worked. If there are leaves, do we use them to cover the other 0.5?
  // The user says "The salary calculation should be (Base Salary / Total Working Days in Month) * (Days Worked + Paid Leaves)"
  // So Paid Leaves is simply the number of leaves utilized to cover non-working time.
  const leavesUtilized = paidLeaveDaysPerMonth - remainingPaidLeaves;
  
  const daysWorked = presentFullDays + lateDays + (halfDays * 0.5) - latePenalty;
  
  const totalPaidDays = daysWorked + leavesUtilized;
  
  // Total Working Days in Month
  const totalWorkingDays = summary.totalWorkingDays;

  const perDayRate = totalWorkingDays > 0 ? baseSalary / totalWorkingDays : 0;
  let netEarned = perDayRate * totalPaidDays;

  // Cap the net earned to base salary (cannot earn more than base)
  if (netEarned > baseSalary) netEarned = baseSalary;

  return {
    success: true,
    data: {
      baseSalary,
      totalWorkingDays,
      perDayRate,
      presentFullDays,
      lateDays,
      halfDays,
      absentDays,
      latePenalty,
      paidLeavesAllowed: paidLeaveDaysPerMonth,
      paidLeavesUtilized: leavesUtilized,
      daysWorked,
      totalPaidDays,
      netEarned,
      currency: "₹"
    }
  };
}
