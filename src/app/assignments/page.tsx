'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Filter,
  Download,
  Mail,
} from 'lucide-react'

interface Guard {
  id: string
  fullName: string
  badgeId: string
  phone: string | null
  photoUrl: string | null
  shiftType: string
  defaultDutyPoint: { name: string } | null
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
  guard: {
    id: string
    fullName: string
    badgeId: string
    phone: string | null
    photoUrl: string | null
    shiftType: string
  }
  dutyPoint: { name: string }
  shift: { name: string }
  date: string
}

export default function AssignmentsPortalPage() {
  const [guards, setGuards] = useState<Guard[]>([])
  const [dutyPoints, setDutyPoints] = useState<DutyPoint[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [dailyAssignments, setDailyAssignments] = useState<DailyAssignment[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedShift, setSelectedShift] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGuards()
    fetchDutyPoints()
    fetchShifts()
  }, [])

  useEffect(() => {
    if (shifts.length > 0 && !selectedShift) {
      setSelectedShift(shifts[0].id)
    }
  }, [shifts])

  useEffect(() => {
    if (selectedDate && selectedShift) {
      fetchDailyAssignments()
    }
  }, [selectedDate, selectedShift])

  const fetchGuards = async () => {
    try {
      const res = await fetch('/api/guards?status=ACTIVE')
      if (res.ok) {
        const data = await res.json()
        setGuards(data)
      }
    } catch (error) {
      console.error('Error fetching guards:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDutyPoints = async () => {
    try {
      const res = await fetch('/api/duty-points')
      if (res.ok) {
        const data = await res.json()
        setDutyPoints(data)
      }
    } catch (error) {
      console.error('Error fetching duty points:', error)
    }
  }

  const fetchShifts = async () => {
    try {
      const res = await fetch('/api/shifts')
      if (res.ok) {
        const data = await res.json()
        setShifts(data)
      }
    } catch (error) {
      console.error('Error fetching shifts:', error)
    }
  }

  const fetchDailyAssignments = async () => {
    try {
      const res = await fetch(`/api/daily-assignments?date=${selectedDate}&shiftId=${selectedShift}`)
      if (res.ok) {
        const data = await res.json()
        setDailyAssignments(data)
      }
    } catch (error) {
      console.error('Error fetching daily assignments:', error)
    }
  }

  const filteredAssignments = dailyAssignments.filter((assignment) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      assignment.guard.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.guard.badgeId.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const exportCSV = () => {
    const headers = ['Guard Name', 'Badge ID', 'Phone', 'Shift Type', 'Duty Point', 'Shift', 'Date']
    const rows = filteredAssignments.map(assignment => [
      assignment.guard.fullName,
      assignment.guard.badgeId,
      assignment.guard.phone || 'N/A',
      assignment.guard.shiftType === 'DAY' ? 'Day Shift (DS)' : assignment.guard.shiftType === 'NIGHT' ? 'Night Shift (NS)' : 'Both Shifts',
      assignment.dutyPoint.name,
      assignment.shift.name,
      new Date(assignment.date).toLocaleDateString(),
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daily-assignments-${selectedDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const selectedShiftName = shifts.find(s => s.id === selectedShift)?.name || 'Selected Shift'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            Daily Duty Assignments
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            View guard duty point assignments by date and shift
          </p>
        </div>

        {/* Filters */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Date Selector */}
              <div className="flex-1">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Date
                </Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-sm bg-slate-50 dark:bg-slate-800/80"
                />
              </div>

              {/* Shift Selector */}
              <div className="flex-1">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                  <Filter className="h-3 w-3 inline mr-1" />
                  Shift
                </Label>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className="text-sm bg-slate-50 dark:bg-slate-800/80">
                    <SelectValue placeholder="Select shift..." />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>
                        {shift.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="flex-1">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                  <Search className="h-3 w-3 inline mr-1" />
                  Search
                </Label>
                <Input
                  placeholder="Name or badge ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-sm bg-slate-50 dark:bg-slate-800/80"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={exportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <Download className="h-4 w-4" />
                Export Assignments
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{filteredAssignments.length}</p>
              <p className="text-xs text-slate-500">Assigned Guards</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {filteredAssignments.filter(a => a.guard.shiftType === 'DAY').length}
              </p>
              <p className="text-xs text-slate-500">Day Shift</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {filteredAssignments.filter(a => a.guard.shiftType === 'NIGHT').length}
              </p>
              <p className="text-xs text-slate-500">Night Shift</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {new Set(filteredAssignments.map(a => a.dutyPoint.name)).size}
              </p>
              <p className="text-xs text-slate-500">Duty Points Used</p>
            </CardContent>
          </Card>
        </div>

        {/* Assignments Grid */}
        {loading ? (
          <div className="text-center py-12 text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading assignments...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
            <CardContent className="py-12 text-center text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No assignments found for the selected date and shift.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAssignments.map((assignment) => (
              <Card
                key={assignment.id}
                className="border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Duty Point - Bold at Top */}
                  <div className="text-center">
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300 truncate max-w-[150px]">
                        {assignment.dutyPoint.name}
                      </span>
                    </div>
                  </div>

                  {/* Photo */}
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
                      {assignment.guard.photoUrl ? (
                        <img
                          src={assignment.guard.photoUrl}
                          alt={assignment.guard.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Users className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name & Badge */}
                  <div className="text-center space-y-1">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                      {assignment.guard.fullName}
                    </h3>
                    <p className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded inline-block">
                      {assignment.guard.badgeId}
                    </p>
                  </div>

                  {/* Shift Type Badge */}
                  <div className="flex justify-center">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                      assignment.guard.shiftType === 'DAY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                      assignment.guard.shiftType === 'NIGHT' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {assignment.guard.shiftType === 'DAY' ? 'Day Shift (DS)' : assignment.guard.shiftType === 'NIGHT' ? 'Night Shift (NS)' : 'Both Shifts'}
                    </span>
                  </div>

                  {/* Other Details */}
                  <div className="space-y-1.5 text-xs">
                    {assignment.guard.phone && (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="font-mono">{assignment.guard.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pt-4">
          <p>PCC Security Department · Daily Duty Assignments</p>
          <p className="mt-1">Last updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
