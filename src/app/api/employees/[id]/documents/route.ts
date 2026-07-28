import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/employees/[id]/documents — list all docs for an employee
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const documents = await prisma.document.findMany({
      where: { userId: params.id },
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        docCategory: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, documents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/employees/[id]/documents — upload a new doc for an employee (admin only)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docCategory = formData.get("docCategory") as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    // Check if a doc with the same category already exists for this user — if so, replace it
    if (docCategory) {
      const existing = await prisma.document.findFirst({
        where: { userId: params.id, docCategory },
      });
      if (existing) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const updated = await prisma.document.update({
          where: { id: existing.id },
          data: {
            name: file.name,
            mimeType: file.type,
            size: file.size,
            data: buffer,
          },
          select: { id: true, name: true, mimeType: true, size: true, docCategory: true, createdAt: true, updatedAt: true },
        });
        return NextResponse.json({ success: true, document: updated, replaced: true });
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await prisma.document.create({
      data: {
        name: file.name,
        mimeType: file.type,
        size: file.size,
        data: buffer,
        userId: params.id,
        docCategory: docCategory || null,
      },
      select: { id: true, name: true, mimeType: true, size: true, docCategory: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ success: true, document });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
