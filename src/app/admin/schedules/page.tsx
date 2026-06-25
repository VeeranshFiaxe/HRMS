// src/app/admin/schedules/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SchedulesClient } from "@/components/admin/SchedulesClient";

export default async function SchedulesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");
  
  const schedules = await prisma.companySchedule.findMany({
    orderBy: { createdAt: 'asc' }
  });
  
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="page-header">
        <h1 className="page-title">Company Schedules</h1>
        <p className="page-subtitle">Manage company working hours. You can define multiple schedules and assign them to specific employees.</p>
      </div>
      <SchedulesClient initialSchedules={JSON.parse(JSON.stringify(schedules))} />
    </div>
  );
}
