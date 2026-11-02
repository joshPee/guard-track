import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SummaryCard } from '@/components/ui/summary-card'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CampusCoverageMap } from '@/components/ui/campus-coverage-map'
import {
  Shield,
  Clock,
  UserX,
  Users,
  CheckCircle,
  MapPin,
  ArrowRight,
  Sun,
  Moon,
  AlertTriangle,
  Building
} from 'lucide-react'
import Link from 'next/link'

async function getDashboardStats() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalGuards, allDutyPoints, records, recentRecords] = await Promise.all([
      prisma.guard.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.dutyPoint.findMany({
        where: { isActive: true },
        include: { zone: true },
        orderBy: { name: 'asc' },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          shiftDate: today,
        },
        include: {
          guard: true,
        },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          shiftDate: today,
        },
        include: {
          guard: true,
          dutyPoint: true,
          shift: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 6,
      }),
    ])

    const present = records.filter((r) => r.status === 'PRESENT').length
    const late = records.filter((r) => r.status === 'LATE').length
    const absent = records.filter((r) => r.status === 'ABSENT').length
    const notSignedIn = Math.max(0, totalGuards - records.length)

    // Calculate unique duty points covered today
    const coveredDutyPoints = new Set(
      records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').map((r) => r.dutyPointId)
    ).size

    // Map each official duty point for the visual map
    const mappedDutyPoints = allDutyPoints.map((dp) => {
      const activeRecord = records.find(
        (r) => r.dutyPointId === dp.id && (r.status === 'PRESENT' || r.status === 'LATE')
      )
      return {
        id: dp.id,
        name: dp.name,
        zoneName: dp.zone?.name || 'Unassigned',
        isCovered: !!activeRecord,
        assignedGuardName: activeRecord?.guard?.fullName,
        assignedGuardBadge: activeRecord?.guard?.badgeId,
        signInTime: activeRecord?.signInTime
          ? new Date(activeRecord.signInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : undefined,
        status: activeRecord?.status,
      }
    })

    return {
      present,
      late,
      absent,
      notSignedIn,
      total: totalGuards,
      totalDutyPoints: allDutyPoints.length,
      coveredDutyPoints,
      mappedDutyPoints,
      recentRecords,
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      present: 0,
      late: 0,
      absent: 0,
      notSignedIn: 0,
      total: 0,
      totalDutyPoints: 0,
      coveredDutyPoints: 0,
      mappedDutyPoints: [],
      recentRecords: [],
    }
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const stats = await getDashboardStats()
  const isSupervisor = session.user.role === 'SUPERVISOR'

  // Determine current active shift by hour
  const currentHour = new Date().getHours()
  const isDayShift = currentHour >= 6 && currentHour < 18
  const currentShiftName = isDayShift ? 'Day Shift' : 'Night Shift'
  const currentShiftHours = isDayShift ? '06:00 – 18:00' : '18:00 – 06:00'

  const coveragePercent = stats.totalDutyPoints > 0
    ? Math.round((stats.coveredDutyPoints / stats.totalDutyPoints) * 100)
    : 0

  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present + stats.late) / stats.total) * 100)
    : 0

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={Shield}
        badge="Live Operations"
        title="Security Command Center"
        description="Pentecost Convention Centre guard deployment and shift monitoring"
        color="emerald"
        livePulse
        stats={[
          { label: 'Total Guards', value: stats.total },
          { label: 'Present Today', value: stats.present },
          { label: 'Late', value: stats.late, highlight: stats.late > 0 },
          { label: 'Absent', value: stats.absent, highlight: stats.absent > 0 },
        ]}
      />

      {/* Operational Shift Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isDayShift ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'}`}>
            {isDayShift ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Operation</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Shift
              </span>
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {currentShiftName} <span className="text-xs font-normal text-slate-500">({currentShiftHours})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs sm:text-sm self-end sm:self-center">
          <div>
            <p className="text-slate-500 text-right text-[11px] font-medium">Duty Coverage</p>
            <p className="font-bold text-slate-900 dark:text-white text-right">
              {stats.coveredDutyPoints} / {stats.totalDutyPoints} Posts ({coveragePercent}%)
            </p>
          </div>
          <Link
            href="/attendance"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <span>Record Attendance</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Present"
          value={stats.present}
          subtitle="On Schedule"
          icon={CheckCircle}
          iconColor="text-emerald-600 dark:text-emerald-300"
          iconBgColor="bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50"
          badge={{
            text: `${attendanceRate}% Rate`,
            variant: 'emerald',
          }}
          footerText={`${stats.total} total guards`}
          href="/attendance"
          className="animate-fade-in-up animation-delay-0"
        />

        <SummaryCard
          title="Late"
          value={stats.late}
          subtitle="Past Grace Period"
          icon={Clock}
          iconColor="text-amber-600 dark:text-amber-300"
          iconBgColor="bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/50 dark:to-amber-800/50"
          badge={
            stats.late > 0
              ? { text: 'Attention', variant: 'amber' }
              : { text: 'On Schedule', variant: 'emerald' }
          }
          footerText="Today's shift"
          href="/attendance"
          className="animate-fade-in-up animation-delay-1"
        />

        <SummaryCard
          title="Absent"
          value={stats.absent}
          subtitle="Unexcused / Missing"
          icon={UserX}
          iconColor="text-rose-600 dark:text-rose-300"
          iconBgColor="bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/50 dark:to-rose-800/50"
          badge={
            stats.absent > 0
              ? { text: 'Follow Up', variant: 'rose' }
              : { text: 'None Today', variant: 'emerald' }
          }
          footerText="Review required"
          href="/attendance"
          className="animate-fade-in-up animation-delay-2"
        />

        <SummaryCard
          title="Not Signed In"
          value={stats.notSignedIn}
          subtitle="No Record Yet"
          icon={Users}
          iconColor="text-blue-600 dark:text-blue-300"
          iconBgColor="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50"
          badge={{
            text: stats.notSignedIn > 0 ? 'Pending' : 'Complete',
            variant: stats.notSignedIn > 0 ? 'blue' : 'emerald',
          }}
          footerText="Awaiting sign-in"
          href="/attendance"
          className="animate-fade-in-up animation-delay-3"
        />
      </div>

      {/* Interactive Visual Campus Map & Patrol Grid */}
      <CampusCoverageMap
        dutyPoints={stats.mappedDutyPoints}
        totalPoints={stats.totalDutyPoints}
        coveredCount={stats.coveredDutyPoints}
        className="animate-fade-in-up"
      />

      {/* Two Column Grid: Recent Activity & Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-3 pb-6 lg:pb-0">
        {/* Recent Attendance Activity */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in-up">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Shield className="h-4 w-4 text-emerald-600" />
              Recent Attendance Check-Ins Today
            </CardTitle>
            <Link
              href="/attendance"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
            >
              <span>View Full Roster</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {stats.recentRecords.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No guard check-ins recorded yet for today.</p>
                <Link href="/attendance" className="mt-2 inline-block text-xs text-emerald-600 underline font-medium">
                  Go to Attendance Roster
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.recentRecords.map((rec: any) => (
                  <div key={rec.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold shrink-0">
                        {rec.guard?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'GD'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {rec.guard?.fullName || 'Guard'}
                        </p>
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {rec.dutyPoint?.name || 'Unassigned Post'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          rec.status === 'PRESENT'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : rec.status === 'LATE'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {rec.status}
                      </span>
                      {rec.signInTime && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(rec.signInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Management Shortcuts */}
        <div className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in-up">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                Command Center Shortcuts
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-2">
              <Link
                href="/attendance"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Take Shift Attendance
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
              </Link>
              <Link
                href="/duty-points"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-teal-600" />
                  21 Campus Posts Roster
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
              </Link>
              <Link
                href="/guards"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Manage Personnel ({stats.total})
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
              </Link>
              <Link
                href="/reports"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-violet-600" />
                  Export Daily / Monthly PDF
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
