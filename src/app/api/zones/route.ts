import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const zoneSchema = z.object({
  name: z.string().min(1),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const zones = await prisma.zone.findMany({
      include: {
        dutyPoints: {
          where: { isActive: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(zones)
  } catch (error) {
    console.error('Error fetching zones:', error)
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
    const validatedData = zoneSchema.parse(body)

    const zone = await prisma.zone.create({
      data: validatedData,
    })

    return NextResponse.json(zone, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Error creating zone:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
