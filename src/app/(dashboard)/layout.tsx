'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { DashboardSidebar } from '@/components/Sidebar'
import { DashboardTopBar } from '@/components/DashboardTopBar'
import { MobileBottomNav } from '@/components/MobileBottomNav'

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!session) {
      router.push('/login')
    }
  }, [session, router])

  if (!session) {
    return null
  }

  return (
    <div className="flex h-screen dashboard-bg overflow-hidden">
      {/* Desktop sidebar — hidden on mobile via lg:flex inside component */}
      <DashboardSidebar />

      <div className="flex flex-1 flex-col min-w-0">
        <DashboardTopBar />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pt-3 lg:pt-4 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — hidden on desktop via lg:hidden inside component */}
      <MobileBottomNav />
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayoutContent>{children}</DashboardLayoutContent>
}
