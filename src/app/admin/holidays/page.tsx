// src/app/admin/holidays/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HolidayManager } from "@/components/admin/HolidayManager";

export default async function HolidaysPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");
  const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Holiday Manager</h1>
        <p className="page-subtitle">Define public holidays — these days are excluded from attendance and salary calculations</p>
      </div>
      <HolidayManager holidays={JSON.parse(JSON.stringify(holidays))} />
    </div>
  );
}
