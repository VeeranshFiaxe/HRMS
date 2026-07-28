// src/app/api/employees/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { customSchedule: true, salaryRuleOverride: true },
  });

  if (!user) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: user });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.id !== params.id)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      name, email, personalEmail, role, employmentType,
      department, designation, phone, isActive, timeFormat,
      dateOfBirth, joiningDate, exitDate,
      emergencyContactName, emergencyContactNumber,
    } = body;

    const isAdmin = session.user.role === "ADMIN";

    // If email is being changed, check for uniqueness first
    if (isAdmin && email !== undefined) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== params.id) {
        return NextResponse.json({ success: false, error: "This email is already in use by another employee." }, { status: 409 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(personalEmail !== undefined && { personalEmail }),
        ...(timeFormat !== undefined && { timeFormat }),
        ...(isAdmin && email !== undefined && { email }),
        ...(isAdmin && role !== undefined && { role }),
        ...(isAdmin && employmentType !== undefined && { employmentType }),
        ...(isAdmin && department !== undefined && { department }),
        ...(isAdmin && designation !== undefined && { designation }),
        ...(isAdmin && isActive !== undefined && { isActive }),
        ...(isAdmin && dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(isAdmin && joiningDate && { joiningDate: new Date(joiningDate) }),
        ...(isAdmin && exitDate !== undefined && { exitDate: exitDate ? new Date(exitDate) : null }),
        ...(isAdmin && emergencyContactName !== undefined && { emergencyContactName }),
        ...(isAdmin && emergencyContactNumber !== undefined && { emergencyContactNumber }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EMPLOYEE_UPDATE",
        description: `Profile updated: ${updated.name}`,
        metadata: { targetUserId: params.id, changes: body },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

// PUT: Full profile save (used by EditEmployeeForm — delegates to PATCH)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return PATCH(req, { params });
}


export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  // Soft delete — just deactivate
  await prisma.user.update({ where: { id: params.id }, data: { isActive: false } });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "EMPLOYEE_DELETE",
      description: `Admin deactivated employee ID: ${params.id}`,
    },
  });

  return NextResponse.json({ success: true });
}
