import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateGuardSchema = z.object({
  fullName: z.string().min(1).optional(),
  badgeId: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  defaultDutyPointId: z.string().nullable().optional(),
})

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const guard = await prisma.guard.findUnique({
      where: { id: params.id },
      include: {
        defaultDutyPoint: true,
      },
    })

    if (!guard) {
      return NextResponse.json({ error: 'Guard not found' }, { status: 404 })
    }

    return NextResponse.json(guard)
  } catch (error) {
    console.error('Error fetching guard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPERVISOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = updateGuardSchema.parse(body)

    const updatedGuard = await prisma.guard.update({
      where: { id: params.id },
      data: {
        ...(validatedData.fullName ? { fullName: validatedData.fullName } : {}),
        ...(validatedData.badgeId ? { badgeId: validatedData.badgeId } : {}),
        ...(validatedData.phone !== undefined ? { phone: validatedData.phone } : {}),
        ...(validatedData.status ? { status: validatedData.status } : {}),
        ...(validatedData.defaultDutyPointId !== undefined
          ? { defaultDutyPointId: validatedData.defaultDutyPointId || null }
          : {}),
      },
      include: {
        defaultDutyPoint: true,
      },
    })

    return NextResponse.json(updatedGuard)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Error updating guard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPERVISOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if guard has attendance records
    const attendanceCount = await prisma.attendanceRecord.count({
      where: { guardId: params.id },
    })

    if (attendanceCount > 0) {
      // Soft-delete to preserve attendance historical records
      await prisma.guard.update({
        where: { id: params.id },
        data: { status: 'INACTIVE' },
      })
      return NextResponse.json({ message: 'Guard marked as INACTIVE (historical records preserved)' })
    }

    // Hard-delete if no records exist
    await prisma.guard.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting guard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
