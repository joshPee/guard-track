'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Calendar, ChevronLeft, ChevronRight, Users, Search, CalendarDays } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns'

interface Guard {
  id: string
  fullName: string
  badgeId: string
}

interface AttendanceRecord {
  guardId: string
  guardName: string
  shiftDate: string
  status: string
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-emerald-500',
  LATE: 'bg-amber-500',
  ABSENT: 'bg-rose-500',
  OFF: 'bg-slate-400',
  LEAVE: 'bg-blue-500',
  EXCUSED: 'bg-purple-500',
}

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Present',
  LATE: 'Late',
  ABSENT: 'Absent',
  OFF: 'Off',
  LEAVE: 'Leave',
  EXCUSED: 'Excused',
}

export default function AttendanceHeatmapPage() {
  const [guards, setGuards] = useState<Guard[]>([])
  const [selectedGuardId, setSelectedGuardId] = useState<string>('all')
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchGuards()
  }, [])

  useEffect(() => {
    fetchAttendanceData()
  }, [selectedGuardId, currentMonth])

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

  const fetchAttendanceData = async () => {
    setLoading(true)
    try {
      const monthStr = format(currentMonth, 'yyyy-MM')
      const params = new URLSearchParams({ month: monthStr })

      if (selectedGuardId !== 'all') {
        params.append('guardId', selectedGuardId)
      }

      const res = await fetch(`/api/reports/monthly?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const records: AttendanceRecord[] = []
        if (data.guards) {
          data.guards.forEach((guardData: any) => {
            Object.entries(guardData.days).forEach(([dateStr, dayData]: [string, any]) => {
              records.push({
                guardId: guardData.guard.id,
                guardName: guardData.guard.fullName,
                shiftDate: dateStr,
                status: dayData.status,
              })
            })
          })
        }
        setAttendanceData(records)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getAttendanceForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return attendanceData.filter(r => r.shiftDate === dateStr)
  }

  const getDayColor = (date: Date) => {
    const records = getAttendanceForDay(date)
    if (records.length === 0) return 'bg-slate-100 dark:bg-slate-800'

    if (selectedGuardId !== 'all') {
      const record = records[0]
      return STATUS_COLORS[record.status] || 'bg-slate-100 dark:bg-slate-800'
    }

    // For all guards, calculate average
    const presentCount = records.filter(r => r.status === 'PRESENT').length
    const lateCount = records.filter(r => r.status === 'LATE').length
    const absentCount = records.filter(r => r.status === 'ABSENT').length
    const total = records.length

    if (absentCount / total > 0.5) return 'bg-rose-500'
    if (lateCount / total > 0.3) return 'bg-amber-500'
    if (presentCount / total > 0.8) return 'bg-emerald-500'
    return 'bg-slate-300 dark:bg-slate-700'
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1))
  }

  const selectedGuard = guards.find(g => g.id === selectedGuardId)

  return (
    <div className="space-y-4 sm:space-y-6">
      <Breadcrumb
        items={[
          { label: 'Operations' },
          { label: 'Attendance Heatmap' },
        ]}
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <PageHeader
        icon={CalendarDays}
        title="Attendance Heatmap Calendar"
        description="Visual attendance patterns across the month"
        color="blue"
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                Guard
              </Label>
              <Select value={selectedGuardId} onValueChange={setSelectedGuardId}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Guards</SelectItem>
                  {guards.map(guard => (
                    <SelectItem key={guard.id} value={guard.id}>
                      {guard.fullName} ({guard.badgeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('prev')}
                className="h-10 w-10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="w-40 text-center">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {format(currentMonth, 'MMMM yyyy')}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('next')}
                className="h-10 w-10"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Legend:</span>
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${STATUS_COLORS[status]}`} />
                <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Heatmap */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <Calendar className="h-4 w-4 text-blue-600" />
            {selectedGuardId === 'all' ? 'All Guards' : selectedGuard?.fullName} - {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30 animate-pulse" />
              <p className="text-sm">Loading attendance data...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {daysInMonth.map(day => {
                  const records = getAttendanceForDay(day)
                  const bgColor = getDayColor(day)

                  return (
                    <div
                      key={day.toISOString()}
                      className="aspect-square rounded-lg cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all relative group"
                      onClick={() => {
                        // Could show a modal with day details
                      }}
                    >
                      <div className={`w-full h-full rounded-lg ${bgColor} flex flex-col items-center justify-center p-1`}>
                        <span className="text-xs font-semibold text-white">
                          {format(day, 'd')}
                        </span>
                        {records.length > 0 && (
                          <span className="text-[10px] text-white/80">
                            {records.length}
                          </span>
                        )}
                      </div>

                      {/* Tooltip */}
                      {records.length > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          <div className="font-semibold mb-1">{format(day, 'MMM d, yyyy')}</div>
                          {selectedGuardId === 'all' ? (
                            <div>
                              {records.slice(0, 3).map(r => (
                                <div key={r.guardId} className="text-slate-300">
                                  {r.guardName}: {r.status}
                                </div>
                              ))}
                              {records.length > 3 && (
                                <div className="text-slate-400">+{records.length - 3} more</div>
                              )}
                            </div>
                          ) : (
                            <div>Status: {records[0].status}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
