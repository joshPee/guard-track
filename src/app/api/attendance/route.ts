import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const attendanceRecordSchema = z.object({
  guardId: z.string(),
  shiftId: z.string(),
  dutyPointId: z.string(),
  shiftDate: z.string(),
  signInTime: z.string().optional(),
  signOutTime: z.string().optional(),
  status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'OFF', 'LEAVE', 'EXCUSED']).optional(),
  minutesLate: z.number().default(0),
  remarks: z.string().optional(),
})

async function calculateStatus(
  signInTime: string | null,
  shiftStartTime: string,
  graceMinutes: number
): Promise<{ status: string; minutesLate: number }> {
  if (!signInTime) {
    return { status: 'ABSENT', minutesLate: 0 }
  }

  const signIn = new Date(signInTime)
  const shiftStart = new Date(signInTime)
  const [hours, minutes] = shiftStartTime.split(':').map(Number)
  shiftStart.setHours(hours, minutes, 0, 0)

  const diffMs = signIn.getTime() - shiftStart.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes <= graceMinutes) {
    return { status: 'PRESENT', minutesLate: 0 }
  } else if (diffMinutes > graceMinutes) {
    return { status: 'LATE', minutesLate: diffMinutes }
  }

  return { status: 'ABSENT', minutesLate: 0 }
}

function calculateShiftDate(signInTime: string, shiftStartTime: string): string {
  const signIn = new Date(signInTime)
  const [hours, minutes] = shiftStartTime.split(':').map(Number)
  const shiftStart = new Date(signIn)
  shiftStart.setHours(hours, minutes, 0, 0)

  if (signIn < shiftStart) {
    shiftStart.setDate(shiftStart.getDate() - 1)
  }

  return shiftStart.toISOString().split('T')[0]
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const shiftId = searchParams.get('shiftId')

    const records = await prisma.attendanceRecord.findMany({
      where: {
        shiftDate: date ? new Date(date) : undefined,
        shiftId: shiftId || undefined,
      },
      include: {
        guard: true,
        shift: true,
        dutyPoint: true,
        recordedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { shiftDate: 'desc' },
        { guard: { fullName: 'asc' } },
      ],
    })

    return NextResponse.json(records)
  } catch (error) {
    console.error('Error fetching attendance records:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPERVISOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = attendanceRecordSchema.parse(body)

    const shift = await prisma.shift.findUnique({
      where: { id: validatedData.shiftId },
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    let finalStatus = validatedData.status
    let finalMinutesLate = validatedData.minutesLate
    let finalShiftDate = validatedData.shiftDate

    if (validatedData.signInTime && !validatedData.status) {
      const calculated = await calculateStatus(
        validatedData.signInTime,
        shift.startTime,
        shift.graceMinutes
      )
      finalStatus = calculated.status as any
      finalMinutesLate = calculated.minutesLate
      finalShiftDate = calculateShiftDate(validatedData.signInTime, shift.startTime)
    }

    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        guardId_shiftId_shiftDate: {
          guardId: validatedData.guardId,
          shiftId: validatedData.shiftId,
          shiftDate: new Date(finalShiftDate),
        },
      },
    })

    let record

    if (existingRecord) {
      const oldValue = {
        signInTime: existingRecord.signInTime,
        signOutTime: existingRecord.signOutTime,
        status: existingRecord.status,
        minutesLate: existingRecord.minutesLate,
        remarks: existingRecord.remarks,
      }

      record = await prisma.attendanceRecord.update({
        where: { id: existingRecord.id },
        data: {
          signInTime: validatedData.signInTime ? new Date(validatedData.signInTime) : null,
          signOutTime: validatedData.signOutTime ? new Date(validatedData.signOutTime) : null,
          status: finalStatus || validatedData.status,
          minutesLate: finalMinutesLate,
          remarks: validatedData.remarks,
          dutyPointId: validatedData.dutyPointId,
        },
      })

      await prisma.attendanceAudit.create({
        data: {
          recordId: record.id,
          changedById: session.user.id,
          oldValue,
          newValue: {
            ...validatedData,
            status: finalStatus,
            minutesLate: finalMinutesLate,
          },
        },
      })
    } else {
      record = await prisma.attendanceRecord.create({
        data: {
          ...validatedData,
          shiftDate: new Date(finalShiftDate),
          signInTime: validatedData.signInTime ? new Date(validatedData.signInTime) : null,
          signOutTime: validatedData.signOutTime ? new Date(validatedData.signOutTime) : null,
          status: finalStatus || 'ABSENT',
          minutesLate: finalMinutesLate,
          recordedById: session.user.id,
        },
      })
    }

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Error creating attendance record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
