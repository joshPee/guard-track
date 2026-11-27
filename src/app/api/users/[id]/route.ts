import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['SUPERVISOR', 'VIEWER']).optional(),
  shiftScope: z.enum(['DAY', 'NIGHT', 'BOTH']).nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
})

async function requireSupervisor() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERVISOR') return null
  return session
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSupervisor()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input' }, { status: 400 })
    }

    // Prevent a supervisor from deactivating or demoting themselves
    if (id === session.user.id && (parsed.data.isActive === false || parsed.data.role === 'VIEWER')) {
      return NextResponse.json({ error: 'You cannot deactivate or demote your own account' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) data.name = parsed.data.name.trim()
    if (parsed.data.role !== undefined) data.role = parsed.data.role
    if (parsed.data.shiftScope !== undefined) data.shiftScope = parsed.data.shiftScope
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive
    if (parsed.data.password !== undefined) {
      data.passwordHash = await bcrypt.hash(parsed.data.password, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, shiftScope: true, isActive: true, createdAt: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSupervisor()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (id === session.user.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    // Deactivate rather than hard-delete to preserve attendance audit history
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deactivating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
