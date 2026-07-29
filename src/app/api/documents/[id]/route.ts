import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/documents/[id]
// ?preview=true → inline (for browser preview); default → attachment (download)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const doc = await prisma.document.findUnique({
      where: { id: params.id }
    });

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const preview = req.nextUrl.searchParams.get("preview") === "true";
    const headers = new Headers();
    headers.set("Content-Type", doc.mimeType);
    headers.set(
      "Content-Disposition",
      `${preview ? "inline" : "attachment"}; filename="${encodeURIComponent(doc.name)}"`
    );
    headers.set("Content-Length", doc.size.toString());

    return new NextResponse(doc.data as unknown as BodyInit, { headers });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

// DELETE /api/documents/[id] — admin only
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await prisma.document.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

