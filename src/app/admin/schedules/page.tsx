// src/app/admin/schedules/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ScheduleSettingsForm } from "@/components/admin/ScheduleSettingsForm";

export default async function SchedulesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");
  const schedule = await prisma.companySchedule.findFirst();
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Company Schedule</h1>
        <p className="page-subtitle">Default working hours applied to all employees without a custom schedule</p>
      </div>
      <ScheduleSettingsForm schedule={schedule ? JSON.parse(JSON.stringify(schedule)) : null} />
    </div>
  );
}
