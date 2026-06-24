// src/app/api/employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const employees = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: { customSchedule: true },
  });

  return NextResponse.json({ success: true, data: employees });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { email, name, password, role, employmentType, department, designation, phone, joiningDate } = body;

    if (!email || !name || !password) {
      return NextResponse.json({ success: false, error: "Email, name, and password are required" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return NextResponse.json({ success: false, error: "Email already in use" }, { status: 409 });

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        password: hashed,
        role: role || "EMPLOYEE",
        employmentType: employmentType || "FULL_TIME",
        department: department || null,
        designation: designation || null,
        phone: phone || null,
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        emailVerified: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EMPLOYEE_CREATE",
        description: `Admin created employee: ${user.name} (${user.email})`,
        metadata: { newUserId: user.id },
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Create employee error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
