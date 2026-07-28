import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/documents/templates — fetch all document templates
export async function GET() {
  try {
    const templates = await prisma.documentTemplate.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/documents/templates — create a new document template
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, employmentTypes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }

    const template = await prisma.documentTemplate.create({
      data: {
        name: name.trim(),
        employmentTypes: employmentTypes || [],
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
