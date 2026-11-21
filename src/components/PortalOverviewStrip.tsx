'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { IdCard, Package, AlertTriangle, Users, ClipboardCheck, Wrench } from 'lucide-react'

interface PortalOverview {
  visitors: {
    onSite: number | null
    checkedInToday: number | null
    openIncidents: number | null
  } | null
  equipment: {
    issuedItems: number | null
    damagedActive: number | null
    missingActive: number | null
    totalEquipment: number | null
  } | null
}

export function PortalOverviewStrip() {
  const [data, setData] = useState<PortalOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/portal-overview')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return null
  if (!data || (!data.visitors && !data.equipment)) return null

  const v = data.visitors
  const e = data.equipment

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Campus-Wide Live
        </h3>
        <div className="flex items-center gap-3 text-[11px]">
          <a
            href="https://pcc-vms.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Visitor Portal ↗
          </a>
          <a
            href="https://psec-inv.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Inventory Portal ↗
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {v && (
          <>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-3.5">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase font-semibold">On Site</span>
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">{v.onSite ?? '—'}</p>
                <p className="text-[10px] text-slate-400">visitors inside</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-3.5">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase font-semibold">Check-ins Today</span>
                </div>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{v.checkedInToday ?? '—'}</p>
                <p className="text-[10px] text-slate-400">visitor arrivals</p>
              </CardContent>
            </Card>
            <Card className={`border ${v.openIncidents ? 'border-rose-200 dark:border-rose-900' : 'border-slate-200 dark:border-slate-800'}`}>
              <CardContent className="p-3.5">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase font-semibold">Open Incidents</span>
                </div>
                <p className={`text-xl font-black ${v.openIncidents ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                  {v.openIncidents ?? '—'}
                </p>
                <p className="text-[10px] text-slate-400">visitor incidents</p>
              </CardContent>
            </Card>
          </>
        )}
        {e && (
          <>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-3.5">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Wrench className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase font-semibold">Issued Items</span>
                </div>
                <p className="text-xl font-black text-blue-600 dark:text-blue-400">{e.issuedItems ?? '—'}</p>
                <p className="text-[10px] text-slate-400">equipment out</p>
              </CardContent>
            </Card>
            <Card className={`border ${e.damagedActive ? 'border-amber-200 dark:border-amber-900' : 'border-slate-200 dark:border-slate-800'}`}>
              <CardContent className="p-3.5">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Package className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase font-semibold">Damaged</span>
                </div>
                <p className={`text-xl font-black ${e.damagedActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                  {e.damagedActive ?? '—'}
                </p>
                <p className="text-[10px] text-slate-400">active reports</p>
              </CardContent>
            </Card>
            <Card className={`border ${e.missingActive ? 'border-rose-200 dark:border-rose-900' : 'border-slate-200 dark:border-slate-800'}`}>
              <CardContent className="p-3.5">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <IdCard className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase font-semibold">Missing</span>
                </div>
                <p className={`text-xl font-black ${e.missingActive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                  {e.missingActive ?? '—'}
                </p>
                <p className="text-[10px] text-slate-400">active reports</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
