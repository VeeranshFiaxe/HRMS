// src/app/admin/salary/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SalaryRulesForm } from "@/components/admin/SalaryRulesForm";

export default async function SalaryPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");
  const rules = await prisma.salaryRules.findFirst();
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Salary Rules</h1>
        <p className="page-subtitle">Configure how salary is calculated based on attendance</p>
      </div>
      <SalaryRulesForm rules={rules ? JSON.parse(JSON.stringify(rules)) : null} />
    </div>
  );
}
