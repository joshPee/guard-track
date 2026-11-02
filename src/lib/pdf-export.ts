import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

export interface GuardWeeklyMonthlyTotals {
  present: number
  late: number
  absent: number
  off: number
  leave: number
  excused: number
  minutesLate: number
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
  totals: GuardWeeklyMonthlyTotals
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
// DAILY REPORT (Single Guard or All Guards)
// ─────────────────────────────────────────────────────────────────────────────

export function exportDailyReportPDF(data: DailyReportData[], date: string, shift: string, guardName?: string) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const isSingle = !!guardName && guardName !== 'all'

  // Header Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 45, 89)
  doc.text('PCC Security Department', pageWidth / 2, 18, { align: 'center' })

  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(
    isSingle ? `Individual Daily Attendance Dossier — ${guardName}` : 'Daily Shift Attendance Register',
    pageWidth / 2,
    26,
    { align: 'center' }
  )

  // Meta banner
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, 32, pageWidth - 28, 20, 2, 2, 'FD')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(`Date: ${date}`, 18, 40)
  doc.text(`Shift: ${shift === 'day-shift' ? 'Day Shift (06:00 – 18:00)' : 'Night Shift (18:00 – 06:00)'}`, 18, 47)

  doc.text(`Total Records: ${data.length}`, 110, 40)
  doc.text(`Scope: ${isSingle ? `Guard ${guardName}` : 'All On-Duty Guards'}`, 110, 47)

  // Table
  const tableData = data.map(record => [
    record.guard.fullName,
    record.guard.badgeId,
    record.dutyPoint?.name || 'Unassigned',
    record.signInTime ? new Date(record.signInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
    record.status,
    record.minutesLate > 0 ? `+${record.minutesLate}m` : '0',
    record.remarks || '—'
  ])

  autoTable(doc, {
    startY: 56,
    head: [['Guard Name', 'Badge ID', 'Duty Point', 'Sign In', 'Status', 'Late Min', 'Remarks']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 45, 89],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
  })

  addPDFFooters(doc, pageWidth)
  const filename = isSingle
    ? `daily-attendance-${guardName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${date}.pdf`
    : `daily-attendance-all-guards-${date}.pdf`
  doc.save(filename)
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY REPORT DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────

export function exportWeeklyReportPDF(
  data: WeeklyReportData,
  weekStart: string,
  options?: { guardId?: string; guardName?: string }
) {
  const isSingle = (options?.guardId && options.guardId !== 'all') || (data.guards.length === 1 && !!options?.guardName)

  if (isSingle) {
    const singleGuardItem = data.guards[0]
    exportSingleGuardWeeklyPDF(singleGuardItem, data.days, weekStart)
  } else {
    exportAllGuardsWeeklyPDF(data, weekStart)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. INDIVIDUAL GUARD WEEKLY REPORT (PDF)
// ─────────────────────────────────────────────────────────────────────────────

export function exportSingleGuardWeeklyPDF(
  guardItem: GuardReportItem,
  days: string[],
  weekStart: string
) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const guard = guardItem.guard
  const totals = guardItem.totals || { present: 0, late: 0, absent: 0, off: 0, leave: 0, excused: 0, minutesLate: 0 }

  const scheduled = totals.present + totals.late + totals.absent
  const rate = scheduled > 0 ? Math.round(((totals.present + totals.late) / scheduled) * 100) : 100

  // PCC Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 45, 89)
  doc.text('PCC Security Department', pageWidth / 2, 18, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text('Individual Guard Weekly Attendance Report', pageWidth / 2, 25, { align: 'center' })

  // Guard Dossier Profile Banner
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, 30, pageWidth - 28, 36, 2.5, 2.5, 'FD')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(`Guard: ${guard.fullName}`, 18, 38)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(`Badge ID: ${guard.badgeId}`, 18, 45)
  doc.text(`Phone: ${guard.phone || 'Not recorded'}`, 18, 52)
  doc.text(`Default Post: ${guard.defaultDutyPoint?.name || 'Unassigned'}`, 18, 59)

  doc.text(`Week Starting: ${weekStart}`, 110, 38)
  doc.text(`Weekly Attendance Rate: ${rate}%`, 110, 45)
  doc.text(`Present: ${totals.present}  |  Late: ${totals.late}  |  Absent: ${totals.absent}`, 110, 52)
  doc.text(`Off Days: ${totals.off}  |  Leave/Exeat: ${totals.leave}  |  Excused: ${totals.excused}`, 110, 59)

  // Day-by-Day Detailed Rows Table
  const tableData = days.map(d => {
    const dateObj = new Date(d + 'T12:00:00')
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const dayData = guardItem.days?.[d]

    return [
      `${dayName}\n${formattedDate}`,
      dayData?.shiftName || 'Standard Shift',
      dayData?.dutyPoint || guard.defaultDutyPoint?.name || 'Assigned Post',
      dayData?.signInTime ? new Date(dayData.signInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
      dayData?.status || 'ABSENT',
      dayData?.minutesLate && dayData.minutesLate > 0 ? `+${dayData.minutesLate}m` : '0',
      dayData?.remarks || '—'
    ]
  })

  autoTable(doc, {
    startY: 72,
    head: [['Day & Date', 'Shift', 'Duty Point', 'Sign-In', 'Status', 'Late Min', 'Remarks / Exeat Ref']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 45, 89],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 24 },
      2: { cellWidth: 38 },
      3: { cellWidth: 18 },
      4: { cellWidth: 20 },
      5: { cellWidth: 16 },
      6: { cellWidth: 'auto' },
    }
  })

  // Supervisor Sign-off block
  const finalY = (doc as any).lastAutoTable?.finalY || 160
  const signY = Math.min(finalY + 16, 250)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('Supervisor Verification & Official Stamp:', 14, signY)

  doc.setDrawColor(180, 190, 200)
  doc.line(14, signY + 14, 90, signY + 14)
  doc.line(120, signY + 14, 195, signY + 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Duty Officer Name & Signature', 14, signY + 18)
  doc.text('Date Verified & Department Stamp', 120, signY + 18)

  addPDFFooters(doc, pageWidth)
  const cleanName = guard.fullName.toLowerCase().replace(/[^a-z0-9]/g, '-')
  doc.save(`weekly-report-${cleanName}-${guard.badgeId.toLowerCase()}-${weekStart}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ALL GUARDS WEEKLY REPORT (PDF)
// ─────────────────────────────────────────────────────────────────────────────

export function exportAllGuardsWeeklyPDF(data: WeeklyReportData, weekStart: string) {
  const doc = new jsPDF('l', 'mm', 'a4') // landscape
  const pageWidth = doc.internal.pageSize.getWidth()

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 45, 89)
  doc.text('PCC Security Department', pageWidth / 2, 15, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text('Comprehensive Weekly Attendance Register (All Guards)', pageWidth / 2, 22, { align: 'center' })

  // Summary header info
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, 27, pageWidth - 28, 14, 2, 2, 'FD')

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(`Week Starting (Monday): ${weekStart}`, 18, 35)
  doc.text(`Total Active Guards: ${data.guards.length}`, 110, 35)

  const totalPresent = data.guards.reduce((sum, g) => sum + (g.totals?.present || 0), 0)
  const totalLate = data.guards.reduce((sum, g) => sum + (g.totals?.late || 0), 0)
  const totalAbsent = data.guards.reduce((sum, g) => sum + (g.totals?.absent || 0), 0)
  doc.text(`Department Totals: ${totalPresent} Present  |  ${totalLate} Late  |  ${totalAbsent} Absent`, 190, 35)

  // Table headers (Mon to Sun)
  const dayHeaders = data.days.map(d => {
    const date = new Date(d + 'T12:00:00')
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
    const dayNum = date.getDate()
    return `${weekday}\n${dayNum}`
  })

  const headers = ['Guard Name', 'Badge ID', ...dayHeaders, 'P', 'L', 'A', 'Off', 'Ex/Lv', 'Late Min']

  const tableData = data.guards.map(guardItem => {
    const g = guardItem.guard
    const t = guardItem.totals || { present: 0, late: 0, absent: 0, off: 0, leave: 0, excused: 0, minutesLate: 0 }

    return [
      g.fullName,
      g.badgeId,
      ...data.days.map(day => {
        const dayData = guardItem.days?.[day]
        if (!dayData) return '—'
        const codeMap: Record<string, string> = {
          PRESENT: 'P',
          LATE: 'L',
          ABSENT: 'A',
          OFF: 'O',
          LEAVE: 'LV',
          EXCUSED: 'E',
        }
        return codeMap[dayData.status] || dayData.status
      }),
      t.present.toString(),
      t.late.toString(),
      t.absent.toString(),
      t.off.toString(),
      (t.leave + t.excused).toString(),
      t.minutesLate > 0 ? `${t.minutesLate}m` : '0',
    ]
  })

  autoTable(doc, {
    startY: 45,
    head: [headers],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 45, 89],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      halign: 'center',
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 42, halign: 'left' },
      1: { cellWidth: 20, halign: 'left' },
      // 7 day columns: ~14mm each
      2: { cellWidth: 16 },
      3: { cellWidth: 16 },
      4: { cellWidth: 16 },
      5: { cellWidth: 16 },
      6: { cellWidth: 16 },
      7: { cellWidth: 16 },
      8: { cellWidth: 16 },
      // Summary columns:
      9: { cellWidth: 12, fontStyle: 'bold' },
      10: { cellWidth: 12, fontStyle: 'bold' },
      11: { cellWidth: 12, fontStyle: 'bold' },
      12: { cellWidth: 12 },
      13: { cellWidth: 14 },
      14: { cellWidth: 18 },
    },
  })

  addPDFFooters(doc, pageWidth)
  doc.save(`weekly-attendance-all-guards-${weekStart}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTHLY REPORT DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────

export function exportMonthlyReportPDF(
  data: MonthlyReportData,
  month: string,
  options?: { guardId?: string; guardName?: string }
) {
  const isSingle = (options?.guardId && options.guardId !== 'all') || (data.guards.length === 1 && !!options?.guardName)

  if (isSingle) {
    const singleGuardItem = data.guards[0]
    exportSingleGuardMonthlyPDF(singleGuardItem, data.days, month)
  } else {
    exportAllGuardsMonthlyPDF(data, month)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. INDIVIDUAL GUARD MONTHLY REPORT (PDF)
// ─────────────────────────────────────────────────────────────────────────────

export function exportSingleGuardMonthlyPDF(
  guardItem: GuardReportItem,
  days: string[],
  month: string
) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const guard = guardItem.guard
  const totals = guardItem.totals || { present: 0, late: 0, absent: 0, off: 0, leave: 0, excused: 0, minutesLate: 0 }

  const monthDate = new Date(month.length === 7 ? `${month}-01T12:00:00` : month)
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const scheduled = totals.present + totals.late + totals.absent
  const rate = scheduled > 0 ? Math.round(((totals.present + totals.late) / scheduled) * 100) : 100

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 45, 89)
  doc.text('PCC Security Department', pageWidth / 2, 18, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(`Individual Guard Monthly Attendance Report — ${monthName}`, pageWidth / 2, 25, { align: 'center' })

  // Guard info banner
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, 30, pageWidth - 28, 36, 2.5, 2.5, 'FD')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(`Guard: ${guard.fullName}`, 18, 38)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(`Badge ID: ${guard.badgeId}`, 18, 45)
  doc.text(`Phone: ${guard.phone || 'Not recorded'}`, 18, 52)
  doc.text(`Default Post: ${guard.defaultDutyPoint?.name || 'Unassigned'}`, 18, 59)

  doc.text(`Period: ${monthName}`, 110, 38)
  doc.text(`Monthly Attendance Rate: ${rate}%`, 110, 45)
  doc.text(`Present: ${totals.present}  |  Late: ${totals.late}  |  Absent: ${totals.absent}`, 110, 52)
  doc.text(`Off Days: ${totals.off}  |  Leave: ${totals.leave}  |  Excused: ${totals.excused}  |  Late Min: ${totals.minutesLate}m`, 110, 59)

  // Full Month Chronological Schedule (Every day from 1 to 28/30/31)
  const tableData = days.map(d => {
    const dateObj = new Date(d + 'T12:00:00')
    const dayNum = dateObj.getDate()
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
    const dayData = guardItem.days?.[d]

    return [
      `#${String(dayNum).padStart(2, '0')} (${weekday})`,
      dayData?.shiftName || 'Standard Shift',
      dayData?.dutyPoint || guard.defaultDutyPoint?.name || 'Assigned Post',
      dayData?.signInTime ? new Date(dayData.signInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
      dayData?.status || 'ABSENT',
      dayData?.minutesLate && dayData.minutesLate > 0 ? `+${dayData.minutesLate}m` : '0',
      dayData?.remarks || '—'
    ]
  })

  autoTable(doc, {
    startY: 72,
    head: [['Date (Day)', 'Shift', 'Duty Point', 'Sign-In', 'Status', 'Late Min', 'Remarks / Notes']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 45, 89],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 24 },
      2: { cellWidth: 42 },
      3: { cellWidth: 18 },
      4: { cellWidth: 20 },
      5: { cellWidth: 16 },
      6: { cellWidth: 'auto' },
    }
  })

  // Supervisor verification block
  const finalY = (doc as any).lastAutoTable?.finalY || 240
  const signY = finalY + 12 > 270 ? 250 : finalY + 12

  if (signY > 240) {
    doc.addPage()
  }

  const actualSignY = signY > 240 ? 30 : signY

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('Supervisor Verification & Official Review:', 14, actualSignY)

  doc.setDrawColor(180, 190, 200)
  doc.line(14, actualSignY + 14, 90, actualSignY + 14)
  doc.line(120, actualSignY + 14, 195, actualSignY + 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Commanding Officer / Security Head', 14, actualSignY + 18)
  doc.text('Date & Official Seal', 120, actualSignY + 18)

  addPDFFooters(doc, pageWidth)
  const cleanName = guard.fullName.toLowerCase().replace(/[^a-z0-9]/g, '-')
  doc.save(`monthly-report-${cleanName}-${guard.badgeId.toLowerCase()}-${month}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ALL GUARDS MONTHLY REPORT (PDF)
// ─────────────────────────────────────────────────────────────────────────────

export function exportAllGuardsMonthlyPDF(data: MonthlyReportData, month: string) {
  const doc = new jsPDF('l', 'mm', 'a4') // landscape
  const pageWidth = doc.internal.pageSize.getWidth()

  const monthDate = new Date(month.length === 7 ? `${month}-01T12:00:00` : month)
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Header Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 45, 89)
  doc.text('PCC Security Department', pageWidth / 2, 14, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(`Comprehensive Monthly Attendance Register — ${monthName} (All Guards)`, pageWidth / 2, 21, { align: 'center' })

  // Header info banner
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, 25, pageWidth - 28, 12, 1.5, 1.5, 'FD')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(`Month: ${monthName}`, 18, 33)
  doc.text(`Total Guards: ${data.guards.length}`, 90, 33)
  doc.text(`Total Days: ${data.days.length}`, 160, 33)

  const overallPresent = data.guards.reduce((sum, g) => sum + (g.totals?.present || 0), 0)
  const overallLate = data.guards.reduce((sum, g) => sum + (g.totals?.late || 0), 0)
  const overallAbsent = data.guards.reduce((sum, g) => sum + (g.totals?.absent || 0), 0)
  doc.text(`Department Totals: ${overallPresent} P | ${overallLate} L | ${overallAbsent} A`, 210, 33)

  // Full Month Day headers (1..31)
  const dayHeaders = data.days.map(d => {
    const dayNum = new Date(d + 'T12:00:00').getDate()
    return dayNum.toString()
  })

  const headers = ['Guard Name', 'Badge', ...dayHeaders, 'P', 'L', 'A', 'Rate%', 'Late']

  const tableData = data.guards.map(guardItem => {
    const g = guardItem.guard
    const t = guardItem.totals || { present: 0, late: 0, absent: 0, off: 0, leave: 0, excused: 0, minutesLate: 0 }

    return [
      g.fullName,
      g.badgeId,
      ...data.days.map(day => {
        const dayData = guardItem.days?.[day]
        if (!dayData) return '·'
        const codeMap: Record<string, string> = {
          PRESENT: 'P',
          LATE: 'L',
          ABSENT: 'A',
          OFF: 'O',
          LEAVE: 'LV',
          EXCUSED: 'E',
        }
        return codeMap[dayData.status] || dayData.status
      }),
      t.present.toString(),
      t.late.toString(),
      t.absent.toString(),
      `${guardItem.attendanceRate || '0'}%`,
      t.minutesLate > 0 ? `${t.minutesLate}m` : '0',
    ]
  })

  // Dynamic day cell width so 28-31 days always fit cleanly
  const dayColWidth = Math.min(5, Math.floor(140 / data.days.length))
  const colStyles: Record<number, any> = {
    0: { cellWidth: 38, halign: 'left' },
    1: { cellWidth: 18, halign: 'left' },
  }

  // Days start at column index 2
  data.days.forEach((_, idx) => {
    colStyles[2 + idx] = { cellWidth: dayColWidth, halign: 'center' }
  })

  // Totals at end
  const baseEnd = 2 + data.days.length
  colStyles[baseEnd] = { cellWidth: 9, halign: 'center', fontStyle: 'bold' } // P
  colStyles[baseEnd + 1] = { cellWidth: 9, halign: 'center', fontStyle: 'bold' } // L
  colStyles[baseEnd + 2] = { cellWidth: 9, halign: 'center', fontStyle: 'bold' } // A
  colStyles[baseEnd + 3] = { cellWidth: 14, halign: 'center' } // Rate%
  colStyles[baseEnd + 4] = { cellWidth: 14, halign: 'center' } // Late min

  autoTable(doc, {
    startY: 40,
    head: [headers],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 45, 89],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 6,
      cellPadding: 1.5,
      halign: 'center',
      textColor: [30, 41, 59],
    },
    columnStyles: colStyles,
  })

  // Second Page: Monthly Late Arrival Ranking
  if (data.lateRanking && data.lateRanking.length > 0) {
    doc.addPage()
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 45, 89)
    doc.text(`Monthly Punctuality & Late Arrival Ranking — ${monthName}`, pageWidth / 2, 18, { align: 'center' })

    const rankingData = data.lateRanking.map((item: any, idx: number) => [
      `#${idx + 1}`,
      item.guard?.fullName || 'Guard',
      item.guard?.badgeId || '—',
      `${item.totals?.present || 0} shifts`,
      `${item.totals?.late || 0} late arrivals`,
      `${item.totals?.minutesLate || 0} minutes`,
      `${item.attendanceRate || '0'}%`,
    ])

    autoTable(doc, {
      startY: 28,
      head: [['Rank', 'Guard Name', 'Badge ID', 'Present Days', 'Late Count', 'Total Minutes Late', 'Attendance Rate']],
      body: rankingData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 45, 89],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
      },
    })
  }

  addPDFFooters(doc, pageWidth)
  doc.save(`monthly-attendance-all-guards-${month}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// GUARD DOSSIER (Complete Career / Service Record)
// ─────────────────────────────────────────────────────────────────────────────

export interface GuardDossierData {
  guard: {
    id?: string
    fullName: string
    badgeId: string
    phone: string | null
    status: string
    defaultDutyPoint?: { name: string } | null
  }
  stats: {
    total: number
    present: number
    late: number
    absent: number
    totalLateMinutes: number
  }
  attendanceRate: number
  records: Array<{
    shiftDate: string | Date
    shiftName: string
    dutyPointName: string
    signInTime: string | Date | null
    status: string
    minutesLate: number
    remarks?: string | null
  }>
}

export function exportGuardDossierPDF(data: GuardDossierData) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header banner / title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 45, 89)
  doc.text('PCC Security Department', pageWidth / 2, 18, { align: 'center' })

  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text('Guard Service & Attendance Dossier', pageWidth / 2, 26, { align: 'center' })

  // Meta box / summary
  doc.setDrawColor(210, 215, 220)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, 33, pageWidth - 28, 38, 3, 3, 'FD')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(`Guard: ${data.guard.fullName}`, 18, 41)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text(`Badge ID: ${data.guard.badgeId}`, 18, 48)
  doc.text(`Phone: ${data.guard.phone || 'Not recorded'}`, 18, 55)
  doc.text(`Default Post: ${data.guard.defaultDutyPoint?.name || 'Unassigned'}`, 18, 62)

  doc.text(`Status: ${data.guard.status}`, 110, 41)
  doc.text(`Attendance Rate: ${data.attendanceRate}%`, 110, 48)
  doc.text(`Present: ${data.stats.present}  |  Late: ${data.stats.late}  |  Absent: ${data.stats.absent}`, 110, 55)
  doc.text(`Total Recorded Late Minutes: ${data.stats.totalLateMinutes} min`, 110, 62)

  // Records Table
  const tableData = data.records.map((r) => [
    new Date(r.shiftDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    r.shiftName,
    r.dutyPointName,
    r.signInTime ? new Date(r.signInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
    r.status,
    r.minutesLate > 0 ? `+${r.minutesLate}m` : '0',
    r.remarks || '—'
  ])

  autoTable(doc, {
    startY: 76,
    head: [['Shift Date', 'Shift', 'Duty Point', 'Sign-In', 'Status', 'Mins Late', 'Remarks']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 45, 89],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 22 },
      2: { cellWidth: 42 },
      3: { cellWidth: 18 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 'auto' },
    }
  })

  addPDFFooters(doc, pageWidth)
  const sanitizedName = data.guard.fullName.toLowerCase().replace(/[^a-z0-9]/g, '-')
  doc.save(`guard-dossier-${sanitizedName}-${data.guard.badgeId.toLowerCase()}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Consistent PDF Footers
// ─────────────────────────────────────────────────────────────────────────────

function addPDFFooters(doc: jsPDF, pageWidth: number) {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(140, 140, 140)
    doc.text(
      `PCC GuardTrack System · Page ${i} of ${pageCount} · Generated on ${new Date().toLocaleString()}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    )
  }
}
