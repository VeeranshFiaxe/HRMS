// src/app/admin/office/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OfficeSettingsForm } from "@/components/admin/OfficeSettingsForm";

export default async function OfficeSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const settings = await prisma.officeSettings.findFirst();
  const rules = await prisma.attendanceRules.findFirst();
  let defaultSalaryRule = await prisma.salaryRules.findFirst({ where: { isDefault: true } });
  if (!defaultSalaryRule) {
    defaultSalaryRule = await prisma.salaryRules.findFirst();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Office & Access Settings</h1>
        <p className="page-subtitle">Configure geofence, IP allowlist, attendance & default salary rules</p>
      </div>
      <OfficeSettingsForm
        settings={settings ? JSON.parse(JSON.stringify(settings)) : null}
        rules={rules ? JSON.parse(JSON.stringify(rules)) : null}
        defaultSalaryRule={defaultSalaryRule ? JSON.parse(JSON.stringify(defaultSalaryRule)) : null}
      />
    </div>
  );
}
