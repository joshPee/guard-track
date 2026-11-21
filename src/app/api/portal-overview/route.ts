import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPortalOverview } from '@/lib/external-db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const overview = await getPortalOverview()
    return NextResponse.json(overview)
  } catch (error) {
    console.error('Error building portal overview:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
