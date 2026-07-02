// src/app/api/admin/leave/route.ts
// Admin: GET all leave requests with filters

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const userId = searchParams.get("userId");
  const department = searchParams.get("department");
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const leaveType = searchParams.get("leaveType");

  const where: any = {};

  if (status && status !== "ALL") where.status = status;
  if (userId) where.userId = userId;
  if (leaveType) where.leaveType = leaveType;

  if (year || month) {
    const y = parseInt(year || new Date().getFullYear().toString());
    if (month) {
      const m = parseInt(month);
      where.fromDate = { lte: new Date(y, m, 0) }; // last day of month
      where.toDate = { gte: new Date(y, m - 1, 1) }; // first day of month
    } else {
      where.fromDate = { lte: new Date(y, 11, 31) };
      where.toDate = { gte: new Date(y, 0, 1) };
    }
  }

  // Department filter — done via user relation
  if (department) {
    where.user = { department };
  }

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          department: true,
          designation: true,
          employmentType: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}
