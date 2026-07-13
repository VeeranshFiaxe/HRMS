import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });
    const user = session.user;

    const submission = await prisma.onboardingSubmission.findUnique({
      where: { id: params.id },
      include: {
        form: true,
        documents: {
          select: { id: true, name: true, mimeType: true, size: true, createdAt: true }
        }
      }
    });

    if (!submission) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json({ success: true, submission });
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
    
    const submission = await prisma.onboardingSubmission.update({
      where: { id: params.id },
      data: {
        data: body.data,
        adminNotes: body.adminNotes,
        status: body.status,
        candidateName: body.candidateName,
        candidateEmail: body.candidateEmail
      }
    });

    return NextResponse.json({ success: true, submission });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
