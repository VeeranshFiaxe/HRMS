// src/components/employee/LeaveHistory.tsx
"use client";

import { format } from "date-fns";
import { Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LeaveRequest {
  id: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  leaveType: string;
  isPaid: boolean;
  status: string;
  reason: string | null;
  adminNote: string | null;
  createdAt: string;
}

interface Props {
  requests: LeaveRequest[];
}

const STATUS_STYLE: Record<string, string> = {
  PENDING:   "text-amber-700 bg-amber-50",
  APPROVED:  "text-emerald-700 bg-emerald-50",
  REJECTED:  "text-red-700 bg-red-50",
  CANCELLED: "text-slate-500 bg-slate-100",
};

const LEAVE_TYPE_LABEL: Record<string, string> = {
  CASUAL: "Casual", SICK: "Sick", ANNUAL: "Annual", UNPAID: "Unpaid",
};

export function LeaveHistory({ requests }: Props) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this leave request?")) return;
    setCancelling(id);
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel");
      }
      toast.success("Leave request cancelled");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel");
    } finally {
      setCancelling(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-400 text-sm">No leave requests yet.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden divide-y divide-slate-100">
      {requests.map(req => (
        <div key={req.id} className="px-5 py-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("badge text-xs", STATUS_STYLE[req.status])}>{req.status}</span>
              <span className={cn("badge text-xs", req.isPaid ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50")}>
                {req.isPaid ? "Paid" : "Unpaid"}
              </span>
              <span className="badge text-purple-700 bg-purple-50 text-xs">{LEAVE_TYPE_LABEL[req.leaveType]}</span>
              <span className="text-sm text-slate-700 font-medium">
                {format(new Date(req.fromDate), "dd MMM")}
                {req.fromDate !== req.toDate && ` – ${format(new Date(req.toDate), "dd MMM yyyy")}`}
                {req.fromDate === req.toDate && ` ${format(new Date(req.fromDate), "yyyy")}`}
              </span>
              <span className="text-xs text-slate-500">({req.totalDays} day{req.totalDays !== 1 ? "s" : ""})</span>
            </div>
            {req.reason && <p className="text-xs text-slate-500 mt-1 italic">"{req.reason}"</p>}
            {req.adminNote && (
              <p className="text-xs text-blue-600 mt-1">Admin: {req.adminNote}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">Submitted {format(new Date(req.createdAt), "dd MMM yyyy")}</p>
          </div>
          {["PENDING", "APPROVED"].includes(req.status) && (
            <button
              onClick={() => handleCancel(req.id)}
              disabled={cancelling === req.id}
              className="btn-secondary text-xs py-1.5 px-3 text-slate-500 hover:text-red-600 hover:border-red-200 flex-shrink-0"
            >
              <Ban size={12} />
              {cancelling === req.id ? "Cancelling…" : "Cancel"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
