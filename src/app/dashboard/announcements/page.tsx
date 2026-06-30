// src/app/dashboard/announcements/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Megaphone, Calendar, Cake, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

function getTodayBirthdays(employees: Array<{ id: string; name: string; dateOfBirth: Date | null; joiningDate: Date }>) {
  const today = new Date();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();
  return employees.filter((e) => {
    if (!e.dateOfBirth) return false;
    const dob = new Date(e.dateOfBirth);
    return dob.getMonth() === todayMonth && dob.getDate() === todayDay;
  });
}

function getTodayAnniversaries(employees: Array<{ id: string; name: string; dateOfBirth: Date | null; joiningDate: Date }>) {
  const today = new Date();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();
  return employees.filter((e) => {
    const doj = new Date(e.joiningDate);
    const isToday = doj.getMonth() === todayMonth && doj.getDate() === todayDay;
    const years = today.getFullYear() - doj.getFullYear();
    return isToday && years > 0;
  }).map((e) => ({
    ...e,
    years: today.getFullYear() - new Date(e.joiningDate).getFullYear(),
  }));
}

export default async function EmployeeAnnouncementsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const announcements = await prisma.announcement.findMany({
    where: { isActive: true },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const employees = await prisma.user.findMany({
    where: { isActive: true, role: "EMPLOYEE" },
    select: { id: true, name: true, dateOfBirth: true, joiningDate: true },
  });

  const birthdays = getTodayBirthdays(employees as any);
  const anniversaries = getTodayAnniversaries(employees as any);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Announcements</h1>
        <p className="page-subtitle">Stay up to date with company news and updates.</p>
      </div>

      {/* Birthday / Anniversary cards */}
      {(birthdays.length > 0 || anniversaries.length > 0) && (
        <div className="space-y-2">
          {birthdays.map((emp) => (
            <div key={`bday-${emp.id}`} className="card p-4 flex items-center gap-3 border-pink-200 bg-pink-50/40">
              <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                <Cake size={18} className="text-pink-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">🎂 Happy Birthday, {emp.name}!</p>
                <p className="text-xs text-slate-500">Wishing {emp.name} a wonderful birthday today.</p>
              </div>
              <span className="badge text-pink-600 bg-pink-100 ml-auto text-xs">Birthday</span>
            </div>
          ))}
          {anniversaries.map((emp) => (
            <div key={`ann-${emp.id}`} className="card p-4 flex items-center gap-3 border-amber-200 bg-amber-50/40">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Trophy size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">🎉 {emp.years} Year{emp.years !== 1 ? "s" : ""} with Us, {emp.name}!</p>
                <p className="text-xs text-slate-500">Celebrating {emp.name}'s work anniversary today.</p>
              </div>
              <span className="badge text-amber-600 bg-amber-100 ml-auto text-xs">Anniversary</span>
            </div>
          ))}
        </div>
      )}

      {/* Announcements list */}
      {announcements.length === 0 && birthdays.length === 0 && anniversaries.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Megaphone size={22} className="text-blue-500" />
          </div>
          <p className="text-slate-700 font-medium">No announcements yet</p>
          <p className="text-sm text-slate-400 mt-1">Check back later for updates from your team.</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-slate-100">
          {announcements.map((ann) => (
            <div key={ann.id} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Megaphone size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{ann.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-400">
                      {format(new Date(ann.createdAt), "dd MMM yyyy")}
                    </span>
                    {ann.reflectOnCalendar && ann.eventDate && (
                      <span className="badge text-blue-600 bg-blue-50 text-xs">
                        <Calendar size={10} className="mr-1" />
                        {format(new Date(ann.eventDate), "dd MMM")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{ann.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
