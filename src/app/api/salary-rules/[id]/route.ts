// src/app/api/salary-rules/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();

    if (body.isDefault) {
      await prisma.salaryRules.updateMany({
        where: { isDefault: true, id: { not: params.id } },
        data: { isDefault: false }
      });
    }

    const rules = await prisma.salaryRules.update({
      where: { id: params.id },
      data: body
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "SALARY_RULE_CHANGE", description: `Updated salary rule: ${rules.name}`, metadata: body },
    });

    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  try {
    const existingUsers = await prisma.user.count({ where: { salaryRulesId: params.id } });
    if (existingUsers > 0) {
      return NextResponse.json({ success: false, error: `Cannot delete salary rule. It is assigned to ${existingUsers} users.` }, { status: 400 });
    }

    await prisma.salaryRules.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
