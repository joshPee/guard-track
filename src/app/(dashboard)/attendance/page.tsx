'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionCard } from '@/components/ui/section-card'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useSession } from 'next-auth/react'
import {
  Shield, CheckCircle, XCircle, AlertCircle,
  Search, Clock, UserCheck, X, Zap, Download,
  BookOpen, ListFilter, Check, ArrowRight, UserX,
  Sparkles, Layers, Coffee, FileBadge, Stethoscope,
  ArrowUpDown, ArrowDownAZ, ChevronsUp,
} from 'lucide-react'
import { toast } from '@/components/ui/toast'

interface Guard {
  id: string
  fullName: string
  badgeId: string
  defaultDutyPoint: { id: string; name: string } | null
}

interface DutyPoint {
  id: string
  name: string
}

interface AttendanceRow {
  guardId: string
  guardName: string
  badgeId: string
  dutyPointId: string
  signInTime: string
  status: string
  remarks: string
}

interface RecentBookEntry {
  guardName: string
  badgeId: string
  dutyPointName: string
  signInTime: string
  status: string
  timestamp: string
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
  LATE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
  ABSENT: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800',
  OFF: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
  LEAVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-800',
  EXCUSED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-800',
}

export default function AttendancePage() {
  const { data: session } = useSession()

  // Main roster state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [shift, setShift] = useState('day-shift')
  const [guards, setGuards] = useState<Guard[]>([])
  const [dutyPoints, setDutyPoints] = useState<DutyPoint[]>([])
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PRESENT' | 'LATE' | 'ABSENT' | 'OFF' | 'EXCUSED' | 'LEAVE'>('ALL')
  const [shiftTypeFilter, setShiftTypeFilter] = useState<'ALL' | 'DS' | 'NS'>('ALL')
  const [rosterSearch, setRosterSearch] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [sortMode, setSortMode] = useState<'alpha' | 'status' | 'pending'>('alpha')
  const [selectedGuardIds, setSelectedGuardIds] = useState<Set<string>>(new Set())

  // View Mode: 'book-mode' for rapid mobile physical book entry, 'roster-mode' for full roster
  const [activeTab, setActiveTab] = useState<'book-mode' | 'roster-mode'>('book-mode')

  // Rapid Book Entry Form State
  const [bookSearch, setBookSearch] = useState('')
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null)
  const [bookDutyPointId, setBookDutyPointId] = useState('')
  const [bookTime, setBookTime] = useState(shift === 'day-shift' ? '06:00' : '18:00')
  const [bookStatus, setBookStatus] = useState('PRESENT')
  const [bookRemarks, setBookRemarks] = useState('')
  const [recentEntries, setRecentEntries] = useState<RecentBookEntry[]>([])
  const [bookSaving, setBookSaving] = useState(false)
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchGuards()
    fetchDutyPoints()
  }, [])

  useEffect(() => {
    if (guards.length > 0 && dutyPoints.length > 0) {
      loadRoster()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guards.length, dutyPoints.length, date, shift])

  // Update default book time when shift changes
  useEffect(() => {
    setBookTime(shift === 'day-shift' ? '06:00' : '18:00')
  }, [shift])

  // Close search dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchGuards = async () => {
    try {
      const res = await fetch('/api/guards')
      if (res.ok) {
        const data = await res.json()
        setGuards(data)
      }
    } catch (e) { console.error(e) }
  }

  const fetchDutyPoints = async () => {
    try {
      const res = await fetch('/api/duty-points')
      if (res.ok) {
        const data = await res.json()
        setDutyPoints(data)
      }
    } catch (e) { console.error(e) }
  }

  const loadRoster = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/attendance?date=${date}&shiftId=${shift}`)
      if (res.ok) {
        const records = await res.json()
        const rows: AttendanceRow[] = guards.map((guard) => {
          const existing = records.find((r: any) => r.guardId === guard.id)
          return {
            guardId: guard.id,
            guardName: guard.fullName,
            badgeId: guard.badgeId,
            dutyPointId: existing?.dutyPointId || guard.defaultDutyPoint?.id || dutyPoints[0]?.id || '',
            signInTime: existing?.signInTime ? new Date(existing.signInTime).toISOString().slice(11, 16) : '',
            status: existing?.status || 'ABSENT',
            remarks: existing?.remarks || '',
          }
        })
        setAttendanceRows(rows)
        setHasChanges(false)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Row update helper for roster view
  const updateRow = (index: number, field: keyof AttendanceRow, value: string) => {
    const newRows = [...attendanceRows]
    newRows[index][field] = value
    if (field === 'status' && (value === 'PRESENT' || value === 'LATE') && !newRows[index].signInTime) {
      newRows[index].signInTime = shift === 'day-shift' ? '06:00' : '18:00'
    }
    if (field === 'signInTime' && value) {
      // Auto adjust status if time set
      const cutoff = shift === 'day-shift' ? '06:15' : '18:15'
      newRows[index].status = value <= cutoff ? 'PRESENT' : 'LATE'
    }
    setAttendanceRows(newRows)
    setHasChanges(true)
  }

  // Determine shift type based on sign-in time
  const getShiftType = (signInTime: string): 'DS' | 'NS' | null => {
    if (!signInTime) return null
    const [hours] = signInTime.split(':').map(Number)
    // Day shift: 06:00 - 17:59
    // Night shift: 18:00 - 05:59
    if (hours >= 6 && hours < 18) return 'DS'
    return 'NS'
  }

  const markRowPresent = (index: number, presetTime?: string) => {
    const newRows = [...attendanceRows]
    newRows[index].status = 'PRESENT'
    newRows[index].signInTime = presetTime || (shift === 'day-shift' ? '06:00' : '18:00')
    setAttendanceRows(newRows)
    setHasChanges(true)
  }

  const markRowLate = (index: number, presetTime?: string) => {
    const newRows = [...attendanceRows]
    newRows[index].status = 'LATE'
    newRows[index].signInTime = presetTime || (shift === 'day-shift' ? '06:20' : '18:20')
    setAttendanceRows(newRows)
    setHasChanges(true)
  }

  const markRowAbsent = (index: number) => {
    const newRows = [...attendanceRows]
    newRows[index].status = 'ABSENT'
    newRows[index].signInTime = ''
    setAttendanceRows(newRows)
    setHasChanges(true)
  }

  const markRowOff = (index: number) => {
    const newRows = [...attendanceRows]
    newRows[index].status = 'OFF'
    newRows[index].signInTime = ''
    if (!newRows[index].remarks) newRows[index].remarks = 'Roster Off Day'
    setAttendanceRows(newRows)
    setHasChanges(true)
  }

  const markRowExcused = (index: number) => {
    const newRows = [...attendanceRows]
    newRows[index].status = 'EXCUSED'
    newRows[index].signInTime = ''
    if (!newRows[index].remarks) newRows[index].remarks = 'Excuse Duty (Illness / Hospital Permit)'
    setAttendanceRows(newRows)
    setHasChanges(true)
  }

  const markRowLeave = (index: number) => {
    const newRows = [...attendanceRows]
    newRows[index].status = 'LEAVE'
    newRows[index].signInTime = ''
    if (!newRows[index].remarks) newRows[index].remarks = 'Casual Leave / Exeat Form Approved'
    setAttendanceRows(newRows)
    setHasChanges(true)
  }

  // Select guard for Book Entry
  const handleSelectGuardForBook = (guard: Guard) => {
    setSelectedGuard(guard)
    setBookSearch(guard.fullName)
    setSearchDropdownOpen(false)

    // Prepopulate duty point from guard profile or current row
    const existingRow = attendanceRows.find(r => r.guardId === guard.id)
    if (existingRow && existingRow.dutyPointId) {
      setBookDutyPointId(existingRow.dutyPointId)
      if (existingRow.signInTime) setBookTime(existingRow.signInTime)
      if (existingRow.status) setBookStatus(existingRow.status)
      if (existingRow.remarks) setBookRemarks(existingRow.remarks)
    } else {
      setBookDutyPointId(guard.defaultDutyPoint?.id || dutyPoints[0]?.id || '')
      setBookTime(shift === 'day-shift' ? '06:00' : '18:00')
      setBookStatus('PRESENT')
      setBookRemarks('')
    }
  }

  // Rapid Quick-Time chip handler
  const handlePresetTimeClick = (timeStr: string) => {
    setBookTime(timeStr)
    const cutoff = shift === 'day-shift' ? '06:15' : '18:15'
    if (timeStr <= cutoff) {
      setBookStatus('PRESENT')
    } else {
      setBookStatus('LATE')
    }
  }

  // Submit single line from physical book
  const handleBookEntrySubmit = async () => {
    if (!selectedGuard) {
      toast.error('Please select a guard from the book first')
      searchInputRef.current?.focus()
      return
    }

    setBookSaving(true)
    try {
      const dutyPointToUse = bookDutyPointId || selectedGuard.defaultDutyPoint?.id || dutyPoints[0]?.id || ''
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardId: selectedGuard.id,
          shiftId: shift,
          dutyPointId: dutyPointToUse,
          shiftDate: date,
          signInTime: bookTime ? `${date}T${bookTime}` : null,
          status: bookStatus,
          minutesLate: 0,
          remarks: bookRemarks,
        }),
      })

      if (res.ok) {
        const dpName = dutyPoints.find(d => d.id === dutyPointToUse)?.name || 'Duty Point'

        // Update local roster row immediately without waiting
        setAttendanceRows(prev => prev.map(r => {
          if (r.guardId === selectedGuard.id) {
            return {
              ...r,
              dutyPointId: dutyPointToUse,
              signInTime: bookTime,
              status: bookStatus,
              remarks: bookRemarks,
            }
          }
          return r
        }))

        // Add to recent physical book log feed
        setRecentEntries(prev => [
          {
            guardName: selectedGuard.fullName,
            badgeId: selectedGuard.badgeId,
            dutyPointName: dpName,
            signInTime: bookTime,
            status: bookStatus,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev.slice(0, 9)
        ])

        toast.success(`✓ Logged: ${selectedGuard.fullName} at ${bookTime}`)

        // Reset for next book row and autofocus search
        setSelectedGuard(null)
        setBookSearch('')
        setBookRemarks('')
        setBookTime(shift === 'day-shift' ? '06:00' : '18:00')
        setBookStatus('PRESENT')
        setTimeout(() => {
          searchInputRef.current?.focus()
        }, 50)
      } else {
        toast.error('Could not save attendance entry')
      }
    } catch (e) {
      toast.error('Network error saving entry')
    } finally {
      setBookSaving(false)
    }
  }

  // Fast Batch Save
  const saveAllAttendance = async () => {
    setSaving(true)
    try {
      // Parallel batch save for speed
      const promises = attendanceRows.map(row =>
        fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guardId: row.guardId,
            shiftId: shift,
            dutyPointId: row.dutyPointId,
            shiftDate: date,
            signInTime: row.signInTime ? `${date}T${row.signInTime}` : null,
            status: row.status,
            minutesLate: 0,
            remarks: row.remarks,
          }),
        })
      )
      await Promise.all(promises)
      setHasChanges(false)
      setSuccessMsg('All attendance records successfully saved!')
      toast.success('Roster saved successfully')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (e) {
      toast.error('Error saving attendance records')
    } finally {
      setSaving(false)
    }
  }

  // Convenience helper: mark all unlogged guards as ABSENT
  const markUnrecordedAsAbsent = () => {
    const unrecordedCount = attendanceRows.filter(r => !r.signInTime || r.status === 'ABSENT').length
    if (unrecordedCount === 0) {
      toast.info('All guards have already been logged')
      return
    }

    setAttendanceRows(prev => prev.map(row => {
      if (!row.signInTime || row.status === 'ABSENT') {
        return {
          ...row,
          status: 'ABSENT',
          signInTime: '',
          remarks: row.remarks || 'Did not report / unrecorded in logbook',
        }
      }
      return row
    }))
    setHasChanges(true)
    toast.success(`Marked remaining ${unrecordedCount} guards as Absent`)
  }

  // Convenience helper: Mark all on-time
  const setAllToShiftStart = () => {
    setAttendanceRows(attendanceRows.map(row => ({
      ...row,
      signInTime: shift === 'day-shift' ? '06:00' : '18:00',
      status: 'PRESENT',
    })))
    setHasChanges(true)
    toast.success('All guards marked Present at shift start')
  }

  // Bulk operations
  const toggleSelectGuard = (guardId: string) => {
    setSelectedGuardIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(guardId)) {
        newSet.delete(guardId)
      } else {
        newSet.add(guardId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedGuardIds.size === filteredRows.length) {
      setSelectedGuardIds(new Set())
    } else {
      setSelectedGuardIds(new Set(filteredRows.map(r => r.guardId)))
    }
  }

  const bulkMarkPresent = () => {
    setAttendanceRows(prev => prev.map(row => {
      if (selectedGuardIds.has(row.guardId)) {
        return {
          ...row,
          status: 'PRESENT',
          signInTime: shift === 'day-shift' ? '06:00' : '18:00',
        }
      }
      return row
    }))
    setHasChanges(true)
    toast.success(`Marked ${selectedGuardIds.size} guards as Present`)
    setSelectedGuardIds(new Set())
  }

  const bulkMarkLate = () => {
    setAttendanceRows(prev => prev.map(row => {
      if (selectedGuardIds.has(row.guardId)) {
        return {
          ...row,
          status: 'LATE',
          signInTime: shift === 'day-shift' ? '06:20' : '18:20',
        }
      }
      return row
    }))
    setHasChanges(true)
    toast.success(`Marked ${selectedGuardIds.size} guards as Late`)
    setSelectedGuardIds(new Set())
  }

  const bulkMarkAbsent = () => {
    setAttendanceRows(prev => prev.map(row => {
      if (selectedGuardIds.has(row.guardId)) {
        return {
          ...row,
          status: 'ABSENT',
          signInTime: '',
        }
      }
      return row
    }))
    setHasChanges(true)
    toast.success(`Marked ${selectedGuardIds.size} guards as Absent`)
    setSelectedGuardIds(new Set())
  }

  const bulkMarkOff = () => {
    setAttendanceRows(prev => prev.map(row => {
      if (selectedGuardIds.has(row.guardId)) {
        return {
          ...row,
          status: 'OFF',
          signInTime: '',
          remarks: row.remarks || 'Roster Off Day',
        }
      }
      return row
    }))
    setHasChanges(true)
    toast.success(`Marked ${selectedGuardIds.size} guards as Off`)
    setSelectedGuardIds(new Set())
  }

  const bulkAssignDutyPoint = (dutyPointId: string) => {
    setAttendanceRows(prev => prev.map(row => {
      if (selectedGuardIds.has(row.guardId)) {
        return {
          ...row,
          dutyPointId,
        }
      }
      return row
    }))
    setHasChanges(true)
    const dpName = dutyPoints.find(dp => dp.id === dutyPointId)?.name || 'Duty Point'
    toast.success(`Assigned ${selectedGuardIds.size} guards to ${dpName}`)
    setSelectedGuardIds(new Set())
  }

  // Export CSV
  const exportCurrentRosterCSV = () => {
    if (attendanceRows.length === 0) {
      toast.warning('No attendance roster rows to export.')
      return
    }
    try {
      const headers = ['Guard Name', 'Badge ID', 'Duty Point', 'Sign In Time', 'Status', 'Remarks']
      const rows = attendanceRows.map(r => {
        const dp = dutyPoints.find(d => d.id === r.dutyPointId)?.name || 'Unassigned'
        return [
          `"${r.guardName}"`,
          `"${r.badgeId}"`,
          `"${dp}"`,
          `"${r.signInTime || 'N/A'}"`,
          `"${r.status}"`,
          `"${r.remarks || ''}"`
        ]
      })
      const csvContent = [
        `PCC Security Department - Shift Attendance Roster`,
        `Date: ${date}, Shift: ${shift === 'day-shift' ? 'Day Shift (06:00-18:00)' : 'Night Shift (18:00-06:00)'}`,
        `Total Guards: ${attendanceRows.length}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `attendance-roster-${date}-${shift}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Roster exported to CSV file successfully.')
    } catch (e) {
      toast.error('Failed to export CSV file.')
    }
  }

  const isSupervisor = session?.user?.role === 'SUPERVISOR'

  // Dynamic shift presets
  const timePresets = shift === 'day-shift'
    ? ['05:45', '05:50', '05:55', '06:00', '06:05', '06:10', '06:15', '06:30']
    : ['17:45', '17:50', '17:55', '18:00', '18:05', '18:10', '18:15', '18:30']

  // Unlogged guards pool (guards whose sign-in is not recorded yet)
  const unloggedGuards = guards.filter(g => {
    const row = attendanceRows.find(r => r.guardId === g.id)
    return !row || !row.signInTime || row.status === 'ABSENT'
  })

  // Filtered dropdown guards for book search
  const filteredSearchGuards = bookSearch.trim().length > 0
    ? guards.filter(g =>
      g.fullName.toLowerCase().includes(bookSearch.toLowerCase()) ||
      g.badgeId.toLowerCase().includes(bookSearch.toLowerCase())
    ).slice(0, 8)
    : []

  // Filtered roster rows for list view
  const filteredRows = (() => {
    const STATUS_SORT_ORDER: Record<string, number> = {
      PRESENT: 0, LATE: 1, ABSENT: 2, OFF: 3, LEAVE: 4, EXCUSED: 5,
    }

    const baseFiltered = attendanceRows.filter(row => {
      const matchesSearch = rosterSearch.trim() === '' ||
        row.guardName.toLowerCase().includes(rosterSearch.toLowerCase()) ||
        row.badgeId.toLowerCase().includes(rosterSearch.toLowerCase())

      let matchesStatus = true
      if (statusFilter === 'PRESENT') matchesStatus = row.status === 'PRESENT'
      else if (statusFilter === 'LATE') matchesStatus = row.status === 'LATE'
      else if (statusFilter === 'ABSENT') matchesStatus = row.status === 'ABSENT'
      else if (statusFilter === 'OFF') matchesStatus = row.status === 'OFF'
      else if (statusFilter === 'EXCUSED') matchesStatus = row.status === 'EXCUSED'
      else if (statusFilter === 'LEAVE') matchesStatus = row.status === 'LEAVE'
      else if (statusFilter === 'PENDING') matchesStatus = !row.signInTime && row.status !== 'OFF' && row.status !== 'EXCUSED' && row.status !== 'LEAVE'

      let matchesShiftType = true
      if (shiftTypeFilter === 'DS') matchesShiftType = getShiftType(row.signInTime) === 'DS'
      else if (shiftTypeFilter === 'NS') matchesShiftType = getShiftType(row.signInTime) === 'NS'

      return matchesSearch && matchesStatus && matchesShiftType
    })

    // Apply sort
    if (sortMode === 'alpha') {
      return [...baseFiltered].sort((a, b) => a.guardName.localeCompare(b.guardName))
    } else if (sortMode === 'status') {
      return [...baseFiltered].sort((a, b) =>
        (STATUS_SORT_ORDER[a.status] ?? 9) - (STATUS_SORT_ORDER[b.status] ?? 9)
      )
    } else {
      // pending first: unrecorded (no sign-in and still ABSENT) come first
      return [...baseFiltered].sort((a, b) => {
        const aPending = !a.signInTime && a.status !== 'OFF' && a.status !== 'EXCUSED' && a.status !== 'LEAVE' ? 0 : 1
        const bPending = !b.signInTime && b.status !== 'OFF' && b.status !== 'EXCUSED' && b.status !== 'LEAVE' ? 0 : 1
        return aPending - bPending || a.guardName.localeCompare(b.guardName)
      })
    }
  })()

  // Aggregate statistics
  const stats = {
    total: attendanceRows.length,
    present: attendanceRows.filter(r => r.status === 'PRESENT').length,
    late: attendanceRows.filter(r => r.status === 'LATE').length,
    absent: attendanceRows.filter(r => r.status === 'ABSENT').length,
    off: attendanceRows.filter(r => r.status === 'OFF').length,
    excused: attendanceRows.filter(r => r.status === 'EXCUSED').length,
    leave: attendanceRows.filter(r => r.status === 'LEAVE').length,
    recorded: attendanceRows.filter(r => (r.signInTime && r.status !== 'ABSENT') || r.status === 'OFF' || r.status === 'EXCUSED' || r.status === 'LEAVE').length,
    pending: attendanceRows.filter(r => (!r.signInTime && r.status === 'ABSENT') || (!r.signInTime && r.status !== 'OFF' && r.status !== 'EXCUSED' && r.status !== 'LEAVE')).length,
  }

  const completionPct = stats.total > 0 ? Math.round((stats.recorded / stats.total) * 100) : 0

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Operations' },
          { label: 'Attendance Register' },
        ]}
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      {/* Page Header */}
      <PageHeader
        icon={Shield}
        title="Attendance Register"
        description="Fast logbook digitizer and shift attendance roster"
        color="blue"
        stats={[
          { label: 'Total Guards', value: stats.total },
          { label: 'Logged In', value: `${stats.recorded}/${stats.total}` },
          { label: 'Present', value: stats.present },
          { label: 'Late', value: stats.late },
          { label: 'Off / Leave', value: stats.off + stats.leave + stats.excused },
          { label: 'Pending', value: stats.pending, highlight: stats.pending > 0 },
        ]}
      />

      {/* Date & Shift Bar with View Toggle */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3">
            {/* Shift & Date Controls */}
            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3 flex-1">
              <div className="flex-1">
                <Label htmlFor="date" className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 text-sm font-medium"
                />
              </div>

              <div className="flex-1">
                <Label htmlFor="shift" className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                  Shift
                </Label>
                <Select value={shift} onValueChange={setShift}>
                  <SelectTrigger id="shift" className="h-10 text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day-shift">Day (06:00 – 18:00)</SelectItem>
                    <SelectItem value="night-shift">Night (18:00 – 06:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* View Switcher Tabs (Book Entry vs Full Roster) */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 self-stretch sm:self-end">
              <button
                type="button"
                onClick={() => setActiveTab('book-mode')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'book-mode'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Book Logger</span>
                <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                  Fast
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('roster-mode')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'roster-mode'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Roster ({attendanceRows.length})</span>
              </button>
            </div>
          </div>

          {/* Progress Tracker Bar */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Logbook Progress:
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {stats.recorded}/{stats.total} guards ({completionPct}%)
              </span>
            </div>
            <div className="w-36 sm:w-48 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* MODE 1: RAPID PHYSICAL BOOK LOGGER (Optimized for one-by-one book entry)  */}
      {/* ========================================================================= */}
      {activeTab === 'book-mode' && (
        <div className="space-y-4">
          <Card className="border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/40 via-white to-slate-50 dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 shadow-md">
            <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Physical Logbook Entry
                    </CardTitle>
                    <p className="text-xs text-slate-500">
                      Sequential entry directly from the paper attendance book
                    </p>
                  </div>
                </div>

                {isSupervisor && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markUnrecordedAsAbsent}
                    disabled={stats.pending === 0}
                    className="text-xs h-8 text-rose-600 dark:text-rose-400 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
                    title="Mark anyone who did not write their name as absent"
                  >
                    <UserX className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Finished Book? Mark Rest Absent ({stats.pending})</span>
                    <span className="sm:hidden">Rest Absent ({stats.pending})</span>
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* STEP 1: Guard Selector / Quick Tap Bar */}
              <div className="space-y-1.5" ref={dropdownRef}>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    1. Guard Name / Badge (from book row)
                  </Label>
                  {selectedGuard && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Selected: {selectedGuard.fullName}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    ref={searchInputRef}
                    className="pl-10 pr-9 h-12 text-sm sm:text-base font-medium rounded-xl border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 shadow-sm"
                    placeholder="Type guard name or badge ID (e.g. John, GT-002)..."
                    value={bookSearch}
                    onChange={(e) => {
                      setBookSearch(e.target.value)
                      setSearchDropdownOpen(true)
                      if (selectedGuard && e.target.value !== selectedGuard.fullName) {
                        setSelectedGuard(null)
                      }
                    }}
                    onFocus={() => setSearchDropdownOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (filteredSearchGuards.length > 0 && !selectedGuard) {
                          handleSelectGuardForBook(filteredSearchGuards[0])
                        } else if (selectedGuard) {
                          handleBookEntrySubmit()
                        }
                      }
                    }}
                  />
                  {bookSearch && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                      onClick={() => {
                        setSelectedGuard(null)
                        setBookSearch('')
                        searchInputRef.current?.focus()
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Instant Search Dropdown */}
                {searchDropdownOpen && filteredSearchGuards.length > 0 && !selectedGuard && (
                  <div className="relative z-50">
                    <div className="absolute top-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                      {filteredSearchGuards.map((g) => {
                        const isAlreadyLogged = attendanceRows.find(r => r.guardId === g.id && r.signInTime && r.status !== 'ABSENT')
                        return (
                          <button
                            key={g.id}
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-between transition-colors"
                            onClick={() => handleSelectGuardForBook(g)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold">
                                {g.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{g.fullName}</p>
                                <p className="text-xs text-slate-500">
                                  {g.badgeId} · {g.defaultDutyPoint?.name || 'Default Duty Point'}
                                </p>
                              </div>
                            </div>
                            {isAlreadyLogged ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                                Logged ({isAlreadyLogged.signInTime})
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                Select <ArrowRight className="h-3 w-3" />
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Unlogged Guards Scrollable Chips (Saves typing on phone!) */}
                {unloggedGuards.length > 0 && (
                  <div className="pt-1.5">
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      Tap an unlogged guard to fill immediately ({unloggedGuards.length} remaining):
                    </p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      {unloggedGuards.slice(0, 10).map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => handleSelectGuardForBook(g)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium flex-shrink-0 transition-all ${selectedGuard?.id === g.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                            }`}
                        >
                          {g.fullName.split(' ')[0]} ({g.badgeId})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: Duty Point Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  2. Duty Point / Post
                </Label>
                <Select value={bookDutyPointId} onValueChange={setBookDutyPointId}>
                  <SelectTrigger className="h-11 text-sm font-medium rounded-xl">
                    <SelectValue placeholder="Select duty point..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {dutyPoints.map((dp, idx) => (
                      <SelectItem key={dp.id} value={dp.id}>
                        #{String(idx + 1).padStart(2, '0')} · {dp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* STEP 3: Sign-In Time with Instant One-Tap Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    3. Sign-In Time (Written in Book)
                  </Label>
                  <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">
                    Selected: {bookTime}
                  </span>
                </div>

                {/* Big One-Tap Time Buttons (Critical for Mobile!) */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {timePresets.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handlePresetTimeClick(t)}
                      className={`py-2 px-1 text-center font-mono text-xs font-bold rounded-lg transition-all ${bookTime === t
                          ? 'bg-blue-600 text-white shadow ring-2 ring-blue-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Manual Time Input fallback */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="time"
                      value={bookTime}
                      onChange={(e) => {
                        setBookTime(e.target.value)
                        const cutoff = shift === 'day-shift' ? '06:15' : '18:15'
                        setBookStatus(e.target.value <= cutoff ? 'PRESENT' : 'LATE')
                      }}
                      className="pl-9 h-10 text-sm font-mono rounded-lg"
                    />
                  </div>

                  {/* One-tap "Now" button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date().toTimeString().slice(0, 5)
                      handlePresetTimeClick(now)
                    }}
                    className="h-10 text-xs px-3 font-semibold"
                  >
                    Use Now
                  </Button>
                </div>
              </div>

              {/* STEP 4: Status Selector (Large Touch Targets with Off, Excused & Exeat/Leave) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  4. Attendance Status
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBookStatus('PRESENT')}
                    className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${bookStatus === 'PRESENT'
                        ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Present
                  </button>

                  <button
                    type="button"
                    onClick={() => setBookStatus('LATE')}
                    className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${bookStatus === 'LATE'
                        ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400'
                        : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                  >
                    <AlertCircle className="h-4 w-4" />
                    Late
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBookStatus('ABSENT')
                      setBookTime('')
                    }}
                    className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${bookStatus === 'ABSENT'
                        ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400'
                        : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}
                  >
                    <XCircle className="h-4 w-4" />
                    Absent
                  </button>
                </div>

                {/* Additional Special Authorized Status Toggles */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setBookStatus('OFF')
                      setBookTime('')
                      if (!bookRemarks) setBookRemarks('Roster Off Day')
                    }}
                    className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${bookStatus === 'OFF'
                        ? 'bg-slate-700 text-white shadow-md ring-2 ring-slate-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                      }`}
                    title="Regular scheduled off-duty day"
                  >
                    <Coffee className="h-3.5 w-3.5" />
                    Off Day
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBookStatus('EXCUSED')
                      setBookTime('')
                      if (!bookRemarks) setBookRemarks('Excuse Duty: Illness / Medical')
                    }}
                    className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${bookStatus === 'EXCUSED'
                        ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400'
                        : 'bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      }`}
                    title="Excuse duty due to sickness or clinic visit"
                  >
                    <Stethoscope className="h-3.5 w-3.5" />
                    Excuse Duty
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBookStatus('LEAVE')
                      setBookTime('')
                      if (!bookRemarks) setBookRemarks('On Exeat / Casual Leave')
                    }}
                    className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${bookStatus === 'LEAVE'
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400'
                        : 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}
                    title="Approved Exeat or casual leave"
                  >
                    <FileBadge className="h-3.5 w-3.5" />
                    On Exeat
                  </button>
                </div>
              </div>

              {/* Optional Remarks input (shows prompt for exeat number or medical note) */}
              <div className="space-y-1">
                <Label htmlFor="bookRemarks" className="text-xs text-slate-500 flex items-center justify-between">
                  <span>Remarks / Notes / Exeat Form Ref</span>
                  {(bookStatus === 'LEAVE' || bookStatus === 'EXCUSED') && (
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      Include Exeat Form # or Clinic Note
                    </span>
                  )}
                </Label>
                <Input
                  id="bookRemarks"
                  value={bookRemarks}
                  onChange={(e) => setBookRemarks(e.target.value)}
                  placeholder={
                    bookStatus === 'LEAVE'
                      ? 'e.g. Exeat Form #EF-042, Emergency travel...'
                      : bookStatus === 'EXCUSED'
                        ? 'e.g. Excuse duty slip from PCC Clinic, malaria...'
                        : 'e.g. Relieved Guard Kofi, Gate duty...'
                  }
                  className="h-9 text-xs rounded-lg"
                />
              </div>

              {/* STEP 5: Big "Record Entry & Next Guard" Action Button */}
              <div className="pt-2">
                <Button
                  onClick={handleBookEntrySubmit}
                  disabled={!selectedGuard || bookSaving}
                  className="w-full h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                >
                  <UserCheck className="h-5 w-5" />
                  {bookSaving ? (
                    'Recording Entry...'
                  ) : selectedGuard ? (
                    `Save "${selectedGuard.fullName}" & Next Line (↵)`
                  ) : (
                    'Select Guard to Record'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* RECENTLY LOGGED ENTRIES (Live Cross-Check with the Physical Book) */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="py-3 px-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Live Logbook Feed ({recentEntries.length} just logged)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Matches your paper book order
              </span>
            </CardHeader>

            <CardContent className="p-3 sm:p-4">
              {recentEntries.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No book entries logged in this session yet. Type a guard name above to start.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-mono font-bold text-slate-400 w-5 text-right">
                          #{recentEntries.length - idx}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {entry.guardName}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {entry.badgeId} · {entry.dutyPointName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {entry.signInTime || 'N/A'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[entry.status] || ''}`}>
                          {entry.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: FULL ROSTER (Responsive Mobile Cards + Desktop Table)             */}
      {/* ========================================================================= */}
      {activeTab === 'roster-mode' && (
        <Card className="animate-fade-in-up border-slate-200 dark:border-slate-800">
          <CardHeader className="p-4 sm:p-6 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <CardTitle className="text-base sm:text-lg">Shift Attendance Roster</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {filteredRows.length} of {attendanceRows.length} guards for this shift
              </p>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              {/* Select All Checkbox */}
              {isSupervisor && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="h-9 px-3 flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedGuardIds.size === filteredRows.length && filteredRows.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                    {selectedGuardIds.size === filteredRows.length && filteredRows.length > 0 && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <span className="hidden sm:inline">Select All</span>
                </button>
              )}

              {/* Search roster — with clear button */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  className="pl-8 pr-8 w-full sm:w-52 h-9 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                  placeholder="Search guard or badge ID..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                />
                {rosterSearch && (
                  <button
                    type="button"
                    onClick={() => setRosterSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Sort cycle button */}
              <button
                type="button"
                onClick={() => setSortMode(m => m === 'alpha' ? 'status' : m === 'status' ? 'pending' : 'alpha')}
                title={`Sort: ${sortMode === 'alpha' ? 'A→Z' : sortMode === 'status' ? 'By Status' : 'Pending First'}`}
                className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                {sortMode === 'alpha' ? (
                  <><span className="text-slate-400 text-[10px]">A→Z</span><span>Alpha</span></>
                ) : sortMode === 'status' ? (
                  <><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /><span>By Status</span></>
                ) : (
                  <><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /><span>Pending First</span></>
                )}
              </button>

              {/* Export CSV button */}
              <Button
                variant="outline"
                size="sm"
                onClick={exportCurrentRosterCSV}
                disabled={attendanceRows.length === 0}
                className="h-9 text-xs gap-1.5"
                title="Export shift roster to CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span> CSV
              </Button>

              {isSupervisor && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={setAllToShiftStart}
                    className="h-9 text-xs"
                    title="Mark all guards as present at shift start"
                  >
                    All On-Time
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveAllAttendance}
                    disabled={!hasChanges || saving}
                    className={`h-9 text-xs font-semibold ${hasChanges
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        : ''
                      }`}
                  >
                    {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved ✓'}
                  </Button>
                </>
              )}
            </div>
          </CardHeader>

          {/* Status Filter Chips — colour-coded with live count badges */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1 flex-shrink-0 uppercase tracking-wider">
                <ListFilter className="h-3 w-3" /> Filter:
              </span>
              {(
                [
                  { key: 'ALL', label: 'All', count: stats.total, activeCls: 'bg-blue-600 text-white', dot: '' },
                  { key: 'PENDING', label: 'Pending', count: stats.pending, activeCls: 'bg-amber-500 text-white', dot: 'bg-amber-400' },
                  { key: 'PRESENT', label: 'Present', count: stats.present, activeCls: 'bg-emerald-600 text-white', dot: 'bg-emerald-500' },
                  { key: 'LATE', label: 'Late', count: stats.late, activeCls: 'bg-amber-600 text-white', dot: 'bg-amber-500' },
                  { key: 'ABSENT', label: 'Absent', count: stats.absent, activeCls: 'bg-rose-600 text-white', dot: 'bg-rose-500' },
                  { key: 'OFF', label: 'Off Day', count: stats.off, activeCls: 'bg-slate-600 text-white', dot: 'bg-slate-400' },
                  { key: 'EXCUSED', label: 'Excuse Duty', count: stats.excused, activeCls: 'bg-purple-600 text-white', dot: 'bg-purple-500' },
                  { key: 'LEAVE', label: 'On Leave / Exeat', count: stats.leave, activeCls: 'bg-blue-500 text-white', dot: 'bg-blue-400' },
                ] as const
              ).map(({ key, label, count, activeCls, dot }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${statusFilter === key
                      ? `${activeCls} shadow-sm`
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                  {dot && statusFilter !== key && (
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                  )}
                  {label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusFilter === key ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Shift Type Filter Chips (DS/NS) */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1 flex-shrink-0 uppercase tracking-wider">
                <Layers className="h-3 w-3" /> Shift Type:
              </span>
              {(
                [
                  { key: 'ALL', label: 'All Shifts', activeCls: 'bg-slate-600 text-white' },
                  { key: 'DS', label: 'Day Shift (DS)', activeCls: 'bg-blue-600 text-white' },
                  { key: 'NS', label: 'Night Shift (NS)', activeCls: 'bg-purple-600 text-white' },
                ] as const
              ).map(({ key, label, activeCls }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setShiftTypeFilter(key)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${shiftTypeFilter === key
                      ? `${activeCls} shadow-sm`
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedGuardIds.size > 0 && isSupervisor && (
            <div className="mx-4 sm:mx-6 my-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                    {selectedGuardIds.size} guard{selectedGuardIds.size !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedGuardIds(new Set())}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={bulkMarkPresent}
                    className="h-8 text-xs gap-1"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Present
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={bulkMarkLate}
                    className="h-8 text-xs gap-1"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Late
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={bulkMarkAbsent}
                    className="h-8 text-xs gap-1"
                  >
                    <XCircle className="h-3 w-3" />
                    Absent
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={bulkMarkOff}
                    className="h-8 text-xs gap-1"
                  >
                    <Coffee className="h-3 w-3" />
                    Off
                  </Button>
                  <Select onValueChange={bulkAssignDutyPoint}>
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue placeholder="Assign post..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dutyPoints.map(dp => (
                        <SelectItem key={dp.id} value={dp.id}>
                          {dp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mx-4 sm:mx-6 my-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-lg text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {successMsg}
            </div>
          )}

          <CardContent className="p-3 sm:p-6">
            {attendanceRows.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No roster loaded for this date and shift.</p>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No guards match your search / filter criteria.</p>
              </div>
            ) : (
              <>
                {/* ------------------------------------------------------------- */}
                {/* MOBILE VIEW (< md): Touch-Friendly Cards (No horizontal scroll) */}
                {/* ------------------------------------------------------------- */}
                <div className="block md:hidden space-y-3">
                  {filteredRows.map((row) => {
                    const realIndex = attendanceRows.findIndex(r => r.guardId === row.guardId)
                    const isRecorded = row.signInTime && row.status !== 'ABSENT'
                    const isSelected = selectedGuardIds.has(row.guardId)

                    return (
                      <div
                        key={row.guardId}
                        className={`p-3.5 rounded-xl border transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''} ${row.status === 'PRESENT'
                            ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                            : row.status === 'LATE'
                              ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10'
                              : row.status === 'ABSENT' && row.signInTime
                                ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                          }`}
                      >
                        {/* Header: Guard Name, Badge, Status, Checkbox */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isSupervisor && (
                              <button
                                type="button"
                                onClick={() => toggleSelectGuard(row.guardId)}
                                className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}
                              >
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </button>
                            )}
                            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex-shrink-0">
                              {row.guardName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                {row.guardName}
                              </p>
                              <p className="text-xs font-mono text-slate-500">
                                {row.badgeId}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {getShiftType(row.signInTime) && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getShiftType(row.signInTime) === 'DS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'}`}>
                                {getShiftType(row.signInTime)}
                              </span>
                            )}
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[row.status] || ''}`}>
                              {row.status}
                            </span>
                          </div>
                        </div>

                        {/* Duty Point Selector */}
                        <div className="mb-2.5">
                          <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                            Duty Post
                          </Label>
                          <Select
                            value={row.dutyPointId}
                            onValueChange={(val) => updateRow(realIndex, 'dutyPointId', val)}
                            disabled={!isSupervisor}
                          >
                            <SelectTrigger className="w-full h-9 text-xs font-medium">
                              <SelectValue placeholder="Assign post..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                              {dutyPoints.map((dp, idx) => (
                                <SelectItem key={dp.id} value={dp.id}>
                                  #{String(idx + 1).padStart(2, '0')} · {dp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Sign-In Time & Fast Time Chips */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              Sign-In Time
                            </Label>
                            {row.signInTime && (
                              <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                                {row.signInTime}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Input
                              type="time"
                              value={row.signInTime}
                              onChange={(e) => updateRow(realIndex, 'signInTime', e.target.value)}
                              disabled={!isSupervisor}
                              className="h-9 text-xs font-mono flex-1"
                            />
                            {/* Fast chips */}
                            {isSupervisor && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => markRowPresent(realIndex, shift === 'day-shift' ? '06:00' : '18:00')}
                                  className="h-9 px-2 text-[11px] font-mono font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                                >
                                  {shift === 'day-shift' ? '06:00' : '18:00'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => markRowLate(realIndex, shift === 'day-shift' ? '06:20' : '18:20')}
                                  className="h-9 px-2 text-[11px] font-mono font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                                >
                                  {shift === 'day-shift' ? '06:20' : '18:20'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Fast Status Action Segment (Big Touch Targets) */}
                        {isSupervisor && (
                          <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <div className="grid grid-cols-3 gap-1.5">
                              <button
                                type="button"
                                onClick={() => markRowPresent(realIndex)}
                                className={`py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${row.status === 'PRESENT'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                                  }`}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Present
                              </button>

                              <button
                                type="button"
                                onClick={() => markRowLate(realIndex)}
                                className={`py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${row.status === 'LATE'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                                  }`}
                              >
                                <AlertCircle className="h-3.5 w-3.5" />
                                Late
                              </button>

                              <button
                                type="button"
                                onClick={() => markRowAbsent(realIndex)}
                                className={`py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${row.status === 'ABSENT'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                                  }`}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Absent
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5">
                              <button
                                type="button"
                                onClick={() => markRowOff(realIndex)}
                                className={`py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${row.status === 'OFF'
                                    ? 'bg-slate-700 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                  }`}
                                title="Roster off day"
                              >
                                <Coffee className="h-3.5 w-3.5" />
                                Off Day
                              </button>

                              <button
                                type="button"
                                onClick={() => markRowExcused(realIndex)}
                                className={`py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${row.status === 'EXCUSED'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                                  }`}
                                title="Excuse duty (illness)"
                              >
                                <Stethoscope className="h-3.5 w-3.5" />
                                Excuse
                              </button>

                              <button
                                type="button"
                                onClick={() => markRowLeave(realIndex)}
                                className={`py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${row.status === 'LEAVE'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                                  }`}
                                title="On exeat / casual leave"
                              >
                                <FileBadge className="h-3.5 w-3.5" />
                                Exeat
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* ------------------------------------------------------------- */}
                {/* DESKTOP VIEW (>= md): Full Data Table                         */}
                {/* ------------------------------------------------------------- */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[900px] table-enhanced">
                    <thead>
                      <tr className="border-b">
                        {isSupervisor && (
                          <th className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={toggleSelectAll}
                              className={`w-5 h-5 rounded border flex items-center justify-center mx-auto ${selectedGuardIds.size === filteredRows.length && filteredRows.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}
                            >
                              {selectedGuardIds.size === filteredRows.length && filteredRows.length > 0 && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </button>
                          </th>
                        )}
                        <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Guard</th>
                        <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Badge ID</th>
                        <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Duty Point</th>
                        <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sign-In</th>
                        <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Remarks</th>
                        {isSupervisor && <th className="text-center p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => {
                        const realIndex = attendanceRows.findIndex(r => r.guardId === row.guardId)
                        const isSelected = selectedGuardIds.has(row.guardId)
                        return (
                          <tr key={row.guardId} className={`border-b hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                            {isSupervisor && (
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleSelectGuard(row.guardId)}
                                  className={`w-5 h-5 rounded border flex items-center justify-center mx-auto ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}
                                >
                                  {isSelected && <Check className="h-3 w-3 text-white" />}
                                </button>
                              </td>
                            )}
                            <td className="p-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex-shrink-0">
                                  {row.guardName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <span className="font-semibold text-sm text-slate-900 dark:text-white">{row.guardName}</span>
                              </div>
                            </td>
                            <td className="p-2.5 text-sm text-slate-500 font-mono">{row.badgeId}</td>
                            <td className="p-2.5">
                              <Select
                                value={row.dutyPointId}
                                onValueChange={(val) => updateRow(realIndex, 'dutyPointId', val)}
                                disabled={!isSupervisor}
                              >
                                <SelectTrigger className="w-44 h-8 text-xs font-medium">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                  {dutyPoints.map((dp, idx) => (
                                    <SelectItem key={dp.id} value={dp.id}>
                                      #{String(idx + 1).padStart(2, '0')} · {dp.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2.5">
                              <Input
                                type="time"
                                value={row.signInTime}
                                onChange={(e) => updateRow(realIndex, 'signInTime', e.target.value)}
                                disabled={!isSupervisor}
                                className="w-32 h-8 text-xs font-mono"
                              />
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-1.5">
                                {getShiftType(row.signInTime) && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getShiftType(row.signInTime) === 'DS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'}`}>
                                    {getShiftType(row.signInTime)}
                                  </span>
                                )}
                                {isSupervisor ? (
                                  <Select
                                    value={row.status}
                                    onValueChange={(val) => updateRow(realIndex, 'status', val)}
                                  >
                                    <SelectTrigger className="w-28 h-8 text-xs font-semibold">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PRESENT">Present</SelectItem>
                                      <SelectItem value="LATE">Late</SelectItem>
                                      <SelectItem value="ABSENT">Absent</SelectItem>
                                      <SelectItem value="OFF">Off</SelectItem>
                                      <SelectItem value="LEAVE">Leave</SelectItem>
                                      <SelectItem value="EXCUSED">Excused</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[row.status] || ''}`}>
                                    {row.status}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5">
                              <Input
                                value={row.remarks}
                                onChange={(e) => updateRow(realIndex, 'remarks', e.target.value)}
                                disabled={!isSupervisor}
                                placeholder="Remarks..."
                                className="w-40 h-8 text-xs"
                              />
                            </td>
                            {isSupervisor && (
                              <td className="p-2.5">
                                <div className="flex gap-0.5 justify-center">
                                  <button
                                    onClick={() => markRowPresent(realIndex)}
                                    title="Mark Present"
                                    className={`p-1.5 rounded-lg transition-colors ${row.status === 'PRESENT' ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}`}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => markRowLate(realIndex)}
                                    title="Mark Late"
                                    className={`p-1.5 rounded-lg transition-colors ${row.status === 'LATE' ? 'bg-amber-600 text-white' : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'}`}
                                  >
                                    <AlertCircle className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => markRowAbsent(realIndex)}
                                    title="Mark Absent"
                                    className={`p-1.5 rounded-lg transition-colors ${row.status === 'ABSENT' ? 'bg-rose-600 text-white' : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30'}`}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => markRowOff(realIndex)}
                                    title="Off Day"
                                    className={`p-1.5 rounded-lg transition-colors ${row.status === 'OFF' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                  >
                                    <Coffee className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => markRowExcused(realIndex)}
                                    title="Excuse Duty (Illness)"
                                    className={`p-1.5 rounded-lg transition-colors ${row.status === 'EXCUSED' ? 'bg-purple-600 text-white' : 'text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30'}`}
                                  >
                                    <Stethoscope className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => markRowLeave(realIndex)}
                                    title="On Exeat / Casual Leave"
                                    className={`p-1.5 rounded-lg transition-colors ${row.status === 'LEAVE' ? 'bg-blue-600 text-white' : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30'}`}
                                  >
                                    <FileBadge className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STICKY BOTTOM MOBILE ACTION BAR (Fast Thumb Save & Status Indicator)       */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-2.5 sm:px-6 shadow-2xl block md:hidden">
        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
          {/* Status info */}
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {stats.recorded}/{stats.total} Logged ({completionPct}%)
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              {hasChanges ? '⚠️ Unsaved roster changes' : '✓ All records saved'}
            </p>
          </div>

          {/* Quick Action buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {activeTab === 'roster-mode' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('book-mode')}
                className="h-9 text-xs px-2.5 font-bold gap-1 text-blue-600 dark:text-blue-400 border-blue-200"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Book Entry
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('roster-mode')}
                className="h-9 text-xs px-2.5 font-bold gap-1"
              >
                <Layers className="h-3.5 w-3.5" />
                Roster ({attendanceRows.length})
              </Button>
            )}

            {isSupervisor && (
              <Button
                size="sm"
                onClick={saveAllAttendance}
                disabled={!hasChanges || saving}
                className={`h-9 text-xs px-3 font-bold ${hasChanges
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
              >
                {saving ? 'Saving...' : hasChanges ? 'Save All' : 'Saved'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
