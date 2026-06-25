// src/app/api/salary-rules/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const rules = await prisma.salaryRules.findMany({
    orderBy: { createdAt: 'asc' }
  });
  return NextResponse.json({ success: true, data: rules });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    
    // If setting as default, unset others first
    if (body.isDefault) {
      await prisma.salaryRules.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const rules = await prisma.salaryRules.create({ data: body });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "SALARY_RULE_CHANGE", description: `Created new salary rule: ${rules.name}`, metadata: body },
    });

    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
