import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const shiftSchema = z.object({
  name: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  graceMinutes: z.number().min(0),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shifts = await prisma.shift.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(shifts)
  } catch (error) {
    console.error('Error fetching shifts:', error)
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
    const validatedData = shiftSchema.parse(body)

    const shift = await prisma.shift.create({
      data: validatedData,
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Error creating shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
