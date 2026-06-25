"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Users, Plus, Pencil, Trash2, MoreVertical, CheckSquare, XSquare, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface EmployeesClientProps {
  initialEmployees: any[];
  schedules?: any[];
  salaryRules?: any[];
}

const typeColors: Record<string, string> = {
  FULL_TIME: "text-emerald-700 bg-emerald-50",
  PART_TIME: "text-blue-700 bg-blue-50",
  INTERN: "text-purple-700 bg-purple-50",
  CONTRACT: "text-orange-700 bg-orange-50",
};

const typeOrder = { FULL_TIME: 1, INTERN: 2, PART_TIME: 3, CONTRACT: 4 };

export function EmployeesClient({ initialEmployees, schedules = [], salaryRules = [] }: EmployeesClientProps) {
  const router = useRouter();
  const [employees, setEmployees] = useState(initialEmployees);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filters & Sorting State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartments, setFilterDepartments] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [sortBy, setSortBy] = useState("name_asc");
  const [groupByDepartment, setGroupByDepartment] = useState(false);

  // Bulk action modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [selectedSalaryRuleId, setSelectedSalaryRuleId] = useState("");
  const [selectedType, setSelectedType] = useState("FULL_TIME");

  // Derived options
  const uniqueDepartments = Array.from(new Set(initialEmployees.map(e => e.department).filter(Boolean))) as string[];
  const employmentTypes = ["FULL_TIME", "INTERN", "PART_TIME", "CONTRACT"];

  // Handlers for single actions
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

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedIds.length === displayedEmployees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedEmployees.map(e => e.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x => x !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleBulkSubmit = async (action: string, payload?: any) => {
    try {
      const res = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, employeeIds: selectedIds, payload })
      });
      if (res.ok) {
        toast.success(`Bulk action successful`);
        router.refresh();
        setSelectionMode(false);
        setSelectedIds([]);
        setShowScheduleModal(false);
        setShowSalaryModal(false);
        setShowTypeModal(false);
      } else {
        toast.error("Failed to apply bulk action");
      }
    } catch {
      toast.error("Error applying bulk action");
    }
  };

  const onBulkActionSelect = (action: string) => {
    if (action === "deactivate") {
       if (confirm(`Deactivate ${selectedIds.length} employees?`)) handleBulkSubmit("DEACTIVATE");
    } else if (action === "delete") {
       if (confirm(`Permanently delete ${selectedIds.length} employees?`)) handleBulkSubmit("DELETE");
    } else if (action === "schedule") {
       setShowScheduleModal(true);
    } else if (action === "salary") {
       setShowSalaryModal(true);
    } else if (action === "type") {
       setShowTypeModal(true);
    }
  };

  // Filtering
  let displayedEmployees = employees.filter((emp) => {
    if (searchTerm && !emp.name.toLowerCase().includes(searchTerm.toLowerCase()) && !emp.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterDepartments.length > 0 && !filterDepartments.includes(emp.department || "")) return false;
    if (filterTypes.length > 0 && !filterTypes.includes(emp.employmentType)) return false;
    if (filterStatuses.length > 0) {
       const empStatus = emp.isActive ? "ACTIVE" : "INACTIVE";
       if (!filterStatuses.includes(empStatus)) return false;
    }
    if (dateRange.start && new Date(emp.joiningDate) < new Date(dateRange.start)) return false;
    if (dateRange.end && new Date(emp.joiningDate) > new Date(dateRange.end)) return false;
    return true;
  });

  // Sorting
  displayedEmployees.sort((a, b) => {
    if (groupByDepartment) {
      const deptA = a.department || "No Department";
      const deptB = b.department || "No Department";
      if (deptA !== deptB) return deptA.localeCompare(deptB);
      
      const typeA = typeOrder[a.employmentType as keyof typeof typeOrder] || 99;
      const typeB = typeOrder[b.employmentType as keyof typeof typeOrder] || 99;
      if (typeA !== typeB) return typeA - typeB;
      
      return a.name.localeCompare(b.name);
    }

    if (sortBy === "name_asc") return a.name.localeCompare(b.name);
    if (sortBy === "name_desc") return b.name.localeCompare(a.name);
    if (sortBy === "joined_asc") return new Date(a.joiningDate).getTime() - new Date(b.joiningDate).getTime();
    if (sortBy === "joined_desc") return new Date(b.joiningDate).getTime() - new Date(a.joiningDate).getTime();
    return 0;
  });

  // Grouping structure
  const groupedData: Record<string, typeof employees> = {};
  if (groupByDepartment) {
    displayedEmployees.forEach(emp => {
      const dept = emp.department || "No Department";
      if (!groupedData[dept]) groupedData[dept] = [];
      groupedData[dept].push(emp);
    });
  }

  const renderEmployeeRow = (emp: any) => (
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
  );

  return (
    <div className="space-y-6">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Showing {displayedEmployees.length} of {employees.length} employees</p>
        </div>
        <Link href="/admin/employees/new" className="btn-primary">
          <Plus size={16} />
          Add Employee
        </Link>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
            <input type="text" placeholder="Name or email..." className="input py-1.5 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Sort By</label>
            <select className="input py-1.5 text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)} disabled={groupByDepartment}>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="joined_desc">Newest First</option>
              <option value="joined_asc">Oldest First</option>
            </select>
          </div>

          <div className="flex items-center gap-2 h-[34px]">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={groupByDepartment} onChange={e => setGroupByDepartment(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              Group By Department
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end pt-2 border-t border-slate-100">
          <div>
             <label className="block text-xs font-medium text-slate-500 mb-1">Department</label>
             <select className="input py-1.5 text-sm" value="" onChange={e => {
                if (e.target.value && !filterDepartments.includes(e.target.value)) setFilterDepartments([...filterDepartments, e.target.value]);
             }}>
               <option value="" disabled>Add filter...</option>
               {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
             </select>
          </div>

          <div>
             <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
             <select className="input py-1.5 text-sm" value="" onChange={e => {
                if (e.target.value && !filterTypes.includes(e.target.value)) setFilterTypes([...filterTypes, e.target.value]);
             }}>
               <option value="" disabled>Add filter...</option>
               {employmentTypes.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
             </select>
          </div>

          <div>
             <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
             <select className="input py-1.5 text-sm" value="" onChange={e => {
                if (e.target.value && !filterStatuses.includes(e.target.value)) setFilterStatuses([...filterStatuses, e.target.value]);
             }}>
               <option value="" disabled>Add filter...</option>
               <option value="ACTIVE">Active</option>
               <option value="INACTIVE">Inactive</option>
             </select>
          </div>

          <div className="flex items-end gap-2">
            <div>
               <label className="block text-xs font-medium text-slate-500 mb-1">Joined After</label>
               <input type="date" className="input py-1.5 text-sm" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-500 mb-1">Joined Before</label>
               <input type="date" className="input py-1.5 text-sm" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
            </div>
          </div>
          
          <button onClick={() => {
             setSearchTerm(""); setFilterDepartments([]); setFilterTypes([]); setFilterStatuses([]); setDateRange({start: "", end: ""}); setGroupByDepartment(false); setSortBy("name_asc");
          }} className="btn-secondary py-1.5 text-sm h-[34px]">
             Clear Filters
          </button>
        </div>

        {/* Active Filter Badges */}
        {(filterDepartments.length > 0 || filterTypes.length > 0 || filterStatuses.length > 0) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {filterDepartments.map(d => (
               <span key={d} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                 Dept: {d} <X size={12} className="cursor-pointer" onClick={() => setFilterDepartments(filterDepartments.filter(x => x !== d))} />
               </span>
            ))}
            {filterTypes.map(t => (
               <span key={t} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">
                 Type: {t.replace("_", " ")} <X size={12} className="cursor-pointer" onClick={() => setFilterTypes(filterTypes.filter(x => x !== t))} />
               </span>
            ))}
            {filterStatuses.map(s => (
               <span key={s} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full">
                 Status: {s} <X size={12} className="cursor-pointer" onClick={() => setFilterStatuses(filterStatuses.filter(x => x !== s))} />
               </span>
            ))}
          </div>
        )}
      </div>

      {selectionMode && selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">{selectedIds.length} selected</span>
          <div className="flex gap-2">
            <select className="input py-1.5 text-sm w-auto" onChange={(e) => { onBulkActionSelect(e.target.value); e.target.value = ""; }} value="">
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
                  <input type="checkbox" checked={selectedIds.length === displayedEmployees.length && displayedEmployees.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
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
            {groupByDepartment ? (
               Object.entries(groupedData).sort(([a], [b]) => a.localeCompare(b)).map(([dept, emps]) => (
                  <Fragment key={dept}>
                    <tr className="bg-slate-50 border-b border-slate-200">
                       <td colSpan={selectionMode ? 7 : 6} className="py-2 px-4 text-sm font-bold text-slate-800">
                          {dept} <span className="text-slate-400 font-normal ml-2 text-xs">({emps.length})</span>
                       </td>
                    </tr>
                    {emps.map(renderEmployeeRow)}
                  </Fragment>
               ))
            ) : (
               displayedEmployees.map(renderEmployeeRow)
            )}
          </tbody>
        </table>
        {displayedEmployees.length === 0 && (
          <div className="py-16 text-center">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No employees match your filters</p>
          </div>
        )}
      </div>

      {/* Modals for Bulk Actions */}
      {showTypeModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
               <h3 className="text-lg font-bold text-slate-900 mb-4">Change Employment Type</h3>
               <p className="text-sm text-slate-500 mb-4">Select the new employment type for {selectedIds.length} employees.</p>
               <select className="input mb-6" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                  {employmentTypes.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
               </select>
               <div className="flex justify-end gap-3">
                  <button onClick={() => setShowTypeModal(false)} className="btn-secondary">Cancel</button>
                  <button onClick={() => handleBulkSubmit("CHANGE_TYPE", { employmentType: selectedType })} className="btn-primary">Apply Change</button>
               </div>
            </div>
         </div>
      )}

      {showScheduleModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
               <h3 className="text-lg font-bold text-slate-900 mb-4">Change Schedule</h3>
               <p className="text-sm text-slate-500 mb-4">Select a schedule to apply to {selectedIds.length} employees.</p>
               <select className="input mb-6" value={selectedScheduleId} onChange={e => setSelectedScheduleId(e.target.value)}>
                  <option value="" disabled>Select a schedule...</option>
                  <option value="default">-- Global Default Schedule --</option>
                  {schedules.map(s => <option key={s.id} value={s.id}>{s.name || "Default Company Schedule"}</option>)}
               </select>
               <div className="flex justify-end gap-3">
                  <button onClick={() => setShowScheduleModal(false)} className="btn-secondary">Cancel</button>
                  <button onClick={() => handleBulkSubmit("CHANGE_SCHEDULE", { scheduleId: selectedScheduleId })} className="btn-primary" disabled={!selectedScheduleId}>Apply Schedule</button>
               </div>
            </div>
         </div>
      )}

      {showSalaryModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
               <h3 className="text-lg font-bold text-slate-900 mb-4">Change Salary Rule</h3>
               <p className="text-sm text-slate-500 mb-4">Select a salary rule to apply to {selectedIds.length} employees.</p>
               <select className="input mb-6" value={selectedSalaryRuleId} onChange={e => setSelectedSalaryRuleId(e.target.value)}>
                  <option value="" disabled>Select a rule...</option>
                  <option value="default">-- Global Default Salary Rule --</option>
                  {salaryRules.map(s => <option key={s.id} value={s.id}>{s.name || "Default Salary Rule"}</option>)}
               </select>
               <div className="flex justify-end gap-3">
                  <button onClick={() => setShowSalaryModal(false)} className="btn-secondary">Cancel</button>
                  <button onClick={() => handleBulkSubmit("CHANGE_SALARY_RULE", { salaryRuleId: selectedSalaryRuleId })} className="btn-primary" disabled={!selectedSalaryRuleId}>Apply Rule</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
