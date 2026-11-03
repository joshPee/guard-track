'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Calendar, ChevronLeft, ChevronRight, Users, MapPin, Plus, X, AlertCircle } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay } from 'date-fns'

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

interface ScheduleAssignment {
  guardId: string
  guardName: string
  dutyPointId: string
  dutyPointName: string
  date: string
  shiftId: string
}

export default function ScheduleCalendarPage() {
  const [guards, setGuards] = useState<Guard[]>([])
  const [dutyPoints, setDutyPoints] = useState<DutyPoint[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)
  const [selectedGuardId, setSelectedGuardId] = useState('')
  const [selectedDutyPointId, setSelectedDutyPointId] = useState('')
  const [selectedShiftId, setSelectedShiftId] = useState('day-shift')

  useEffect(() => {
    fetchGuards()
    fetchDutyPoints()
  }, [])

  const fetchGuards = async () => {
    try {
      const res = await fetch('/api/guards')
      if (res.ok) {
        const data = await res.json()
        setGuards(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchDutyPoints = async () => {
    try {
      const res = await fetch('/api/duty-points')
      if (res.ok) {
        const data = await res.json()
        setDutyPoints(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1))
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const daysInMonth = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getAssignmentsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return assignments.filter(a => a.date === dateStr)
  }

  const handleAddAssignment = () => {
    if (!selectedDate || !selectedGuardId || !selectedDutyPointId) return

    const newAssignment: ScheduleAssignment = {
      guardId: selectedGuardId,
      guardName: guards.find(g => g.id === selectedGuardId)?.fullName || '',
      dutyPointId: selectedDutyPointId,
      dutyPointName: dutyPoints.find(dp => dp.id === selectedDutyPointId)?.name || '',
      date: format(selectedDate, 'yyyy-MM-dd'),
      shiftId: selectedShiftId,
    }

    setAssignments(prev => [...prev, newAssignment])
    setShowAssignmentDialog(false)
    setSelectedDate(null)
    setSelectedGuardId('')
    setSelectedDutyPointId('')
  }

  const handleRemoveAssignment = (assignment: ScheduleAssignment) => {
    setAssignments(prev => prev.filter(a => 
      a.guardId === assignment.guardId && 
      a.date === assignment.date && 
      a.dutyPointId === assignment.dutyPointId
    ))
  }

  const checkForConflicts = (guardId: string, date: string, dutyPointId: string) => {
    return assignments.some(a => 
      a.guardId === guardId && 
      a.date === date &&
      a.dutyPointId !== dutyPointId
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Breadcrumb
        items={[
          { label: 'Operations' },
          { label: 'Guard Schedule' },
        ]}
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <PageHeader
        icon={Calendar}
        title="Guard Schedule Calendar"
        description="Visual guard duty assignments and schedule planning"
        color="blue"
      />

      {/* Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="w-48 text-center">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {format(currentMonth, 'MMMM yyyy')}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {guards.length} guards
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {dutyPoints.length} duty points
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map(day => {
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const dayAssignments = getAssignmentsForDate(day)
              const hasConflict = dayAssignments.some(a => 
                checkForConflicts(a.guardId, a.date, a.dutyPointId)
              )

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDate(day)
                    setShowAssignmentDialog(true)
                  }}
                  className={`aspect-square rounded-lg border cursor-pointer transition-all hover:ring-2 hover:ring-blue-500 relative ${
                    isCurrentMonth
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                  } ${hasConflict ? 'ring-2 ring-rose-500' : ''}`}
                >
                  <div className="p-1 h-full flex flex-col">
                    <span className={`text-xs font-medium ${
                      isCurrentMonth ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex-1 flex flex-col gap-0.5 mt-1 overflow-hidden">
                      {dayAssignments.slice(0, 3).map((assignment, idx) => (
                        <div
                          key={idx}
                          className="text-[9px] truncate px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300"
                          title={`${assignment.guardName} @ ${assignment.dutyPointName}`}
                        >
                          {assignment.guardName.split(' ')[0]}
                        </div>
                      ))}
                      {dayAssignments.length > 3 && (
                        <div className="text-[9px] text-slate-500">
                          +{dayAssignments.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>

                  {hasConflict && (
                    <div className="absolute top-1 right-1" title="Schedule conflict">
                      <AlertCircle className="h-3 w-3 text-rose-500" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      {showAssignmentDialog && selectedDate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Add Schedule Assignment
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowAssignmentDialog(false)
                  setSelectedDate(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                  Date
                </Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                  Guard
                </Label>
                <Select value={selectedGuardId} onValueChange={setSelectedGuardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select guard..." />
                  </SelectTrigger>
                  <SelectContent>
                    {guards.map(guard => (
                      <SelectItem key={guard.id} value={guard.id}>
                        {guard.fullName} ({guard.badgeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                  Duty Point
                </Label>
                <Select value={selectedDutyPointId} onValueChange={setSelectedDutyPointId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duty point..." />
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

              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                  Shift
                </Label>
                <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day-shift">Day Shift (06:00 - 18:00)</SelectItem>
                    <SelectItem value="night-shift">Night Shift (18:00 - 06:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAssignmentDialog(false)
                    setSelectedDate(null)
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddAssignment}
                  disabled={!selectedGuardId || !selectedDutyPointId}
                  className="flex-1"
                >
                  Add Assignment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment List */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
              Schedule Assignments ({assignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {assignments.map((assignment, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold">
                      {assignment.guardName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {assignment.guardName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {assignment.dutyPointName} · {format(new Date(assignment.date), 'MMM d')} · {assignment.shiftId === 'day-shift' ? 'Day' : 'Night'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAssignment(assignment)}
                    className="h-8 w-8 text-slate-400 hover:text-rose-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
