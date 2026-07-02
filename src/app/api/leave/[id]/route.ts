// src/app/api/leave/[id]/route.ts
// PATCH: approve / reject / cancel leave (admin can do all; employee can only cancel own)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveLeave, rejectLeave, cancelLeave } from "@/lib/leave-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const request = await prisma.leaveRequest.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, name: true, department: true, employmentType: true } } },
  });

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Employee can only see own requests
  if (session.user.role !== "ADMIN" && request.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(request);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { action, note } = body; // action: "approve" | "reject" | "cancel"

    if (!["approve", "reject", "cancel"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Check ownership for non-admin cancel
    if (action === "cancel" && session.user.role !== "ADMIN") {
      const request = await prisma.leaveRequest.findUnique({ where: { id: params.id } });
      if (!request || request.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (["approve", "reject"].includes(action) && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    let result;
    if (action === "approve") {
      result = await approveLeave(params.id, session.user.id, note);
    } else if (action === "reject") {
      result = await rejectLeave(params.id, session.user.id, note);
    } else {
      result = await cancelLeave(params.id, session.user.id);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/leave/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
