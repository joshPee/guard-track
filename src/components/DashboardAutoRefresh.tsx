'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export function DashboardAutoRefresh({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter()
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    const tick = () => {
      setSpinning(true)
      router.refresh()
      setLastUpdated(new Date())
      // Stop the spin shortly after refresh completes
      setTimeout(() => setSpinning(false), 1200)
    }
    const interval = setInterval(tick, intervalMs)
    return () => clearInterval(interval)
  }, [router, intervalMs])

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
      <RefreshCw className={`h-3 w-3 ${spinning ? 'animate-spin' : ''}`} />
      <span>
        Auto-refresh 60s
        {lastUpdated && ` · updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
      </span>
    </div>
  )
}
