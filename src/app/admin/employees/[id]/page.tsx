// src/app/admin/employees/[id]/page.tsx
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditEmployeeForm } from "@/components/admin/EditEmployeeForm";

export default async function EditEmployeePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const employee = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      customSchedule: true,
      salaryRuleOverride: true,
    },
  });

  if (!employee) notFound();

  const companySchedule = await prisma.companySchedule.findFirst();
  const salaryRules = await prisma.salaryRules.findFirst();

  return (
    <EditEmployeeForm
      employee={JSON.parse(JSON.stringify(employee))}
      companySchedule={JSON.parse(JSON.stringify(companySchedule))}
      salaryRules={JSON.parse(JSON.stringify(salaryRules))}
    />
  );
}
