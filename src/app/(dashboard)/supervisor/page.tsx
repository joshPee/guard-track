'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { toast } from '@/components/ui/toast'
import {
  Calendar, ClipboardList, Loader2, MapPin, UserX, Users, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Guard {
  id: string
  fullName: string
  badgeId: string
  phone?: string | null
  photoUrl?: string | null
  shiftType?: string
  designation?: string | null
  excludeFromDuty?: boolean
  status?: string
}

interface DutyPoint {
  id: string
  name: string
  isActive?: boolean
  requiredGuards?: number | null
  zone?: { name: string } | null
}

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
}

interface DailyAssignment {
  guardId: string
  dutyPointId: string
}

export default function SupervisorRosterPage() {
  const { data: session } = useSession()
  const isSupervisor = session?.user?.role === 'SUPERVISOR'

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [shiftId, setShiftId] = useState('')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [dutyPoints, setDutyPoints] = useState<DutyPoint[]>([])
  const [guards, setGuards] = useState<Guard[]>([])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [original, setOriginal] = useState<Record<string, string>>({})
  const [excusedIds, setExcusedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Initial data: shifts, duty points, guards
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [shiftsRes, dpRes, guardsRes] = await Promise.all([
          fetch('/api/shifts'),
          fetch('/api/duty-points'),
          fetch('/api/guards?status=ACTIVE'),
        ])
        const [shiftsData, dpData, guardsData] = await Promise.all([
          shiftsRes.ok ? shiftsRes.json() : [],
          dpRes.ok ? dpRes.json() : [],
          guardsRes.ok ? guardsRes.json() : [],
        ])
        if (cancelled) return
        const shiftList: Shift[] = Array.isArray(shiftsData) ? shiftsData : shiftsData.shifts || []
        setShifts(shiftList)
        setDutyPoints(Array.isArray(dpData) ? dpData : dpData.dutyPoints || [])
        const guardList: Guard[] = Array.isArray(guardsData) ? guardsData : guardsData.guards || []
        setGuards(guardList)
        // Default to first shift
        if (shiftList.length > 0 && !shiftId) {
          setShiftId(shiftList[0].id)
        }
      } catch (e) {
        console.error('Failed to load supervisor roster data:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load assignments + approved leave whenever date/shift changes
  useEffect(() => {
    if (!date || !shiftId) return
    let cancelled = false

    async function loadDay() {
      setLoading(true)
      try {
        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)

        const [assignRes, leaveRes] = await Promise.all([
          fetch(`/api/daily-assignments?date=${date}&shiftId=${shiftId}`),
          fetch('/api/leave?status=APPROVED'),
        ])
        const [assignData, leaveData] = await Promise.all([
          assignRes.ok ? assignRes.json() : [],
          leaveRes.ok ? leaveRes.json() : null,
        ])
        if (cancelled) return

        const map: Record<string, string> = {}
        ;(Array.isArray(assignData) ? assignData : []).forEach((a: DailyAssignment) => {
          map[a.guardId] = a.dutyPointId
        })
        setDraft(map)
        setOriginal(map)
        setHasChanges(false)

        const excused = new Set<string>()
        ;(leaveData?.records || []).forEach((r: any) => {
          const s = new Date(r.startDate)
          const e = new Date(r.endDate)
          e.setHours(23, 59, 59, 999)
          if (s <= dayEnd && e >= dayStart) excused.add(r.guardId)
        })
        setExcusedIds(excused)
      } catch (e) {
        console.error('Failed to load day assignments:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadDay()
    return () => {
      cancelled = true
    }
  }, [date, shiftId])

  const selectedShift = useMemo(() => shifts.find((s) => s.id === shiftId), [shifts, shiftId])
  const isDayShift = useMemo(
    () => !selectedShift || selectedShift.name.toLowerCase().includes('day'),
    [selectedShift]
  )

  // Guards eligible for this shift, excluding non-duty staff
  const eligibleGuards = useMemo(() => {
    return guards.filter((g) => {
      if (g.excludeFromDuty) return false
      const st = g.shiftType || 'BOTH'
      return isDayShift ? st === 'DAY' || st === 'BOTH' : st === 'NIGHT' || st === 'BOTH'
    })
  }, [guards, isDayShift])

  const guardById = useMemo(() => new Map(guards.map((g) => [g.id, g])), [guards])

  // Guards currently placed in draft
  const guardsByPost = useMemo(() => {
    const map = new Map<string, Guard[]>()
    dutyPoints.forEach((dp) => map.set(dp.id, []))
    Object.entries(draft).forEach(([guardId, dpId]) => {
      if (!dpId) return
      const g = guardById.get(guardId)
      if (!g) return
      const list = map.get(dpId)
      if (list) list.push(g)
    })
    return map
  }, [draft, dutyPoints, guardById])

  const unassignedGuards = useMemo(() => {
    const placed = new Set(Object.entries(draft).filter(([, dpId]) => dpId).map(([id]) => id))
    return eligibleGuards.filter((g) => !placed.has(g.id))
  }, [eligibleGuards, draft])

  const activeDutyPoints = useMemo(
    () => dutyPoints.filter((dp) => dp.isActive !== false),
    [dutyPoints]
  )

  const assignGuard = useCallback((guardId: string, dutyPointId: string) => {
    setDraft((prev) => ({ ...prev, [guardId]: dutyPointId }))
    setHasChanges(true)
  }, [])

  const unassignGuard = useCallback((guardId: string) => {
    setDraft((prev) => {
      const next = { ...prev }
      delete next[guardId]
      return next
    })
    setHasChanges(true)
  }, [])

  const handleSave = async () => {
    if (!isSupervisor) {
      toast.error('Only supervisors can save assignments.')
      return
    }
    setSaving(true)
    try {
      // Include every guard that currently has an assignment OR had one originally (to clear removals)
      const guardIds = new Set([...Object.keys(draft), ...Object.keys(original)])
      const batch = Array.from(guardIds).map((guardId) => ({
        guardId,
        dutyPointId: draft[guardId] || '',
        shiftId,
        date,
      }))
      const res = await fetch('/api/daily-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to save assignments.')
        return
      }
      setOriginal(draft)
      setHasChanges(false)
      toast.success(`Saved ${batch.length} assignment${batch.length !== 1 ? 's' : ''} for ${new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.`, 'Roster Saved')
    } catch {
      toast.error('An error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  const coverageStats = useMemo(() => {
    const placed = Object.values(draft).filter(Boolean).length
    const required = activeDutyPoints.reduce((sum, dp) => sum + (dp.requiredGuards ?? 1), 0)
    return { placed, required }
  }, [draft, activeDutyPoints])

  if (loading && guards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Breadcrumb items={[{ label: 'Supervisor Roster' }]} />
      <PageHeader
        title="Supervisor Roster"
        description="Quick duty-point assignment — pick a date and shift, place guards at posts, save."
      />

      {/* Controls */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Date
            </Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shift</Label>
            <Select value={shiftId} onValueChange={setShiftId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.startTime}–{s.endTime})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right text-xs text-slate-500">
              <span className="font-bold text-slate-800 dark:text-slate-200">{coverageStats.placed}</span> placed ·{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">{unassignedGuards.length}</span> unassigned
            </div>
            <Button onClick={handleSave} disabled={saving || !hasChanges || !isSupervisor} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? 'Saving...' : hasChanges ? 'Save Roster' : 'Saved'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!isSupervisor && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
          You are signed in as a viewer — roster changes require a supervisor account.
        </div>
      )}

      {excusedIds.size > 0 && (
        <div className="rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50 dark:bg-violet-950/30 px-4 py-3 text-xs text-violet-800 dark:text-violet-200 flex items-center gap-2">
          <UserX className="h-4 w-4 shrink-0" />
          <span>
            <strong>{excusedIds.size}</strong> guard{excusedIds.size !== 1 ? 's' : ''} excused/on leave this day — they are excluded from the assignable pool.
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Duty point cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeDutyPoints.map((dp) => {
              const posted = guardsByPost.get(dp.id) || []
              const required = dp.requiredGuards ?? 1
              const understaffed = posted.length < required
              return (
                <Card
                  key={dp.id}
                  className={cn(
                    'border-slate-200 dark:border-slate-800',
                    understaffed && 'border-amber-300 dark:border-amber-800'
                  )}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                          {dp.name}
                        </h3>
                        {dp.zone?.name && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{dp.zone.name}</p>
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0',
                          understaffed
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        )}
                      >
                        {posted.length}/{required}
                      </span>
                    </div>

                    <div className="space-y-1.5 min-h-[2rem]">
                      {posted.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic">No guards assigned</p>
                      )}
                      {posted.map((g) => (
                        <div
                          key={g.id}
                          className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {g.fullName}
                              {g.designation && (
                                <span className="ml-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                  ★ {g.designation}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400">{g.badgeId}</p>
                          </div>
                          {excusedIds.has(g.id) && (
                            <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 shrink-0">
                              excused
                            </span>
                          )}
                          <button
                            onClick={() => unassignGuard(g.id)}
                            disabled={!isSupervisor}
                            className="text-slate-400 hover:text-rose-500 transition-colors shrink-0 disabled:opacity-40"
                            aria-label={`Remove ${g.fullName}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <Select
                      value=""
                      onValueChange={(v) => {
                        if (v) assignGuard(v, dp.id)
                      }}
                      disabled={!isSupervisor}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="+ Add guard to this post" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedGuards
                          .filter((g) => !excusedIds.has(g.id))
                          .map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.fullName} ({g.badgeId})
                            </SelectItem>
                          ))}
                        {unassignedGuards.filter((g) => !excusedIds.has(g.id)).length === 0 && (
                          <SelectItem value="__none" disabled>
                            All eligible guards assigned
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Unassigned pool */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-slate-400" />
                Unassigned Guards ({unassignedGuards.length})
              </h3>
              {unassignedGuards.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Every eligible guard has a post.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {unassignedGuards.map((g) => (
                    <div
                      key={g.id}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2',
                        excusedIds.has(g.id)
                          ? 'border-violet-200 dark:border-violet-800/60 bg-violet-50/50 dark:bg-violet-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {g.fullName}
                          {g.designation && (
                            <span className="ml-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              ★ {g.designation}
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400">{g.badgeId}</p>
                      </div>
                      {excusedIds.has(g.id) ? (
                        <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 shrink-0">
                          EXCUSED
                        </span>
                      ) : (
                        <Select
                          value=""
                          onValueChange={(v) => {
                            if (v) assignGuard(g.id, v)
                          }}
                          disabled={!isSupervisor}
                        >
                          <SelectTrigger className="h-7 w-40 text-[11px] shrink-0">
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent>
                            {activeDutyPoints.map((dp) => (
                              <SelectItem key={dp.id} value={dp.id}>
                                {dp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save bar (mobile-friendly sticky) */}
          <div className="print:hidden flex items-center justify-between gap-3 pb-4">
            <p className="text-xs text-slate-500">
              {hasChanges ? 'Unsaved changes — remember to save.' : 'All changes saved.'}
            </p>
            <Button onClick={handleSave} disabled={saving || !hasChanges || !isSupervisor} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Roster'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
