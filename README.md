# PCC Guard Attendance Portal

A standalone web application for the Security Supervisor at Pentecost Convention Centre (PCC), Gomoa Fetteh, Ghana to record security guard attendance and generate reports.

## Features

- **Authentication**: NextAuth.js with credentials provider and bcrypt password hashing
- **Role-Based Access**: SUPERVISOR (full access) and VIEWER (read-only) roles
- **Dashboard**: Real-time statistics for present, late, absent, and not-signed-in guards
- **Attendance Management**: 
  - Date and shift selection
  - Auto status calculation (PRESENT/LATE based on grace minutes)
  - Manual status override (ABSENT, OFF, LEAVE, EXCUSED)
  - Audit logging for all changes
  - Night shift date handling (shifts crossing midnight)
- **Guards Management**: Add, edit, deactivate guards with badge IDs
- **Duty Points**: 4 zones with 22 duty points
- **Shifts**: Configurable shift times and grace minutes
- **Reports**:
  - Daily reports with guard selection
  - Weekly reports with Monday-Sunday grid
  - Monthly reports with attendance rates and late rankings
  - PDF and CSV export (UI ready, backend implementation pending)
- **Mobile Responsive**: Collapsible sidebar and responsive layouts

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma ORM with PostgreSQL (Neon)
- NextAuth.js
- shadcn/ui and Tailwind CSS
- Zod for validation
- jsPDF for PDF export
- date-fns for date manipulation

## Database Schema

- User: Authentication and role management
- Guard: Guard profiles with badge IDs
- Zone: Grouping of duty points
- DutyPoint: Specific guard locations
- Shift: Shift configurations (start, end, grace minutes)
- AttendanceRecord: Attendance tracking with audit trail
- AttendanceAudit: Change history for attendance records
- Setting: Application settings

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon provided)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`:
```
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

3. Run database migrations:
```bash
npx prisma db push
```

4. Seed the database:
```bash
npm run seed
```

5. Start the development server:
```bash
npm run dev
```

### Default Credentials

- Supervisor: supervisor@pcc.gov.gh / admin123
- Viewer: viewer@pcc.gov.gh / viewer123

## Seed Data

The seed script creates:
- 2 users (1 supervisor, 1 viewer)
- 2 shifts (Day: 06:00-18:00, Night: 18:00-06:00)
- 4 zones
- 22 duty points across all zones
- 5 sample guards

## Acceptance Criteria

✅ Duplicate prevention: Unique constraint on guardId + shiftId + shiftDate
✅ Late calculation: Auto-calculated based on shift start time and grace minutes
✅ Night shift handling: Shifts crossing midnight belong to the start date
✅ Role protection: VIEWER cannot access write endpoints
✅ Audit logging: Every edit creates an AttendanceAudit record
✅ Mobile responsive: Collapsible sidebar and responsive layouts

## Project Structure

```
guardtrack-app/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── attendance/
│   │   │   ├── guards/
│   │   │   ├── duty-points/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── guards/
│   │   │   ├── duty-points/
│   │   │   ├── attendance/
│   │   │   ├── shifts/
│   │   │   ├── zones/
│   │   │   └── reports/
│   │   └── login/
│   ├── components/
│   │   ├── ui/
│   │   ├── Sidebar.tsx
│   │   └── providers.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── prisma.ts
│   │   └── utils.ts
│   └── types/
└── package.json
```

## Theme

The application uses PCC brand colors:
- Navy blue (#1e3a8a) for sidebar and primary actions
- Red (#dc2626) for alerts and destructive actions
- Gold (#f59e0b) for highlights

## License

Private - For PCC Security Department use only
