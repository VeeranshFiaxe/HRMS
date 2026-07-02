import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (!["PRESENT", "LATE", "HALF_DAY", "ABSENT"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const record = await prisma.attendanceRecord.update({
      where: { id: params.id },
      data: { status },
      include: { user: { select: { name: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ATTENDANCE_OVERRIDE",
        description: `Updated attendance status for ${record.user.name} on ${record.date.toISOString().slice(0, 10)} to ${status}`,
        metadata: { recordId: record.id, newStatus: status },
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("[attendance PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
