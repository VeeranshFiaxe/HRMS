// src/app/api/attendance/check-in/route.ts
// SERVER TIME IS USED — browser time is NEVER trusted

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { processCheckIn } from "@/lib/attendance-engine";
import { getClientIp } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const clientIp = getClientIp(req.headers);

    const result = await processCheckIn({
      userId: session.user.id,
      clientIp,
      lat: body.lat,
      lng: body.lng,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Check-in route error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
