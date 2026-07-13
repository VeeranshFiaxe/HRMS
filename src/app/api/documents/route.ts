import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const submissionId = formData.get("submissionId") as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const document = await prisma.document.create({
      data: {
        name: file.name,
        mimeType: file.type,
        size: file.size,
        data: buffer,
        submissionId: submissionId || null,
      }
    });

    return NextResponse.json({ 
      success: true, 
      document: { id: document.id, name: document.name, mimeType: document.mimeType } 
    });
  } catch (error: any) {
    console.error("Document upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
