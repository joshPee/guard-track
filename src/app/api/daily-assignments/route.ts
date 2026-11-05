import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const assignmentSchema = z.object({
  guardId: z.string(),
  dutyPointId: z.string(),
  shiftId: z.string(),
  date: z.string(),
})

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const shiftId = searchParams.get('shiftId')

    const assignments = await prisma.dailyDutyAssignment.findMany({
      where: {
        date: date ? new Date(date) : undefined,
        shiftId: shiftId || undefined,
      },
      include: {
        guard: true,
        dutyPoint: true,
        shift: true,
      },
      orderBy: [
        { date: 'desc' },
        { guard: { fullName: 'asc' } },
      ],
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching daily assignments:', error)
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
    const validatedData = assignmentSchema.parse(body)

    const existingAssignment = await prisma.dailyDutyAssignment.findUnique({
      where: {
        guardId_shiftId_date: {
          guardId: validatedData.guardId,
          shiftId: validatedData.shiftId,
          date: new Date(validatedData.date),
        },
      },
    })

    let assignment

    if (existingAssignment) {
      assignment = await prisma.dailyDutyAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          dutyPointId: validatedData.dutyPointId,
        },
      })
    } else {
      assignment = await prisma.dailyDutyAssignment.create({
        data: {
          guardId: validatedData.guardId,
          dutyPointId: validatedData.dutyPointId,
          shiftId: validatedData.shiftId,
          date: new Date(validatedData.date),
        },
      })
    }

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Error creating daily assignment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPERVISOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 })
    }

    await prisma.dailyDutyAssignment.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting daily assignment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
