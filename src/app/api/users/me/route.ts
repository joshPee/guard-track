import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = updateProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input' }, { status: 400 })
    }

    const { name, currentPassword, newPassword } = parsed.data
    const wantsPasswordChange = !!(currentPassword || newPassword)

    if (wantsPasswordChange && (!currentPassword || !newPassword)) {
      return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const data: { name?: string; passwordHash?: string } = {}

    if (name !== undefined) {
      data.name = name.trim()
    }

    if (wantsPasswordChange) {
      const valid = await bcrypt.compare(currentPassword!, existing.passwordHash)
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
      data.passwordHash = await bcrypt.hash(newPassword!, 10)
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
