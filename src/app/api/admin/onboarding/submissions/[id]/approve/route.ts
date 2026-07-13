import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });
    const admin = session.user;

    const submission = await prisma.onboardingSubmission.findUnique({
      where: { id: params.id },
      include: { form: true, documents: true }
    });

    if (!submission) return new NextResponse("Not found", { status: 404 });
    if (submission.status === "APPROVED") return new NextResponse("Already approved", { status: 400 });

    const submittedData = submission.data as Record<string, any> || {};
    
    const name = submission.candidateName || submittedData.name || submittedData.Name || "Unknown Employee";
    const email = submission.candidateEmail || submittedData.email || submittedData.Email || `user${Date.now()}@example.com`;
    
    const department = submittedData.department || submittedData.Department || null;
    const designation = submittedData.designation || submittedData.Designation || submittedData.role || null;
    const phone = submittedData.phone || submittedData.Phone || null;

    // create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role: "EMPLOYEE",
        isActive: true,
        department: typeof department === "string" ? department : null,
        designation: typeof designation === "string" ? designation : null,
        phone: typeof phone === "string" ? phone : null,
      }
    });

    // Transfer documents
    if (submission.documents.length > 0) {
      await prisma.document.updateMany({
        where: { submissionId: submission.id },
        data: {
          userId: newUser.id,
          submissionId: null
        }
      });
    }

    // Mark as APPROVED
    await prisma.onboardingSubmission.update({
      where: { id: params.id },
      data: { status: "APPROVED" }
    });

    // Google Sheets Integration (Optional webhook)
    if (submission.form.googleSheetUrl && submission.form.googleSheetUrl.startsWith("http")) {
      try {
        await fetch(submission.form.googleSheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateName: name,
            candidateEmail: email,
            status: "APPROVED",
            ...submittedData
          })
        }).catch(() => {}); 
      } catch (e) {}
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
