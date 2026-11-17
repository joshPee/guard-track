import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const assignmentSchema = z.object({
  guardId: z.string(),
  dutyPointId: z.string().optional().nullable(),
  shiftId: z.string(),
  date: z.string(),
})

const batchSchema = z.object({
  batch: z.array(assignmentSchema),
})

export async function GET(req: Request) {
  try {
    // Removed auth check to allow directory page to fetch assignments
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
    const body = await req.json()

    // Handle batch assignment updates
    if (body && Array.isArray(body.batch)) {
      const { batch } = batchSchema.parse(body)

      const operations = batch.map((item) => {
        const isUnassigned = !item.dutyPointId || item.dutyPointId === '' || item.dutyPointId === 'unassigned'
        const assignmentDate = new Date(item.date)

        if (isUnassigned) {
          return prisma.dailyDutyAssignment.deleteMany({
            where: {
              guardId: item.guardId,
              shiftId: item.shiftId,
              date: assignmentDate,
            },
          })
        }

        return prisma.dailyDutyAssignment.upsert({
          where: {
            guardId_shiftId_date: {
              guardId: item.guardId,
              shiftId: item.shiftId,
              date: assignmentDate,
            },
          },
          update: {
            dutyPointId: item.dutyPointId as string,
          },
          create: {
            guardId: item.guardId,
            dutyPointId: item.dutyPointId as string,
            shiftId: item.shiftId,
            date: assignmentDate,
          },
        })
      })

      const results = await prisma.$transaction(operations)
      return NextResponse.json({ success: true, count: results.length })
    }

    // Handle single assignment update
    const validatedData = assignmentSchema.parse(body)
    const isUnassigned = !validatedData.dutyPointId || validatedData.dutyPointId === '' || validatedData.dutyPointId === 'unassigned'
    const assignmentDate = new Date(validatedData.date)

    if (isUnassigned) {
      await prisma.dailyDutyAssignment.deleteMany({
        where: {
          guardId: validatedData.guardId,
          shiftId: validatedData.shiftId,
          date: assignmentDate,
        },
      })
      return NextResponse.json({ success: true, message: 'Assignment cleared' })
    }

    const assignment = await prisma.dailyDutyAssignment.upsert({
      where: {
        guardId_shiftId_date: {
          guardId: validatedData.guardId,
          shiftId: validatedData.shiftId,
          date: assignmentDate,
        },
      },
      update: {
        dutyPointId: validatedData.dutyPointId as string,
      },
      create: {
        guardId: validatedData.guardId,
        dutyPointId: validatedData.dutyPointId as string,
        shiftId: validatedData.shiftId,
        date: assignmentDate,
      },
    })

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
