// src/app/api/reports/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format, startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
  const userId = searchParams.get("userId") || undefined;

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);

  const records = await prisma.attendanceRecord.findMany({
    where: { date: { gte: monthStart, lte: monthEnd }, ...(userId && { userId }) },
    include: { user: { select: { name: true, email: true, department: true, designation: true } } },
    orderBy: [{ date: "asc" }, { user: { name: "asc" } }],
  });

  const headers = ["Date","Employee Name","Email","Department","Designation","Check In","Check Out","Duration (mins)","Status","Is Late","Late By (mins)","Is Half Day","Check-In IP","Latitude","Longitude"];
  const rows = records.map((r) => {
    const checkIn = r.checkInAt ? new Date(r.checkInAt) : null;
    const checkOut = r.checkOutAt ? new Date(r.checkOutAt) : null;
    const durationMins = checkIn && checkOut ? Math.round((checkOut.getTime() - checkIn.getTime()) / 60000) : "";
    return [format(new Date(r.date), "yyyy-MM-dd"), r.user.name, r.user.email, r.user.department||"", r.user.designation||"", checkIn ? format(checkIn, "yyyy-MM-dd HH:mm:ss") : "", checkOut ? format(checkOut, "yyyy-MM-dd HH:mm:ss") : "", durationMins, r.status, r.isLate?"Yes":"No", r.lateMinutes, r.isHalfDay?"Yes":"No", r.checkInIp||"", r.checkInLat||"", r.checkInLng||""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="attendance_${year}_${String(month).padStart(2,"0")}.csv"` },
  });
}
