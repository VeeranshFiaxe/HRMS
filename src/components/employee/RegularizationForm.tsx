"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Clock, Edit2 } from "lucide-react";

export function RegularizationForm({ limit, used }: { limit: number, used: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultDate = searchParams.get("date") || "";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [checkInAt, setCheckInAt] = useState("");
  const [checkOutAt, setCheckOutAt] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const remaining = Math.max(0, limit - used);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !reason) {
      setError("Date and reason are required.");
      return;
    }
    if (!checkInAt && !checkOutAt) {
      setError("Please provide at least a new check-in or check-out time.");
      return;
    }

    // Combine date and time
    const combineDateTime = (timeStr: string) => {
       if (!timeStr) return null;
       const d = new Date(date);
       const [h, m] = timeStr.split(":");
       d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
       return d.toISOString();
    };

    setIsSubmitting(true);
    setError("");
    
    try {
      const res = await fetch("/api/regularization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          checkInAt: combineDateTime(checkInAt),
          checkOutAt: combineDateTime(checkOutAt),
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit request.");

      setDate("");
      setCheckInAt("");
      setCheckOutAt("");
      setReason("");
      
      // Remove date from URL if it was there
      if (defaultDate) {
          router.replace("/dashboard/leave");
      }
      
      router.refresh();
      alert("Regularisation request submitted successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Edit2 size={16} className="text-indigo-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Request Regularisation</h2>
          </div>
          <span className="badge text-indigo-700 bg-indigo-50 text-xs font-medium">
              {remaining} requests remaining this month
          </span>
      </div>

      {error && <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
            <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field pl-9"
                max={new Date().toISOString().split("T")[0]}
                />
            </div>
            </div>
            
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Check-in</label>
            <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                type="time"
                value={checkInAt}
                onChange={(e) => setCheckInAt(e.target.value)}
                className="input-field pl-9"
                />
            </div>
            </div>

            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Check-out</label>
            <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                type="time"
                value={checkOutAt}
                onChange={(e) => setCheckOutAt(e.target.value)}
                className="input-field pl-9"
                />
            </div>
            </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
          <input
            type="text"
            required
            placeholder="e.g. Forgot to check out, system issue"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input-field"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || remaining <= 0}
          className="btn-primary w-full disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : remaining <= 0 ? "Limit Exceeded" : "Submit Regularisation Request"}
        </button>
      </form>
    </div>
  );
}
