'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Search,
  MapPin,
  Phone,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  X,
  Building2,
  AlertTriangle,
  Layers,
  Share2,
  CalendarCheck,
  List,
  Loader2,
  Columns2,
} from 'lucide-react'
import { PortalNavbar } from '@/components/PortalNavbar'
import { GuardCard } from '@/components/GuardCard'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
}

interface DutyPoint {
  id: string
  name: string
  isActive: boolean
  zoneId: string
  requiredGuards?: number | null
}

interface Zone {
  id: string
  name: string
  dutyPoints: DutyPoint[]
}

interface DailyAssignment {
  id: string
  guard: {
    id: string
    fullName: string
    badgeId: string
    phone: string | null
    photoUrl: string | null
    shiftType: string
    designation: string | null
    excludeFromDuty: boolean
  }
  dutyPoint: {
    id?: string
    name: string
  }
  shift: {
    id?: string
    name: string
  }
  date: string
  excused?: boolean
  excuseType?: string | null
  excuseReason?: string | null
}

export default function AssignmentsPortalPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [dutyPoints, setDutyPoints] = useState<DutyPoint[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [dailyAssignments, setDailyAssignments] = useState<DailyAssignment[]>([])
  const [nightAssignments, setNightAssignments] = useState<DailyAssignment[]>([])
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedShift, setSelectedShift] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDutyPointFilter, setSelectedDutyPointFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'flat' | 'zone' | 'table'>('flat')
  const [splitView, setSplitView] = useState(false)
  // Outside deployed count — shift-independent, derived from all assignments for the date
  const [outsideDeployedCount, setOutsideDeployedCount] = useState(0)
  // Dynamic greeting for Mr. Achaab based on time of day
  const [greeting, setGreeting] = useState('Good day')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  // Fetch shifts, duty points, and zones on initial mount
  useEffect(() => {
    let isMounted = true

    async function loadInitialData() {
      try {
        const [shiftsRes, dutyPointsRes, zonesRes] = await Promise.all([
          fetch('/api/shifts'),
          fetch('/api/duty-points'),
          fetch('/api/zones'),
        ])

        if (shiftsRes.ok) {
          const data: Shift[] = await shiftsRes.json()
          if (isMounted) {
            setShifts(data)
            if (data.length > 0) {
              const day = data.find((s) => s.name.toLowerCase().includes('day'))
              setSelectedShift(day ? day.id : data[0].id)
            }
          }
        }

        if (dutyPointsRes.ok) {
          const data: DutyPoint[] = await dutyPointsRes.json()
          if (isMounted) {
            setDutyPoints(data)
          }
        }

        if (zonesRes.ok) {
          const data: Zone[] = await zonesRes.json()
          if (isMounted) {
            setZones(data)
          }
        }
      } catch (err) {
        console.error('Failed to load initial data:', err)
      }
    }

    loadInitialData()
    return () => {
      isMounted = false
    }
  }, [])

  // Fetch daily assignments whenever date or shift changes
  const fetchDailyAssignments = useCallback(async (isSilent = false) => {
    if (!selectedDate || !selectedShift) return
    if (!isSilent) setLoading(true)
    else setRefreshing(true)

    try {
      // Shift-specific assignments (for the guard card list)
      const res = await fetch(`/api/daily-assignments?date=${selectedDate}&shiftId=${selectedShift}&includeExcused=1`)
      if (res.ok) {
        const data = await res.json()
        setDailyAssignments(Array.isArray(data) ? data : [])
      }

      // Shift-agnostic: fetch ALL assignments for the date to get true outside-deployed count
      const allRes = await fetch(`/api/daily-assignments?date=${selectedDate}`)
      if (allRes.ok) {
        const allData: DailyAssignment[] = await allRes.json()
        const outside = Array.isArray(allData)
          ? allData.filter((a) =>
              a.dutyPoint.name.toLowerCase().includes('outside deployment') ||
              a.dutyPoint.name.toLowerCase().includes('outside')
            ).length
          : 0
        setOutsideDeployedCount(outside)

        // For split view, also fetch the opposite shift
        if (splitView && shifts.length >= 2) {
          const dayShift = shifts.find((s) => s.name.toLowerCase().includes('day'))
          const nightShift = shifts.find((s) => s.name.toLowerCase().includes('night'))
          const oppositeShiftId = selectedShift === dayShift?.id ? nightShift?.id : dayShift?.id

          if (oppositeShiftId) {
            const oppositeRes = await fetch(`/api/daily-assignments?date=${selectedDate}&shiftId=${oppositeShiftId}&includeExcused=1`)
            if (oppositeRes.ok) {
              const oppositeData = await oppositeRes.json()
              setNightAssignments(Array.isArray(oppositeData) ? oppositeData : [])
            }
          }
        } else {
          setNightAssignments([])
        }
      }
    } catch (error) {
      console.error('Error fetching daily assignments:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedDate, selectedShift, splitView, shifts])

  useEffect(() => {
    if (selectedDate && selectedShift) {
      fetchDailyAssignments()
    }
  }, [selectedDate, selectedShift, fetchDailyAssignments])

  // Re-fetch when split view toggles
  useEffect(() => {
    if (selectedDate && selectedShift && splitView) {
      fetchDailyAssignments(true)
    }
  }, [splitView, selectedDate, selectedShift, fetchDailyAssignments])

  // Quick date navigator helpers
  const handleDateShift = (deltaDays: number) => {
    const cur = new Date(selectedDate)
    cur.setDate(cur.getDate() + deltaDays)
    setSelectedDate(cur.toISOString().split('T')[0])
  }

  const setDatePreset = (preset: 'today' | 'yesterday' | 'tomorrow') => {
    const d = new Date()
    if (preset === 'yesterday') d.setDate(d.getDate() - 1)
    if (preset === 'tomorrow') d.setDate(d.getDate() + 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  // Unique duty points in current assignments with guard counts
  const dutyPointsList = useMemo(() => {
    const map = new Map<string, number>()
    dailyAssignments.forEach((a) => {
      const name = a.dutyPoint.name
      map.set(name, (map.get(name) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [dailyAssignments])

  // Calculate uncovered/understaffed posts (critical duty points below required headcount)
  // Only check if assignments have been submitted for this shift
  const uncoveredPosts = useMemo(() => {
    // Don't show alert if no assignments have been submitted for this shift yet
    if (dailyAssignments.length === 0) {
      return []
    }

    const isExcluded = (name: string) => {
      const n = name.toLowerCase()
      return n.includes('off duty') ||
             n.includes('off day') ||
             n.includes('outside deployment') ||
             n.includes('outside')
    }

    // Count assigned guards per duty point for the current shift
    // (excused/on-leave guards do NOT count — their post needs covering)
    const assignedCounts = new Map<string, number>()
    dailyAssignments.forEach((a) => {
      if (isExcluded(a.dutyPoint.name) || a.excused) return
      assignedCounts.set(a.dutyPoint.name, (assignedCounts.get(a.dutyPoint.name) || 0) + 1)
    })

    // Find active duty points below their required headcount
    const uncovered = dutyPoints
      .filter((dp) => {
        if (!dp.isActive || isExcluded(dp.name)) return false
        const required = dp.requiredGuards ?? 1
        return (assignedCounts.get(dp.name) || 0) < required
      })
      .map((dp) => ({
        name: dp.name,
        assigned: assignedCounts.get(dp.name) || 0,
        required: dp.requiredGuards ?? 1,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return uncovered
  }, [dailyAssignments, dutyPoints])

  // Filtered assignments with memoization (excludes outside deployed on "ALL" view)
  const filterAssignmentList = useCallback(
    (list: DailyAssignment[]) => {
      const q = searchQuery.trim().toLowerCase()
      return list.filter((assignment) => {
        if (assignment.guard.excludeFromDuty) return false

        const isOutside =
          assignment.dutyPoint.name.toLowerCase().includes('outside deployment') ||
          assignment.dutyPoint.name.toLowerCase().includes('outside')

        const matchesSearch =
          q === '' ||
          assignment.guard.fullName.toLowerCase().includes(q) ||
          assignment.guard.badgeId.toLowerCase().includes(q) ||
          assignment.dutyPoint.name.toLowerCase().includes(q) ||
          (assignment.guard.phone && assignment.guard.phone.includes(q))

        const matchesDutyPoint =
          selectedDutyPointFilter === 'ALL'
            ? q !== '' ? true : !isOutside
            : assignment.dutyPoint.name === selectedDutyPointFilter

        return matchesSearch && matchesDutyPoint
      })
    },
    [searchQuery, selectedDutyPointFilter]
  )

  const filteredAssignments = useMemo(
    () => filterAssignmentList(dailyAssignments),
    [dailyAssignments, filterAssignmentList]
  )

  const filteredOppositeAssignments = useMemo(
    () => filterAssignmentList(nightAssignments),
    [nightAssignments, filterAssignmentList]
  )

  // Group assignments by zone for zone-based view
  const assignmentsByZone = useMemo(() => {
    const grouped = new Map<string, DailyAssignment[]>()

    filteredAssignments.forEach((assignment) => {
      // Find the zone for this duty point
      const dutyPoint = dutyPoints.find((dp) => dp.name === assignment.dutyPoint.name)
      const zone = zones.find((z) => z.id === dutyPoint?.zoneId)
      const zoneName = zone?.name || 'Unassigned Zone'

      if (!grouped.has(zoneName)) {
        grouped.set(zoneName, [])
      }
      grouped.get(zoneName)!.push(assignment)
    })

    // Sort zones alphabetically and sort assignments within each zone
    const sortedGrouped = new Map<string, DailyAssignment[]>()
    Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([zoneName, assignments]) => {
        sortedGrouped.set(zoneName, assignments.sort((a, b) => a.guard.fullName.localeCompare(b.guard.fullName)))
      })

    return sortedGrouped
  }, [filteredAssignments, dutyPoints, zones])

  // Print roster rows: flat list grouped by duty point with running serial numbers
  const printRosterRows = useMemo(() => {
    const isOffDuty = (name: string) => {
      const n = name.toLowerCase()
      return n.includes('off duty') || n.includes('off day')
    }
    const isOutside = (name: string) => {
      const n = name.toLowerCase()
      return n.includes('outside deployment') || n.includes('outside')
    }

    const groups = new Map<string, DailyAssignment[]>()
    filteredAssignments.forEach((a) => {
      const name = a.dutyPoint.name
      if (!groups.has(name)) groups.set(name, [])
      groups.get(name)!.push(a)
    })

    const sortedPoints = Array.from(groups.keys()).sort((a, b) => {
      const aOff = isOffDuty(a) ? 2 : isOutside(a) ? 1 : 0
      const bOff = isOffDuty(b) ? 2 : isOutside(b) ? 1 : 0
      if (aOff !== bOff) return aOff - bOff
      return a.localeCompare(b)
    })

    const rows: Array<
      | { type: 'header'; point: string; count: number }
      | { type: 'row'; sn: number; assignment: DailyAssignment }
    > = []
    let sn = 0
    sortedPoints.forEach((point) => {
      const guards = groups.get(point)!.sort((a, b) => a.guard.fullName.localeCompare(b.guard.fullName))
      rows.push({ type: 'header', point, count: guards.length })
      guards.forEach((assignment) => {
        sn += 1
        rows.push({ type: 'row', sn, assignment })
      })
    })
    return rows
  }, [filteredAssignments])

  // Summary statistics
  const stats = useMemo(() => {
    const offDutyCount = dailyAssignments.filter((a) =>
      a.dutyPoint.name.toLowerCase().includes('off duty') || a.dutyPoint.name.toLowerCase().includes('off day')
    ).length
    const outsideInDaily = dailyAssignments.filter((a) =>
      a.dutyPoint.name.toLowerCase().includes('outside deployment') || a.dutyPoint.name.toLowerCase().includes('outside')
    ).length
    // Total assigned on shift excluding those deployed outside
    const totalAssigned = Math.max(0, dailyAssignments.length - outsideInDaily)
    const campusCount = Math.max(0, dailyAssignments.length - offDutyCount - outsideInDaily)
    const pointsCount = new Set(
      dailyAssignments
        .filter(
          (a) =>
            !a.dutyPoint.name.toLowerCase().includes('off duty') &&
            !a.dutyPoint.name.toLowerCase().includes('outside')
        )
        .map((a) => a.dutyPoint.name)
    ).size
    return {
      total: dailyAssignments.length,
      totalAssigned,
      filtered: filteredAssignments.length,
      offDutyCount,
      outsideCount: outsideDeployedCount,
      campusCount,
      pointsCount,
    }
  }, [dailyAssignments, filteredAssignments.length, outsideDeployedCount])

  // CSV Export
  const exportCSV = () => {
    const headers = ['Guard Name', 'Badge ID', 'Phone', 'Shift Type', 'Duty Point', 'Shift', 'Date']
    const rows = filteredAssignments.map((a) => [
      `"${a.guard.fullName}"`,
      `"${a.guard.badgeId}"`,
      `"${a.guard.phone || 'N/A'}"`,
      `"${a.guard.shiftType === 'DAY' ? 'Day Shift' : a.guard.shiftType === 'NIGHT' ? 'Night Shift' : 'Both Shifts'}"`,
      `"${a.dutyPoint.name}"`,
      `"${a.shift.name}"`,
      `"${new Date(a.date).toLocaleDateString()}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pcc-duty-assignments-${selectedDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // WhatsApp Share - Format roster summary
  const shareToWhatsApp = () => {
    const dateStr = new Date(selectedDate).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // Build WhatsApp message
    let message = `🏛️ *PCC SECURITY GUARD ROSTER*\n`
    message += `📅 ${dateStr}\n`
    message += `🕐 ${selectedShiftObj?.name || 'Selected Shift'}\n\n`

    // Summary stats
    message += `📊 *SUMMARY*\n`
    message += `├─ On Campus: ${stats.campusCount}\n`
    message += `├─ Outside: ${stats.outsideCount}\n`
    message += `├─ Off Duty: ${stats.offDutyCount}\n`
    message += `└─ Total: ${stats.total}\n\n`

    // Group by duty point
    const byDutyPoint = new Map<string, string[]>()
    filteredAssignments.forEach((a) => {
      const name = a.dutyPoint.name
      if (!byDutyPoint.has(name)) {
        byDutyPoint.set(name, [])
      }
      byDutyPoint.get(name)!.push(a.guard.fullName)
    })

    // List duty points and guards
    message += `📍 *DUTY POINTS*\n`
    const sortedPoints = Array.from(byDutyPoint.entries()).sort((a, b) => a[0].localeCompare(b[0]))

    sortedPoints.forEach(([point, guards]) => {
      const isOffDuty = point.toLowerCase().includes('off duty') || point.toLowerCase().includes('off day')
      const isOutside = point.toLowerCase().includes('outside deployment') || point.toLowerCase().includes('outside')

      let icon = '📍'
      if (isOffDuty) icon = '🌙'
      if (isOutside) icon = '🌐'

      message += `\n${icon} *${point}*\n`
      guards.forEach((guard) => {
        message += `  └─ ${guard}\n`
      })
    })

    message += `\n_Generated via PCC GuardTrack_`

    // Encode and open WhatsApp
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')
  }

  // Print helper
  const handlePrint = () => {
    window.print()
  }

  const selectedShiftObj = shifts.find((s) => s.id === selectedShift)
  const isDayShift = selectedShiftObj?.name.toLowerCase().includes('day') ?? true
  const oppositeShiftObj = useMemo(() => {
    const dayShift = shifts.find((s) => s.name.toLowerCase().includes('day'))
    const nightShift = shifts.find((s) => s.name.toLowerCase().includes('night'))
    return selectedShift === dayShift?.id ? nightShift : dayShift
  }, [shifts, selectedShift])

  // Render a single assignment card (reusable for both flat and zone views)
  const renderAssignmentCard = (assignment: DailyAssignment, shiftCtx?: 'DAY' | 'NIGHT') => {
    const ctx = shiftCtx ?? (isDayShift ? 'DAY' : 'NIGHT')
    return (
      <GuardCard
        key={assignment.id}
        guard={assignment.guard}
        dutyPointName={assignment.dutyPoint.name}
        excused={!!assignment.excused}
        excuseReason={assignment.excuseReason}
        activeShiftContext={ctx}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans overflow-x-clip">
      {/* View-Only Top Navbar (No page switcher bar) */}
      <PortalNavbar
        subtitle="Daily Duty Assignments · Executive View"
        hideProfile
        onPrint={handlePrint}
        extraActions={
          <>
            {/* Share menu — WhatsApp + CSV export grouped to keep the top bar clean */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs border-slate-200 dark:border-slate-800 gap-1.5"
                  title="Share or export roster"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={shareToWhatsApp} className="cursor-pointer gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/whatsapp.png" alt="" className="w-4 h-4" />
                  Share via WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportCSV} className="cursor-pointer gap-2">
                  <Download className="w-4 h-4" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Printable Official Header (Only in print output) */}
      <div className="hidden print:block p-6 border-b border-slate-300 text-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 p-1 bg-white border border-slate-300 rounded-lg">
              <img src="/pcc.png" alt="PCC Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">PENTECOST CONVENTION CENTRE</h1>
              <p className="text-xs uppercase font-semibold text-slate-700">Security Operations Unit · Daily Duty Roster</p>
              <p className="text-[11px] text-slate-500">P.O. Box 2194, Accra - Ghana · Campus Deployment Sheet</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-sm">ROSTER DATE: {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-semibold text-slate-700">SHIFT: {selectedShiftObj?.name || 'Selected Shift'} ({selectedShiftObj?.startTime} - {selectedShiftObj?.endTime})</p>
            <p className="text-slate-500 text-[10px] mt-1" suppressHydrationWarning>Printed: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 print:p-4 print:max-w-none">
        {/* Executive Greeting Header for Mr. Achaab */}
        <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="space-y-0.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {greeting}, Mr. Achaab
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daily deployment overview for {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {selectedShiftObj?.name || 'Selected Shift'}.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Campus Security Active</span>
            </span>
          </div>
        </div>

        {/* Understaffed Duty Points Notice */}
        {uncoveredPosts.length > 0 && (
          <div className="print:hidden relative rounded-2xl bg-white dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
            <div className="p-4 sm:p-4.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                      {uncoveredPosts.length} Understaffed Duty Point{uncoveredPosts.length > 1 ? 's' : ''}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Click a duty point to filter the roster
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Needs Coverage
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {uncoveredPosts.map((post) => {
                  const isActive = selectedDutyPointFilter === post.name
                  const isVacant = post.assigned === 0
                  return (
                    <button
                      type="button"
                      key={post.name}
                      onClick={() => setSelectedDutyPointFilter(isActive ? 'ALL' : post.name)}
                      title={isActive ? 'Click to clear post filter' : `Filter roster by ${post.name}`}
                      className={`group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs'
                          : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/90 dark:border-slate-700/70 text-slate-700 dark:text-slate-200 hover:bg-amber-50/70 hover:border-amber-300 dark:hover:bg-amber-950/30 dark:hover:border-amber-700/70'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isActive
                            ? 'bg-amber-400 dark:bg-amber-600'
                            : isVacant
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      <span className="truncate max-w-[200px]">{post.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Filters and Controls Card */}
        <Card className="print:hidden border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/90 rounded-2xl">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
              {/* Date Selector with Quick Buttons */}
              <div className="lg:col-span-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Assignment Date
                  </Label>
                  {/* Preset Chips */}
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      onClick={() => setDatePreset('yesterday')}
                      className="px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Yesterday
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <button
                      onClick={() => setDatePreset('today')}
                      className="px-1.5 py-0.5 rounded font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    >
                      Today
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <button
                      onClick={() => setDatePreset('tomorrow')}
                      className="px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Tomorrow
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 border-slate-200 dark:border-slate-700"
                    onClick={() => handleDateShift(-1)}
                    title="Previous day"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="relative flex-1 min-w-0">
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="h-9 w-full pr-9 text-xs sm:text-sm bg-slate-50/70 dark:bg-slate-800/60 font-medium [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:bottom-0 [&::-webkit-calendar-picker-indicator]:w-9 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 border-slate-200 dark:border-slate-700"
                    onClick={() => handleDateShift(1)}
                    title="Next day"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Shift Selector Dropdown */}
              <div className="lg:col-span-4 space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  {isDayShift ? (
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  Shift Schedule
                </Label>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className="h-9 text-xs sm:text-sm bg-slate-50/70 dark:bg-slate-800/60 font-medium">
                    <SelectValue placeholder="Select shift..." />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id} className="text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          {shift.name.toLowerCase().includes('day') ? (
                            <Sun className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <Moon className="w-3.5 h-3.5 text-indigo-400" />
                          )}
                          <span className="font-semibold">{shift.name}</span>
                          <span className="text-slate-400 text-xs">({shift.startTime} - {shift.endTime})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Box */}
              <div className="lg:col-span-4 space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    Quick Search
                  </span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Search guard name, badge, duty post..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 text-xs sm:text-sm bg-slate-50/70 dark:bg-slate-800/60 pr-8"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Location Filter Bar — compact dropdown */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0 whitespace-nowrap">
                  Filter Post
                </Label>
                <Select value={selectedDutyPointFilter} onValueChange={setSelectedDutyPointFilter}>
                  <SelectTrigger className="h-8 text-xs flex-1 max-w-xs min-w-0 bg-slate-50/70 dark:bg-slate-800/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Posts ({stats.totalAssigned})</SelectItem>
                    {dutyPointsList.map(([name, count]) => (
                      <SelectItem key={name} value={name}>
                        {name} ({count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDutyPointFilter !== 'ALL' && (
                  <button
                    onClick={() => setSelectedDutyPointFilter('ALL')}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {/* View Mode & Split View Icon Group */}
                <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setViewMode('flat')}
                    className={`w-7 h-7 inline-flex items-center justify-center rounded-md transition-all ${
                      viewMode === 'flat'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Flat Grid View"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('zone')}
                    className={`w-7 h-7 inline-flex items-center justify-center rounded-md transition-all ${
                      viewMode === 'zone'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Zone Grouping View"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`w-7 h-7 inline-flex items-center justify-center rounded-md transition-all ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Compact Table View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => setSplitView(!splitView)}
                    className={`w-7 h-7 inline-flex items-center justify-center rounded-md transition-all ${
                      splitView
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title={splitView ? 'Exit Split View' : 'Split View (Day vs Night)'}
                  >
                    <Columns2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1.5 whitespace-nowrap">
                  {refreshing && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                  <span>
                    Showing {filteredAssignments.length} of{' '}
                    {selectedDutyPointFilter === 'ALL'
                      ? stats.totalAssigned
                      : dutyPointsList.find(([name]) => name === selectedDutyPointFilter)?.[1] ?? stats.totalAssigned}{' '}
                    guards
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operational KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 print:grid-cols-4 print:hidden">
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all bg-white dark:bg-slate-900/95 rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Assigned</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums mt-0.5">
                  {stats.totalAssigned}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Excludes outside</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all bg-white dark:bg-slate-900/95 rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Campus Posts</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums mt-0.5">
                  {stats.campusCount}
                </p>
                <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">{stats.pointsCount} duty points</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all bg-white dark:bg-slate-900/95 rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Outside Deployed</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-tight tabular-nums mt-0.5">
                  {outsideDeployedCount}
                </p>
                <p className="text-[11px] text-blue-500/80 dark:text-blue-400/80 mt-0.5">External deployment</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all bg-white dark:bg-slate-900/95 rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Off Duty</p>
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-300 tracking-tight tabular-nums mt-0.5">
                  {stats.offDutyCount}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Scheduled day off</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                <Moon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Split View: Selected Shift vs Opposite Shift Side-by-Side */}
        {splitView && !loading && (
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
            {/* Primary Selected Shift Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                {isDayShift ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400" />
                )}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  {selectedShiftObj?.name || (isDayShift ? 'Day Shift' : 'Night Shift')}
                </h3>
                <span className="text-xs text-slate-500">
                  ({filteredAssignments.length} guard{filteredAssignments.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredAssignments.map((assignment) =>
                  renderAssignmentCard(assignment, isDayShift ? 'DAY' : 'NIGHT')
                )}
              </div>
            </div>

            {/* Opposite Shift Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                {isDayShift ? (
                  <Moon className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  {oppositeShiftObj?.name || (isDayShift ? 'Night Shift' : 'Day Shift')}
                </h3>
                <span className="text-xs text-slate-500">
                  ({filteredOppositeAssignments.length} guard{filteredOppositeAssignments.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredOppositeAssignments.map((assignment) =>
                  renderAssignmentCard(assignment, isDayShift ? 'NIGHT' : 'DAY')
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content Section: Skeletons, Empty State, Table, or Card Grid (screen only) */}
        <div className={`print:hidden transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
              >
                <Skeleton className="h-7 w-full rounded-xl" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : splitView ? (
          /* Split View is handled above */
          null
        ) : filteredAssignments.length === 0 ? (
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/90 rounded-2xl">
            <CardContent className="py-16 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No Duty Assignments Found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {searchQuery || selectedDutyPointFilter !== 'ALL'
                    ? 'No assignments matched your search or location filter.'
                    : `No guard assignments have been scheduled for ${new Date(selectedDate).toLocaleDateString()} on the selected shift.`}
                </p>
              </div>

              {(searchQuery || selectedDutyPointFilter !== 'ALL') && (
                <Button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedDutyPointFilter('ALL')
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs mt-2"
                >
                  Reset Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          /* On-Screen Compact Table View */
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/90 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-10">#</th>
                    <th className="py-3 px-4">Duty Point</th>
                    <th className="py-3 px-4">Guard Name</th>
                    <th className="py-3 px-4">Badge ID</th>
                    <th className="py-3 px-4">Shift</th>
                    <th className="py-3 px-4">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {printRosterRows.map((row, i) =>
                    row.type === 'header' ? (
                      <tr key={`tbl-hdr-${row.point}-${i}`} className="bg-slate-50/80 dark:bg-slate-800/40">
                        <td colSpan={6} className="py-2 px-4 font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                          {row.point}{' '}
                          <span className="font-normal normal-case text-slate-500">
                            ({row.count} guard{row.count !== 1 ? 's' : ''})
                          </span>
                        </td>
                      </tr>
                    ) : (
                      <tr key={row.assignment.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{row.sn}</td>
                        <td className="py-2.5 px-4">
                          {row.assignment.excused ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-semibold">
                              Excused{row.assignment.excuseReason ? ` — ${row.assignment.excuseReason}` : ''}
                            </span>
                          ) : (
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {row.assignment.dutyPoint.name}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                          {row.assignment.guard.fullName}
                          {row.assignment.guard.designation && (
                            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                              ★ {row.assignment.guard.designation}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {row.assignment.guard.badgeId}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                          {row.assignment.guard.shiftType === 'DAY'
                            ? 'Day'
                            : row.assignment.guard.shiftType === 'NIGHT'
                            ? 'Night'
                            : 'Both'}
                        </td>
                        <td className="py-2.5 px-4">
                          {row.assignment.guard.phone ? (
                            <a
                              href={`tel:${row.assignment.guard.phone}`}
                              className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-mono"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {row.assignment.guard.phone}
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : viewMode === 'zone' ? (
          /* Zone Grouped View */
          <div className="space-y-6">
            {Array.from(assignmentsByZone.entries()).map(([zoneName, assignments]) => (
              <div key={zoneName} className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                    {zoneName}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({assignments.length} guard{assignments.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {assignments.map((assignment) => renderAssignmentCard(assignment))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Flat List View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAssignments.map((assignment) => renderAssignmentCard(assignment))}
          </div>
        )}
        </div>

        {/* Printable Roster Table — official tabular layout, no photos */}
        <div className="hidden print:block text-black">
          <table className="w-full border-collapse text-[11px] leading-tight">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black px-2 py-1.5 text-left font-bold w-10">S/N</th>
                <th className="border border-black px-2 py-1.5 text-left font-bold">Guard Name</th>
                <th className="border border-black px-2 py-1.5 text-left font-bold w-24">Badge ID</th>
                <th className="border border-black px-2 py-1.5 text-left font-bold w-32">Phone</th>
                <th className="border border-black px-2 py-1.5 text-left font-bold w-28">Shift Type</th>
              </tr>
            </thead>
            <tbody>
              {printRosterRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="border border-black px-2 py-3 text-center text-slate-500">
                    No duty assignments found for the selected date and shift.
                  </td>
                </tr>
              )}
              {printRosterRows.map((row, i) =>
                row.type === 'header' ? (
                  <tr key={`point-${row.point}-${i}`}>
                    <td
                      colSpan={5}
                      className="border border-black bg-slate-50 px-2 py-1 font-bold uppercase tracking-wide"
                    >
                      {row.point}{' '}
                      <span className="font-normal normal-case">({row.count} guard{row.count !== 1 ? 's' : ''})</span>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.assignment.id}>
                    <td className="border border-black px-2 py-1 text-center">{row.sn}</td>
                    <td className="border border-black px-2 py-1 font-semibold">
                      {row.assignment.guard.fullName}
                      {row.assignment.excused ? ' (Excused)' : ''}
                    </td>
                    <td className="border border-black px-2 py-1">{row.assignment.guard.badgeId}</td>
                    <td className="border border-black px-2 py-1">{row.assignment.guard.phone || '—'}</td>
                    <td className="border border-black px-2 py-1">
                      {row.assignment.guard.shiftType === 'DAY'
                        ? 'Day'
                        : row.assignment.guard.shiftType === 'NIGHT'
                          ? 'Night'
                          : 'Both'}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-slate-600">
            Total: {filteredAssignments.length} guard{filteredAssignments.length !== 1 ? 's' : ''}
            {selectedShiftObj
              ? ` · Shift: ${selectedShiftObj.name} (${selectedShiftObj.startTime} - ${selectedShiftObj.endTime})`
              : ''}
          </p>
        </div>

        {/* Printable Official Sign-Off Footer */}
        <div className="hidden print:block pt-12 text-xs text-black border-t border-slate-300 mt-8">
          <div className="grid grid-cols-3 gap-8">
            <div className="space-y-12">
              <p className="font-bold">Prepared By: (Shift Supervisor)</p>
              <div className="border-t border-black pt-1">
                <p>Signature & Date</p>
              </div>
            </div>
            <div className="space-y-12">
              <p className="font-bold">Verified By: (Duty Officer)</p>
              <div className="border-t border-black pt-1">
                <p>Signature & Date</p>
              </div>
            </div>
            <div className="space-y-12">
              <p className="font-bold">Approved By: (Head of Security)</p>
              <div className="border-t border-black pt-1">
                <p>Signature & Date</p>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-500 mt-8">
            PCC GuardTrack System · Pentecost Convention Centre, Gomoa Fetteh · Official Security Document
          </p>
        </div>

        {/* Regular Web Footer */}
        <footer className="print:hidden text-center text-xs text-slate-400 dark:text-slate-500 pt-8 pb-4 space-y-1">
          <p className="font-medium">
            Pentecost Convention Centre · Security Operations Unit
          </p>
          <p className="text-[11px]">
            Daily Duty Assignments · Real-time operational data
          </p>
        </footer>
      </main>
    </div>
  )
}
