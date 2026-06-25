// src/app/admin/employees/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { Users, Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmployeesClient } from "@/components/admin/EmployeesClient";

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const employees = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      customSchedule: true,
      _count: {
        select: { attendanceRecords: true },
      },
    },
  });

  const schedules = await prisma.companySchedule.findMany({
    orderBy: { createdAt: "desc" }
  });

  const salaryRules = await prisma.salaryRules.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <EmployeesClient 
      initialEmployees={JSON.parse(JSON.stringify(employees))} 
      schedules={JSON.parse(JSON.stringify(schedules))}
      salaryRules={JSON.parse(JSON.stringify(salaryRules))}
    />
  );
}
