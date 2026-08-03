import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateAttendance } from "@/lib/attendance-engine";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { action, adminNote } = body; // "approve" or "reject"

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const request = await prisma.regularizationRequest.findUnique({
      where: { id },
    });

    if (!request || request.status !== "PENDING") {
      return NextResponse.json(
        { error: "Request not found or not pending" },
        { status: 404 }
      );
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    // 1. Update the request
    await prisma.regularizationRequest.update({
      where: { id },
      data: {
        status: newStatus,
        adminNote,
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
    });

    // 2. If approved, update attendance record
    if (newStatus === "APPROVED") {
      // Find or upsert the attendance record
      let record = await prisma.attendanceRecord.findUnique({
        where: {
          userId_date: {
            userId: request.userId,
            date: request.date,
          },
        },
      });

      if (!record) {
         // Create basic record if they were completely absent and had no record
         record = await prisma.attendanceRecord.create({
             data: {
                 userId: request.userId,
                 date: request.date,
                 status: "ABSENT",
                 isLate: false,
                 isHalfDay: false,
                 hoursWorked: 0,
                 checkInAt: request.checkInAt,
                 checkOutAt: request.checkOutAt,
                 overrideNote: `Regularized by admin. Reason: ${request.reason}`,
             }
         });
      } else {
        await prisma.attendanceRecord.update({
          where: { id: record.id },
          data: {
            checkInAt: request.checkInAt ?? record.checkInAt,
            checkOutAt: request.checkOutAt ?? record.checkOutAt,
            overrideNote: `Regularized by admin. Reason: ${request.reason}`,
          },
        });
      }

      // Recalculate hours and status
      await recalculateAttendance(record.id);
    }

    // 3. Update the associated InboxItem
    await prisma.inboxItem.updateMany({
      where: { relatedId: id, type: "REGULARIZATION_REQUEST" },
      data: {
        status: newStatus,
      },
    });

    // 4. Audit Log
    const auditAction = newStatus === "APPROVED" ? "REGULARIZATION_REQUEST_APPROVE" : "REGULARIZATION_REQUEST_REJECT";
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: auditAction as any,
        description: `${newStatus === "APPROVED" ? "Approved" : "Rejected"} regularisation request for ${request.userId}`,
        metadata: { requestId: id, adminNote },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing regularisation request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
