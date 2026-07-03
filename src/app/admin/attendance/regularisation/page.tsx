import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RegularisationManagementClient } from "@/components/admin/RegularisationManagementClient";

export const dynamic = "force-dynamic";

export default async function AdminRegularisationPage({
  searchParams,
}: {
  searchParams: {
    status?: string; userId?: string; dept?: string;
    year?: string; month?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const now = new Date();
  const year = parseInt(searchParams.year || now.getFullYear().toString());
  const month = parseInt(searchParams.month || (now.getMonth() + 1).toString());
  const filterStatus = searchParams.status || "";
  const filterUserId = searchParams.userId || "";
  const filterDept = searchParams.dept || "";

  // Build where
  const where: any = {};
  if (filterStatus) where.status = filterStatus;
  if (filterUserId) where.userId = filterUserId;
  if (filterDept) where.user = { department: filterDept };

  // Month filter - based on the `date` of the request, but always include pending requests
  where.OR = [
    {
      date: {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0)
      }
    },
    { status: "PENDING" }
  ];

  const requests = await prisma.regularizationRequest.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, department: true, designation: true, employmentType: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", isActive: true },
    select: { id: true, name: true, department: true },
    orderBy: { name: "asc" },
  });

  return (
    <RegularisationManagementClient
      requests={JSON.parse(JSON.stringify(requests))}
      employees={JSON.parse(JSON.stringify(employees))}
      year={year}
      month={month}
      filterStatus={filterStatus}
      filterUserId={filterUserId}
      filterDept={filterDept}
    />
  );
}
