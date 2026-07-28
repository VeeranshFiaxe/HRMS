import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/documents/templates/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.documentTemplate.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/documents/templates/[id] — update name or employmentTypes
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const template = await prisma.documentTemplate.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.employmentTypes !== undefined && { employmentTypes: body.employmentTypes }),
      },
    });
    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
