'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'
import {
  Shield, BookOpen, Layers,
} from 'lucide-react'
import { toast } from '@/components/ui/toast'
import {
  Guard, DutyPoint, AttendanceRow, RecentBookEntry, LeaveInfo,
  StatusFilter, ShiftTypeFilter, SortMode, RosterStats,
} from '@/components/attendance/types'
import { BookEntryMode } from '@/components/attendance/BookEntryMode'
import { RosterMode } from '@/components/attendance/RosterMode'

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [shiftTypeFilter, setShiftTypeFilter] = useState<ShiftTypeFilter>('ALL')
  const [rosterSearch, setRosterSearch] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('alpha')
  const [selectedGuardIds, setSelectedGuardIds] = useState<Set<string>>(new Set())
  const [leaveMap, setLeaveMap] = useState<Record<string, LeaveInfo>>({})

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

  // Fetch approved leave overlapping the selected date (leave-conflict warnings)
  useEffect(() => {
    const fetchLeave = async () => {
      try {
        const res = await fetch('/api/leave?status=APPROVED')
        if (!res.ok) return
        const data = await res.json()
        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)

        const map: Record<string, LeaveInfo> = {}
        ;(data.records || []).forEach((r: any) => {
          const s = new Date(r.startDate)
          const e = new Date(r.endDate)
          e.setHours(23, 59, 59, 999)
          if (s <= dayEnd && e >= dayStart) {
            map[r.guardId] = { type: r.type, refNumber: r.refNumber }
          }
        })
        setLeaveMap(map)
      } catch (e) {
        console.error('Failed to load leave data:', e)
      }
    }
    if (date) fetchLeave()
  }, [date])

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
      const res = await fetch(`/api/attendance?date=${date}`)
      const assignmentsRes = await fetch(`/api/daily-assignments?date=${date}&shiftId=${shift}`)

      if (res.ok && assignmentsRes.ok) {
        const records = await res.json()
        const assignments = await assignmentsRes.json()

        // Create a map of guardId to dutyPointId from daily assignments
        const assignmentMap: Record<string, string> = {}
        assignments.forEach((a: any) => {
          assignmentMap[a.guardId] = a.dutyPointId
        })

        const rows: AttendanceRow[] = guards.map((guard) => {
          const existing = records.find((r: any) => r.guardId === guard.id)
          // Priority: daily assignment > existing record > default > first duty point
          const dutyPointId = assignmentMap[guard.id] || existing?.dutyPointId || guard.defaultDutyPoint?.id || dutyPoints[0]?.id || ''
          const assignedDp = dutyPoints.find((dp) => dp.id === dutyPointId)
          const isOffDuty = assignedDp?.name?.toLowerCase().includes('off duty') || assignedDp?.name?.toLowerCase().includes('off day')

          return {
            guardId: guard.id,
            guardName: guard.fullName,
            badgeId: guard.badgeId,
            photoUrl: guard.photoUrl || null,
            dutyPointId,
            signInTime: existing?.signInTime ? new Date(existing.signInTime).toISOString().slice(11, 16) : '',
            status: existing?.status || (isOffDuty ? 'OFF' : 'ABSENT'),
            remarks: existing?.remarks || (isOffDuty ? 'Scheduled Off Day' : ''),
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

  // Non-blocking leave-conflict warning
  const warnIfOnLeave = (guardId: string, guardName: string) => {
    const leave = leaveMap[guardId]
    if (leave) {
      toast.warning(
        `${guardName} has approved ${leave.type.replace(/_/g, ' ')}${leave.refNumber ? ` (${leave.refNumber})` : ''} on this date — marked Present anyway.`
      )
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
      // Auto adjust status if time set based on actual time, not selected shift
      const [hours, minutes] = value.split(':').map(Number)
      const isDayShift = hours >= 6 && hours < 18
      const cutoff = isDayShift ? '06:15' : '18:15'
      newRows[index].status = value <= cutoff ? 'PRESENT' : 'LATE'
    }
    setAttendanceRows(newRows)
    setHasChanges(true)
  }

  // Get expected shift ID based on time (for database)
  const getShiftIdForTime = (signInTime: string) => {
    if (!signInTime) return shift
    const [hours] = signInTime.split(':').map(Number)
    // 06:00-17:59 = day-shift, 18:00-05:59 = night-shift
    return hours >= 6 && hours < 18 ? 'day-shift' : 'night-shift'
  }

  const markRowPresent = (index: number, presetTime?: string) => {
    const row = attendanceRows[index]
    warnIfOnLeave(row.guardId, row.guardName)
    const newRows = [...attendanceRows]
    newRows[index].status = 'PRESENT'
    // Use preset time if provided, otherwise use 06:00 or 18:00 based on the current time context
    newRows[index].signInTime = presetTime || (shift === 'day-shift' ? '06:00' : '18:00')
    setAttendanceRows(newRows)
    setHasChanges(true)
  }

  const markRowLate = (index: number, presetTime?: string) => {
    const newRows = [...attendanceRows]
    newRows[index].status = 'LATE'
    // Use preset time if provided, otherwise use 06:20 or 18:20 based on the current time context
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

    warnIfOnLeave(selectedGuard.id, selectedGuard.fullName)

    setBookSaving(true)
    try {
      const dutyPointToUse = bookDutyPointId || selectedGuard.defaultDutyPoint?.id || dutyPoints[0]?.id || ''

      // Determine shift ID based on sign-in time
      const [hours] = bookTime.split(':').map(Number)
      const shiftIdForTime = hours >= 6 && hours < 18 ? 'day-shift' : 'night-shift'

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardId: selectedGuard.id,
          shiftId: shiftIdForTime,
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
            shiftId: getShiftIdForTime(row.signInTime),
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
    const onLeaveCount = attendanceRows.filter(r => selectedGuardIds.has(r.guardId) && leaveMap[r.guardId]).length
    if (onLeaveCount > 0) {
      toast.warning(`${onLeaveCount} selected guard${onLeaveCount !== 1 ? 's have' : ' has'} approved leave on this date — marked Present anyway.`)
    }
    setAttendanceRows(prev => prev.map(row => {
      if (selectedGuardIds.has(row.guardId)) {
        const time = shift === 'day-shift' ? '06:00' : '18:00'
        return {
          ...row,
          status: 'PRESENT',
          signInTime: time,
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
        const time = shift === 'day-shift' ? '06:20' : '18:20'
        return {
          ...row,
          status: 'LATE',
          signInTime: time,
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

      // Filter by shift type chips (ALL/DS/NS) based on current shift selector
      let matchesShiftType = true
      if (shiftTypeFilter === 'DS') {
        matchesShiftType = shift === 'day-shift'
      } else if (shiftTypeFilter === 'NS') {
        matchesShiftType = shift === 'night-shift'
      }

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
  const stats: RosterStats = {
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

      {/* MODE 1: RAPID PHYSICAL BOOK LOGGER (Optimized for one-by-one book entry)  */}
      {activeTab === 'book-mode' && (
        <BookEntryMode
          isSupervisor={!!isSupervisor}
          pendingCount={stats.pending}
          onMarkRestAbsent={markUnrecordedAsAbsent}
          guards={guards}
          attendanceRows={attendanceRows}
          dutyPoints={dutyPoints}
          leaveMap={leaveMap}
          bookSearch={bookSearch}
          setBookSearch={setBookSearch}
          selectedGuard={selectedGuard}
          onSelectGuard={handleSelectGuardForBook}
          onClearSelectedGuard={() => setSelectedGuard(null)}
          searchDropdownOpen={searchDropdownOpen}
          setSearchDropdownOpen={setSearchDropdownOpen}
          filteredSearchGuards={filteredSearchGuards}
          unloggedGuards={unloggedGuards}
          bookDutyPointId={bookDutyPointId}
          setBookDutyPointId={setBookDutyPointId}
          bookTime={bookTime}
          setBookTime={setBookTime}
          timePresets={timePresets}
          shift={shift}
          onPresetTime={handlePresetTimeClick}
          bookStatus={bookStatus}
          setBookStatus={setBookStatus}
          bookRemarks={bookRemarks}
          setBookRemarks={setBookRemarks}
          onSubmit={handleBookEntrySubmit}
          bookSaving={bookSaving}
          searchInputRef={searchInputRef}
          dropdownRef={dropdownRef}
          recentEntries={recentEntries}
        />
      )}

      {/* MODE 2: FULL ROSTER (Responsive Mobile Cards + Desktop Table) */}
      {activeTab === 'roster-mode' && (
        <RosterMode
          isSupervisor={!!isSupervisor}
          attendanceRows={attendanceRows}
          filteredRows={filteredRows}
          dutyPoints={dutyPoints}
          shift={shift}
          leaveMap={leaveMap}
          rosterSearch={rosterSearch}
          setRosterSearch={setRosterSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          shiftTypeFilter={shiftTypeFilter}
          setShiftTypeFilter={setShiftTypeFilter}
          sortMode={sortMode}
          onCycleSort={() => setSortMode(m => m === 'alpha' ? 'status' : m === 'status' ? 'pending' : 'alpha')}
          stats={stats}
          hasChanges={hasChanges}
          saving={saving}
          onSave={saveAllAttendance}
          onAllOnTime={setAllToShiftStart}
          onExport={exportCurrentRosterCSV}
          selectedGuardIds={selectedGuardIds}
          setSelectedGuardIds={setSelectedGuardIds}
          toggleSelectGuard={toggleSelectGuard}
          toggleSelectAll={toggleSelectAll}
          updateRow={updateRow}
          markRowPresent={markRowPresent}
          markRowLate={markRowLate}
          markRowAbsent={markRowAbsent}
          markRowOff={markRowOff}
          markRowExcused={markRowExcused}
          markRowLeave={markRowLeave}
          bulkMarkPresent={bulkMarkPresent}
          bulkMarkLate={bulkMarkLate}
          bulkMarkAbsent={bulkMarkAbsent}
          bulkMarkOff={bulkMarkOff}
          bulkAssignDutyPoint={bulkAssignDutyPoint}
          successMsg={successMsg}
        />
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
