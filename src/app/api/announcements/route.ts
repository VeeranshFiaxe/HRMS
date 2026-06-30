// src/app/api/announcements/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET: Return all active announcements (both admin and employee can access)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const announcements = await prisma.announcement.findMany({
    where: { isActive: true },
    include: {
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(announcements);
}

// POST: Create a new announcement (admin only)
export async function POST(request: Request) {
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

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        reflectOnCalendar: !!reflectOnCalendar,
        eventDate: reflectOnCalendar && eventDate ? new Date(eventDate) : null,
        eventName: reflectOnCalendar && eventName ? eventName.trim() : null,
        createdById: session.user.id,
      },
      include: { createdBy: { select: { name: true } } },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ANNOUNCEMENT_CREATE",
        description: `Created announcement: "${title.trim()}"`,
        metadata: { announcementId: announcement.id },
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error("[announcements POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
