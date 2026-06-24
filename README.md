# HRMS — Human Resource Management System

A full-stack attendance and HR management system built with Next.js 14, TypeScript, PostgreSQL, and Prisma.

## Features

- ✅ Secure email/password + Google OAuth login
- ✅ **Server-side timestamps only** — browser time is never trusted
- ✅ Geofence validation (lat/lng + radius)
- ✅ IP allowlist enforcement
- ✅ Check-in / Check-out with geolocation
- ✅ Present / Late / Half-Day / Absent status calculation
- ✅ Late streak detection + automatic penalty
- ✅ Per-employee custom schedules (for interns, part-time)
- ✅ Holiday management
- ✅ Admin dashboard with live employee status
- ✅ Monthly attendance reports + CSV export
- ✅ Configurable salary rules
- ✅ Full audit log trail
- ✅ Forgot password via email

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js v4 |
| Styling | Tailwind CSS |
| Email | Nodemailer |
| Icons | Lucide React |

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 2. Clone and install

```bash
git clone <your-repo>
cd hrms
npm install
```

### 3. Environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/hrms_db"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# Optional — Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Optional — Email (for password reset)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="you@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="HRMS <noreply@company.com>"

APP_URL="http://localhost:3000"
```

### 4. Database setup

```bash
# Create the database
createdb hrms_db

# Run migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed with sample data
npm run db:seed
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | Admin@123 |
| Employee | alice@company.com | Employee@123 |
| Employee | bob@company.com | Employee@123 |
| Intern | carol@company.com | Employee@123 |

> ⚠️ Change all passwords immediately after first login in production.

## Production Deployment

### Environment

```bash
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
DATABASE_URL=postgresql://...  # use connection pooling (PgBouncer/Supabase)
ENFORCE_IP_CHECK=true
ENFORCE_GEOFENCE=true
```

### Build

```bash
npm run build
npm start
```

### Recommended Stack

- **Hosting**: Vercel (zero-config for Next.js)
- **Database**: Supabase or Railway PostgreSQL
- **Email**: Resend, SendGrid, or AWS SES
- **Domain + SSL**: Cloudflare

## Architecture Notes

### Attendance timestamp security

The check-in and check-out timestamps are **always generated on the server** when the API request arrives. The frontend collects geolocation coordinates and sends them to `/api/attendance/check-in` — but the actual `checkInAt` field is set by `new Date()` on the server, not from any browser-provided value.

### Geofence validation

Uses the Haversine formula to compute distance between employee coordinates and office coordinates. If outside the configured radius, check-in is blocked and the reason is logged.

### IP validation

Supports:
- Exact IP match (`203.0.113.5`)
- CIDR prefix (`192.168.1.0/24`)
- Wildcard (`192.168.1.*`)

### Late streak

The engine checks the last N attendance records after every late check-in. If all N are late, it applies the configured penalty (e.g., marks the latest as Half Day).

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attendance/check-in` | Check in (server timestamps) |
| POST | `/api/attendance/check-out` | Check out |
| GET | `/api/attendance/history` | Attendance history |
| GET | `/api/employees` | List employees (admin) |
| POST | `/api/employees` | Create employee (admin) |
| PATCH | `/api/employees/:id` | Update employee (admin) |
| PUT | `/api/employees/:id/schedule` | Set custom schedule |
| DELETE | `/api/employees/:id/schedule` | Remove custom schedule |
| PUT | `/api/employees/:id/salary` | Set salary override |
| GET | `/api/office-settings` | Get office settings |
| PUT | `/api/office-settings` | Update geofence + IP |
| PUT | `/api/attendance-rules` | Update attendance rules |
| PUT | `/api/schedules` | Update company schedule |
| GET/POST/DELETE | `/api/holidays` | Manage holidays |
| PUT | `/api/salary-rules` | Update salary rules |
| GET | `/api/reports/export` | CSV export |
| GET | `/api/audit` | Audit logs |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/change-password` | Change password |

## Database Schema

See `prisma/schema.prisma` for the full schema. Key models:

- `User` — employees and admins
- `AttendanceRecord` — one row per employee per day, with server timestamps
- `CompanySchedule` — default working hours for all employees
- `EmployeeSchedule` — per-employee schedule override
- `OfficeSettings` — geofence + IP allowlist
- `AttendanceRules` — late streak, auto-absent rules
- `SalaryRules` — deduction factors
- `Holiday` — public holidays
- `AuditLog` — immutable trail of all system events
