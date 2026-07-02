// src/components/admin/LeaveManagementClient.tsx
"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Check, X, Ban, ChevronDown, Filter, CalendarDays, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface LeaveRequest {
  id: string;
  userId: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string | null;
  leaveType: string;
  isPaid: boolean;
  status: string;
  adminNote: string | null;
  approvedBy: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    department: string | null;
    designation: string | null;
    employmentType: string;
  };
}

interface Props {
  requests: LeaveRequest[];
  employees: Array<{ id: string; name: string; department: string | null }>;
  year: number;
  month: number;
  filterStatus: string;
  filterUserId: string;
  filterDept: string;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING:   "text-amber-700 bg-amber-50",
  APPROVED:  "text-emerald-700 bg-emerald-50",
  REJECTED:  "text-red-700 bg-red-50",
  CANCELLED: "text-slate-500 bg-slate-100",
};

const LEAVE_TYPE_LABEL: Record<string, string> = {
  CASUAL: "Casual",
  SICK: "Sick",
  ANNUAL: "Annual",
  UNPAID: "Unpaid",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function LeaveManagementClient({ requests, employees, year, month, filterStatus, filterUserId, filterDept }: Props) {
  const router = useRouter();
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState(filterStatus);
  const [localUserId, setLocalUserId] = useState(filterUserId);
  const [localDept, setLocalDept] = useState(filterDept);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const departments = useMemo(() => {
    const depts = employees.map(e => e.department).filter(Boolean) as string[];
    return [...new Set(depts)].sort();
  }, [employees]);

  const applyFilters = () => {
    const params = new URLSearchParams({
      year: String(year), month: String(month),
      ...(localStatus && { status: localStatus }),
      ...(localUserId && { userId: localUserId }),
      ...(localDept && { dept: localDept }),
    });
    router.push(`/admin/attendance/leave?${params}`);
  };

  const doAction = async (id: string, action: "approve" | "reject" | "cancel") => {
    setLoading(id + action);
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: actionNote[id] }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      toast.success(`Leave ${action}d`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setLoading(null);
    }
  };

  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">{MONTHS[month - 1]} {year} · Approve, reject, or cancel leave requests</p>
        </div>
        {pendingCount > 0 && (
          <span className="badge text-amber-700 bg-amber-100 text-sm">{pendingCount} pending</span>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label text-xs">Status</label>
            <select className="input !w-auto text-sm" value={localStatus} onChange={e => setLocalStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">Employee</label>
            <select className="input !w-auto text-sm" value={localUserId} onChange={e => setLocalUserId(e.target.value)}>
              <option value="">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Department</label>
            <select className="input !w-auto text-sm" value={localDept} onChange={e => setLocalDept(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button onClick={applyFilters} className="btn-primary text-sm py-2">
            <Filter size={14} />Filter
          </button>
        </div>
      </div>

      {/* Leave requests list */}
      {requests.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarDays size={24} className="text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700 text-lg">No leave requests</p>
          <p className="text-sm text-slate-400 mt-2">No requests match the current filters.</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-slate-100">
          {requests.map(req => (
            <div key={req.id}>
              {/* Main row */}
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: employee + details */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      {req.user.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm">{req.user.name}</p>
                        <span className="badge text-slate-500 bg-slate-100 text-xs">{req.user.department}</span>
                        <span className="badge text-slate-500 bg-slate-100 text-xs">{req.user.employmentType.replace("_", " ")}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className={cn("badge text-xs", STATUS_STYLE[req.status] || "")}>
                          {req.status}
                        </span>
                        <span className={cn("badge text-xs", req.isPaid ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50")}>
                          {req.isPaid ? "Paid" : "Unpaid"}
                        </span>
                        <span className="badge text-purple-700 bg-purple-50 text-xs">{LEAVE_TYPE_LABEL[req.leaveType]}</span>
                        <span className="text-xs text-slate-500">
                          {format(new Date(req.fromDate), "dd MMM")}
                          {req.fromDate !== req.toDate && ` – ${format(new Date(req.toDate), "dd MMM yyyy")}`}
                          {req.fromDate === req.toDate && ` ${format(new Date(req.fromDate), "yyyy")}`}
                          {" "}· <strong>{req.totalDays}</strong> day{req.totalDays !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {req.reason && (
                        <p className="text-xs text-slate-500 mt-1 italic">"{req.reason}"</p>
                      )}
                      {req.adminNote && (
                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <MessageSquare size={11} />Admin note: {req.adminNote}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        Submitted {format(new Date(req.createdAt), "dd MMM yyyy, HH:mm")}
                      </p>
                    </div>
                  </div>

                  {/* Right: expand / actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {req.status === "PENDING" && (
                      <button
                        onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Actions <ChevronDown size={12} className={cn("transition-transform", expandedId === req.id && "rotate-180")} />
                      </button>
                    )}
                    {req.status === "APPROVED" && (
                      <button
                        onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Cancel <ChevronDown size={12} className={cn("transition-transform", expandedId === req.id && "rotate-180")} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded action panel */}
              {expandedId === req.id && (
                <div className="px-5 pb-4 bg-slate-50 border-t border-slate-100">
                  <div className="flex flex-wrap items-end gap-3 mt-3">
                    <div className="flex-1 min-w-[200px]">
                      <label className="label text-xs">Admin Note (optional)</label>
                      <input
                        type="text"
                        className="input text-sm"
                        placeholder="Add a note…"
                        value={actionNote[req.id] || ""}
                        onChange={e => setActionNote(prev => ({ ...prev, [req.id]: e.target.value }))}
                      />
                    </div>
                    {req.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => doAction(req.id, "approve")}
                          disabled={loading === req.id + "approve"}
                          className="btn-secondary text-xs py-2 px-4 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        >
                          <Check size={13} />
                          {loading === req.id + "approve" ? "Approving…" : "Approve"}
                        </button>
                        <button
                          onClick={() => doAction(req.id, "reject")}
                          disabled={loading === req.id + "reject"}
                          className="btn-secondary text-xs py-2 px-4 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X size={13} />
                          {loading === req.id + "reject" ? "Rejecting…" : "Reject"}
                        </button>
                      </>
                    )}
                    {req.status === "APPROVED" && (
                      <button
                        onClick={() => doAction(req.id, "cancel")}
                        disabled={loading === req.id + "cancel"}
                        className="btn-secondary text-xs py-2 px-4 text-slate-600 hover:bg-slate-100"
                      >
                        <Ban size={13} />
                        {loading === req.id + "cancel" ? "Cancelling…" : "Cancel Leave"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
