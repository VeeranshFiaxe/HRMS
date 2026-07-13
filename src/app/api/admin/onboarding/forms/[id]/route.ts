import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });
    const user = session.user;

    const form = await prisma.onboardingForm.findUnique({
      where: { id: params.id }
    });

    if (!form) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json({ success: true, form });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });
    const user = session.user;

    const body = await req.json();
    
    const form = await prisma.onboardingForm.update({
      where: { id: params.id },
      data: {
        title: body.title,
        description: body.description,
        fields: body.fields,
        status: body.status,
        googleSheetUrl: body.googleSheetUrl
      }
    });

    return NextResponse.json({ success: true, form });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
