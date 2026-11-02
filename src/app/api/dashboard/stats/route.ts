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
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const shiftId = searchParams.get('shiftId')

    const records = await prisma.attendanceRecord.findMany({
      where: {
        shiftDate: new Date(date),
        shiftId: shiftId || undefined,
      },
    })

    const present = records.filter(r => r.status === 'PRESENT').length
    const late = records.filter(r => r.status === 'LATE').length
    const absent = records.filter(r => r.status === 'ABSENT').length

    const totalGuards = await prisma.guard.count({
      where: { status: 'ACTIVE' },
    })

    const notSignedIn = totalGuards - records.length

    return NextResponse.json({
      present,
      late,
      absent,
      notSignedIn,
      total: totalGuards,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
