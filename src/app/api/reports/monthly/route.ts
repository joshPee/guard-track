import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    const guardId = searchParams.get('guardId')

    if (!month) {
      return NextResponse.json({ error: 'month is required' }, { status: 400 })
    }

    const inputDate = new Date(month.length === 7 ? `${month}-01T00:00:00` : month)
    const startDate = startOfMonth(inputDate)
    const endDate = endOfMonth(startDate)
    const daysOfMonth = eachDayOfInterval({ start: startDate, end: endDate })

    // Fetch relevant guards (single guard or all active guards)
    const guardsList = await prisma.guard.findMany({
      where: guardId ? { id: guardId } : { status: 'ACTIVE' },
      include: {
        defaultDutyPoint: true,
      },
      orderBy: { fullName: 'asc' },
    })

    const records = await prisma.attendanceRecord.findMany({
      where: {
        shiftDate: {
          gte: startDate,
          lte: endDate,
        },
        guardId: guardId || undefined,
      },
      include: {
        guard: {
          include: {
            defaultDutyPoint: true,
          },
        },
        shift: true,
        dutyPoint: true,
      },
      orderBy: [
        { guard: { fullName: 'asc' } },
        { shiftDate: 'asc' },
      ],
    })

    const groupedByGuard: Record<string, any> = {}

    // Initialize all guards so guards with 0 records still show up in monthly summary
    guardsList.forEach((g) => {
      groupedByGuard[g.id] = {
        guard: g,
        days: {} as Record<string, any>,
        totals: { present: 0, late: 0, absent: 0, off: 0, leave: 0, excused: 0, minutesLate: 0 },
      }
    })

    records.forEach((record) => {
      if (!groupedByGuard[record.guardId]) {
        groupedByGuard[record.guardId] = {
          guard: record.guard,
          days: {} as Record<string, any>,
          totals: { present: 0, late: 0, absent: 0, off: 0, leave: 0, excused: 0, minutesLate: 0 },
        }
      }

      const dayKey = format(record.shiftDate, 'yyyy-MM-dd')
      groupedByGuard[record.guardId].days[dayKey] = {
        status: record.status,
        signInTime: record.signInTime,
        minutesLate: record.minutesLate || 0,
        dutyPoint: record.dutyPoint?.name || null,
        shiftName: record.shift?.name || null,
        remarks: record.remarks || null,
      }

      const statusKey = record.status.toLowerCase() as keyof typeof groupedByGuard[string]['totals']
      if (groupedByGuard[record.guardId].totals[statusKey] !== undefined) {
        groupedByGuard[record.guardId].totals[statusKey]++
      }
      groupedByGuard[record.guardId].totals.minutesLate += (record.minutesLate || 0)
    })

    const guardsWithStats = Object.values(groupedByGuard).map((guardData: any) => {
      const scheduledDays = guardData.totals.present + guardData.totals.late + guardData.totals.absent
      const attendanceRate = scheduledDays > 0
        ? ((guardData.totals.present + guardData.totals.late) / scheduledDays) * 100
        : (guardData.totals.off + guardData.totals.leave + guardData.totals.excused > 0 ? 100 : 0)

      return {
        ...guardData,
        attendanceRate: attendanceRate.toFixed(1),
      }
    })

    const sortedByLate = [...guardsWithStats].sort((a, b) => b.totals.minutesLate - a.totals.minutesLate)

    return NextResponse.json({
      days: daysOfMonth.map(d => format(d, 'yyyy-MM-dd')),
      guards: guardsWithStats,
      lateRanking: sortedByLate,
      selectedGuard: guardId ? guardsList[0] || null : null,
    })
  } catch (error) {
    console.error('Error fetching monthly report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
