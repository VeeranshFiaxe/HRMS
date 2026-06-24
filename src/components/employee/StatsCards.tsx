// src/components/employee/StatsCards.tsx
import { CheckCircle, XCircle, Clock, AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  summary: {
    totalWorkingDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    halfDays: number;
    attendancePercentage: number;
    lateStreak: number;
  };
}

export function StatsCards({ summary }: StatsCardsProps) {
  const cards = [
    {
      label: "Attendance",
      value: `${summary.attendancePercentage}%`,
      sub: `${summary.presentDays + summary.lateDays} / ${summary.totalWorkingDays} days`,
      icon: TrendingUp,
      color: summary.attendancePercentage >= 90
        ? "text-emerald-600 bg-emerald-100"
        : summary.attendancePercentage >= 75
        ? "text-amber-600 bg-amber-100"
        : "text-red-600 bg-red-100",
      valueColor: summary.attendancePercentage >= 90
        ? "text-emerald-700"
        : summary.attendancePercentage >= 75
        ? "text-amber-700"
        : "text-red-700",
    },
    {
      label: "Present",
      value: summary.presentDays,
      sub: "Full days this month",
      icon: CheckCircle,
      color: "text-emerald-600 bg-emerald-100",
      valueColor: "text-slate-900",
    },
    {
      label: "Absent",
      value: summary.absentDays,
      sub: "Days missed this month",
      icon: XCircle,
      color: "text-red-600 bg-red-100",
      valueColor: summary.absentDays > 0 ? "text-red-600" : "text-slate-900",
    },
    {
      label: "Late",
      value: summary.lateDays,
      sub: summary.lateStreak > 0 ? `${summary.lateStreak} day streak ⚠️` : "No streak",
      icon: Clock,
      color: "text-amber-600 bg-amber-100",
      valueColor: summary.lateDays > 0 ? "text-amber-600" : "text-slate-900",
    },
    {
      label: "Half Days",
      value: summary.halfDays,
      sub: "Half-day records",
      icon: AlertCircle,
      color: "text-orange-600 bg-orange-100",
      valueColor: summary.halfDays > 0 ? "text-orange-600" : "text-slate-900",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="stat-card">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-2", card.color)}>
              <Icon size={18} />
            </div>
            <p className={cn("text-2xl font-bold", card.valueColor)}>{card.value}</p>
            <p className="text-xs font-medium text-slate-500">{card.label}</p>
            <p className="text-xs text-slate-400">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
