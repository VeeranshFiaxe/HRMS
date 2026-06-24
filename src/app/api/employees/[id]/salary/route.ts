import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateSalary } from "@/lib/salary-engine";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(url.searchParams.get("month") || (new Date().getMonth() + 1).toString());

  try {
    const result = await calculateSalary(params.id, year, month);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const override = await prisma.salaryRuleOverride.upsert({
      where: { userId: params.id },
      create: { userId: params.id, ...body },
      update: body,
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "SALARY_RULE_CHANGE", description: `Salary override set for employee ${params.id}`, metadata: body },
    });

    return NextResponse.json({ success: true, data: override });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  await prisma.salaryRuleOverride.deleteMany({ where: { userId: params.id } });
  return NextResponse.json({ success: true });
}
