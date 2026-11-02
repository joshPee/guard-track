import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PCC_LOGO_BASE64 } from './pcc-logo'

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

// ─────────────────────────────────────────────────────────────────────────────
// HEADER COMPONENT (PCC Security Unit with Crest Logo & Tricolor Ribbon)
// ─────────────────────────────────────────────────────────────────────────────

interface HeaderOptions {
  title: string
  subtitle?: string
  refCode?: string
  landscape?: boolean
}

function renderPCCHeader(doc: jsPDF, options: HeaderOptions): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const isLandscape = !!options.landscape

  // 1. Tricolor Top Ribbon
  const ribbonH = 3.5
  const w1 = pageWidth * 0.65
  const w2 = pageWidth * 0.20
  const w3 = pageWidth * 0.15

  // Navy Blue
  doc.setFillColor(15, 45, 89)
  doc.rect(0, 0, w1, ribbonH, 'F')
  // PCC Warm Gold
  doc.setFillColor(217, 119, 6)
  doc.rect(w1, 0, w2, ribbonH, 'F')
  // PCC Crimson Red
  doc.setFillColor(220, 38, 38)
  doc.rect(w1 + w2, 0, w3, ribbonH, 'F')

  // 2. Official Logo Crest
  const logoX = 14
  const logoY = 6.5
  const logoSize = 16

  try {
    if (PCC_LOGO_BASE64) {
      // White backing tile with subtle border for high-definition rendering
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(logoX - 1, logoY - 1, logoSize + 2, logoSize + 2, 2, 2, 'FD')
      doc.addImage(PCC_LOGO_BASE64, 'PNG', logoX, logoY, logoSize, logoSize, undefined, 'FAST')
    }
  } catch (err) {
    console.error('Error drawing PCC logo on PDF:', err)
  }

  // 3. Header Typography
  const textX = logoX + logoSize + 6

  // Sub-institution
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(217, 119, 6) // Gold accent
  doc.text('PENTECOST CONVENTION CENTRE · GOMOA FETTEH', textX, 10.5)

  // Primary Title: PCC Security Unit
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 45, 89) // Deep Navy
  doc.text('PCC SECURITY UNIT', textX, 16.5)

  // Report Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text(options.title, textX, 21.5)

  // Subtitle / Scope
  if (options.subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(options.subtitle, textX, 26)
  }

  // 4. Official Meta Stamp Box on Top Right
  const badgeW = isLandscape ? 68 : 56
  const badgeH = 17
  const badgeX = pageWidth - 14 - badgeW
  const badgeY = 6.5

  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text('CLASSIFICATION', badgeX + 3.5, badgeY + 4)

  doc.setFontSize(7.5)
  doc.setTextColor(15, 45, 89)
  doc.text('OFFICIAL SECURITY RECORD', badgeX + 3.5, badgeY + 8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(71, 85, 105)
  const nowStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
  doc.text(`Issued: ${nowStr} · Unit Control`, badgeX + 3.5, badgeY + 12)

  if (options.refCode) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(217, 119, 6)
    doc.text(`REF: ${options.refCode}`, badgeX + 3.5, badgeY + 15.5)
  }

  // Bottom dividing line
  const bottomY = 28.5
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.4)
  doc.line(14, bottomY, pageWidth - 14, bottomY)

  return bottomY + 3.5
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPERVISOR VERIFICATION BLOCK
// ─────────────────────────────────────────────────────────────────────────────

function renderSupervisorStamp(doc: jsPDF, startY: number, pageWidth: number): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = startY
  if (y + 30 > pageHeight - 15) {
    doc.addPage()
    y = 25
  }

  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(14, y, pageWidth - 28, 24, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(15, 45, 89)
  doc.text('SUPERVISOR VERIFICATION & COMMAND APPROVAL', 18, y + 5.5)

  const col1X = 18
  const col2X = pageWidth / 2 + 6

  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.3)
  doc.line(col1X, y + 16, col1X + 65, y + 16)
  doc.line(col2X, y + 16, col2X + 65, y + 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text('Duty Supervisor Signature & Rank', col1X, y + 20)
  doc.text('Unit Commander / Official Stamp & Date', col2X, y + 20)

  return y + 28
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSISTENT FOOTER
// ─────────────────────────────────────────────────────────────────────────────

function addPDFFooters(doc: jsPDF, pageWidth: number) {
  const pageCount = doc.getNumberOfPages()
  const pageHeight = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text(
      'Pentecost Convention Centre · PCC Security Unit · Gomoa Fetteh, Central Region, Ghana',
      14,
      pageHeight - 6.5
    )

    doc.text(
      `Page ${i} of ${pageCount} · Generated: ${new Date().toLocaleString()}`,
      pageWidth - 14,
      pageHeight - 6.5,
      { align: 'right' }
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DAILY REPORT (Single Guard or All Guards)
// ─────────────────────────────────────────────────────────────────────────────

export function exportDailyReportPDF(data: DailyReportData[], date: string, shift: string, guardName?: string) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const isSingle = !!guardName && guardName !== 'all'
  const shiftLabel = shift === 'day-shift' ? 'Day Shift (06:00 – 18:00)' : 'Night Shift (18:00 – 06:00)'

  const startY = renderPCCHeader(doc, {
    title: isSingle ? `Individual Daily Attendance Dossier — ${guardName}` : 'Daily Shift Attendance Register',
    subtitle: `Date: ${date}  ·  Shift: ${shiftLabel}`,
    refCode: 'PCC-SEC-DLY-01',
  })

  // Meta Summary Banner
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, startY, pageWidth - 28, 18, 2, 2, 'FD')

  const presentCount = data.filter(r => r.status === 'PRESENT').length
  const lateCount = data.filter(r => r.status === 'LATE').length
  const absentCount = data.filter(r => r.status === 'ABSENT').length

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(`Shift Date: ${date}`, 18, startY + 6.5)
  doc.text(`Operational Shift: ${shiftLabel}`, 18, startY + 12.5)

  doc.text(`Total Records: ${data.length}`, 110, startY + 6.5)
  doc.text(`Roll Call: ${presentCount} Present  |  ${lateCount} Late  |  ${absentCount} Absent`, 110, startY + 12.5)

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
    startY: startY + 22,
    head: [['Guard Name', 'Badge ID', 'Duty Post', 'Sign-In Time', 'Status', 'Late Min', 'Remarks / Notes']],
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
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 20 },
      2: { cellWidth: 40 },
      3: { cellWidth: 22 },
      4: { cellWidth: 20 },
      5: { cellWidth: 16 },
      6: { cellWidth: 'auto' },
    }
  })

  const finalY = (doc as any).lastAutoTable?.finalY || 180
  renderSupervisorStamp(doc, finalY + 8, pageWidth)
  addPDFFooters(doc, pageWidth)

  const filename = isSingle
    ? `pcc-daily-${guardName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${date}.pdf`
    : `pcc-daily-all-guards-${date}.pdf`
  doc.save(filename)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. WEEKLY REPORT DISPATCHER
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
// 3. INDIVIDUAL GUARD WEEKLY REPORT
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

  const startY = renderPCCHeader(doc, {
    title: `Individual Guard Weekly Attendance Report`,
    subtitle: `Guard: ${guard.fullName} (${guard.badgeId})  ·  Week Starting: ${weekStart}`,
    refCode: `PCC-WKL-${guard.badgeId}`,
  })

  // Guard Dossier Profile Banner
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, startY, pageWidth - 28, 30, 2, 2, 'FD')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(`Guard: ${guard.fullName}`, 18, startY + 6.5)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(`Badge ID: ${guard.badgeId}`, 18, startY + 12.5)
  doc.text(`Phone: ${guard.phone || 'Not recorded'}`, 18, startY + 18.5)
  doc.text(`Default Post: ${guard.defaultDutyPoint?.name || 'Unassigned Post'}`, 18, startY + 24.5)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 45, 89)
  doc.text(`Weekly Attendance Rate: ${rate}%`, 110, startY + 6.5)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(`Week Starting: ${weekStart}`, 110, startY + 12.5)
  doc.text(`Present: ${totals.present}  |  Late: ${totals.late}  |  Absent: ${totals.absent}`, 110, startY + 18.5)
  doc.text(`Off Days: ${totals.off}  |  Leave/Exeat: ${totals.leave}  |  Excused: ${totals.excused}`, 110, startY + 24.5)

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
    startY: startY + 34,
    head: [['Day & Date', 'Shift', 'Duty Post', 'Sign-In', 'Status', 'Late Min', 'Remarks / Exeat Ref']],
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
      cellPadding: 2.8,
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

  const finalY = (doc as any).lastAutoTable?.finalY || 160
  renderSupervisorStamp(doc, finalY + 8, pageWidth)
  addPDFFooters(doc, pageWidth)

  const cleanName = guard.fullName.toLowerCase().replace(/[^a-z0-9]/g, '-')
  doc.save(`pcc-weekly-${cleanName}-${guard.badgeId.toLowerCase()}-${weekStart}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ALL GUARDS WEEKLY REPORT (Landscape)
// ─────────────────────────────────────────────────────────────────────────────

export function exportAllGuardsWeeklyPDF(data: WeeklyReportData, weekStart: string) {
  const doc = new jsPDF('l', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()

  const startY = renderPCCHeader(doc, {
    title: 'Comprehensive Weekly Attendance Register (All Guards)',
    subtitle: `Week Starting (Monday): ${weekStart}  ·  Total Active Personnel: ${data.guards.length}`,
    refCode: 'PCC-SEC-WKL-ALL',
    landscape: true,
  })

  // Summary header info
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, startY, pageWidth - 28, 12, 1.5, 1.5, 'FD')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(`Week Starting: ${weekStart}`, 18, startY + 7.5)
  doc.text(`Active Roster: ${data.guards.length} Guards`, 90, startY + 7.5)

  const totalPresent = data.guards.reduce((sum, g) => sum + (g.totals?.present || 0), 0)
  const totalLate = data.guards.reduce((sum, g) => sum + (g.totals?.late || 0), 0)
  const totalAbsent = data.guards.reduce((sum, g) => sum + (g.totals?.absent || 0), 0)
  doc.text(`Unit Totals: ${totalPresent} Present  |  ${totalLate} Late  |  ${totalAbsent} Absent`, 180, startY + 7.5)

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
    startY: startY + 16,
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
      2: { cellWidth: 16 },
      3: { cellWidth: 16 },
      4: { cellWidth: 16 },
      5: { cellWidth: 16 },
      6: { cellWidth: 16 },
      7: { cellWidth: 16 },
      8: { cellWidth: 16 },
      9: { cellWidth: 12, fontStyle: 'bold' },
      10: { cellWidth: 12, fontStyle: 'bold' },
      11: { cellWidth: 12, fontStyle: 'bold' },
      12: { cellWidth: 12 },
      13: { cellWidth: 14 },
      14: { cellWidth: 18 },
    },
  })

  addPDFFooters(doc, pageWidth)
  doc.save(`pcc-weekly-all-guards-${weekStart}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MONTHLY REPORT DISPATCHER
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
// 6. INDIVIDUAL GUARD MONTHLY REPORT
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

  const startY = renderPCCHeader(doc, {
    title: `Individual Guard Monthly Attendance Report — ${monthName}`,
    subtitle: `Guard: ${guard.fullName} (${guard.badgeId})  ·  Period: ${monthName}`,
    refCode: `PCC-MTH-${guard.badgeId}`,
  })

  // Guard info banner
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, startY, pageWidth - 28, 30, 2, 2, 'FD')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(`Guard: ${guard.fullName}`, 18, startY + 6.5)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(`Badge ID: ${guard.badgeId}`, 18, startY + 12.5)
  doc.text(`Phone: ${guard.phone || 'Not recorded'}`, 18, startY + 18.5)
  doc.text(`Default Post: ${guard.defaultDutyPoint?.name || 'Unassigned Post'}`, 18, startY + 24.5)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 45, 89)
  doc.text(`Monthly Attendance Rate: ${rate}%`, 110, startY + 6.5)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(`Period: ${monthName}`, 110, startY + 12.5)
  doc.text(`Present: ${totals.present}  |  Late: ${totals.late}  |  Absent: ${totals.absent}`, 110, startY + 18.5)
  doc.text(`Off Days: ${totals.off}  |  Leave: ${totals.leave}  |  Excused: ${totals.excused}  |  Late Min: ${totals.minutesLate}m`, 110, startY + 24.5)

  // Full Month Chronological Schedule (1 to 28/30/31)
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
    startY: startY + 34,
    head: [['Date (Day)', 'Shift', 'Duty Post', 'Sign-In', 'Status', 'Late Min', 'Remarks / Notes']],
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

  const finalY = (doc as any).lastAutoTable?.finalY || 240
  renderSupervisorStamp(doc, finalY + 8, pageWidth)
  addPDFFooters(doc, pageWidth)

  const cleanName = guard.fullName.toLowerCase().replace(/[^a-z0-9]/g, '-')
  doc.save(`pcc-monthly-${cleanName}-${guard.badgeId.toLowerCase()}-${month}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ALL GUARDS MONTHLY REPORT (Landscape)
// ─────────────────────────────────────────────────────────────────────────────

export function exportAllGuardsMonthlyPDF(data: MonthlyReportData, month: string) {
  const doc = new jsPDF('l', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()

  const monthDate = new Date(month.length === 7 ? `${month}-01T12:00:00` : month)
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const startY = renderPCCHeader(doc, {
    title: `Comprehensive Monthly Attendance Register — ${monthName} (All Guards)`,
    subtitle: `Total Personnel: ${data.guards.length}  ·  Days in Period: ${data.days.length}`,
    refCode: 'PCC-SEC-MTH-ALL',
    landscape: true,
  })

  // Header info banner
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, startY, pageWidth - 28, 11, 1.5, 1.5, 'FD')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(`Month: ${monthName}`, 18, startY + 7)
  doc.text(`Active Roster: ${data.guards.length} Guards`, 85, startY + 7)
  doc.text(`Days Recorded: ${data.days.length}`, 155, startY + 7)

  const overallPresent = data.guards.reduce((sum, g) => sum + (g.totals?.present || 0), 0)
  const overallLate = data.guards.reduce((sum, g) => sum + (g.totals?.late || 0), 0)
  const overallAbsent = data.guards.reduce((sum, g) => sum + (g.totals?.absent || 0), 0)
  doc.text(`Unit Totals: ${overallPresent} P | ${overallLate} L | ${overallAbsent} A`, 210, startY + 7)

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

  const dayColWidth = Math.min(5, Math.floor(140 / data.days.length))
  const colStyles: Record<number, any> = {
    0: { cellWidth: 38, halign: 'left' },
    1: { cellWidth: 18, halign: 'left' },
  }

  data.days.forEach((_, idx) => {
    colStyles[2 + idx] = { cellWidth: dayColWidth, halign: 'center' }
  })

  const baseEnd = 2 + data.days.length
  colStyles[baseEnd] = { cellWidth: 9, halign: 'center', fontStyle: 'bold' }
  colStyles[baseEnd + 1] = { cellWidth: 9, halign: 'center', fontStyle: 'bold' }
  colStyles[baseEnd + 2] = { cellWidth: 9, halign: 'center', fontStyle: 'bold' }
  colStyles[baseEnd + 3] = { cellWidth: 14, halign: 'center' }
  colStyles[baseEnd + 4] = { cellWidth: 14, halign: 'center' }

  autoTable(doc, {
    startY: startY + 15,
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
    const p2StartY = renderPCCHeader(doc, {
      title: `Monthly Punctuality & Late Arrival Ranking — ${monthName}`,
      subtitle: 'Ranked analysis of recorded tardiness across all duty posts',
      refCode: 'PCC-SEC-RNK-01',
      landscape: true,
    })

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
      startY: p2StartY + 4,
      head: [['Rank', 'Guard Name', 'Badge ID', 'Present Days', 'Late Count', 'Total Minutes Late', 'Attendance Rate']],
      body: rankingData,
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
        cellPadding: 2.5,
      },
    })
  }

  addPDFFooters(doc, pageWidth)
  doc.save(`pcc-monthly-all-guards-${month}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. GUARD DOSSIER (Full Career / Service Record)
// ─────────────────────────────────────────────────────────────────────────────

export function exportGuardDossierPDF(data: GuardDossierData) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()

  const startY = renderPCCHeader(doc, {
    title: `Guard Service & Attendance Dossier — ${data.guard.fullName}`,
    subtitle: `Badge ID: ${data.guard.badgeId}  ·  Pentecost Convention Centre Security Unit`,
    refCode: `DOS-${data.guard.badgeId}`,
  })

  // Meta box / summary
  doc.setDrawColor(210, 215, 220)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, startY, pageWidth - 28, 32, 2.5, 2.5, 'FD')

  doc.setFontSize(10.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(`Guard: ${data.guard.fullName}`, 18, startY + 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text(`Badge ID: ${data.guard.badgeId}`, 18, startY + 13.5)
  doc.text(`Phone: ${data.guard.phone || 'Not recorded'}`, 18, startY + 20)
  doc.text(`Default Post: ${data.guard.defaultDutyPoint?.name || 'Unassigned Post'}`, 18, startY + 26.5)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 45, 89)
  doc.text(`Status: ${data.guard.status} (On Roster)`, 110, startY + 7)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(`Attendance Rate: ${data.attendanceRate}%`, 110, startY + 13.5)
  doc.text(`Present: ${data.stats.present}  |  Late: ${data.stats.late}  |  Absent: ${data.stats.absent}`, 110, startY + 20)
  doc.text(`Total Recorded Late Minutes: ${data.stats.totalLateMinutes} min`, 110, startY + 26.5)

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
    startY: startY + 36,
    head: [['Shift Date', 'Shift', 'Duty Post', 'Sign-In', 'Status', 'Mins Late', 'Remarks / Notes']],
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
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 22 },
      2: { cellWidth: 42 },
      3: { cellWidth: 18 },
      4: { cellWidth: 20 },
      5: { cellWidth: 18 },
      6: { cellWidth: 'auto' },
    }
  })

  const finalY = (doc as any).lastAutoTable?.finalY || 180
  renderSupervisorStamp(doc, finalY + 8, pageWidth)
  addPDFFooters(doc, pageWidth)

  const sanitizedName = data.guard.fullName.toLowerCase().replace(/[^a-z0-9]/g, '-')
  doc.save(`pcc-dossier-${sanitizedName}-${data.guard.badgeId.toLowerCase()}.pdf`)
}
