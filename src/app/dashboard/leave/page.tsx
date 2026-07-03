// src/app/dashboard/leave/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateLeaveBalance, getUsedLeavesForMonth } from "@/lib/leave-engine";
import { LeaveRequestForm } from "@/components/employee/LeaveRequestForm";
import { LeaveHistory } from "@/components/employee/LeaveHistory";
import { RegularizationForm } from "@/components/employee/RegularizationForm";
import { startOfMonth, endOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export default async function EmployeeLeavePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const userId = session.user.id;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Leave requests
  const requests = await prisma.leaveRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Regularization rules and requests
  const rules = await prisma.attendanceRules.findFirst();
  const regularizationLimit = rules?.regularizationLimitPerMonth ?? 3;

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const usedRegularizations = await prisma.regularizationRequest.count({
    where: {
      userId,
      date: {
        gte: monthStart,
        lte: monthEnd,
      },
      status: {
        in: ["PENDING", "APPROVED"]
      }
    },
  });

  const regularizationRequests = await prisma.regularizationRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Leave balance
  let balance = null;
  let currentMonthUsed = 0;
  let availableBalance = 0;
  try {
    balance = await getOrCreateLeaveBalance(userId, year);
    currentMonthUsed = await getUsedLeavesForMonth(userId, year, month);
    availableBalance = balance.allocated + balance.carried - balance.used;
  } catch { /* non-blocking */ }

  // User info for employment type
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { employmentType: true, salaryRules: { select: { paidLeaveDaysPerMonth: true } } },
  });

  const isIntern = user?.employmentType === "INTERN";
  const monthlyEntitlement = isIntern ? (user?.salaryRules?.paidLeaveDaysPerMonth ?? 2) : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="page-header">
        <h1 className="page-title">My Requests</h1>
        <p className="page-subtitle">Apply for leave, request attendance regularisation, and view history</p>
      </div>

      {/* Balance cards */}
      <div className={`grid gap-4 ${isIntern ? "grid-cols-2" : "grid-cols-3"}`}>
        {isIntern ? (
          <>
            <div className="card p-5 text-center">
              <p className="text-3xl font-bold text-blue-600">{monthlyEntitlement}</p>
              <p className="text-sm text-slate-500 mt-1">Leaves/Month</p>
            </div>
            <div className="card p-5 text-center">
              <p className="text-3xl font-bold text-amber-600">{currentMonthUsed}</p>
              <p className="text-sm text-slate-500 mt-1">Used This Month</p>
            </div>
          </>
        ) : (
          <>
            <div className="card p-5 text-center">
              <p className="text-3xl font-bold text-blue-600">{balance?.allocated ?? 0}</p>
              <p className="text-sm text-slate-500 mt-1">Annual Allocation</p>
            </div>
            <div className="card p-5 text-center">
              <p className="text-3xl font-bold text-amber-600">{balance?.used ?? 0}</p>
              <p className="text-sm text-slate-500 mt-1">Days Used</p>
            </div>
            <div className="card p-5 text-center">
              <p className={`text-3xl font-bold ${availableBalance > 5 ? "text-emerald-600" : availableBalance > 0 ? "text-amber-600" : "text-red-600"}`}>
                {availableBalance}
              </p>
              <p className="text-sm text-slate-500 mt-1">Available Balance</p>
            </div>
          </>
        )}
      </div>

      {/* Apply for leave form */}
      <LeaveRequestForm />

      {/* Apply for regularization form */}
      <RegularizationForm limit={regularizationLimit} used={usedRegularizations} />

      {/* History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold text-slate-900 mb-3">Leave History</h2>
          <LeaveHistory requests={JSON.parse(JSON.stringify(requests))} />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 mb-3">Regularisation History</h2>
          {regularizationRequests.length === 0 ? (
            <p className="text-sm text-slate-500 card p-4">No regularisation requests found.</p>
          ) : (
             <div className="card divide-y divide-slate-100">
             {regularizationRequests.map((req) => (
                <div key={req.id} className="p-4 flex items-center justify-between">
                   <div>
                     <p className="text-sm font-medium">{new Date(req.date).toLocaleDateString()}</p>
                     <p className="text-xs text-slate-500 mt-1">{req.reason}</p>
                   </div>
                   <span className={`badge text-xs ${
                     req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                     req.status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                     'bg-amber-50 text-amber-700'
                   }`}>
                     {req.status}
                   </span>
                </div>
             ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
