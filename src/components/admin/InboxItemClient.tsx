"use client";

import { useState } from "react";
import { Check, X, Eye, PhoneCall } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface InboxItemClientProps {
  item: any;
}

export default function InboxItemClient({ item }: InboxItemClientProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const handleAction = async (action: "approve" | "reject") => {
    if (item.type !== "REGULARIZATION_REQUEST" && item.type !== "LEAVE_REQUEST") {
      toast.error("This item type cannot be processed here yet.");
      return;
    }
    
    const reason = action === "reject" ? window.prompt("Reason for rejection (optional):") : "";
    if (action === "reject" && reason === null) return; // User cancelled prompt

    setIsProcessing(true);
    try {
      let res;
      if (item.type === "REGULARIZATION_REQUEST") {
        res = await fetch(`/api/admin/inbox/regularization/${item.relatedId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: action.toUpperCase(), adminNote: reason || "" }),
        });
      } else {
        res = await fetch(`/api/leave/${item.relatedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, note: reason || "" }),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process request");
      }

      toast.success(`Successfully ${action}d request.`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDetails = () => {
    if (item.type === "REGULARIZATION_REQUEST") {
      router.push("/admin/attendance/regularisation");
    } else if (item.type === "LEAVE_REQUEST") {
      router.push("/admin/attendance/leave");
    } else {
      toast.error("No specific detail page available.");
    }
  };

  const handleScheduleHRCall = () => {
    if (!item.user?.email) {
      toast.error("No email address associated with this user.");
      return;
    }
    const subject = encodeURIComponent(`HR Call regarding your ${item.type.replace("_", " ").toLowerCase()}`);
    const body = encodeURIComponent(`Hi ${item.user.name || ""},\n\nI would like to schedule a quick call with you to discuss your recent ${item.type.replace("_", " ").toLowerCase()}.\n\nPlease let me know when you are available.\n\nThanks,\nHR`);
    window.location.href = `mailto:${item.user.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="flex items-center gap-2 mt-3">
      <button 
        disabled={isProcessing}
        onClick={() => handleAction("approve")}
        className="btn-secondary text-xs py-1.5 px-3 text-emerald-700 border-emerald-200 hover:bg-emerald-50 disabled:opacity-50"
      >
        <Check size={13} />
        {isProcessing ? "Processing..." : "Approve"}
      </button>
      <button 
        disabled={isProcessing}
        onClick={() => handleAction("reject")}
        className="btn-secondary text-xs py-1.5 px-3 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
      >
        <X size={13} />
        Reject
      </button>
      <button onClick={handleViewDetails} className="btn-secondary text-xs py-1.5 px-3">
        <Eye size={13} />
        View Details
      </button>
      <button onClick={handleScheduleHRCall} className="btn-secondary text-xs py-1.5 px-3 text-slate-600">
        <PhoneCall size={13} />
        Schedule HR Call
      </button>
    </div>
  );
}
