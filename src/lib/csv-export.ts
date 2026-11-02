export interface DailyReportData {
  id: string
  guard: { fullName: string; badgeId: string; phone?: string | null; defaultDutyPoint?: { name: string } | null }
  dutyPoint: { name: string }
  signInTime: string | null
  status: string
  minutesLate: number
  remarks?: string | null
}

export interface GuardDayData {
  status: string
  signInTime: string | null
  minutesLate: number
  dutyPoint?: string | null
  shiftName?: string | null
  remarks?: string | null
}

export interface GuardReportItem {
  guard: {
    id: string
    fullName: string
    badgeId: string
    phone?: string | null
    status?: string
    defaultDutyPoint?: { name: string } | null
  }
  days: Record<string, GuardDayData>
  totals: {
    present: number
    late: number
    absent: number
    off: number
    leave: number
    excused: number
    minutesLate: number
  }
  attendanceRate?: string
}

export interface WeeklyReportData {
  days: string[]
  guards: GuardReportItem[]
  selectedGuard?: any
}

export interface MonthlyReportData {
  days: string[]
  guards: GuardReportItem[]
  lateRanking?: any[]
  selectedGuard?: any
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY CSV
// ─────────────────────────────────────────────────────────────────────────────

export function exportDailyReportCSV(
  data: DailyReportData[],
  date: string,
  shift: string,
  guardName?: string
) {
  const isSingle = !!guardName && guardName !== 'all'
  const headers = ['Guard Name', 'Badge ID', 'Duty Point', 'Sign In Time', 'Status', 'Minutes Late', 'Remarks']

  const rows = data.map(record => [
    `"${record.guard.fullName}"`,
    `"${record.guard.badgeId}"`,
    `"${record.dutyPoint?.name || 'Unassigned'}"`,
    `"${record.signInTime ? new Date(record.signInTime).toLocaleTimeString() : 'N/A'}"`,
    `"${record.status}"`,
    record.minutesLate.toString(),
    `"${record.remarks || ''}"`
  ])

  const csvContent = [
    `PCC Security Unit - Daily Attendance Report`,
    `Date: ${date}`,
    `Shift: ${shift === 'day-shift' ? 'Day Shift (06:00 - 18:00)' : 'Night Shift (18:00 - 06:00)'}`,
    `Scope: ${isSingle ? `Guard ${guardName}` : 'All Guards'}`,
    `Total Records: ${data.length}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  const filename = isSingle
    ? `daily-attendance-${guardName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${date}.csv`
    : `daily-attendance-all-guards-${date}.csv`
  downloadCSV(csvContent, filename)
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY CSV DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────

export function exportWeeklyReportCSV(
  data: WeeklyReportData,
  weekStart: string,
  options?: { guardId?: string; guardName?: string }
) {
  const isSingle = (options?.guardId && options.guardId !== 'all') || (data.guards.length === 1 && !!options?.guardName)

  if (isSingle) {
    exportSingleGuardWeeklyCSV(data.guards[0], data.days, weekStart)
  } else {
    exportAllGuardsWeeklyCSV(data, weekStart)
  }
}

export function exportSingleGuardWeeklyCSV(
  guardItem: GuardReportItem,
  days: string[],
  weekStart: string
) {
  const guard = guardItem.guard
  const totals = guardItem.totals || { present: 0, late: 0, absent: 0, off: 0, leave: 0, excused: 0, minutesLate: 0 }
  const scheduled = totals.present + totals.late + totals.absent
  const rate = scheduled > 0 ? Math.round(((totals.present + totals.late) / scheduled) * 100) : 100

  const headers = ['Date', 'Day of Week', 'Shift', 'Duty Point', 'Sign In Time', 'Status', 'Minutes Late', 'Remarks']

  const rows = days.map(d => {
    const dateObj = new Date(d + 'T12:00:00')
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
    const dayData = guardItem.days?.[d]

    return [
      `"${d}"`,
      `"${weekday}"`,
      `"${dayData?.shiftName || 'Standard Shift'}"`,
      `"${dayData?.dutyPoint || guard.defaultDutyPoint?.name || 'Unassigned'}"`,
      `"${dayData?.signInTime ? new Date(dayData.signInTime).toLocaleTimeString() : 'N/A'}"`,
      `"${dayData?.status || 'ABSENT'}"`,
      (dayData?.minutesLate || 0).toString(),
      `"${dayData?.remarks || ''}"`
    ]
  })

  const csvContent = [
    `PCC Security Unit - Individual Guard Weekly Attendance Report`,
    `Guard Name: "${guard.fullName}"`,
    `Badge ID: "${guard.badgeId}"`,
    `Phone: "${guard.phone || 'N/A'}"`,
    `Default Post: "${guard.defaultDutyPoint?.name || 'Unassigned'}"`,
    `Week Starting: ${weekStart}`,
    `Weekly Attendance Rate: ${rate}%`,
    `Present: ${totals.present}, Late: ${totals.late}, Absent: ${totals.absent}, Off: ${totals.off}, Leave: ${totals.leave}, Excused: ${totals.excused}, Total Late Minutes: ${totals.minutesLate}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  const cleanName = guard.fullName.toLowerCase().replace(/[^a-z0-9]/g, '-')
  downloadCSV(csvContent, `weekly-report-${cleanName}-${guard.badgeId.toLowerCase()}-${weekStart}.csv`)
}

export function exportAllGuardsWeeklyCSV(data: WeeklyReportData, weekStart: string) {
  const dayHeaders = data.days.map(d => {
    const date = new Date(d + 'T12:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  })

  const headers = [
    'Guard Name',
    'Badge ID',
    'Default Post',
    ...dayHeaders,
    'Present',
    'Late',
    'Absent',
    'Off',
    'Leave',
    'Excused',
    'Total Late (min)',
    'Attendance Rate %'
  ]

  const rows = data.guards.map(guardItem => {
    const g = guardItem.guard
    const t = guardItem.totals || { present: 0, late: 0, absent: 0, off: 0, leave: 0, excused: 0, minutesLate: 0 }

    const dayCells = data.days.map(day => {
      const dayData = guardItem.days?.[day]
      return dayData ? dayData.status : '-'
    })

    return [
      `"${g.fullName}"`,
      `"${g.badgeId}"`,
      `"${g.defaultDutyPoint?.name || 'Unassigned'}"`,
      ...dayCells.map(c => `"${c}"`),
      t.present.toString(),
      t.late.toString(),
      t.absent.toString(),
      t.off.toString(),
      t.leave.toString(),
      t.excused.toString(),
      t.minutesLate.toString(),
      `"${guardItem.attendanceRate || '0'}%"`
    ]
  })

  const csvContent = [
    `PCC Security Unit - Weekly Attendance Report (All Guards)`,
    `Week Starting: ${weekStart}`,
    `Total Guards: ${data.guards.length}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  downloadCSV(csvContent, `weekly-attendance-all-guards-${weekStart}.csv`)
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTHLY CSV DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────

export function exportMonthlyReportCSV(
  data: MonthlyReportData,
  month: string,
  options?: { guardId?: string; guardName?: string }
) {
  const isSingle = (options?.guardId && options.guardId !== 'all') || (data.guards.length === 1 && !!options?.guardName)

  if (isSingle) {
    exportSingleGuardMonthlyCSV(data.guards[0], data.days, month)
  } else {
    exportAllGuardsMonthlyCSV(data, month)
  }
}

export function exportSingleGuardMonthlyCSV(
  guardItem: GuardReportItem,
  days: string[],
  month: string
) {
  const guard = guardItem.guard
  const totals = guardItem.totals || { present: 0, late: 0, absent: 0, off: 0, leave: 0, excused: 0, minutesLate: 0 }
  const scheduled = totals.present + totals.late + totals.absent
  const rate = scheduled > 0 ? Math.round(((totals.present + totals.late) / scheduled) * 100) : 100

  const headers = ['Date', 'Day of Week', 'Shift', 'Duty Point', 'Sign In Time', 'Status', 'Minutes Late', 'Remarks']

  const rows = days.map(d => {
    const dateObj = new Date(d + 'T12:00:00')
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
    const dayData = guardItem.days?.[d]

    return [
      `"${d}"`,
      `"${weekday}"`,
      `"${dayData?.shiftName || 'Standard Shift'}"`,
      `"${dayData?.dutyPoint || guard.defaultDutyPoint?.name || 'Unassigned'}"`,
      `"${dayData?.signInTime ? new Date(dayData.signInTime).toLocaleTimeString() : 'N/A'}"`,
      `"${dayData?.status || 'ABSENT'}"`,
      (dayData?.minutesLate || 0).toString(),
      `"${dayData?.remarks || ''}"`
    ]
  })

  const csvContent = [
    `PCC Security Unit - Individual Guard Monthly Attendance Report`,
    `Guard Name: "${guard.fullName}"`,
    `Badge ID: "${guard.badgeId}"`,
    `Phone: "${guard.phone || 'N/A'}"`,
    `Default Post: "${guard.defaultDutyPoint?.name || 'Unassigned'}"`,
    `Month: ${month}`,
    `Monthly Attendance Rate: ${rate}%`,
    `Present: ${totals.present}, Late: ${totals.late}, Absent: ${totals.absent}, Off: ${totals.off}, Leave: ${totals.leave}, Excused: ${totals.excused}, Total Late Minutes: ${totals.minutesLate}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  const cleanName = guard.fullName.toLowerCase().replace(/[^a-z0-9]/g, '-')
  downloadCSV(csvContent, `monthly-report-${cleanName}-${guard.badgeId.toLowerCase()}-${month}.csv`)
}

export function exportAllGuardsMonthlyCSV(data: MonthlyReportData, month: string) {
  const dayHeaders = data.days.map(d => {
    const date = new Date(d + 'T12:00:00')
    return `Day ${date.getDate()}`
  })

  const headers = [
    'Guard Name',
    'Badge ID',
    'Default Post',
    ...dayHeaders,
    'Present',
    'Late',
    'Absent',
    'Off',
    'Leave',
    'Excused',
    'Attendance Rate %',
    'Total Late (min)'
  ]

  const rows = data.guards.map(guardItem => {
    const g = guardItem.guard
    const t = guardItem.totals || { present: 0, late: 0, absent: 0, off: 0, leave: 0, excused: 0, minutesLate: 0 }

    const dayCells = data.days.map(day => {
      const dayData = guardItem.days?.[day]
      return dayData ? dayData.status : '-'
    })

    return [
      `"${g.fullName}"`,
      `"${g.badgeId}"`,
      `"${g.defaultDutyPoint?.name || 'Unassigned'}"`,
      ...dayCells.map(c => `"${c}"`),
      t.present.toString(),
      t.late.toString(),
      t.absent.toString(),
      t.off.toString(),
      t.leave.toString(),
      t.excused.toString(),
      `"${guardItem.attendanceRate || '0'}%"`,
      t.minutesLate.toString()
    ]
  })

  const rankingHeaders = ['Rank', 'Guard Name', 'Badge ID', 'Total Minutes Late', 'Attendance Rate %']
  const rankingRows = (data.lateRanking || []).map((guardItem, index) => [
    (index + 1).toString(),
    `"${guardItem.guard?.fullName || ''}"`,
    `"${guardItem.guard?.badgeId || ''}"`,
    (guardItem.totals?.minutesLate || 0).toString(),
    `"${guardItem.attendanceRate || '0'}%"`
  ])

  const csvContent = [
    `PCC Security Unit - Monthly Attendance Report (All Guards)`,
    `Month: ${month}`,
    `Total Guards: ${data.guards.length}`,
    `Total Days: ${data.days.length}`,
    '',
    'SECTION 1: COMPREHENSIVE ATTENDANCE MATRIX',
    headers.join(','),
    ...rows.map(row => row.join(',')),
    '',
    '',
    'SECTION 2: LATE ARRIVAL RANKING & PUNCTUALITY',
    rankingHeaders.join(','),
    ...rankingRows.map(row => row.join(','))
  ].join('\n')

  downloadCSV(csvContent, `monthly-attendance-all-guards-${month}.csv`)
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Browser CSV Download
// ─────────────────────────────────────────────────────────────────────────────

function downloadCSV(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
