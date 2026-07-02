// prisma/seed.ts
// Run: npm run db:seed

import { PrismaClient, UserRole, EmploymentType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Company Schedule ──────────────────────────────────────
  const schedule = await prisma.companySchedule.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "Default Schedule",
      startTime: "11:00",
      endTime: "20:00",
      lateAfter: "11:15",
      halfDayAfter: "14:00",
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
  });
  console.log("✅ Company schedule created");

  // ── Attendance Rules ──────────────────────────────────────
  const rules = await prisma.attendanceRules.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      lateStreakDays: 3,
      lateStreakPenalty: "HALF_DAY",
      graceMinutes: 0,
      autoAbsentAfter: "15:00",
      minHoursFullDay: 8.0,
      minHoursHalfDay: 4.0,
    },
  });
  console.log("✅ Attendance rules created");

  // ── Office Settings ───────────────────────────────────────
  const office = await prisma.officeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "Main Office",
      latitude: 19.076, // Mumbai default
      longitude: 72.8777,
      radiusMeters: 200,
      geofenceEnabled: true,
      allowedIps: ["127.0.0.1", "::1"],
      ipCheckEnabled: false, // disabled by default so local dev works
    },
  });
  console.log("✅ Office settings created");

  // ── Salary Rules ──────────────────────────────────────────
  await prisma.salaryRules.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      halfDayDeductionFactor: 0.5,
      lateDeductionFactor: 0.33,
      absentDeductionFactor: 1.0,
      paidLeaveDaysPerMonth: 1,
      note: "Default salary calculation: baseSalary × (daysWorked / payableWorkingDays)",
    },
  });
  console.log("✅ Salary rules created");

  // ── Admin User ────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      email: "admin@company.com",
      name: "System Admin",
      password: adminPassword,
      role: UserRole.ADMIN,
      employmentType: EmploymentType.FULL_TIME,
      department: "Management",
      designation: "HR Admin",
      joiningDate: new Date("2024-01-01"),
      emailVerified: new Date(),
    },
  });
  console.log("✅ Admin user created (admin@company.com / Admin@123)");

  // ── Sample Employees ──────────────────────────────────────
  const empPassword = await bcrypt.hash("Employee@123", 12);

  const employees = [
    {
      email: "alice@company.com",
      name: "Alice Johnson",
      department: "Engineering",
      designation: "Software Engineer",
      employmentType: EmploymentType.FULL_TIME,
    },
    {
      email: "bob@company.com",
      name: "Bob Smith",
      department: "Design",
      designation: "UI/UX Designer",
      employmentType: EmploymentType.FULL_TIME,
    },
    {
      email: "carol@company.com",
      name: "Carol Williams",
      department: "Engineering",
      designation: "Frontend Intern",
      employmentType: EmploymentType.INTERN,
    },
    {
      email: "dave@company.com",
      name: "Dave Brown",
      department: "Marketing",
      designation: "Marketing Manager",
      employmentType: EmploymentType.FULL_TIME,
    },
    {
      email: "eve@company.com",
      name: "Eve Davis",
      department: "Engineering",
      designation: "Backend Engineer",
      employmentType: EmploymentType.FULL_TIME,
    },
  ];

  for (const emp of employees) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        ...emp,
        password: empPassword,
        role: UserRole.EMPLOYEE,
        joiningDate: new Date("2024-06-01"),
        emailVerified: new Date(),
      },
    });
    console.log(`✅ Employee created: ${emp.name}`);
  }

  // ── Intern custom schedule ────────────────────────────────
  const intern = await prisma.user.findUnique({ where: { email: "carol@company.com" } });
  if (intern) {
    await prisma.employeeSchedule.upsert({
      where: { userId: intern.id },
      update: {},
      create: {
        userId: intern.id,
        startTime: "12:00",
        endTime: "17:00",
        lateAfter: "12:15",
        halfDayAfter: "15:00",
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
        note: "Intern schedule (12 PM - 5 PM)",
      },
    });
    console.log("✅ Custom intern schedule created");
  }

  // ── Sample Holidays ───────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const holidays = [
    { name: "New Year's Day", date: new Date(`${currentYear}-01-01`) },
    { name: "Republic Day", date: new Date(`${currentYear}-01-26`) },
    { name: "Holi", date: new Date(`${currentYear}-03-25`) },
    { name: "Good Friday", date: new Date(`${currentYear}-04-18`) },
    { name: "Independence Day", date: new Date(`${currentYear}-08-15`) },
    { name: "Gandhi Jayanti", date: new Date(`${currentYear}-10-02`) },
    { name: "Diwali", date: new Date(`${currentYear}-10-20`) },
    { name: "Christmas", date: new Date(`${currentYear}-12-25`) },
  ];

  for (const holiday of holidays) {
    await prisma.holiday.upsert({
      where: { date: holiday.date },
      update: {},
      create: holiday,
    });
  }
  console.log("✅ Holidays created");

  console.log("\n🎉 Seeding complete!");
  console.log("Admin: admin@company.com / Admin@123");
  console.log("Employees: alice@company.com ... / Employee@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
