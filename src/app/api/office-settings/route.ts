// src/app/api/office-settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.officeSettings.findFirst();
  return NextResponse.json({ success: true, data: settings });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const existing = await prisma.officeSettings.findFirst();

    const settings = existing
      ? await prisma.officeSettings.update({ where: { id: existing.id }, data: body })
      : await prisma.officeSettings.create({ data: { id: "default", ...body } });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "GEOFENCE_CHANGE", description: "Office settings updated", metadata: body },
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
