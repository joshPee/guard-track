import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
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
  ShieldCheck
} from 'lucide-react'
import Link from 'next/link'
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
        take: 30,
        include: {
          shift: true,
          dutyPoint: true,
        },
      },
    },
  })

  if (!guard) return null

  // Calculate stats
  const stats = {
    total: guard.attendanceRecords.length,
    present: guard.attendanceRecords.filter((r) => r.status === 'PRESENT').length,
    late: guard.attendanceRecords.filter((r) => r.status === 'LATE').length,
    absent: guard.attendanceRecords.filter((r) => r.status === 'ABSENT').length,
    totalLateMinutes: guard.attendanceRecords.reduce((sum, r) => sum + (r.minutesLate || 0), 0),
  }

  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present + stats.late) / stats.total) * 100)
    : 0

  return { guard, stats, attendanceRate }
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

  const { guard, stats, attendanceRate } = data

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
        }
        stats={[
          { label: 'Status', value: guard.status },
          { label: 'Attendance Rate', value: `${attendanceRate}%` },
          { label: 'Logged Shifts', value: stats.total },
          { label: 'Late Minutes', value: stats.totalLateMinutes, highlight: stats.totalLateMinutes > 0 },
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

      {/* Attendance History Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <FileText className="h-4 w-4 text-blue-600" />
              Attendance History (Last 30 Shifts)
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
