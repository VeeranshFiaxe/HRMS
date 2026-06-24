// src/app/admin/audit/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Shield } from "lucide-react";

export default async function AuditPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  const actionColors: Record<string, string> = {
    CHECK_IN: "bg-emerald-50 text-emerald-700",
    CHECK_OUT: "bg-blue-50 text-blue-700",
    LOGIN: "bg-slate-100 text-slate-600",
    LOGOUT: "bg-slate-100 text-slate-600",
    PASSWORD_CHANGE: "bg-amber-50 text-amber-700",
    EMPLOYEE_CREATE: "bg-purple-50 text-purple-700",
    EMPLOYEE_UPDATE: "bg-purple-50 text-purple-700",
    EMPLOYEE_DELETE: "bg-red-50 text-red-700",
    ADMIN_RULE_CHANGE: "bg-orange-50 text-orange-700",
    GEOFENCE_CHANGE: "bg-orange-50 text-orange-700",
    IP_SETTING_CHANGE: "bg-orange-50 text-orange-700",
    SALARY_RULE_CHANGE: "bg-yellow-50 text-yellow-700",
    SCHEDULE_UPDATE: "bg-cyan-50 text-cyan-700",
    HOLIDAY_CREATE: "bg-pink-50 text-pink-700",
    HOLIDAY_DELETE: "bg-red-50 text-red-700",
    ATTENDANCE_OVERRIDE: "bg-red-50 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">Full trail of all system actions — last 100 entries</p>
      </div>

      <div className="card overflow-hidden">
        <div className="divide-y divide-slate-100">
          {logs.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <Shield size={32} className="mx-auto mb-3 opacity-40" />
              <p>No audit logs yet</p>
            </div>
          )}
          {logs.map(log => (
            <div key={log.id} className="px-5 py-3.5 flex items-start gap-4">
              <div className="flex-shrink-0 pt-0.5">
                <span className={`badge text-xs font-mono px-2 py-0.5 ${actionColors[log.action] || "bg-slate-100 text-slate-600"}`}>
                  {log.action}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800">{log.description}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {log.user ? `${log.user.name} (${log.user.email})` : "System"}
                  {log.ipAddress && ` · ${log.ipAddress}`}
                </p>
              </div>
              <div className="text-xs text-slate-400 flex-shrink-0 tabular-nums">
                {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
