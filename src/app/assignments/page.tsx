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
  Building2,
  RefreshCw,
} from 'lucide-react'
import { PortalNavbar } from '@/components/PortalNavbar'
import { Skeleton } from '@/components/ui/skeleton'

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
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
  const [dailyAssignments, setDailyAssignments] = useState<DailyAssignment[]>([])
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedShift, setSelectedShift] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDutyPointFilter, setSelectedDutyPointFilter] = useState('ALL')
  const [shiftTypeFilter, setShiftTypeFilter] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Fetch shifts on initial mount
  useEffect(() => {
    let isMounted = true

    async function loadShifts() {
      try {
        const res = await fetch('/api/shifts')
        if (res.ok) {
          const data: Shift[] = await res.json()
          if (isMounted) {
            setShifts(data)
            if (data.length > 0) {
              // Default to day shift if available, or first shift
              const day = data.find((s) => s.name.toLowerCase().includes('day'))
              setSelectedShift(day ? day.id : data[0].id)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load shifts:', err)
      }
    }

    loadShifts()
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

  // Unique duty points in current assignments
  const dutyPointsList = useMemo(() => {
    const map = new Map<string, number>()
    dailyAssignments.forEach((a) => {
      const name = a.dutyPoint.name
      map.set(name, (map.get(name) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [dailyAssignments])

  // Filtered assignments with memoization
  const filteredAssignments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return dailyAssignments.filter((assignment) => {
      // Search match
      const matchesSearch =
        q === '' ||
        assignment.guard.fullName.toLowerCase().includes(q) ||
        assignment.guard.badgeId.toLowerCase().includes(q) ||
        assignment.dutyPoint.name.toLowerCase().includes(q) ||
        (assignment.guard.phone && assignment.guard.phone.includes(q))

      // Duty point filter
      const matchesDutyPoint =
        selectedDutyPointFilter === 'ALL' ||
        assignment.dutyPoint.name === selectedDutyPointFilter

      // Shift type filter
      const matchesShiftType =
        shiftTypeFilter === 'ALL' ||
        assignment.guard.shiftType === shiftTypeFilter

      return matchesSearch && matchesDutyPoint && matchesShiftType
    })
  }, [dailyAssignments, searchQuery, selectedDutyPointFilter, shiftTypeFilter])

  // Summary statistics
  const stats = useMemo(() => {
    const dayCount = dailyAssignments.filter((a) => a.guard.shiftType === 'DAY').length
    const nightCount = dailyAssignments.filter((a) => a.guard.shiftType === 'NIGHT').length
    const pointsCount = new Set(dailyAssignments.map((a) => a.dutyPoint.name)).size
    return {
      total: dailyAssignments.length,
      filtered: filteredAssignments.length,
      dayCount,
      nightCount,
      pointsCount,
    }
  }, [dailyAssignments, filteredAssignments.length])

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

  // Print helper
  const handlePrint = () => {
    window.print()
  }

  const selectedShiftObj = shifts.find((s) => s.id === selectedShift)
  const isDayShift = selectedShiftObj?.name.toLowerCase().includes('day') ?? true

  // Get guard initials for avatar fallback
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
      {/* Top Navigation Bar */}
      <div className="print:hidden">
        <PortalNavbar
          currentPage="assignments"
          onPrint={handlePrint}
          extraActions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDailyAssignments(true)}
              disabled={refreshing}
              className="h-9 text-xs border-slate-200 dark:border-slate-800"
              title="Refresh assignments"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline ml-1.5">Refresh</span>
            </Button>
          }
        />
      </div>

      {/* Printable Official Header (Only visible when printing) */}
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
            <p className="text-slate-500 text-[10px] mt-1">Printed: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 print:p-4 print:max-w-none">
        {/* Banner Section */}
        <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white shadow-md">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-blue-100 border border-white/20">
              <Shield className="w-3.5 h-3.5 text-blue-200" />
              <span>Campus Security Operations</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Daily Duty Assignments Portal</h2>
            <p className="text-xs text-blue-200/90 max-w-xl">
              Real-time duty point assignments for security personnel at Pentecost Convention Centre.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={exportCSV}
              variant="secondary"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold gap-1.5 backdrop-blur-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>
            <Button
              onClick={handlePrint}
              variant="secondary"
              size="sm"
              className="bg-white text-blue-900 hover:bg-blue-50 text-xs font-bold gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Duty Sheet</span>
            </Button>
          </div>
        </div>

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

              {/* Duty Point Filter */}
              <div className="lg:col-span-3 space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Duty Point Filter
                </Label>
                <Select value={selectedDutyPointFilter} onValueChange={setSelectedDutyPointFilter}>
                  <SelectTrigger className="h-9 text-xs sm:text-sm bg-slate-50/70 dark:bg-slate-800/60 font-medium">
                    <SelectValue placeholder="All Duty Points" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Duty Points ({dutyPointsList.length})</SelectItem>
                    {dutyPointsList.map(([dpName, count]) => (
                      <SelectItem key={dpName} value={dpName} className="text-xs">
                        {dpName} ({count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Box */}
              <div className="lg:col-span-2 space-y-1.5">
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
                    placeholder="Name, badge..."
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

            {/* Sub-toolbar: Active deployment summary pills & View Mode switcher */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Duty Points Deployment Pills */}
              <div className="flex flex-wrap items-center gap-1.5 max-w-3xl">
                <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  Locations:
                </span>
                <button
                  onClick={() => setSelectedDutyPointFilter('ALL')}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                    selectedDutyPointFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  All ({dailyAssignments.length})
                </button>
                {dutyPointsList.slice(0, 6).map(([name, count]) => (
                  <button
                    key={name}
                    onClick={() => setSelectedDutyPointFilter(name === selectedDutyPointFilter ? 'ALL' : name)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                      selectedDutyPointFilter === name
                        ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                    }`}
                  >
                    {name}: {count}
                  </button>
                ))}
                {dutyPointsList.length > 6 && (
                  <span className="text-[11px] text-slate-400">+{dutyPointsList.length - 6} more</span>
                )}
              </div>

              {/* View Switcher & Shift Filter */}
              <div className="flex items-center gap-2 ml-auto">
                {/* Shift Type Filter */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium">
                  <button
                    onClick={() => setShiftTypeFilter('ALL')}
                    className={`px-2 py-1 rounded-md transition-all ${shiftTypeFilter === 'ALL' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setShiftTypeFilter('DAY')}
                    className={`px-2 py-1 rounded-md transition-all ${shiftTypeFilter === 'DAY' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    Day
                  </button>
                  <button
                    onClick={() => setShiftTypeFilter('NIGHT')}
                    className={`px-2 py-1 rounded-md transition-all ${shiftTypeFilter === 'NIGHT' ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    Night
                  </button>
                </div>

                {/* Grid / Table Toggle */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                    title="Grid Card View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                    title="Compact Table View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operational KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/90 rounded-xl">
            <CardContent className="p-3.5 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Assigned Personnel</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                {stats.total}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {stats.filtered !== stats.total ? `Showing ${stats.filtered}` : 'Active deployment'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/90 rounded-xl">
            <CardContent className="p-3.5 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Day Shift Guards</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight mt-0.5">
                {stats.dayCount}
              </p>
              <p className="text-[10px] text-blue-500/80 dark:text-blue-400/80 mt-0.5">06:00 - 18:00</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/90 rounded-xl">
            <CardContent className="p-3.5 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Night Shift Guards</p>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight mt-0.5">
                {stats.nightCount}
              </p>
              <p className="text-[10px] text-purple-500/80 dark:text-purple-400/80 mt-0.5">18:00 - 06:00</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/90 rounded-xl">
            <CardContent className="p-3.5 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Duty Points Manned</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5">
                {stats.pointsCount}
              </p>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Campus posts</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Section: Skeletons, Empty State, Grid or Table */}
        {loading ? (
          /* High-fidelity Skeleton Loaders */
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
        ) : filteredAssignments.length === 0 ? (
          /* Empty State */
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
                  {searchQuery || selectedDutyPointFilter !== 'ALL' || shiftTypeFilter !== 'ALL'
                    ? 'No assignments matched your search and filter criteria. Try resetting filters.'
                    : `No guard assignments have been scheduled for ${new Date(selectedDate).toLocaleDateString()} on the selected shift.`}
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
                    <th className="py-3 px-4">Assigned Duty Point</th>
                    <th className="py-3 px-4">Security Guard</th>
                    <th className="py-3 px-4">Badge ID</th>
                    <th className="py-3 px-4">Shift Type</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAssignments.map((assignment, index) => (
                    <tr
                      key={assignment.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-slate-400">{index + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 font-semibold">
                          <MapPin className="w-3 h-3 shrink-0 text-emerald-600" />
                          <span>{assignment.dutyPoint.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-600 dark:text-slate-300">
                            {assignment.guard.photoUrl ? (
                              <img
                                src={assignment.guard.photoUrl}
                                alt={assignment.guard.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getInitials(assignment.guard.fullName)
                            )}
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {assignment.guard.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">
                          {assignment.guard.badgeId}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            assignment.guard.shiftType === 'DAY'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : assignment.guard.shiftType === 'NIGHT'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {assignment.guard.shiftType === 'DAY' ? (
                            <>
                              <Sun className="w-2.5 h-2.5" /> Day (DS)
                            </>
                          ) : assignment.guard.shiftType === 'NIGHT' ? (
                            <>
                              <Moon className="w-2.5 h-2.5" /> Night (NS)
                            </>
                          ) : (
                            'Both Shifts'
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {assignment.guard.phone ? (
                          <a
                            href={`tel:${assignment.guard.phone}`}
                            className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-mono"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            {assignment.guard.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {assignment.guard.phone && (
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          >
                            <a href={`tel:${assignment.guard.phone}`}>
                              <Phone className="w-3 h-3 mr-1" />
                              Call
                            </a>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Modern Card Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAssignments.map((assignment) => (
              <Card
                key={assignment.id}
                className="group border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 bg-white dark:bg-slate-900/90 rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                <CardContent className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                  {/* Top Duty Point Highlight */}
                  <div className="text-center">
                    <div className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 px-3 py-1.5 rounded-xl shadow-2xs">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300 truncate max-w-[200px]">
                        {assignment.dutyPoint.name}
                      </span>
                    </div>
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

                  {/* Shift Badge & Contact Info */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
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
            ))}
          </div>
        )}

        {/* Printable Official Sign-Off Footer (Only in print) */}
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
            Daily Duty Assignments Portal · Real-time operational data
          </p>
        </footer>
      </main>
    </div>
  )
}
