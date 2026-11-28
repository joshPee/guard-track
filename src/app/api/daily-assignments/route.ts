import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { timingSafeEqual } from 'crypto'

const assignmentSchema = z.object({
  guardId: z.string(),
  dutyPointId: z.string().optional().nullable(),
  shiftId: z.string(),
  date: z.string(),
})

const batchSchema = z.object({
  batch: z.array(assignmentSchema),
})

// Writes are allowed for SUPERVISOR sessions OR callers presenting the
// shared portal token (used by the public /directory supervisor portal).
function isWriteAuthorized(req: Request, session: { user?: { role?: string } } | null): boolean {
  if (session?.user?.role === 'SUPERVISOR') return true
  const expected = process.env.PORTAL_WRITE_TOKEN
  const provided = req.headers.get('x-portal-token')
  if (!expected || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function getSession() {
  return getServerSession(authOptions)
}

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

    // Attach approved excused/leave status for the requested date so the
    // public roster can badge excused guards (they keep their post occupied).
    const includeExcused = searchParams.get('includeExcused') === '1'
    if (date) {
      const leaveModel = (prisma as any).leaveRecord
      if (leaveModel) {
        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)
        const assignedGuardIds = new Set(assignments.map((a) => a.guard.id))
        const leaves: Array<{ guardId: string; type: string; reason: string | null }> = await leaveModel.findMany({
          where: {
            status: 'APPROVED',
            startDate: { lte: dayEnd },
            endDate: { gte: dayStart },
          },
          select: { guardId: true, type: true, reason: true },
        })
        const byGuard = new Map(leaves.map((l) => [l.guardId, l]))
        assignments.forEach((a: any) => {
          const l = byGuard.get(a.guard.id)
          if (l) {
            a.excused = true
            a.excuseType = l.type
            a.excuseReason = l.reason
          }
        })

        // Optionally inject excused guards who have NO assignment as pseudo
        // roster entries so they still appear as cards on the public roster.
        if (includeExcused) {
          const missingIds = leaves.map((l) => l.guardId).filter((id) => !assignedGuardIds.has(id))
          if (missingIds.length > 0) {
            // Resolve shift name to filter guards by shift eligibility
            let shiftName = ''
            if (shiftId) {
              const shift = await prisma.shift.findUnique({ where: { id: shiftId }, select: { name: true } })
              shiftName = shift?.name || ''
            }
            const isDay = shiftName.toLowerCase().includes('day')
            const isNight = shiftName.toLowerCase().includes('night')
            const excusedGuards = await prisma.guard.findMany({
              where: { id: { in: missingIds }, status: 'ACTIVE' },
            })
            for (const g of excusedGuards) {
              const eligible =
                g.shiftType === 'BOTH' ||
                (isDay && g.shiftType === 'DAY') ||
                (isNight && g.shiftType === 'NIGHT') ||
                (!isDay && !isNight)
              if (!eligible) continue
              const l = byGuard.get(g.id)!
              ;(assignments as any[]).push({
                id: `excused-${g.id}`,
                guard: g,
                dutyPoint: { id: 'excused', name: 'Excused' },
                shift: { id: shiftId || '', name: shiftName || 'Excused' },
                date: new Date(date),
                excused: true,
                excuseType: l.type,
                excuseReason: l.reason,
              })
            }
          }
        }
      }
    }

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching daily assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!isWriteAuthorized(req, session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Enforce supervisor shift scope: DAY/NIGHT-scoped supervisors can only write their shift
    const scope = session?.user?.shiftScope as string | null | undefined
    if (scope === 'DAY' || scope === 'NIGHT') {
      const items: Array<{ shiftId?: string }> = Array.isArray(body?.batch) ? body.batch : [body]
      const shiftIds = Array.from(new Set(items.map((i) => i.shiftId).filter(Boolean))) as string[]
      if (shiftIds.length > 0) {
        const shifts = await prisma.shift.findMany({ where: { id: { in: shiftIds } }, select: { id: true, name: true } })
        const needle = scope === 'DAY' ? 'day' : 'night'
        const allowed = new Set(shifts.filter((s) => s.name.toLowerCase().includes(needle)).map((s) => s.id))
        const denied = shiftIds.filter((id) => !allowed.has(id))
        if (denied.length > 0) {
          return NextResponse.json({ error: `Your account is scoped to the ${scope.toLowerCase()} shift` }, { status: 403 })
        }
      }
    }

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
    const session = await getSession()
    if (!isWriteAuthorized(req, session)) {
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
