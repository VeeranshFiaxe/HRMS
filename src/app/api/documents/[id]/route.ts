import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: params.id }
    });

    if (!doc) {
      return new NextResponse("Not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", doc.mimeType);
    headers.set("Content-Disposition", `attachment; filename="${doc.name}"`);

    return new NextResponse(doc.data as unknown as BodyInit, { headers });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
