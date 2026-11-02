import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateDutyPointSchema = z.object({
  name: z.string().min(1).optional(),
  zoneId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})

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
    const validatedData = updateDutyPointSchema.parse(body)

    const updatedDutyPoint = await prisma.dutyPoint.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        zone: true,
      },
    })

    return NextResponse.json(updatedDutyPoint)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Error updating duty point:', error)
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

    // Soft deactivate
    await prisma.dutyPoint.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deactivating duty point:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
