'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { DashboardSidebar } from '@/components/Sidebar'
import { DashboardTopBar } from '@/components/DashboardTopBar'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { QuickActionFAB } from '@/components/QuickActionFAB'

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Only redirect when NextAuth has confirmed the user is unauthenticated
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // While NextAuth is verifying session during page refresh, render a clean spinner
  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white p-2 shadow-sm border border-slate-200/80 flex items-center justify-center">
            <img src="/pcc.png" alt="PCC Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-500">Authenticating...</span>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated' || !session) {
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

      {/* Quick Action FAB — mobile only */}
      <QuickActionFAB />
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
