'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useSession } from 'next-auth/react'
import { Calendar, MapPin, Clock, Download, Save, Users } from 'lucide-react'
import { toast } from '@/components/ui/toast'

interface Guard {
  id: string
  fullName: string
  badgeId: string
  defaultDutyPoint?: { id: string; name: string } | null
}

interface DutyPoint {
  id: string
  name: string
}

interface Assignment {
  id: string
  guardId: string
  dutyPointId: string
  shiftId: string
  date: string
  guard: Guard
  dutyPoint: DutyPoint
}

export default function DailyAssignmentsPage() {
  const { data: session } = useSession()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [shift, setShift] = useState('day-shift')
  const [guards, setGuards] = useState<Guard[]>([])
  const [dutyPoints, setDutyPoints] = useState<DutyPoint[]>([])
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const isSupervisor = session?.user?.role === 'SUPERVISOR'

  useEffect(() => {
    fetchGuards()
    fetchDutyPoints()
  }, [])

  useEffect(() => {
    if (guards.length > 0 && dutyPoints.length > 0) {
      loadAssignments()
    }
  }, [guards.length, dutyPoints.length, date, shift])

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

  const loadAssignments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/daily-assignments?date=${date}&shiftId=${shift}`)
      if (res.ok) {
        const data: Assignment[] = await res.json()
        const assignmentMap: Record<string, string> = {}
        data.forEach(a => {
          assignmentMap[a.guardId] = a.dutyPointId
        })
        setAssignments(assignmentMap)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const updateAssignment = (guardId: string, dutyPointId: string) => {
    setAssignments(prev => ({
      ...prev,
      [guardId]: dutyPointId
    }))
  }

  const saveAssignments = async () => {
    setSaving(true)
    try {
      const promises = guards.map(guard => {
        const dutyPointId = assignments[guard.id] || guard.defaultDutyPoint?.id || dutyPoints[0]?.id
        return fetch('/api/daily-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guardId: guard.id,
            dutyPointId,
            shiftId: shift,
            date,
          }),
        })
      })

      await Promise.all(promises)
      toast.success('Daily duty assignments saved successfully')
    } catch (e) {
      toast.error('Error saving assignments')
    } finally {
      setSaving(false)
    }
  }

  const exportAssignments = () => {
    const headers = ['Guard Name', 'Badge ID', 'Duty Point', 'Shift', 'Date']
    const rows = guards.map(guard => {
      const dutyPointId = assignments[guard.id] || guard.defaultDutyPoint?.id || dutyPoints[0]?.id
      const dutyPoint = dutyPoints.find(dp => dp.id === dutyPointId)
      return [
        `"${guard.fullName}"`,
        `"${guard.badgeId}"`,
        `"${dutyPoint?.name || 'Unassigned'}"`,
        shift === 'day-shift' ? 'Day Shift (06:00-18:00)' : 'Night Shift (18:00-06:00)',
        date,
      ]
    })

    const csvContent = [
      `PCC Security Department - Daily Duty Point Assignments`,
      `Date: ${date}, Shift: ${shift === 'day-shift' ? 'Day Shift (06:00-18:00)' : 'Night Shift (18:00-06:00)'}`,
      `Total Guards: ${guards.length}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `daily-assignments-${date}-${shift}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Assignments exported to CSV')
  }

  const shiftLabel = shift === 'day-shift' ? 'Day Shift (06:00 – 18:00)' : 'Night Shift (18:00 – 06:00)'

  return (
    <div className="space-y-4 pb-8">
      <Breadcrumb
        items={[
          { label: 'Operations' },
          { label: 'Daily Duty Assignments' },
        ]}
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <PageHeader
        icon={MapPin}
        title="Daily Duty Point Assignments"
        description="Assign duty points to guards for each shift"
        color="blue"
        stats={[
          { label: 'Total Guards', value: guards.length },
          { label: 'Assigned', value: Object.keys(assignments).length },
          { label: 'Shift', value: shift === 'day-shift' ? 'Day' : 'Night' },
        ]}
      />

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3">
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

            <div className="flex gap-2">
              {isSupervisor && (
                <>
                  <Button
                    onClick={saveAssignments}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={exportAssignments}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base">
            <Users className="h-4 w-4 mr-2 inline" />
            Guard Assignments - {shiftLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading assignments...</div>
          ) : (
            <div className="space-y-2">
              {guards.map(guard => {
                const assignedDutyPointId = assignments[guard.id] || guard.defaultDutyPoint?.id || dutyPoints[0]?.id
                return (
                  <div key={guard.id} className="flex items-center gap-4 p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{guard.fullName}</div>
                      <div className="text-xs text-slate-500">{guard.badgeId}</div>
                    </div>
                    {isSupervisor ? (
                      <div className="w-64">
                        <Select
                          value={assignedDutyPointId}
                          onValueChange={(value) => updateAssignment(guard.id, value)}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select duty point" />
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
                    ) : (
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {dutyPoints.find(dp => dp.id === assignedDutyPointId)?.name || 'Unassigned'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
