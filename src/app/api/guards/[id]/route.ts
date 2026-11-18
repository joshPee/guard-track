import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const guardUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  badgeId: z.string().min(1).optional(),
  phone: z.string().nullish(),
  defaultDutyPointId: z.string().nullish(),
  photoUrl: z.string().nullish(),
  shiftType: z.enum(['DAY', 'NIGHT', 'BOTH']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  startDate: z.string().nullish(),
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
    const validatedData = guardUpdateSchema.parse(body)

    // Normalize empty strings to null for nullable columns
    const data: any = {}
    for (const [key, value] of Object.entries(validatedData)) {
      data[key] = value === '' ? null : value
    }
    if (data.startDate) {
      data.startDate = new Date(data.startDate)
    }

    const guard = await prisma.guard.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(guard)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      return NextResponse.json({ error: `Invalid data (${msg})`, details: error.errors }, { status: 400 })
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

    await prisma.guard.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting guard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
