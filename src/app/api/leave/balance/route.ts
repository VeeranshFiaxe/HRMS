// src/app/api/leave/balance/route.ts
// GET current user's leave balance for a given year

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrCreateLeaveBalance, getUsedLeavesForMonth } from "@/lib/leave-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  // Optional userId param for admin lookups
  const targetUserId = searchParams.get("userId") || session.user.id;

  // Admin can look up any user; employee only their own
  if (targetUserId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const balance = await getOrCreateLeaveBalance(targetUserId, year);

    // Also compute current month usage
    const now = new Date();
    const currentMonthUsed = await getUsedLeavesForMonth(targetUserId, now.getFullYear(), now.getMonth() + 1);

    return NextResponse.json({
      ...balance,
      available: balance.allocated + balance.carried - balance.used,
      currentMonthUsed,
    });
  } catch (error) {
    console.error("[GET /api/leave/balance]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
