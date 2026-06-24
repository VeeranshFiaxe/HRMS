// src/app/api/holidays/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });
  return NextResponse.json({ success: true, data: holidays });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  try {
    const { name, date, isOptional } = await req.json();
    if (!name || !date) return NextResponse.json({ success: false, error: "Name and date required" }, { status: 400 });

    const holiday = await prisma.holiday.create({
      data: { name, date: new Date(date), isOptional: isOptional ?? false },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "HOLIDAY_CREATE", description: `Holiday added: ${name} on ${date}` },
    });

    return NextResponse.json({ success: true, data: holiday });
  } catch (error: any) {
    if (error.code === "P2002") return NextResponse.json({ success: false, error: "A holiday already exists on that date" }, { status: 409 });
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

  await prisma.holiday.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "HOLIDAY_DELETE", description: `Holiday deleted: ${id}` },
  });

  return NextResponse.json({ success: true });
}
