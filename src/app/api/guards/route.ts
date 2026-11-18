import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const guardSchema = z.object({
  fullName: z.string().min(1),
  badgeId: z.string().min(1),
  phone: z.string().nullish(),
  defaultDutyPointId: z.string().nullish(),
  photoUrl: z.string().nullish(),
  shiftType: z.enum(['DAY', 'NIGHT', 'BOTH']).optional(),
  startDate: z.string().nullish(),
})

export async function GET(req: Request) {
  try {
    // Allow callers to opt into fetching all statuses (e.g. guards management page)
    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get('status') // 'ACTIVE' | 'INACTIVE' | 'ALL'

    const whereClause =
      statusParam === 'ALL'
        ? {}
        : statusParam === 'INACTIVE'
        ? { status: 'INACTIVE' as const }
        : { status: 'ACTIVE' as const } // default: only active

    const guards = await prisma.guard.findMany({
      where: whereClause,
      include: {
        defaultDutyPoint: true,
      },
      orderBy: { fullName: 'asc' },
    })

    return NextResponse.json(guards)
  } catch (error) {
    console.error('Error fetching guards:', error)
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
    const validatedData = guardSchema.parse(body)

    // Normalize empty strings to null for nullable columns
    const data: any = {}
    for (const [key, value] of Object.entries(validatedData)) {
      data[key] = value === '' ? null : value
    }
    if (data.startDate) {
      data.startDate = new Date(data.startDate)
    }

    const guard = await prisma.guard.create({
      data,
    })

    return NextResponse.json(guard, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      return NextResponse.json({ error: `Invalid data (${msg})`, details: error.errors }, { status: 400 })
    }
    console.error('Error creating guard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPERVISOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Guard ID required' }, { status: 400 })
    }

    const body = await req.json()
    const validatedData = guardSchema.parse(body)

    // Normalize empty strings to null for nullable columns
    const data: any = {}
    for (const [key, value] of Object.entries(validatedData)) {
      data[key] = value === '' ? null : value
    }
    if (data.startDate) {
      data.startDate = new Date(data.startDate)
    }

    const guard = await prisma.guard.update({
      where: { id },
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

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPERVISOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Guard ID required' }, { status: 400 })
    }

    await prisma.guard.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting guard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
