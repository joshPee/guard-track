import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const shiftId = searchParams.get('shiftId')
    const guardId = searchParams.get('guardId')

    const records = await prisma.attendanceRecord.findMany({
      where: {
        shiftDate: date ? new Date(date) : undefined,
        shiftId: shiftId || undefined,
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
      ],
    })

    return NextResponse.json(records)
  } catch (error) {
    console.error('Error fetching daily report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
