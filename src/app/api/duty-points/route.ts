import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const dutyPointSchema = z.object({
  name: z.string().min(1),
  zoneId: z.string().min(1),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dutyPoints = await prisma.dutyPoint.findMany({
      where: { isActive: true },
      include: {
        zone: true,
        _count: {
          select: { guards: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(dutyPoints)
  } catch (error) {
    console.error('Error fetching duty points:', error)
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
    const validatedData = dutyPointSchema.parse(body)

    const dutyPoint = await prisma.dutyPoint.create({
      data: validatedData,
    })

    return NextResponse.json(dutyPoint, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Error creating duty point:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
