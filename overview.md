# GuardTrack — PCC Security Operations System

GuardTrack is a web-based security management platform built for the **Pentecost Convention Centre (PCC) Security Operations Unit** in Ghana. It replaces paper rosters and manual attendance logs with a centralized system for managing guards, duty posts, daily deployments, attendance, leave, and reporting.

## Who it's for

- **Supervisors** — full access: manage guards, duty points, schedules, attendance, leave approvals, and exports
- **Viewers** — read-only access to dashboards and rosters
- **Public portal visitors** — supervisors and executives can view the guard directory and daily duty assignments without logging in

## Core modules

### Guard Personnel (`/guards`)
- Guard profiles with photos, badge IDs, phone numbers, shift type (Day/Night/Both), start dates, and service tenure
- Designations (e.g. Day Supervisor, Senior Supervisor) shown as badges on rosters
- Non-duty staff flag — senior supervisors appear on the guards page but are excluded from duty assignments and public rosters
- Status management (Active/Inactive), permanent delete with history preservation, CSV export
- Per-guard profile page (`/guards/[id]`) with attendance stats, leave history, and quick Call/WhatsApp actions

### Duty Points (`/duty-points`)
- Campus posts organized by zone (gates, auditoriums, residential areas, etc.)
- Required guard headcount per post (`requiredGuards`) for understaffing detection
- Zone-aware icons for quick visual identification

### Daily Assignments & Directory (`/directory`, `/assignments`)
- **Public, no-login portals** for supervisors/executives
- Directory: browse all guards, assign-mode for editing daily postings (writes protected by `PORTAL_WRITE_TOKEN` or supervisor session)
- Assignments: executive roster view with KPI counters, zone grouping, search/filter, official tabular print layout, CSV export, and WhatsApp roster sharing (`PCC SECURITY GUARD ROSTER` message format)
- Understaffed post alerts comparing assigned vs required headcount
- Non-duty staff never appear on rosters

### Attendance (`/attendance`)
- Roster mode (mark Present/Absent per guard) and logbook "sign-in book" entry mode
- Guard photos in roster rows, bulk actions, late-arrival tracking
- Leave-conflict warnings when marking a guard present while on approved leave
- Full audit trail via `AttendanceAudit`

### Leave & Exeats (`/leave`)
- Leave types: Casual, Excused Clinic, Exeat, Emergency, Annual, Off Duty
- Auto-generated reference numbers (e.g. `EX-2026-001`), approval workflow with PENDING/APPROVED/REJECTED/CANCELLED states
- Active-leave indicators on dashboard and guard profiles

### Schedule, Heatmap & Reports
- `/schedule` — planner view for upcoming shifts
- `/heatmap` — attendance calendar per guard
- `/reports` — PDF/CSV exports (weekly/monthly summaries)

### Dashboard (`/dashboard`)
- Live operations overview with 60-second auto-refresh and last-updated indicator
- Today's leave/exeat strip, recent check-ins, staffing alerts
- Dynamic post counts (no hardcoded numbers)

## Cross-cutting features

- **Command palette** (⌘K / Ctrl+K) — jump to any page or search guards
- **Dark mode** — toggle in admin topbar and public portal navbar
- **Profile page** (`/profile`) — avatar photo upload (shown in topbar), display name editing, password change
- **Mobile bottom navigation** for the admin portal
- **Role-based access** — middleware protects dashboard routes; public portals are read-only with token-guarded writes
- **Official print layouts** — PCC letterhead headers and sign-off footers for duty rosters

## Tech stack

- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **Prisma ORM** with PostgreSQL (Neon serverless)
- **NextAuth** credentials auth (JWT sessions, bcrypt passwords)
- **Vercel Blob** for image storage (guard/user photos)
- **Radix UI** primitives + Lucide icons
- Deployed on **Vercel** (auto-deploys from `main`)

## Key environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | Auth signing + base URL |
| `PORTAL_WRITE_TOKEN` | Token required for public-portal assignment writes |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob image storage |

## Data model highlights

`Guard` (photo, badge, shift, designation, excludeFromDuty) · `DutyPoint`/`Zone` (posts + required headcount) · `DailyDutyAssignment` (date + shift roster) · `AttendanceRecord` + `AttendanceAudit` · `LeaveRecord` · `Shift` · `User` (roles, photo)
