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
  Shield,
  Calendar,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LayoutGrid,
  List,
  X,
  Save,
  Wand2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
} from 'lucide-react'
import { PortalNavbar } from '@/components/PortalNavbar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'

interface Guard {
  id: string
  fullName: string
  badgeId: string
  phone: string | null
  photoUrl: string | null
  shiftType: string
  defaultDutyPointId: string | null
  defaultDutyPoint: { id: string; name: string } | null
  startDate: string | null
}

interface DutyPoint {
  id: string
  name: string
}

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
}

interface DailyAssignment {
  id: string
  guardId: string
  dutyPointId: string
  dutyPoint: { id?: string; name: string }
  shift: { id?: string; name: string }
  date: string
}

export default function GuardDirectoryPage() {
  const [guards, setGuards] = useState<Guard[]>([])
  const [dutyPoints, setDutyPoints] = useState<DutyPoint[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [dailyAssignments, setDailyAssignments] = useState<DailyAssignment[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [shiftTypeFilter, setShiftTypeFilter] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL')
  const [selectedDutyPointFilter, setSelectedDutyPointFilter] = useState('ALL')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedShift, setSelectedShift] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Assign Mode State
  const [assignMode, setAssignMode] = useState(false)
  const [assignmentsDraft, setAssignmentsDraft] = useState<Record<string, string>>({})
  const [modifiedGuards, setModifiedGuards] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Initial Parallel Data Fetching
  useEffect(() => {
    let isMounted = true

    async function initializeData() {
      try {
        setLoading(true)
        const [guardsRes, dutyPointsRes, shiftsRes] = await Promise.all([
          fetch('/api/guards?status=ACTIVE'),
          fetch('/api/duty-points'),
          fetch('/api/shifts'),
        ])

        if (!isMounted) return

        if (guardsRes.ok) {
          const gData = await guardsRes.json()
          setGuards(Array.isArray(gData) ? gData : [])
        }
        if (dutyPointsRes.ok) {
          const dpData = await dutyPointsRes.json()
          setDutyPoints(Array.isArray(dpData) ? dpData : [])
        }
        if (shiftsRes.ok) {
          const sData: Shift[] = await shiftsRes.json()
          setShifts(Array.isArray(sData) ? sData : [])
          if (sData.length > 0) {
            const day = sData.find((s) => s.name.toLowerCase().includes('day'))
            setSelectedShift(day ? day.id : sData[0].id)
          }
        }
      } catch (err) {
        console.error('Error initializing directory data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initializeData()
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
      const res = await fetch(`/api/daily-assignments?date=${selectedDate}&shiftId=${selectedShift}`)
      if (res.ok) {
        const data = await res.json()
        setDailyAssignments(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching daily assignments:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedDate, selectedShift])

  useEffect(() => {
    if (selectedDate && selectedShift) {
      fetchDailyAssignments()
    }
  }, [selectedDate, selectedShift, fetchDailyAssignments])

  // Helper map: Guard ID -> Current Assigned Duty Point
  const assignmentMap = useMemo(() => {
    const map = new Map<string, { dutyPointId: string; dutyPointName: string }>()
    dailyAssignments.forEach((a) => {
      map.set(a.guardId, {
        dutyPointId: a.dutyPointId,
        dutyPointName: a.dutyPoint?.name || 'Assigned',
      })
    })
    return map
  }, [dailyAssignments])

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

  // Toggle Assign Mode & Initialize Draft
  const toggleAssignMode = () => {
    if (!assignMode) {
      // Entering assign mode: build initial draft dictionary from current daily assignments
      const draft: Record<string, string> = {}
      dailyAssignments.forEach((a) => {
        draft[a.guardId] = a.dutyPointId
      })
      setAssignmentsDraft(draft)
      setModifiedGuards(new Set())
    } else {
      // Exiting assign mode: discard unsaved changes
      setModifiedGuards(new Set())
    }
    setAssignMode(!assignMode)
  }

  // Update a single guard's assignment in draft
  const updateAssignment = (guardId: string, dutyPointId: string) => {
    setAssignmentsDraft((prev) => ({ ...prev, [guardId]: dutyPointId }))
    setModifiedGuards((prev) => {
      const next = new Set(prev)
      next.add(guardId)
      return next
    })
  }

  // Auto-Fill Default Posts for guards who have a defaultDutyPoint
  const autoAssignDefaults = () => {
    let appliedCount = 0
    const newDraft = { ...assignmentsDraft }
    const newModified = new Set(modifiedGuards)

    filteredGuards.forEach((guard) => {
      // If guard has a default duty point and is currently unassigned in draft
      if (guard.defaultDutyPointId && !newDraft[guard.id]) {
        newDraft[guard.id] = guard.defaultDutyPointId
        newModified.add(guard.id)
        appliedCount++
      }
    })

    setAssignmentsDraft(newDraft)
    setModifiedGuards(newModified)

    if (appliedCount > 0) {
      toast.success(`Auto-assigned ${appliedCount} guards to their default duty posts!`)
    } else {
      toast.info('No additional guards with default posts to assign.')
    }
  }

  // Find off duty duty point
  const offDutyDp = useMemo(() => {
    return dutyPoints.find(
      (dp) => dp.id === 'off-duty' || dp.name.toLowerCase().includes('off duty') || dp.name.toLowerCase().includes('off day')
    )
  }, [dutyPoints])

  // Sorted duty points prioritizing Off Duty & Outside Deployment at the top
  const sortedDutyPoints = useMemo(() => {
    return [...dutyPoints].sort((a, b) => {
      const aOff = a.id === 'off-duty' || a.name.toLowerCase().includes('off duty')
      const bOff = b.id === 'off-duty' || b.name.toLowerCase().includes('off duty')
      if (aOff && !bOff) return -1
      if (!aOff && bOff) return 1

      const aOut = a.id === 'outside-deployment' || a.name.toLowerCase().includes('outside')
      const bOut = b.id === 'outside-deployment' || b.name.toLowerCase().includes('outside')
      if (aOut && !bOut) return -1
      if (!aOut && bOut) return 1

      return a.name.localeCompare(b.name)
    })
  }, [dutyPoints])

  // Mark all unassigned guards on this roster as Off Duty with one click
  const markAllUnassignedOffDuty = () => {
    if (!offDutyDp) {
      toast.error('Off Duty duty point not found')
      return
    }
    let appliedCount = 0
    const newDraft = { ...assignmentsDraft }
    const newModified = new Set(modifiedGuards)

    filteredGuards.forEach((guard) => {
      if (!newDraft[guard.id] || newDraft[guard.id] === 'unassigned') {
        newDraft[guard.id] = offDutyDp.id
        newModified.add(guard.id)
        appliedCount++
      }
    })

    setAssignmentsDraft(newDraft)
    setModifiedGuards(newModified)

    if (appliedCount > 0) {
      toast.success(`Marked ${appliedCount} unassigned guards as Off Duty!`)
    } else {
      toast.info('No unassigned guards to mark.')
    }
  }

  // Save Assignments via Batch Transaction API
  const saveAssignments = async () => {
    if (modifiedGuards.size === 0) {
      setAssignMode(false)
      return
    }

    setSaving(true)
    try {
      // Construct batch array for only modified guards
      const batchPayload = Array.from(modifiedGuards).map((guardId) => ({
        guardId,
        dutyPointId: assignmentsDraft[guardId] || '',
        shiftId: selectedShift,
        date: selectedDate,
      }))

      const res = await fetch('/api/daily-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: batchPayload }),
      })

      if (!res.ok) {
        throw new Error('Server returned error while saving assignments')
      }

      await fetchDailyAssignments(true)
      setAssignMode(false)
      setModifiedGuards(new Set())
      toast.success(`Successfully saved ${batchPayload.length} duty point assignments!`)
    } catch (error) {
      console.error('Error saving assignments:', error)
      toast.error('Failed to save assignments. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Filter Guards with Memoization
  const filteredGuards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const selectedShiftObj = shifts.find((s) => s.id === selectedShift)
    const isDayShift = selectedShiftObj?.name.toLowerCase().includes('day') ?? true

    return guards.filter((guard) => {
      // Search matching (name, badge ID, phone)
      const matchesSearch =
        q === '' ||
        guard.fullName.toLowerCase().includes(q) ||
        guard.badgeId.toLowerCase().includes(q) ||
        (guard.phone && guard.phone.includes(q))

      // In assign mode: filter guards suitable for this shift (DAY, NIGHT or BOTH)
      if (assignMode) {
        const matchesShift = isDayShift
          ? guard.shiftType === 'DAY' || guard.shiftType === 'BOTH'
          : guard.shiftType === 'NIGHT' || guard.shiftType === 'BOTH'
        return matchesSearch && matchesShift
      }

      // Shift type filter
      const matchesShiftType =
        shiftTypeFilter === 'ALL' || guard.shiftType === shiftTypeFilter

      // Duty point filter
      const assigned = assignmentMap.get(guard.id)
      const matchesDutyPoint =
        selectedDutyPointFilter === 'ALL' ||
        (selectedDutyPointFilter === 'UNASSIGNED' && !assigned) ||
        (assigned && assigned.dutyPointName === selectedDutyPointFilter)

      return matchesSearch && matchesShiftType && matchesDutyPoint
    })
  }, [guards, searchQuery, assignMode, shifts, selectedShift, shiftTypeFilter, selectedDutyPointFilter, assignmentMap])

  // KPI Statistics
  const stats = useMemo(() => {
    const dayGuards = guards.filter((g) => g.shiftType === 'DAY' || g.shiftType === 'BOTH').length
    const nightGuards = guards.filter((g) => g.shiftType === 'NIGHT' || g.shiftType === 'BOTH').length
    const offDutyCount = dailyAssignments.filter((a) =>
      a.dutyPoint?.name?.toLowerCase().includes('off duty') || a.dutyPoint?.name?.toLowerCase().includes('off day')
    ).length
    const outsideCount = dailyAssignments.filter((a) =>
      a.dutyPoint?.name?.toLowerCase().includes('outside deployment') || a.dutyPoint?.name?.toLowerCase().includes('outside')
    ).length
    const campusCount = Math.max(0, dailyAssignments.length - offDutyCount - outsideCount)
    return {
      total: guards.length,
      filtered: filteredGuards.length,
      dayGuards,
      nightGuards,
      assignedCount: dailyAssignments.length,
      offDutyCount,
      outsideCount,
      campusCount,
    }
  }, [guards, filteredGuards.length, dailyAssignments])

  // CSV Export
  const exportCSV = () => {
    const headers = ['Guard Name', 'Badge ID', 'Phone', 'Shift Type', 'Assigned Duty Point', 'Default Duty Point', 'Start Date']
    const rows = filteredGuards.map((g) => {
      const assigned = assignmentMap.get(g.id)?.dutyPointName || 'Unassigned'
      const defaultPoint = g.defaultDutyPoint?.name || 'None'
      const shiftTypeLabel = g.shiftType === 'DAY' ? 'Day Shift' : g.shiftType === 'NIGHT' ? 'Night Shift' : 'Both Shifts'
      const startDate = g.startDate ? new Date(g.startDate).toLocaleDateString() : 'N/A'
      return [
        `"${g.fullName}"`,
        `"${g.badgeId}"`,
        `"${g.phone || 'N/A'}"`,
        `"${shiftTypeLabel}"`,
        `"${assigned}"`,
        `"${defaultPoint}"`,
        `"${startDate}"`,
      ]
    })

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pcc-guard-directory-${selectedDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Print handler
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

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <PortalNavbar
        currentPage="directory"
        showPageSwitcher={true}
        onPrint={handlePrint}
        extraActions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDailyAssignments(true)}
            disabled={refreshing}
            className="h-9 text-xs border-slate-200 dark:border-slate-800"
            title="Refresh personnel directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline ml-1.5">Refresh</span>
          </Button>
        }
      />

      {/* Printable Official Header */}
      <div className="hidden print:block p-6 border-b border-slate-300 text-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 p-1 bg-white border border-slate-300 rounded-lg">
              <img src="/pcc.png" alt="PCC Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">PENTECOST CONVENTION CENTRE</h1>
              <p className="text-xs uppercase font-semibold text-slate-700">Security Personnel Directory & Deployment</p>
              <p className="text-[11px] text-slate-500">P.O. Box 2194, Accra - Ghana · Campus Security Unit</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-sm">DATE: {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-semibold text-slate-700">SHIFT: {selectedShiftObj?.name || 'Selected Shift'}</p>
            <p className="text-slate-500 text-[10px] mt-1">Printed: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 print:p-4 print:max-w-none pb-24">
        {/* Banner Section */}
        <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shadow-md border border-slate-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <Users className="w-3.5 h-3.5 text-blue-300" />
              <span>Guard Personnel Directory</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Active Security Personnel Directory</h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Complete personnel roster with real-time duty post assignments and quick deployment mode.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={toggleAssignMode}
              variant={assignMode ? 'destructive' : 'default'}
              size="sm"
              className={`text-xs font-bold gap-1.5 shadow-xs ${
                assignMode
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{assignMode ? 'Exit Assign Mode' : '⚡ Assign Mode'}</span>
            </Button>
            <Button
              onClick={exportCSV}
              variant="secondary"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>
            <Button
              onClick={handlePrint}
              variant="secondary"
              size="sm"
              className="bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </Button>
          </div>
        </div>

        {/* Assign Mode Banner Indicator */}
        {assignMode && (
          <div className="print:hidden p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-200/80 dark:bg-amber-800/60 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-amber-800 dark:text-amber-200" />
              </div>
              <div className="text-xs">
                <p className="font-bold">Assign Mode Active ({selectedShiftObj?.name || 'Selected Shift'})</p>
                <p className="text-amber-700 dark:text-amber-300">
                  Select a duty point dropdown for any guard below, then click &ldquo;Save Assignments&rdquo;.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={autoAssignDefaults}
                className="h-8 text-xs bg-white dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-medium gap-1.5"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Auto-Assign Defaults</span>
              </Button>
              <Button
                size="sm"
                onClick={saveAssignments}
                disabled={saving || modifiedGuards.size === 0}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : `Save Changes (${modifiedGuards.size})`}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Filters and Search Toolbar */}
        <Card className="print:hidden border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/90 rounded-2xl">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
              {/* Date Selector */}
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

              {/* Shift Selector */}
              <div className="lg:col-span-3 space-y-1.5">
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

              {/* Guard Shift Type (Only when not in assign mode) */}
              {!assignMode ? (
                <div className="lg:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Guard Type
                  </Label>
                  <Select
                    value={shiftTypeFilter}
                    onValueChange={(val: 'ALL' | 'DAY' | 'NIGHT') => setShiftTypeFilter(val)}
                  >
                    <SelectTrigger className="h-9 text-xs sm:text-sm bg-slate-50/70 dark:bg-slate-800/60 font-medium">
                      <SelectValue placeholder="All types..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Guards</SelectItem>
                      <SelectItem value="DAY">Day Shift (DS)</SelectItem>
                      <SelectItem value="NIGHT">Night Shift (NS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="lg:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Mode Info
                  </Label>
                  <div className="h-9 px-3 flex items-center rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200/60 dark:border-blue-800/60">
                    {isDayShift ? '☀️ Day Guards' : '🌙 Night Guards'}
                  </div>
                </div>
              )}

              {/* Search Box */}
              <div className="lg:col-span-3 space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    Search Personnel
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
                    placeholder="Search name, badge..."
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

            {/* Sub-toolbar: Duty point quick filter & View switcher */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium mr-1">Filter Post:</span>
                <Select
                  value={selectedDutyPointFilter}
                  onValueChange={setSelectedDutyPointFilter}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-800/60 w-44">
                    <SelectValue placeholder="All Posts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Posts</SelectItem>
                    <SelectItem value="UNASSIGNED">Unassigned Only</SelectItem>
                    {dutyPoints.map((dp) => (
                      <SelectItem key={dp.id} value={dp.name} className="text-xs">
                        {dp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-slate-400 ml-2">
                  Showing {filteredGuards.length} of {guards.length} guards
                </span>
              </div>

              {/* Grid / Table Toggle */}
              <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 ml-auto">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Grid Card View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Compact Table View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operational Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/90 rounded-xl">
            <CardContent className="p-3.5 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Active Force</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                {stats.total}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Active personnel</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/90 rounded-xl">
            <CardContent className="p-3.5 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Campus Posts</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5">
                {stats.campusCount}
              </p>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">On-site duty posts</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/90 rounded-xl">
            <CardContent className="p-3.5 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Outside Deployed</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight mt-0.5">
                {stats.outsideCount}
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

        {/* Content Section: Skeletons, Empty State, Grid or Table */}
        {loading ? (
          /* Skeletons */
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
        ) : filteredGuards.length === 0 ? (
          /* Empty State */
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/90 rounded-2xl">
            <CardContent className="py-16 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No Security Guards Found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {searchQuery || selectedDutyPointFilter !== 'ALL' || shiftTypeFilter !== 'ALL'
                    ? 'No personnel matched your active search or filters. Try adjusting criteria.'
                    : 'There are no active security guards in the database.'}
                </p>
              </div>

              {(searchQuery || selectedDutyPointFilter !== 'ALL' || shiftTypeFilter !== 'ALL') && (
                <Button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedDutyPointFilter('ALL')
                    setShiftTypeFilter('ALL')
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs mt-2"
                >
                  Reset All Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          /* Compact Table View */
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/90 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Duty Point (Today)</th>
                    <th className="py-3 px-4">Guard Personnel</th>
                    <th className="py-3 px-4">Badge ID</th>
                    <th className="py-3 px-4">Shift Type</th>
                    <th className="py-3 px-4">Default Post</th>
                    <th className="py-3 px-4">Contact Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredGuards.map((guard, index) => {
                    const assignedInfo = assignmentMap.get(guard.id)
                    const isModified = modifiedGuards.has(guard.id)
                    const currentDraftVal = assignmentsDraft[guard.id] ?? assignedInfo?.dutyPointId ?? ''

                    return (
                      <tr
                        key={guard.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                          isModified ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono text-slate-400">{index + 1}</td>
                        <td className="py-3 px-4">
                          {assignMode ? (
                            <div className="flex items-center gap-1.5">
                              <Select
                                value={currentDraftVal}
                                onValueChange={(val) => updateAssignment(guard.id, val)}
                              >
                                <SelectTrigger className="h-8 text-xs w-44 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 font-medium">
                                  <SelectValue placeholder="-- Unassigned --" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                  {sortedDutyPoints.map((dp) => (
                                    <SelectItem key={dp.id} value={dp.id} className="text-xs">
                                      {dp.id === 'off-duty' || dp.name.toLowerCase().includes('off duty')
                                        ? `🌙 ${dp.name}`
                                        : dp.id === 'outside-deployment' || dp.name.toLowerCase().includes('outside')
                                        ? `🌐 ${dp.name}`
                                        : dp.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                size="sm"
                                variant={currentDraftVal === offDutyDp?.id ? 'secondary' : 'outline'}
                                onClick={() => {
                                  if (offDutyDp) {
                                    updateAssignment(guard.id, currentDraftVal === offDutyDp.id ? 'unassigned' : offDutyDp.id)
                                  }
                                }}
                                className={`h-8 px-2 text-xs font-semibold shrink-0 ${
                                  currentDraftVal === offDutyDp?.id
                                    ? 'bg-slate-800 text-white dark:bg-slate-700'
                                    : 'text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                }`}
                                title={currentDraftVal === offDutyDp?.id ? 'Guard is Off Duty' : 'Mark Off Duty'}
                              >
                                <Moon className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : assignedInfo ? (
                            (() => {
                              const isOffDuty = assignedInfo.dutyPointName.toLowerCase().includes('off duty')
                              const isOutside = assignedInfo.dutyPointName.toLowerCase().includes('outside')
                              if (isOffDuty) {
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-semibold text-xs">
                                    <Moon className="w-3 h-3 text-slate-500" />
                                    Off Duty
                                  </span>
                                )
                              }
                              if (isOutside) {
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 font-semibold text-xs">
                                    <Building2 className="w-3 h-3 text-blue-600" />
                                    Outside Deployment
                                  </span>
                                )
                              }
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 font-semibold text-xs">
                                  <MapPin className="w-3 h-3 text-emerald-600" />
                                  {assignedInfo.dutyPointName}
                                </span>
                              )
                            })()
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px] font-medium border border-dashed border-slate-300 dark:border-slate-700">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-600 dark:text-slate-300">
                              {guard.photoUrl ? (
                                <img
                                  src={guard.photoUrl}
                                  alt={guard.fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                getInitials(guard.fullName)
                              )}
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {guard.fullName}
                            </span>
                            {isModified && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                                Modified
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">
                            {guard.badgeId}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {(assignedInfo?.dutyPointName || guard.defaultDutyPoint?.name || '').toLowerCase().includes('outside') ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                              Outside
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                guard.shiftType === 'DAY'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                  : guard.shiftType === 'NIGHT'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {guard.shiftType === 'DAY' ? 'Day (DS)' : guard.shiftType === 'NIGHT' ? 'Night (NS)' : 'Both'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {guard.defaultDutyPoint?.name || <span className="text-slate-400 italic">None</span>}
                        </td>
                        <td className="py-3 px-4">
                          {guard.phone ? (
                            <a
                              href={`tel:${guard.phone}`}
                              className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-mono"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {guard.phone}
                            </a>
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Modern Card Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredGuards.map((guard) => {
              const assignedInfo = assignmentMap.get(guard.id)
              const isModified = modifiedGuards.has(guard.id)
              const currentDraftVal = assignmentsDraft[guard.id] ?? assignedInfo?.dutyPointId ?? ''

              return (
                <Card
                  key={guard.id}
                  className={`group border shadow-xs hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900/90 rounded-2xl overflow-hidden flex flex-col justify-between ${
                    isModified
                      ? 'border-amber-400 ring-2 ring-amber-300/40 dark:border-amber-600 dark:ring-amber-800/40'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600'
                  }`}
                >
                  <CardContent className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                    {/* Top Duty Point Badge or Selector */}
                    <div className="text-center">
                      {assignMode ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Select
                              value={currentDraftVal}
                              onValueChange={(value) => updateAssignment(guard.id, value)}
                            >
                              <SelectTrigger className="h-9 text-xs bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/80 font-bold text-emerald-900 dark:text-emerald-200 flex-1">
                                <SelectValue placeholder="-- Unassigned --" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                {sortedDutyPoints.map((dp) => (
                                  <SelectItem key={dp.id} value={dp.id} className="text-xs">
                                    {dp.id === 'off-duty' || dp.name.toLowerCase().includes('off duty')
                                      ? `🌙 ${dp.name}`
                                      : dp.id === 'outside-deployment' || dp.name.toLowerCase().includes('outside')
                                      ? `🌐 ${dp.name}`
                                      : dp.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              size="sm"
                              variant={currentDraftVal === offDutyDp?.id ? 'secondary' : 'outline'}
                              onClick={() => {
                                if (offDutyDp) {
                                  updateAssignment(guard.id, currentDraftVal === offDutyDp.id ? 'unassigned' : offDutyDp.id)
                                }
                              }}
                              className={`h-9 px-2 text-xs font-semibold shrink-0 ${
                                currentDraftVal === offDutyDp?.id
                                  ? 'bg-slate-800 text-white dark:bg-slate-700'
                                  : 'text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                              }`}
                              title={currentDraftVal === offDutyDp?.id ? 'Guard is Off Duty' : 'Mark Off Duty'}
                            >
                              <Moon className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          {isModified && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                              ● Pending Save
                            </span>
                          )}
                        </div>
                      ) : assignedInfo ? (
                        (() => {
                          const isOffDuty = assignedInfo.dutyPointName.toLowerCase().includes('off duty')
                          const isOutside = assignedInfo.dutyPointName.toLowerCase().includes('outside')
                          if (isOffDuty) {
                            return (
                              <div className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-2xs text-slate-700 dark:text-slate-300">
                                <Moon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                <span className="font-bold text-xs truncate max-w-[200px]">
                                  Off Duty
                                </span>
                              </div>
                            )
                          }
                          if (isOutside) {
                            return (
                              <div className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 px-3 py-1.5 rounded-xl shadow-2xs text-blue-800 dark:text-blue-300">
                                <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span className="font-bold text-xs truncate max-w-[200px]">
                                  Outside Deployment
                                </span>
                              </div>
                            )
                          }
                          return (
                            <div className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 px-3 py-1.5 rounded-xl shadow-2xs">
                              <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300 truncate max-w-[200px]">
                                {assignedInfo.dutyPointName}
                              </span>
                            </div>
                          )
                        })()
                      ) : (
                        <div className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/70 border border-dashed border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-xs text-slate-500 dark:text-slate-400">
                            {guard.defaultDutyPoint ? `Default: ${guard.defaultDutyPoint.name}` : 'Unassigned'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Guard Photo or Initials Avatar */}
                    <div className="flex justify-center my-1">
                      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-2 border-slate-200 dark:border-slate-700 shadow-xs group-hover:scale-105 transition-transform duration-200 flex items-center justify-center">
                        {guard.photoUrl ? (
                          <img
                            src={guard.photoUrl}
                            alt={guard.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-base text-slate-600 dark:text-slate-300 tracking-wider">
                            {getInitials(guard.fullName)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Name and Badge ID */}
                    <div className="text-center space-y-1">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {guard.fullName}
                      </h3>
                      <div className="inline-block">
                        <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                          {guard.badgeId}
                        </span>
                      </div>
                    </div>

                    {/* Shift & Details */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      {!((assignedInfo?.dutyPointName || guard.defaultDutyPoint?.name || '').toLowerCase().includes('outside')) && (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">Shift Type</span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              guard.shiftType === 'DAY'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                : guard.shiftType === 'NIGHT'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {guard.shiftType === 'DAY' ? (
                              <>
                                <Sun className="w-2.5 h-2.5" /> Day Shift
                              </>
                            ) : guard.shiftType === 'NIGHT' ? (
                              <>
                                <Moon className="w-2.5 h-2.5" /> Night Shift
                              </>
                            ) : (
                              'Both Shifts'
                            )}
                          </span>
                        </div>
                      )}

                      {guard.phone ? (
                        <a
                          href={`tel:${guard.phone}`}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800/60"
                          title="Click to call guard"
                        >
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{guard.phone}</span>
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
            })}
          </div>
        )}

        {/* Floating Dock during Assign Mode */}
        {assignMode && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-2xl p-3 px-5 shadow-2xl border border-slate-700 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-white">Assign Mode</p>
                <p className="text-slate-400">{modifiedGuards.size} modified</p>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-700" />

            <Button
              variant="outline"
              size="sm"
              onClick={autoAssignDefaults}
              className="h-8 text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1.5"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Fill Defaults</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={markAllUnassignedOffDuty}
              className="h-8 text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1.5"
              title="Mark all unassigned guards on this shift as Off Duty"
            >
              <Moon className="w-3.5 h-3.5 text-blue-300" />
              <span className="hidden sm:inline">Mark Unassigned Off Duty</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAssignMode}
              className="h-8 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </Button>

            <Button
              size="sm"
              onClick={saveAssignments}
              disabled={saving || modifiedGuards.size === 0}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : `Save All (${modifiedGuards.size})`}</span>
            </Button>
          </div>
        )}

        {/* Regular Web Footer */}
        <footer className="print:hidden text-center text-xs text-slate-400 dark:text-slate-500 pt-8 pb-4 space-y-1">
          <p className="font-medium">
            Pentecost Convention Centre · Security Operations Unit
          </p>
          <p className="text-[11px]">
            Security Personnel Directory · Gomoa Fetteh Campus
          </p>
        </footer>
      </main>
    </div>
  )
}
