// src/app/api/announcements/[id]/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PUT: Update an announcement (admin only)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, content, reflectOnCalendar, eventDate, eventName } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const announcement = await prisma.announcement.update({
      where: { id: params.id },
      data: {
        title: title.trim(),
        content: content.trim(),
        reflectOnCalendar: !!reflectOnCalendar,
        eventDate: reflectOnCalendar && eventDate ? new Date(eventDate) : null,
        eventName: reflectOnCalendar && eventName ? eventName.trim() : null,
      },
      include: { createdBy: { select: { name: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ANNOUNCEMENT_UPDATE",
        description: `Updated announcement: "${title.trim()}"`,
        metadata: { announcementId: params.id },
      },
    });

    return NextResponse.json(announcement);
  } catch (error) {
    console.error("[announcement PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Soft delete an announcement (admin only)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const announcement = await prisma.announcement.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ANNOUNCEMENT_DELETE",
        description: `Deleted announcement: "${announcement.title}"`,
        metadata: { announcementId: params.id },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[announcement DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
