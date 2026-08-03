// src/app/api/attendance/check-out/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { processCheckOut } from "@/lib/attendance-engine";
import { getClientIp } from "@/lib/utils";
import { notifyAttendanceEvent } from "@/lib/notify-whatsapp";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const clientIp = getClientIp(req.headers);

    const result = await processCheckOut({
      userId: session.user.id,
      clientIp,
      lat: body.lat,
      lng: body.lng,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }

    // Fire-and-forget — never awaited inline, never affects this response
    void notifyAttendanceEvent({ name: session.user.name, type: "CHECK_OUT", time: new Date() });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Check-out route error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
