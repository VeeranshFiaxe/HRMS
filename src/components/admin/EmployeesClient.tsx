"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Users, Plus, Pencil, Trash2, MoreVertical, CheckSquare, XSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface EmployeesClientProps {
  initialEmployees: any[];
}

const typeColors: Record<string, string> = {
  FULL_TIME: "text-emerald-700 bg-emerald-50",
  PART_TIME: "text-blue-700 bg-blue-50",
  INTERN: "text-purple-700 bg-purple-50",
  CONTRACT: "text-orange-700 bg-orange-50",
};

export function EmployeesClient({ initialEmployees }: EmployeesClientProps) {
  const router = useRouter();
  const [employees, setEmployees] = useState(initialEmployees);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelectAll = () => {
    if (selectedIds.length === employees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(employees.map(e => e.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const deactivateEmployee = async (id: string, name: string) => {
    if (!confirm(`Deactivate ${name}?`)) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`Deactivated ${name}`);
        router.refresh();
      }
    } catch {
      toast.error("Failed to deactivate");
    }
  };

  const reactivateEmployee = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true })
      });
      if (res.ok) {
        toast.success(`Reactivated ${name}`);
        router.refresh();
      }
    } catch {
      toast.error("Failed to reactivate");
    }
  };

  const hardDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`Permanently delete ${name}? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/employees/${id}/hard-delete`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`Deleted ${name}`);
        router.refresh();
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.length === 0) return;
    
    // In a real implementation we would hit a bulk API route here
    toast.success(`Bulk ${action} applied to ${selectedIds.length} employees (Simulated)`);
    setSelectionMode(false);
    setSelectedIds([]);
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

      {selectionMode && selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">{selectedIds.length} selected</span>
          <div className="flex gap-2">
            <select className="input py-1.5 text-sm w-auto" onChange={(e) => handleBulkAction(e.target.value)} value="">
              <option value="" disabled>Bulk Actions</option>
              <option value="deactivate">Deactivate</option>
              <option value="delete">Delete</option>
              <option value="schedule">Change Schedule</option>
              <option value="salary">Change Salary Rule</option>
              <option value="type">Change Type</option>
            </select>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              {selectionMode && (
                <th className="w-10">
                  <input type="checkbox" checked={selectedIds.length === employees.length && employees.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                </th>
              )}
              <th>Employee</th>
              <th>Role / Department</th>
              <th>Type</th>
              <th>Joined</th>
              <th>Status</th>
              <th className="text-right">
                <button onClick={() => { setSelectionMode(!selectionMode); setSelectedIds([]); }} className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded">
                  {selectionMode ? "Cancel" : "Select"}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className={selectedIds.includes(emp.id) ? "bg-blue-50/50" : ""}>
                {selectionMode && (
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(emp.id)} onChange={() => toggleSelect(emp.id)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  </td>
                )}
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
                  {format(new Date(emp.joiningDate), "MMM yyyy")}
                </td>
                <td>
                  <span className={cn("badge", emp.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
                    {emp.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-right flex items-center justify-end gap-3">
                  <Link href={`/admin/employees/${emp.id}`} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                    <Pencil size={16} />
                  </Link>
                  {emp.isActive ? (
                    <button onClick={() => deactivateEmployee(emp.id, emp.name)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Deactivate">
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <div className="relative group">
                      <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreVertical size={16} />
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 flex flex-col overflow-hidden">
                        <button onClick={() => reactivateEmployee(emp.id, emp.name)} className="px-4 py-2 text-sm text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                          <CheckSquare size={14} className="text-emerald-500"/> Reactivate
                        </button>
                        <button onClick={() => hardDeleteEmployee(emp.id, emp.name)} className="px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2">
                          <XSquare size={14} className="text-red-500"/> Permanently Delete
                        </button>
                      </div>
                    </div>
                  )}
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
