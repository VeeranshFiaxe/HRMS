// src/app/admin/announcements/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnnouncementsAdminClient } from "@/components/admin/AnnouncementsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const announcements = await prisma.announcement.findMany({
    where: { isActive: true },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AnnouncementsAdminClient
      initialAnnouncements={JSON.parse(JSON.stringify(announcements))}
    />
  );
}
