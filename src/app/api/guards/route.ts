import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const guardSchema = z.object({
  fullName: z.string().min(1),
  badgeId: z.string().min(1),
  phone: z.string().optional(),
  defaultDutyPointId: z.string().optional(),
  photoUrl: z.string().optional(),
})

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const guard = await prisma.guard.create({
      data: validatedData,
    })

    return NextResponse.json(guard, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Error creating guard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
