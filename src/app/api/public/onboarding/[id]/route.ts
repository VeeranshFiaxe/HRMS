import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const form = await prisma.onboardingForm.findUnique({
      where: { id: params.id }
    });

    if (!form || form.status !== "PUBLISHED") {
      return new NextResponse("Form not found or not published", { status: 404 });
    }

    // Omit sensitive data
    return NextResponse.json({ 
      success: true, 
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        fields: form.fields,
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const form = await prisma.onboardingForm.findUnique({
      where: { id: params.id }
    });

    if (!form || form.status !== "PUBLISHED") {
      return new NextResponse("Form not found or not published", { status: 404 });
    }

    const body = await req.json();
    const { data, candidateName, candidateEmail } = body;

    const submission = await prisma.onboardingSubmission.create({
      data: {
        formId: form.id,
        candidateName: candidateName || "Unknown Candidate",
        candidateEmail: candidateEmail || "no-email@provided.com",
        data: data || {},
      }
    });

    return NextResponse.json({ success: true, submissionId: submission.id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
