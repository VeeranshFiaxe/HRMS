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

  const typeColors: Record<string, string> = {
    FULL_TIME: "text-emerald-700 bg-emerald-50",
    PART_TIME: "text-blue-700 bg-blue-50",
    INTERN: "text-purple-700 bg-purple-50",
    CONTRACT: "text-orange-700 bg-orange-50",
  };

  return <EmployeesClient initialEmployees={JSON.parse(JSON.stringify(employees))} />;
}
