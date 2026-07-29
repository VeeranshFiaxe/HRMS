import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const user = session.user;

    const searchParams = req.nextUrl.searchParams;
    const formId = searchParams.get("formId");

    const submissions = await prisma.onboardingSubmission.findMany({
      where: formId ? { formId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        form: { select: { title: true } }
      }
    });

    return NextResponse.json({ success: true, submissions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
