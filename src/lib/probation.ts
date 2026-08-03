// src/lib/probation.ts
// Probation period + paid-leave eligibility helpers.
// Joining Date → Probation Period → Probation End Date → Leave Eligibility.

import { addMonths } from "date-fns";

type ProbationUser = {
  employmentType: string;
  joiningDate: Date;
  probationMonths?: number | null;
};

const DEFAULT_PROBATION_MONTHS: Record<string, number> = {
  INTERN: 1,
};
const DEFAULT_PROBATION_MONTHS_FALLBACK = 3; // FULL_TIME, PART_TIME, CONTRACT

export function getProbationMonths(user: ProbationUser): number {
  if (user.probationMonths != null) return user.probationMonths;
  return DEFAULT_PROBATION_MONTHS[user.employmentType] ?? DEFAULT_PROBATION_MONTHS_FALLBACK;
}

export function getProbationEndDate(user: ProbationUser): Date {
  return addMonths(new Date(user.joiningDate), getProbationMonths(user));
}

export function isInProbation(user: ProbationUser, asOfDate: Date = new Date()): boolean {
  return asOfDate < getProbationEndDate(user);
}

/**
 * Pro-rata annual leave entitlement for the given leave year, based on when
 * the employee becomes eligible (probation end date), ~2 leaves/eligible
 * month with a half-month split on the eligibility month itself.
 * Verified against spec examples: Jan(day<=15)->24, Oct(day<=15)->6, Oct(day>15)->5.
 */
export function getFullTimeAnnualEntitlement(user: ProbationUser, year: number, baseAnnual: number): number {
  const elig = getProbationEndDate(user);
  const eligYear = elig.getFullYear();

  if (eligYear > year) return 0; // not yet eligible at all this leave year
  if (eligYear < year) return baseAnnual; // fully eligible before this year started

  const monthlyRate = baseAnnual / 12;
  const monthsRemaining = 12 - elig.getMonth(); // elig.getMonth() is 0-indexed
  const halfMonthPenalty = elig.getDate() > 15 ? monthlyRate : 0;
  const entitlement = monthsRemaining * monthlyRate - halfMonthPenalty;
  return Math.max(0, Math.round(entitlement * 100) / 100);
}
