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
  RefreshCw,
  AlertTriangle,
  MessageCircle,
  Layers,
} from 'lucide-react'
import { PortalNavbar } from '@/components/PortalNavbar'
import { Skeleton } from '@/components/ui/skeleton'

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
  const [viewMode, setViewMode] = useState<'flat' | 'zone'>('flat')
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
      const res = await fetch(`/api/daily-assignments?date=${selectedDate}&shiftId=${selectedShift}`)
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
            const oppositeRes = await fetch(`/api/daily-assignments?date=${selectedDate}&shiftId=${oppositeShiftId}`)
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

  // Calculate uncovered posts (critical duty points with 0 guards assigned)
  // Only check if assignments have been submitted for this shift
  const uncoveredPosts = useMemo(() => {
    // Don't show alert if no assignments have been submitted for this shift yet
    if (dailyAssignments.length === 0) {
      return []
    }

    // Get assigned duty point names for the current shift
    const assignedPointNames = new Set(
      dailyAssignments
        .filter((a) => {
          const name = a.dutyPoint.name.toLowerCase()
          // Exclude off duty and outside deployment from coverage check
          return !name.includes('off duty') &&
                 !name.includes('off day') &&
                 !name.includes('outside deployment') &&
                 !name.includes('outside')
        })
        .map((a) => a.dutyPoint.name)
    )

    // Find active duty points that are not assigned
    const uncovered = dutyPoints
      .filter((dp) => {
        if (!dp.isActive) return false
        const name = dp.name.toLowerCase()
        // Exclude off duty and outside deployment from coverage check
        if (name.includes('off duty') || name.includes('off day') ||
            name.includes('outside deployment') || name.includes('outside')) {
          return false
        }
        return !assignedPointNames.has(dp.name)
      })
      .map((dp) => dp.name)
      .sort()

    return uncovered
  }, [dailyAssignments, dutyPoints])

  // Filtered assignments with memoization (excludes outside deployed on "ALL" view)
  const filteredAssignments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return dailyAssignments.filter((assignment) => {
      const isOutside =
        assignment.dutyPoint.name.toLowerCase().includes('outside deployment') ||
        assignment.dutyPoint.name.toLowerCase().includes('outside')

      const matchesSearch =
        q === '' ||
        assignment.guard.fullName.toLowerCase().includes(q) ||
        assignment.guard.badgeId.toLowerCase().includes(q) ||
        assignment.dutyPoint.name.toLowerCase().includes(q) ||
        (assignment.guard.phone && assignment.guard.phone.includes(q))

      // When "ALL" is selected without search query, exclude outside deployed personnel so campus roster matches totalAssigned
      const matchesDutyPoint =
        selectedDutyPointFilter === 'ALL'
          ? q !== '' ? true : !isOutside
          : assignment.dutyPoint.name === selectedDutyPointFilter

      return matchesSearch && matchesDutyPoint
    })
  }, [dailyAssignments, searchQuery, selectedDutyPointFilter])

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
    let message = `🏛️ *PCC DUTY ROSTER*\n`
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

  // Get initials for fallback avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  // Render a single assignment card (reusable for both flat and zone views)
  const renderAssignmentCard = (assignment: DailyAssignment) => {
    const isOffDuty =
      assignment.dutyPoint.name.toLowerCase().includes('off duty') ||
      assignment.dutyPoint.name.toLowerCase().includes('off day')
    const isOutside =
      assignment.dutyPoint.name.toLowerCase().includes('outside deployment') ||
      assignment.dutyPoint.name.toLowerCase().includes('outside')

    return (
      <Card
        key={assignment.id}
        className="group border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 bg-white dark:bg-slate-900/90 rounded-2xl overflow-hidden flex flex-col justify-between"
      >
        <CardContent className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
          {/* Top Duty Point Highlight */}
          <div className="text-center">
            {isOffDuty ? (
              <div className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-2xs text-slate-700 dark:text-slate-300">
                <Moon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span className="font-bold text-xs truncate max-w-[200px]">
                  Off Duty (Day Off)
                </span>
              </div>
            ) : isOutside ? (
              <div className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 px-3 py-1.5 rounded-xl shadow-2xs text-blue-800 dark:text-blue-300">
                <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-bold text-xs truncate max-w-[200px]">
                  Outside Deployment
                </span>
              </div>
            ) : (
              <div className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 px-3 py-1.5 rounded-xl shadow-2xs">
                <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300 truncate max-w-[200px]">
                  {assignment.dutyPoint.name}
                </span>
              </div>
            )}
          </div>

          {/* Guard Photo or Initials Avatar */}
          <div className="flex justify-center my-1">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-2 border-slate-200 dark:border-slate-700 shadow-xs group-hover:scale-105 transition-transform duration-200 flex items-center justify-center">
              {assignment.guard.photoUrl ? (
                <img
                  src={assignment.guard.photoUrl}
                  alt={assignment.guard.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-bold text-base text-slate-600 dark:text-slate-300 tracking-wider">
                  {getInitials(assignment.guard.fullName)}
                </span>
              )}
            </div>
          </div>

          {/* Name and Badge ID */}
          <div className="text-center space-y-1">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {assignment.guard.fullName}
            </h3>
            <div className="inline-block">
              <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                {assignment.guard.badgeId}
              </span>
            </div>
          </div>

          {/* Shift Badge (hidden for outside deployed guards) & Contact Phone */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {!isOutside && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Shift</span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    assignment.guard.shiftType === 'DAY'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      : assignment.guard.shiftType === 'NIGHT'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {assignment.guard.shiftType === 'DAY' ? (
                    <>
                      <Sun className="w-2.5 h-2.5" /> Day Shift
                    </>
                  ) : assignment.guard.shiftType === 'NIGHT' ? (
                    <>
                      <Moon className="w-2.5 h-2.5" /> Night Shift
                    </>
                  ) : (
                    'Both Shifts'
                  )}
                </span>
              </div>
            )}

            {assignment.guard.phone ? (
              <a
                href={`tel:${assignment.guard.phone}`}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800/60"
                title="Click to call guard"
              >
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{assignment.guard.phone}</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Call →
                </span>
              </a>
            ) : (
              <div className="text-center text-[11px] text-slate-400 italic py-1">
                No phone on file
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* View-Only Top Navbar (No page switcher bar) */}
      <PortalNavbar
        currentPage="assignments"
        showPageSwitcher={false}
        subtitle="Daily Duty Assignments · Executive View"
        onPrint={handlePrint}
        extraActions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="h-9 text-xs border-slate-200 dark:border-slate-800 gap-1.5"
              title="Export assignments as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={shareToWhatsApp}
              className="h-9 text-xs border-green-500/50 dark:border-green-600/50 text-green-700 dark:text-green-400 gap-1.5 hover:bg-green-50 dark:hover:bg-green-950/30"
              title="Share roster to WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDailyAssignments(true)}
              disabled={refreshing}
              className="h-9 text-xs border-slate-200 dark:border-slate-800"
              title="Refresh assignments"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-1.5">Refresh</span>
            </Button>
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

        {/* Uncovered Posts Alert Bar */}
        {uncoveredPosts.length > 0 && (
          <div className="print:hidden p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-200/80 dark:bg-amber-800/60 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-800 dark:text-amber-200" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                    ⚠️ {uncoveredPosts.length} Uncovered Post{uncoveredPosts.length > 1 ? 's' : ''}
                  </h3>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                    Critical
                  </span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 mb-2">
                  The following duty points have no guards assigned for this shift:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {uncoveredPosts.map((post) => (
                    <span
                      key={post}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/60 text-xs font-semibold text-amber-900 dark:text-amber-200"
                    >
                      <MapPin className="w-3 h-3" />
                      {post}
                    </span>
                  ))}
                </div>
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
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-9 text-xs sm:text-sm bg-slate-50/70 dark:bg-slate-800/60 font-medium"
                  />
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
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0 whitespace-nowrap">
                  Filter Post
                </Label>
                <Select value={selectedDutyPointFilter} onValueChange={setSelectedDutyPointFilter}>
                  <SelectTrigger className="h-8 text-xs flex-1 max-w-xs bg-slate-50/70 dark:bg-slate-800/60">
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
              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <button
                    onClick={() => setViewMode('flat')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === 'flat'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Flat List View"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('zone')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === 'zone'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Zone Grouping View"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Split View Toggle */}
                <button
                  onClick={() => setSplitView(!splitView)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    splitView
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Compare Day vs Night shifts side-by-side"
                >
                  {splitView ? 'Exit Split' : 'Split View'}
                </button>
                <div className="text-[11px] text-slate-400 shrink-0">
                  Showing {filteredAssignments.length} of{' '}
                  {selectedDutyPointFilter === 'ALL'
                    ? stats.totalAssigned
                    : dutyPointsList.find(([name]) => name === selectedDutyPointFilter)?.[1] ?? stats.totalAssigned}{' '}
                  guards
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operational KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/90 rounded-xl">
            <CardContent className="p-3.5 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Assigned</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                {stats.totalAssigned}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Excludes outside
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/90 rounded-xl">
            <CardContent className="p-3.5 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Campus Posts</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5">
                {stats.campusCount}
              </p>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">{stats.pointsCount} duty points</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/90 rounded-xl">
            <CardContent className="p-3.5 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Outside Deployed</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight mt-0.5">
                {outsideDeployedCount}
              </p>
              <p className="text-[10px] text-blue-500/80 dark:text-blue-400/80 mt-0.5">External deployment</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/90 rounded-xl">
            <CardContent className="p-3.5 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Off Duty</p>
              <p className="text-2xl font-black text-slate-700 dark:text-slate-300 tracking-tight mt-0.5">
                {stats.offDutyCount}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Scheduled day off</p>
            </CardContent>
          </Card>
        </div>

        {/* Split View: Day vs Night Side-by-Side */}
        {splitView && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Day Shift Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  Day Shift
                </h3>
                <span className="text-xs text-slate-500">
                  ({filteredAssignments.length} guard{filteredAssignments.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredAssignments.map((assignment) => renderAssignmentCard(assignment))}
              </div>
            </div>

            {/* Night Shift Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  Night Shift
                </h3>
                <span className="text-xs text-slate-500">
                  ({nightAssignments.length} guard{nightAssignments.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {nightAssignments.map((assignment) => renderAssignmentCard(assignment))}
              </div>
            </div>
          </div>
        )}

        {/* Content Section: Skeletons, Empty State, or Card Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
              >
                <Skeleton className="h-7 w-3/4 mx-auto rounded-lg" />
                <div className="flex justify-center">
                  <Skeleton className="h-20 w-20 rounded-full" />
                </div>
                <div className="space-y-1.5 text-center">
                  <Skeleton className="h-4 w-32 mx-auto" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </div>
                <Skeleton className="h-5 w-24 mx-auto rounded-full" />
                <Skeleton className="h-6 w-full rounded-lg" />
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
