// src/app/admin/employees/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { Users, Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-6">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{employees.length} total members</p>
        </div>
        <Link href="/admin/employees/new" className="btn-primary">
          <Plus size={16} />
          Add Employee
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role / Department</th>
              <th>Type</th>
              <th>Joined</th>
              <th>Schedule</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {emp.name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{emp.name}</p>
                      <p className="text-xs text-slate-400">{emp.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <p className="text-slate-900">{emp.designation || "—"}</p>
                  <p className="text-xs text-slate-400">{emp.department || "—"}</p>
                </td>
                <td>
                  <span className={cn("badge", typeColors[emp.employmentType] || "bg-slate-100 text-slate-600")}>
                    {emp.employmentType.replace("_", " ")}
                  </span>
                </td>
                <td className="text-slate-500 text-sm">
                  {format(emp.joiningDate, "MMM yyyy")}
                </td>
                <td>
                  {emp.customSchedule ? (
                    <span className="badge bg-purple-50 text-purple-700">Custom</span>
                  ) : (
                    <span className="badge bg-slate-100 text-slate-600">Default</span>
                  )}
                </td>
                <td>
                  <span className={cn(
                    "badge",
                    emp.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                  )}>
                    {emp.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <Link
                    href={`/admin/employees/${emp.id}`}
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Pencil size={13} />
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && (
          <div className="py-16 text-center">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No employees yet</p>
            <Link href="/admin/employees/new" className="btn-primary mt-4 inline-flex">
              Add first employee
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
