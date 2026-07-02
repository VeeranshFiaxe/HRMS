// src/app/api/leave/route.ts
// Employee: GET own leave requests, POST apply for leave

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyForLeave } from "@/lib/leave-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const status = searchParams.get("status");

  const where: any = { userId: session.user.id };
  if (status) where.status = status;
  if (year) {
    const y = parseInt(year);
    where.fromDate = { gte: new Date(y, 0, 1) };
    where.toDate = { lte: new Date(y, 11, 31) };
  }

  const requests = await prisma.leaveRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { fromDate, toDate, reason, leaveType } = body;

    if (!fromDate || !toDate) {
      return NextResponse.json({ error: "fromDate and toDate are required" }, { status: 400 });
    }

    const result = await applyForLeave({
      userId: session.user.id,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason,
      leaveType: leaveType || "CASUAL",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.request, { status: 201 });
  } catch (error) {
    console.error("[POST /api/leave]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
