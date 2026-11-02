import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateLeaveSchema = z.object({
  type: z.enum(['CASUAL', 'EXCUSED_CLINIC', 'EXEAT', 'EMERGENCY', 'ANNUAL', 'OFF_DUTY']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reason: z.string().optional().nullable(),
  refNumber: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  notes: z.string().optional().nullable(),
})

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await req.json()
    const parsed = updateLeaveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input' }, { status: 400 })
    }

    // Check if record exists
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM leave_records WHERE id = $1`,
      id
    )

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Leave record not found' }, { status: 404 })
    }

    const current = existing[0]
    const updatedStatus = parsed.data.status ?? current.status
    const approvedBy =
      updatedStatus === 'APPROVED'
        ? (current.approvedBy || session.user.name || 'Supervisor')
        : (updatedStatus === 'PENDING' ? null : current.approvedBy)

    const updatedType = parsed.data.type ?? current.type
    const updatedStart = parsed.data.startDate ? new Date(parsed.data.startDate).toISOString() : current.startDate
    const updatedEnd = parsed.data.endDate ? new Date(parsed.data.endDate).toISOString() : current.endDate
    const updatedReason = parsed.data.reason !== undefined ? parsed.data.reason : current.reason
    const updatedRef = parsed.data.refNumber !== undefined ? parsed.data.refNumber : current.refNumber
    const updatedNotes = parsed.data.notes !== undefined ? parsed.data.notes : current.notes

    await prisma.$executeRawUnsafe(`
      UPDATE leave_records
      SET
        type = $1,
        "startDate" = $2::timestamp,
        "endDate" = $3::timestamp,
        reason = $4,
        "refNumber" = $5,
        status = $6,
        "approvedBy" = $7,
        notes = $8,
        "updatedAt" = NOW()
      WHERE id = $9
    `, updatedType, updatedStart, updatedEnd, updatedReason, updatedRef, updatedStatus, approvedBy, updatedNotes, id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating leave record:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPERVISOR') {
      return NextResponse.json({ error: 'Unauthorized: Supervisor role required' }, { status: 403 })
    }

    const { id } = params

    await prisma.$executeRawUnsafe(`
      DELETE FROM leave_records WHERE id = $1
    `, id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting leave record:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

