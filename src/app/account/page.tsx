'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PortalNavbar } from '@/components/PortalNavbar'
import { ProfilePanel } from '@/components/ProfilePanel'
import { Loader2 } from 'lucide-react'

export default function AccountPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/directory')
    }
  }, [status, router])

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white p-2 shadow-sm border border-slate-200/80 flex items-center justify-center">
          <img src="/pcc.png" alt="PCC Logo" className="w-full h-full object-contain" />
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <PortalNavbar subtitle="My Account" />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ProfilePanel showPasswordForm={false} homeHref="/directory" homeLabel="Directory" />
      </main>
    </div>
  )
}
