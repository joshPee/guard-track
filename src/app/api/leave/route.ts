import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createLeaveSchema = z.object({
  guardId: z.string().min(1, 'Guard is required'),
  type: z.enum(['CASUAL', 'EXCUSED_CLINIC', 'EXEAT', 'EMERGENCY', 'ANNUAL', 'OFF_DUTY']).default('CASUAL'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().optional().nullable(),
  refNumber: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).default('PENDING'),
  notes: z.string().optional().nullable(),
})

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get('status') || 'ALL'
    const typeParam = searchParams.get('type') || 'ALL'
    const search = searchParams.get('search') || ''

    // Query leave records with guard info
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        l.id,
        l."guardId",
        l.type,
        l."startDate",
        l."endDate",
        l.reason,
        l."refNumber",
        l.status,
        l."approvedBy",
        l.notes,
        l."createdAt",
        l."updatedAt",
        g."fullName" AS "guardName",
        g."badgeId" AS "guardBadgeId",
        g.phone AS "guardPhone",
        g.status AS "guardStatus",
        dp.name AS "dutyPointName"
      FROM leave_records l
      JOIN guards g ON l."guardId" = g.id
      LEFT JOIN duty_points dp ON g."defaultDutyPointId" = dp.id
      ORDER BY l."startDate" DESC, l."createdAt" DESC;
    `)

    const now = new Date()

    // Calculate summary statistics
    const stats = {
      total: rows.length,
      activeToday: rows.filter(r => {
        if (r.status !== 'APPROVED') return false
        const s = new Date(r.startDate)
        const e = new Date(r.endDate)
        e.setHours(23, 59, 59, 999)
        return now >= s && now <= e
      }).length,
      pending: rows.filter(r => r.status === 'PENDING').length,
      approved: rows.filter(r => r.status === 'APPROVED').length,
      clinicExcused: rows.filter(r => r.type === 'EXCUSED_CLINIC').length,
      exeat: rows.filter(r => r.type === 'EXEAT').length,
    }

    // Filter in-memory for fast and safe filtering
    let filtered = rows

    if (statusParam === 'ACTIVE_TODAY') {
      filtered = filtered.filter(r => {
        if (r.status !== 'APPROVED') return false
        const s = new Date(r.startDate)
        const e = new Date(r.endDate)
        e.setHours(23, 59, 59, 999)
        return now >= s && now <= e
      })
    } else if (statusParam !== 'ALL') {
      filtered = filtered.filter(r => r.status === statusParam)
    }

    if (typeParam !== 'ALL') {
      filtered = filtered.filter(r => r.type === typeParam)
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      filtered = filtered.filter(r => 
        r.guardName?.toLowerCase().includes(q) ||
        r.guardBadgeId?.toLowerCase().includes(q) ||
        r.refNumber?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q) ||
        r.dutyPointName?.toLowerCase().includes(q)
      )
    }

    return NextResponse.json({
      records: filtered,
      stats,
    })
  } catch (error: any) {
    console.error('Error fetching leave records:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = createLeaveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input' }, { status: 400 })
    }

    const { guardId, type, startDate, endDate, reason, refNumber, status, notes } = parsed.data

    // Auto-generate reference code if not provided
    let finalRefNumber = refNumber?.trim() || null
    if (!finalRefNumber) {
      const prefixMap: Record<string, string> = {
        EXEAT: 'EX',
        EXCUSED_CLINIC: 'MED',
        CASUAL: 'LV',
        ANNUAL: 'ANN',
        EMERGENCY: 'EMG',
        OFF_DUTY: 'OFF',
      }
      const prefix = prefixMap[type] || 'REQ'
      const year = new Date().getFullYear()

      const existing = await prisma.$queryRawUnsafe<any[]>(`
        SELECT "refNumber" FROM leave_records WHERE "refNumber" IS NOT NULL
      `)

      let maxSeq = 0
      for (const row of existing) {
        if (row.refNumber) {
          const cleaned = row.refNumber.toUpperCase()
          if (cleaned.startsWith(prefix) || (prefix === 'MED' && (cleaned.startsWith('CL') || cleaned.includes('CL-')))) {
            const matches = cleaned.match(/(\d+)$/)
            if (matches) {
              const num = parseInt(matches[1], 10)
              if (!isNaN(num) && num > maxSeq) maxSeq = num
            }
          }
        }
      }
      finalRefNumber = `${prefix}-${year}-${String(maxSeq + 1).padStart(3, '0')}`
    }

    // If supervisor is creating and status is APPROVED, set approver
    const approvedBy = status === 'APPROVED' ? session.user.name || 'Supervisor' : null
    const id = `leave_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    await prisma.$executeRawUnsafe(`
      INSERT INTO leave_records (id, "guardId", type, "startDate", "endDate", reason, "refNumber", status, "approvedBy", notes, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4::timestamp, $5::timestamp, $6, $7, $8, $9, $10, NOW(), NOW());
    `, id, guardId, type, new Date(startDate).toISOString(), new Date(endDate).toISOString(), reason || null, finalRefNumber, status, approvedBy, notes || null)

    return NextResponse.json({ success: true, id }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating leave record:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

