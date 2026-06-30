// src/app/admin/inbox/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Bell, Check, X, Eye, PhoneCall, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "text-amber-600 bg-amber-50",
  APPROVED: "text-emerald-600 bg-emerald-50",
  REJECTED: "text-red-600 bg-red-50",
};

const TYPE_LABEL: Record<string, string> = {
  LEAVE_REQUEST: "Leave Request",
  ONBOARDING: "Onboarding",
  OTHER: "Other",
};

export default async function AdminInboxPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const items = await prisma.inboxItem.findMany({
    orderBy: { createdAt: "desc" },
  });

  const pendingCount = items.filter((i) => i.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Admin Inbox</h1>
          <p className="page-subtitle">
            Approval center for requests and actions requiring admin review.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="badge text-amber-700 bg-amber-100 text-sm">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="card p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Inbox size={24} className="text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700 text-lg">Inbox is empty</p>
          <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
            No pending items right now. Leave requests, onboarding tasks, and other
            approval items will appear here when submitted.
          </p>
          <div className="mt-6 flex flex-col gap-2 max-w-xs mx-auto text-left">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coming in future phases</p>
            {[
              "Leave request approvals",
              "Onboarding task assignments",
              "Document review requests",
              "Schedule change requests",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length > 0 && (
        <div className="card overflow-hidden divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.id} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bell size={16} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">
                          {format(new Date(item.createdAt), "dd MMM yyyy, HH:mm")}
                        </span>
                        <span className="badge text-slate-500 bg-slate-100 text-xs">
                          {TYPE_LABEL[item.type] ?? item.type}
                        </span>
                        <span className={cn("badge text-xs", STATUS_STYLE[item.status] ?? "text-slate-500 bg-slate-50")}>
                          {item.status}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-slate-600 mt-1.5">{item.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons — only shown for PENDING items */}
                  {item.status === "PENDING" && (
                    <div className="flex items-center gap-2 mt-3">
                      <button className="btn-secondary text-xs py-1.5 px-3 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                        <Check size={13} />
                        Approve
                      </button>
                      <button className="btn-secondary text-xs py-1.5 px-3 text-red-600 border-red-200 hover:bg-red-50">
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
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
