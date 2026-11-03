import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import Link from 'next/link'
import {
  User,
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  Phone,
  CheckCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Award,
  BarChart3,
  Star,
  Target,
  PieChart
} from 'lucide-react'
import { format } from 'date-fns'
import { ExportGuardDossierButton } from '@/components/ExportGuardDossierButton'
import { Breadcrumb } from '@/components/ui/breadcrumb'

async function getGuardWithAttendance(id: string) {
  const guard = await prisma.guard.findUnique({
    where: { id },
    include: {
      defaultDutyPoint: true,
      attendanceRecords: {
        orderBy: { shiftDate: 'desc' },
        take: 90,
        include: {
          shift: true,
          dutyPoint: true,
        },
      },
    },
  })

  if (!guard) return null

  // Calculate comprehensive stats
  const stats = {
    total: guard.attendanceRecords.length,
    present: guard.attendanceRecords.filter((r) => r.status === 'PRESENT').length,
    late: guard.attendanceRecords.filter((r) => r.status === 'LATE').length,
    absent: guard.attendanceRecords.filter((r) => r.status === 'ABSENT').length,
    off: guard.attendanceRecords.filter((r) => r.status === 'OFF').length,
    leave: guard.attendanceRecords.filter((r) => r.status === 'LEAVE').length,
    excused: guard.attendanceRecords.filter((r) => r.status === 'EXCUSED').length,
    totalLateMinutes: guard.attendanceRecords.reduce((sum, r) => sum + (r.minutesLate || 0), 0),
  }

  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present + stats.late) / stats.total) * 100)
    : 0

  const lateRate = stats.total > 0
    ? Math.round((stats.late / stats.total) * 100)
    : 0

  const absentRate = stats.total > 0
    ? Math.round((stats.absent / stats.total) * 100)
    : 0

  // Calculate performance rating
  let performanceRating = 'Excellent'
  let performanceColor = 'emerald'
  if (attendanceRate < 70 || lateRate > 30) {
    performanceRating = 'Needs Improvement'
    performanceColor = 'rose'
  } else if (attendanceRate < 85 || lateRate > 15) {
    performanceRating = 'Fair'
    performanceColor = 'amber'
  } else if (attendanceRate < 95 || lateRate > 5) {
    performanceRating = 'Good'
    performanceColor = 'blue'
  }

  // Calculate most common duty points
  const dutyPointCounts = guard.attendanceRecords.reduce((acc, r) => {
    const dpName = r.dutyPoint.name
    acc[dpName] = (acc[dpName] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const commonDutyPoints = Object.entries(dutyPointCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count, percentage: Math.round((count / stats.total) * 100) }))

  // Calculate last 30 day stats
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentRecords = guard.attendanceRecords.filter(r => new Date(r.shiftDate) >= thirtyDaysAgo)
  const recentStats = {
    total: recentRecords.length,
    present: recentRecords.filter((r) => r.status === 'PRESENT').length,
    late: recentRecords.filter((r) => r.status === 'LATE').length,
    absent: recentRecords.filter((r) => r.status === 'ABSENT').length,
  }

  const recentAttendanceRate = recentStats.total > 0
    ? Math.round(((recentStats.present + recentStats.late) / recentStats.total) * 100)
    : 0

  // Generate weekly attendance data for trend
  const weeklyData: Array<{ week: string; rate: number; late: number }> = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - (i * 7))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const weekRecords = guard.attendanceRecords.filter(r => {
      const date = new Date(r.shiftDate)
      return date >= weekStart && date <= weekEnd
    })

    const weekPresent = weekRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length
    const weekLate = weekRecords.filter(r => r.status === 'LATE').length
    const weekRate = weekRecords.length > 0 ? Math.round((weekPresent / weekRecords.length) * 100) : 0

    weeklyData.push({
      week: format(weekStart, 'MMM dd'),
      rate: weekRate,
      late: weekLate,
    })
  }

  return {
    guard,
    stats,
    attendanceRate,
    lateRate,
    absentRate,
    performanceRating,
    performanceColor,
    commonDutyPoints,
    recentStats,
    recentAttendanceRate,
    weeklyData,
  }
}

export default async function GuardProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const data = await getGuardWithAttendance(params.id)

  if (!data) {
    notFound()
  }

  const {
    guard,
    stats,
    attendanceRate,
    lateRate,
    absentRate,
    performanceRating,
    performanceColor,
    commonDutyPoints,
    recentStats,
    recentAttendanceRate,
    weeklyData,
  } = data

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Operations' },
          { label: 'Guard Personnel', href: '/guards' },
          { label: guard.fullName },
        ]}
        backHref="/guards"
        backLabel="Guards Directory"
      />

      {/* Profile Header */}
      <PageHeader
        icon={User}
        badge={guard.badgeId}
        title={guard.fullName}
        description={`Registered Guard · Assigned to ${guard.defaultDutyPoint?.name || 'Unassigned Post'}`}
        color="blue"
        actions={
          <div className="flex items-center gap-2">
            <ExportGuardDossierButton
              guardId={guard.id}
              data={{
                guard: {
                  id: guard.id,
                  fullName: guard.fullName,
                  badgeId: guard.badgeId,
                  phone: guard.phone,
                  status: guard.status,
                  defaultDutyPoint: guard.defaultDutyPoint,
                },
                stats,
                attendanceRate,
                records: guard.attendanceRecords.map((r) => ({
                  shiftDate: r.shiftDate,
                  shiftName: r.shift.name,
                  dutyPointName: r.dutyPoint.name,
                  signInTime: r.signInTime,
                  status: r.status,
                  minutesLate: r.minutesLate,
                  remarks: r.remarks,
                })),
              }}
            />
          </div>
        }
        stats={[
          { label: 'Performance', value: performanceRating },
          { label: 'Attendance Rate', value: `${attendanceRate}%` },
          { label: 'Logged Shifts', value: stats.total },
          { label: 'Late Rate', value: `${lateRate}%`, highlight: lateRate > 15 },
        ]}
      />

      {/* Guard Quick Info Metrics */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Contact Phone</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {guard.phone || 'Not recorded'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Default Post</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                {guard.defaultDutyPoint?.name || 'Unassigned'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Present Shifts</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {stats.present} / {stats.total} shifts
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Late Arrivals</p>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {stats.late} {stats.late === 1 ? 'incident' : 'incidents'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Rating & Analytics */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Performance Rating Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Award className="h-4 w-4 text-blue-600" />
              Performance Rating
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="text-center py-4">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-${performanceColor}-50 dark:bg-${performanceColor}-950/40 text-${performanceColor}-600 dark:text-${performanceColor}-400 mb-3`}>
                <Star className="h-10 w-10" />
              </div>
              <h3 className={`text-2xl font-bold text-${performanceColor}-600 dark:text-${performanceColor}-400`}>
                {performanceRating}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Based on attendance patterns</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Overall Attendance</span>
                <span className="font-semibold text-slate-900 dark:text-white">{attendanceRate}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-${performanceColor}-500`}
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-slate-500">Late Rate</span>
                <span className={`font-semibold ${lateRate > 15 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                  {lateRate}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Absent Rate</span>
                <span className={`font-semibold ${absentRate > 10 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                  {absentRate}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              8-Week Attendance Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {weeklyData.map((week, idx) => {
                const prevWeek = weeklyData[idx - 1]
                const trend = prevWeek ? week.rate - prevWeek.rate : 0
                return (
                  <div key={week.week} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-16 shrink-0">{week.week}</span>
                    <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative">
                      <div
                        className={`h-full rounded-lg transition-all ${
                          week.rate >= 90 ? 'bg-emerald-500' : week.rate >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${week.rate}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-900 dark:text-white">
                        {week.rate}%
                      </span>
                    </div>
                    {trend !== 0 && (
                      <div className={`flex items-center gap-0.5 text-xs ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span>{Math.abs(trend)}%</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent 30-Day Stats */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Target className="h-4 w-4 text-blue-600" />
              Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Shifts Logged</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{recentStats.total}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Present</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{recentStats.present}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40">
                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Late</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{recentStats.late}</p>
              </div>
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40">
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Absent</p>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">{recentStats.absent}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">30-Day Attendance Rate</span>
                <span className={`text-lg font-bold ${recentAttendanceRate >= 90 ? 'text-emerald-600' : recentAttendanceRate >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {recentAttendanceRate}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all ${recentAttendanceRate >= 90 ? 'bg-emerald-500' : recentAttendanceRate >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${recentAttendanceRate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Common Duty Points */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <PieChart className="h-4 w-4 text-purple-600" />
            Most Common Duty Points
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {commonDutyPoints.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No duty point data available</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {commonDutyPoints.map((dp, idx) => (
                <div key={dp.name} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-blue-500' : idx === 2 ? 'bg-purple-500' : 'bg-slate-500'}`}>
                      {idx + 1}
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
                      {dp.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{dp.count} shifts</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{dp.percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${dp.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance History Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <FileText className="h-4 w-4 text-blue-600" />
              Attendance History (Last 90 Shifts)
            </CardTitle>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex flex-col items-end gap-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{attendanceRate}% rate</span>
                <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${attendanceRate >= 90 ? 'bg-emerald-500' : attendanceRate >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-slate-400">{guard.attendanceRecords.length} records</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {guard.attendanceRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No attendance records found for this guard yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-enhanced text-sm">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Duty Point</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sign-In Time</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Mins Late</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {guard.attendanceRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        {format(new Date(record.shiftDate), 'EEE, MMM dd, yyyy')}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {record.shift.name}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {record.dutyPoint.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {record.signInTime ? format(new Date(record.signInTime), 'HH:mm') : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="py-3 px-4 text-center text-xs">
                        {record.minutesLate > 0 ? (
                          <span className="font-bold text-amber-600 dark:text-amber-400">+{record.minutesLate}m</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 max-w-[200px] truncate">
                        {record.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
