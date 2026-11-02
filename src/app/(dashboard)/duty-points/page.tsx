'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MapPin,
  Search,
  Plus,
  Building,
  CheckCircle2,
  Users,
  Filter,
  Shield,
  Layers,
  ArrowUpDown,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { toast } from '@/components/ui/toast'

interface Zone {
  id: string
  name: string
}

interface DutyPoint {
  id: string
  name: string
  isActive: boolean
  zoneId: string
  zone: {
    id: string
    name: string
  }
  _count?: {
    guards: number
  }
}

// Canonical ordering provided by management
const OFFICIAL_ORDER = [
  'Abraham Tetteh Nartey Block',
  'Lawrence Annor Nyarko Block(PSTM Hostel)*',
  'John Bart Plange Block',
  'David Yaw Anti Owusu Block',
  'Patrick Asiamah (Block)',
  'Main Gate',
  'Fred Diabene Walker (Auditorium)',
  'Stephen Henry Ankamah',
  'James Gyimah Block',
  'Joseph Egyir Paintsil',
  'Perpetual Owusu',
  'Samuel Richard Asomaning',
  'George Alphonso Wood',
  'Children Resource Center',
  'David Mills Block(PSTM Administration Block)*',
  'Lectures Block*',
  'Eunice Addison Block',
  'Josiah Coffie Quaye',
  'Staff Quarters',
  'Water Storage',
  "Center Manager's Quarters",
]

const ZONE_BADGES: Record<string, string> = {
  'Front/Gate Area': 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  'Auditoriums': 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'PSTM Area': 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  'Residential/Admin Cluster': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
}

export default function DutyPointsPage() {
  const { data: session } = useSession()
  const [dutyPoints, setDutyPoints] = useState<DutyPoint[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedZone, setSelectedZone] = useState<string>('ALL')

  // Dialog state
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPoint, setEditingPoint] = useState<DutyPoint | null>(null)
  const [deactivatingPoint, setDeactivatingPoint] = useState<DutyPoint | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    zoneId: '',
    isActive: true,
  })

  useEffect(() => {
    fetchDutyPoints()
    fetchZones()
  }, [])

  const fetchDutyPoints = async () => {
    try {
      const res = await fetch('/api/duty-points')
      if (res.ok) {
        const data = await res.json()
        setDutyPoints(data)
      }
    } catch (error) {
      console.error('Error fetching duty points:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchZones = async () => {
    try {
      const res = await fetch('/api/zones')
      if (res.ok) {
        const data = await res.json()
        setZones(data)
      }
    } catch (error) {
      console.error('Error fetching zones:', error)
    }
  }

  const isSupervisor = session?.user?.role === 'SUPERVISOR'

  // Extract unique zones for filter tabs
  const zonesList = useMemo(() => {
    const set = new Set<string>()
    dutyPoints.forEach((dp) => {
      if (dp.zone?.name) set.add(dp.zone.name)
    })
    return Array.from(set).sort()
  }, [dutyPoints])

  // Sort by official 1-21 order, then filter
  const sortedAndFiltered = useMemo(() => {
    return [...dutyPoints]
      .sort((a, b) => {
        const indexA = OFFICIAL_ORDER.findIndex(
          (name) => name.toLowerCase() === a.name.toLowerCase()
        )
        const indexB = OFFICIAL_ORDER.findIndex(
          (name) => name.toLowerCase() === b.name.toLowerCase()
        )

        if (indexA !== -1 && indexB !== -1) return indexA - indexB
        if (indexA !== -1) return -1
        if (indexB !== -1) return 1
        return a.name.localeCompare(b.name)
      })
      .filter((dp) => {
        const matchesSearch =
          search.trim() === '' ||
          dp.name.toLowerCase().includes(search.toLowerCase()) ||
          dp.zone?.name.toLowerCase().includes(search.toLowerCase())

        const matchesZone = selectedZone === 'ALL' || dp.zone?.name === selectedZone

        return matchesSearch && matchesZone
      })
  }, [dutyPoints, search, selectedZone])

  const totalAssignedGuards = dutyPoints.reduce(
    (sum, dp) => sum + (dp._count?.guards || 0),
    0
  )

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      zoneId: zones[0]?.id || '',
      isActive: true,
    })
    setFormError('')
    setShowAddModal(true)
  }

  const handleOpenEdit = (dp: DutyPoint) => {
    setEditingPoint(dp)
    setFormData({
      name: dp.name,
      zoneId: dp.zoneId,
      isActive: dp.isActive,
    })
    setFormError('')
  }

  const handleSaveDutyPoint = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true)
    setFormError('')

    try {
      const isEdit = !!editingPoint
      const url = isEdit ? `/api/duty-points/${editingPoint.id}` : '/api/duty-points'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to save duty point')
      }

      setShowAddModal(false)
      setEditingPoint(null)
      toast.success(isEdit ? 'Duty post updated successfully' : 'New duty point created')
      await fetchDutyPoints()
    } catch (err: any) {
      setFormError(err.message)
      toast.error(err.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDeactivate = async () => {
    if (!deactivatingPoint) return
    setFormSubmitting(true)

    try {
      const res = await fetch(`/api/duty-points/${deactivatingPoint.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to deactivate duty point')
      }

      setDeactivatingPoint(null)
      toast.success('Duty post deactivated')
      await fetchDutyPoints()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Operations' },
          { label: 'Duty Points Roster' },
        ]}
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <PageHeader
        icon={MapPin}
        title="Duty Points Roster"
        description="Official list of campus security posts, patrol beats, and assigned zones"
        color="teal"
        stats={[
          { label: 'Total Posts', value: dutyPoints.length },
          { label: 'Campus Zones', value: zonesList.length },
          { label: 'Assigned Guards', value: totalAssignedGuards },
        ]}
        actions={
          isSupervisor ? (
            <Button
              onClick={handleOpenAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Duty Point
            </Button>
          ) : undefined
        }
      />

      {/* Main Table View Container */}
      <Card className="animate-fade-in-up border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Zone Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
            <button
              onClick={() => setSelectedZone('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                selectedZone === 'ALL'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Posts ({dutyPoints.length})
            </button>
            {zonesList.map((zoneName) => {
              const count = dutyPoints.filter((dp) => dp.zone?.name === zoneName).length
              const isSelected = selectedZone === zoneName
              return (
                <button
                  key={zoneName}
                  onClick={() => setSelectedZone(zoneName)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-sm font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{zoneName}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9 h-9 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
              placeholder="Search post name or zone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Duty Points Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-enhanced">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 text-center">
                  #
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[260px]">
                  Duty Point / Post
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[200px]">
                  Zone / Sector
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28 text-center">
                  Status
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-36 text-center">
                  Guards Assigned
                </th>
                {isSupervisor && (
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28 text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={isSupervisor ? 6 : 5} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
                    <p>Loading duty points roster...</p>
                  </td>
                </tr>
              ) : sortedAndFiltered.length === 0 ? (
                <tr>
                  <td colSpan={isSupervisor ? 6 : 5} className="py-12 text-center text-slate-400">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No duty points matching &quot;{search}&quot;</p>
                  </td>
                </tr>
              ) : (
                sortedAndFiltered.map((dp, idx) => {
                  const officialIndex = OFFICIAL_ORDER.findIndex(
                    (name) => name.toLowerCase() === dp.name.toLowerCase()
                  )
                  const displayIndex = officialIndex !== -1 ? officialIndex + 1 : idx + 1
                  const isSpecial = dp.name.includes('*')

                  return (
                    <tr
                      key={dp.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-150 group"
                    >
                      {/* # Number Index */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-700 dark:group-hover:bg-teal-950/60 dark:group-hover:text-teal-300 transition-colors">
                          {displayIndex < 10 ? `0${displayIndex}` : displayIndex}
                        </span>
                      </td>

                      {/* Post Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60 shrink-0">
                            <Building className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {dp.name}
                              </span>
                              {isSpecial && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  PSTM / Special
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400">Post ID: {dp.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Zone Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                            ZONE_BADGES[dp.zone?.name] ||
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200'
                          }`}
                        >
                          <Layers className="h-3 w-3 opacity-60" />
                          {dp.zone?.name || 'Unassigned Zone'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                            dp.isActive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              dp.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          {dp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Assigned Guards Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {dp._count?.guards ?? 0}{' '}
                          {(dp._count?.guards ?? 0) === 1 ? 'guard' : 'guards'}
                        </span>
                      </td>

                      {/* Actions */}
                      {isSupervisor && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(dp)}
                              className="h-8 px-2 text-xs text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 gap-1"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeactivatingPoint(dp)}
                              className="h-8 w-8 text-slate-400 hover:text-rose-600"
                              title="Deactivate Duty Point"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Bar */}
        <div className="py-3 px-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800 dark:text-slate-200">{sortedAndFiltered.length}</strong> of{' '}
            <strong className="text-slate-800 dark:text-slate-200">{dutyPoints.length}</strong> official posts
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Pentecost Convention Centre Security Division
          </span>
        </div>
      </Card>

      {/* Add / Edit Duty Point Modal */}
      <Dialog
        open={showAddModal || !!editingPoint}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false)
            setEditingPoint(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white">
              {editingPoint ? 'Edit Duty Post' : 'Add Duty Point'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingPoint
                ? 'Update security post details and campus sector allocation'
                : 'Create a new monitored security post or patrol beat'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDutyPoint} className="space-y-4 py-2">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-medium">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="postName" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Duty Post / Building Name *
              </Label>
              <Input
                id="postName"
                required
                placeholder="e.g. Samuel Richard Asomaning Block"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-sm bg-slate-50 dark:bg-slate-800/80"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="zoneId" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Assigned Zone / Campus Sector *
              </Label>
              <Select
                value={formData.zoneId}
                onValueChange={(val) => setFormData({ ...formData, zoneId: val })}
              >
                <SelectTrigger className="text-sm bg-slate-50 dark:bg-slate-800/80">
                  <SelectValue placeholder="Select campus zone..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {zones.length === 0 ? (
                    <div className="p-2 text-xs text-slate-400 text-center">No zones available</div>
                  ) : (
                    zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {editingPoint && (
              <div className="space-y-1.5">
                <Label htmlFor="isActive" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Post Active Status
                </Label>
                <Select
                  value={formData.isActive ? 'true' : 'false'}
                  onValueChange={(val) => setFormData({ ...formData, isActive: val === 'true' })}
                >
                  <SelectTrigger className="text-sm bg-slate-50 dark:bg-slate-800/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">ACTIVE (In Service)</SelectItem>
                    <SelectItem value="false">INACTIVE (Decommissioned)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddModal(false)
                  setEditingPoint(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={formSubmitting}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
              >
                {formSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Duty Point'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={!!deactivatingPoint}
        onOpenChange={(open) => !open && setDeactivatingPoint(null)}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              Deactivate Duty Post
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to deactivate <strong>{deactivatingPoint?.name}</strong>?
              It will be hidden from active attendance rosters until re-enabled.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeactivatingPoint(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={formSubmitting}
              onClick={handleDeactivate}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {formSubmitting ? 'Deactivating...' : 'Confirm Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
