// src/app/admin/salary/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SalaryRulesClient } from "@/components/admin/SalaryRulesClient";

export default async function SalaryPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");
  
  const rules = await prisma.salaryRules.findMany({
    orderBy: { createdAt: 'asc' }
  });
  
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="page-header">
        <h1 className="page-title">Salary Rules</h1>
        <p className="page-subtitle">Configure multiple salary formulas and assign them to employees based on their requirements.</p>
      </div>
      <SalaryRulesClient initialRules={JSON.parse(JSON.stringify(rules))} />
    </div>
  );
}
