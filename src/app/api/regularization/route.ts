import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, startOfDay } from "date-fns";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { date, checkInAt, checkOutAt, reason } = body;

    if (!date || !reason) {
      return NextResponse.json({ error: "Date and reason are required" }, { status: 400 });
    }

    if (!checkInAt && !checkOutAt) {
      return NextResponse.json({ error: "At least one of checkInAt or checkOutAt must be provided" }, { status: 400 });
    }

    const requestDate = startOfDay(new Date(date));
    
    // Check limit
    const rules = await prisma.attendanceRules.findFirst();
    const limit = rules?.regularizationLimitPerMonth ?? 3;

    const monthStart = startOfMonth(requestDate);
    const monthEnd = endOfMonth(requestDate);

    const existingRequests = await prisma.regularizationRequest.count({
      where: {
        userId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
        status: {
          in: ["PENDING", "APPROVED"] // Usually rejected/cancelled don't count towards the limit
        }
      },
    });

    if (existingRequests >= limit) {
      return NextResponse.json(
        { error: `You have reached the limit of ${limit} regularisation requests for this month.` },
        { status: 403 }
      );
    }

    // Check if there is already a pending request for this date
    const duplicate = await prisma.regularizationRequest.findFirst({
      where: {
        userId,
        date: requestDate,
        status: "PENDING"
      }
    });

    if (duplicate) {
       return NextResponse.json(
        { error: "You already have a pending regularisation request for this date." },
        { status: 400 }
      );
    }

    const request = await prisma.regularizationRequest.create({
      data: {
        userId,
        date: requestDate,
        checkInAt: checkInAt ? new Date(checkInAt) : null,
        checkOutAt: checkOutAt ? new Date(checkOutAt) : null,
        reason,
        status: "PENDING",
      },
      include: {
        user: { select: { name: true } }
      }
    });

    // Create an Inbox item for the admin
    await prisma.inboxItem.create({
      data: {
        type: "REGULARIZATION_REQUEST",
        title: `Regularisation Request: ${request.user?.name || "Employee"}`,
        description: `Requested for ${requestDate.toISOString().split('T')[0]}. Reason: ${reason}`,
        status: "PENDING",
        relatedId: request.id,
        metadata: {
            userId,
            date: requestDate.toISOString(),
            checkInAt,
            checkOutAt
        }
      }
    });

    await prisma.auditLog.create({
        data: {
            userId,
            action: "REGULARIZATION_REQUEST_CREATE",
            description: `Submitted regularisation request for ${requestDate.toISOString().split('T')[0]}`,
            metadata: { requestId: request.id }
        }
    }).catch(() => {}); // non-blocking

    return NextResponse.json({ success: true, request });

  } catch (error) {
    console.error("Failed to submit regularisation request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
