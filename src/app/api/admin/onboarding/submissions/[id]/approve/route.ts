import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Maps a profileMapping dot-path to the User model field + value */
function applyFieldMapping(
  mappingPath: string,
  value: any,
  userData: Record<string, any>,
  docCategories: Record<string, string>,
  fieldId: string
) {
  if (!mappingPath || value === undefined || value === null || value === "") return;
  const [section, key] = mappingPath.split(".");

  if (section === "basicInfo") {
    const colMap: Record<string, string> = {
      name: "name",
      email: "email",
      personalEmail: "personalEmail",
      phone: "phone",
      department: "department",
      designation: "designation",
      employmentType: "employmentType",
      dateOfBirth: "dateOfBirth",
      joiningDate: "joiningDate",
      emergencyContactName: "emergencyContactName",
      emergencyContactNumber: "emergencyContactNumber",
    };
    const col = colMap[key];
    if (col) {
      // Handle date fields
      if (col === "dateOfBirth" || col === "joiningDate") {
        try { userData[col] = new Date(value); } catch { /* skip invalid dates */ }
      } else {
        userData[col] = typeof value === "string" ? value : String(value);
      }
    }
  } else if (section === "docs") {
    // key = category name e.g. "Resume"
    docCategories[fieldId] = key;
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

    const submission = await prisma.onboardingSubmission.findUnique({
      where: { id: params.id },
      include: { form: true, documents: true }
    });

    if (!submission) return new NextResponse("Not found", { status: 404 });
    if (submission.status === "APPROVED") return new NextResponse("Already approved", { status: 400 });

    const submittedData = (submission.data as Record<string, any>) || {};
    const formFields = (submission.form.fields as any[]) || [];

    // ─── Build user data dynamically from profile mappings ───────────────
    const userData: Record<string, any> = {
      role: "EMPLOYEE",
      isActive: true,
    };
    const docCategories: Record<string, string> = {}; // fieldId → category name

    // First pass: apply all mapped fields
    for (const field of formFields) {
      if (!field.profileMapping) continue;
      const value = submittedData[field.id];
      applyFieldMapping(field.profileMapping, value, userData, docCategories, field.id);
    }

    // ─── Fallbacks for required fields (name, email) ─────────────────────
    // If no field was mapped to "name", try label-based heuristics
    if (!userData.name) {
      for (const field of formFields) {
        const label = (field.label || "").toLowerCase();
        if (label.includes("name") && submittedData[field.id]) {
          userData.name = submittedData[field.id];
          break;
        }
      }
      userData.name = userData.name || submission.candidateName || "Unknown Employee";
    }

    // email must be unique — prefer mapped work email, then candidateEmail, then generated placeholder
    if (!userData.email) {
      const hasRealEmail = submission.candidateEmail && !submission.candidateEmail.includes("no-email@");
      userData.email = hasRealEmail
        ? submission.candidateEmail
        : `employee.${Date.now()}@placeholder.hrms`;
    }

    // ─── Create the employee user ─────────────────────────────────────────
    const newUser = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        role: "EMPLOYEE",
        isActive: true,
        personalEmail: userData.personalEmail || null,
        phone: typeof userData.phone === "string" ? userData.phone : null,
        department: typeof userData.department === "string" ? userData.department : null,
        designation: typeof userData.designation === "string" ? userData.designation : null,
        employmentType: userData.employmentType || undefined,
        dateOfBirth: userData.dateOfBirth || null,
        joiningDate: userData.joiningDate || new Date(),
        emergencyContactName: userData.emergencyContactName || null,
        emergencyContactNumber: userData.emergencyContactNumber || null,
      }
    });

    // ─── Transfer + categorize documents ─────────────────────────────────
    if (submission.documents.length > 0) {
      for (const doc of submission.documents) {
        // Find which field uploaded this document — match via document name prefix (label)
        // The public form names files as: "Label - originalfilename"
        let category: string | null = null;
        for (const [fieldId, cat] of Object.entries(docCategories)) {
          const field = formFields.find((f: any) => f.id === fieldId);
          if (field) {
            const prefix = field.label + " - ";
            if (doc.name.startsWith(prefix)) {
              category = cat;
              break;
            }
          }
        }

        await prisma.document.update({
          where: { id: doc.id },
          data: {
            userId: newUser.id,
            submissionId: null,
            ...(category ? { docCategory: category } : {}),
          }
        });
      }
    }

    // ─── Mark submission as APPROVED ─────────────────────────────────────
    await prisma.onboardingSubmission.update({
      where: { id: params.id },
      data: { status: "APPROVED" }
    });

    // ─── Google Sheets webhook (optional) ────────────────────────────────
    if (submission.form.googleSheetUrl?.startsWith("http")) {
      try {
        await fetch(submission.form.googleSheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateName: newUser.name,
            candidateEmail: newUser.email,
            status: "APPROVED",
            ...submittedData
          })
        }).catch(() => {});
      } catch (e) {}
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error("Approve submission error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
