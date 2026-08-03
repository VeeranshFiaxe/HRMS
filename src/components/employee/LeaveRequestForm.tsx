// src/components/employee/LeaveRequestForm.tsx
"use client";

import { useState } from "react";
import { CalendarDays, Send, X } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  prefillDate?: string; // ISO date string
  onSuccess?: () => void;
  onClose?: () => void;
}

const LEAVE_TYPES = [
  { value: "CASUAL", label: "Casual Leave" },
  { value: "SICK", label: "Sick Leave" },
  { value: "ANNUAL", label: "Annual Leave" },
  { value: "UNPAID", label: "Unpaid Leave" },
];

export function LeaveRequestForm({ prefillDate, onSuccess, onClose }: Props) {
  const [fromDate, setFromDate] = useState(prefillDate || "");
  const [toDate, setToDate] = useState(prefillDate || "");
  const [leaveType, setLeaveType] = useState("CASUAL");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDaySession, setHalfDaySession] = useState<"FIRST_HALF" | "SECOND_HALF">("FIRST_HALF");

  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    if (isHalfDay) setToDate(value);
  };

  const handleHalfDayToggle = (checked: boolean) => {
    setIsHalfDay(checked);
    if (checked) setToDate(fromDate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate) {
      toast.error("Please select both from and to dates");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate: isHalfDay ? fromDate : toDate,
          leaveType,
          reason,
          session: isHalfDay ? halfDaySession : "FULL_DAY",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      toast.success("Leave request submitted successfully!");
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-blue-600" />
          <h3 className="font-semibold text-slate-900">Apply for Leave</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">From Date</label>
            <input
              type="date"
              className="input"
              value={fromDate}
              onChange={e => handleFromDateChange(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div>
            <label className="label">To Date</label>
            <input
              type="date"
              className="input"
              value={isHalfDay ? fromDate : toDate}
              onChange={e => setToDate(e.target.value)}
              min={fromDate || new Date().toISOString().slice(0, 10)}
              disabled={isHalfDay}
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="halfDayToggle"
            checked={isHalfDay}
            onChange={e => handleHalfDayToggle(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600"
          />
          <label htmlFor="halfDayToggle" className="text-sm text-slate-700">Half Day (single day only)</label>
        </div>

        {isHalfDay && (
          <div>
            <label className="label">Which Half</label>
            <select className="input" value={halfDaySession} onChange={e => setHalfDaySession(e.target.value as "FIRST_HALF" | "SECOND_HALF")}>
              <option value="FIRST_HALF">First Half</option>
              <option value="SECOND_HALF">Second Half</option>
            </select>
          </div>
        )}

        <div>
          <label className="label">Leave Type</label>
          <select className="input" value={leaveType} onChange={e => setLeaveType(e.target.value)}>
            {LEAVE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Reason <span className="text-slate-400 font-normal">(optional)</span></label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Briefly describe the reason for your leave…"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            <Send size={14} />
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
