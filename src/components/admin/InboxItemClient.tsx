"use client";

import { useState } from "react";
import { Check, X, Eye, PhoneCall } from "lucide-react";
import { useRouter } from "next/navigation";

interface InboxItemClientProps {
  item: any;
}

export default function InboxItemClient({ item }: InboxItemClientProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const handleAction = async (action: "approve" | "reject") => {
    if (item.type !== "REGULARIZATION_REQUEST" && item.type !== "LEAVE_REQUEST") {
      alert("This item type cannot be processed here yet.");
      return;
    }
    
    // Defaulting to REGULARIZATION endpoint since that's what we are building
    const endpoint = item.type === "REGULARIZATION_REQUEST" 
        ? `/api/admin/inbox/regularization/${item.relatedId}`
        : `/api/admin/leave/${item.relatedId}`; // Just an example for leave

    const reason = action === "reject" ? window.prompt("Reason for rejection (optional):") : "";
    if (action === "reject" && reason === null) return; // User cancelled prompt

    setIsProcessing(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST", // OR PUT depending on what the API uses
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNote: reason || "" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process request");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
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
      <button className="btn-secondary text-xs py-1.5 px-3">
        <Eye size={13} />
        View Details
      </button>
      <button className="btn-secondary text-xs py-1.5 px-3 text-slate-600">
        <PhoneCall size={13} />
        Schedule HR Call
      </button>
    </div>
  );
}
