import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });
    const user = session.user;

    const forms = await prisma.onboardingForm.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { submissions: true } }
      }
    });

    return NextResponse.json({ success: true, forms });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });
    const user = session.user;

    const body = await req.json();
    const { title, description, fields, googleSheetUrl } = body;

    const form = await prisma.onboardingForm.create({
      data: {
        title: title || "Untitled Form",
        description,
        fields: fields || [],
        googleSheetUrl,
        createdById: user.id
      }
    });

    return NextResponse.json({ success: true, form });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
