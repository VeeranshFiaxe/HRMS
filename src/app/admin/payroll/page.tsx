// src/app/admin/payroll/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PayrollClient } from "@/components/admin/PayrollClient";

export const dynamic = "force-dynamic";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string; department?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const now = new Date();
  const year = parseInt(searchParams.year || now.getFullYear().toString());
  const month = parseInt(searchParams.month || (now.getMonth() + 1).toString());
  const department = searchParams.department || "";

  const employees = await prisma.user.findMany({
    where: { isActive: true, role: "EMPLOYEE" },
    select: { id: true, name: true, department: true },
    orderBy: { name: "asc" },
  });

  return (
    <PayrollClient
      employees={JSON.parse(JSON.stringify(employees))}
      year={year}
      month={month}
      department={department}
    />
  );
}
