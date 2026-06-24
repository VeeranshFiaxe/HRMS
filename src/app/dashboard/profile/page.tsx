// src/app/dashboard/profile/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { ProfileForm } from "@/components/employee/ProfileForm";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { customSchedule: true },
  });

  if (!user) redirect("/auth/login");

  const companySchedule = await prisma.companySchedule.findFirst();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">View and update your account information</p>
      </div>
      <ProfileForm
        user={JSON.parse(JSON.stringify(user))}
        schedule={user.customSchedule ? JSON.parse(JSON.stringify(user.customSchedule)) : JSON.parse(JSON.stringify(companySchedule))}
        isCustomSchedule={!!user.customSchedule}
      />
    </div>
  );
}
