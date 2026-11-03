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
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  ChevronRight,
  ChevronLeft,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldOff
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { StatusBadge } from '@/components/ui/status-badge'
import { TableRowSkeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import Link from 'next/link'

interface DutyPoint {
  id: string
  name: string
}

interface Guard {
  id: string
  fullName: string
  badgeId: string
  phone: string | null
  status: string
  defaultDutyPointId?: string | null
  defaultDutyPoint: { id?: string; name: string } | null
  photoUrl: string | null
}

export default function GuardsPage() {
  const { data: session } = useSession()
  const [guards, setGuards] = useState<Guard[]>([])
  const [dutyPoints, setDutyPoints] = useState<DutyPoint[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGuard, setEditingGuard] = useState<Guard | null>(null)
  const [deletingGuard, setDeletingGuard] = useState<Guard | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Form fields
  const [formData, setFormData] = useState({
    fullName: '',
    badgeId: '',
    phone: '',
    status: 'ACTIVE',
    defaultDutyPointId: '',
    photoUrl: '',
  })

  useEffect(() => {
    fetchGuards()
    fetchDutyPoints()
  }, [])

  // Reset to page 1 whenever search or status filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  const fetchGuards = async () => {
    try {
      // Fetch ALL guards (active + inactive) so the Inactive tab works
      const res = await fetch('/api/guards?status=ALL')
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

  const handleOpenAdd = () => {
    setFormData({
      fullName: '',
      badgeId: (() => {
        const existingNums = guards
          .map(g => parseInt(g.badgeId.replace(/\D/g, '')) || 0)
          .filter(n => n > 0)
        const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0
        return `GT-${String(maxNum + 1).padStart(3, '0')}`
      })(),
      phone: '',
      status: 'ACTIVE',
      defaultDutyPointId: dutyPoints[0]?.id || '',
      photoUrl: '',
    })
    setFormError('')
    setShowAddModal(true)
  }

  const handleOpenEdit = (guard: Guard) => {
    setEditingGuard(guard)
    setFormData({
      fullName: guard.fullName,
      badgeId: guard.badgeId,
      phone: guard.phone || '',
      status: guard.status,
      defaultDutyPointId: guard.defaultDutyPointId || guard.defaultDutyPoint?.id || '',
      photoUrl: guard.photoUrl || '',
    })
    setFormError('')
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // For now, convert to base64 for demo (in production, use a proper image hosting service)
    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, photoUrl: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleSaveGuard = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true)
    setFormError('')

    try {
      const isEdit = !!editingGuard
      const url = isEdit ? `/api/guards/${editingGuard.id}` : '/api/guards'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          badgeId: formData.badgeId,
          phone: formData.phone || null,
          status: formData.status,
          defaultDutyPointId: formData.defaultDutyPointId || null,
          photoUrl: formData.photoUrl || null,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || errData.details?.[0]?.message || 'Failed to save guard')
      }

      setShowAddModal(false)
      setEditingGuard(null)
      toast.success(isEdit ? 'Guard details updated' : 'New guard added to directory')
      await fetchGuards()
    } catch (err: any) {
      setFormError(err.message)
      toast.error(err.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  /** Quick-reactivate a guard without opening the full edit form */
  const handleQuickReactivate = async (guard: Guard) => {
    try {
      const res = await fetch(`/api/guards/${guard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: guard.fullName,
          badgeId: guard.badgeId,
          phone: guard.phone || null,
          status: 'ACTIVE',
          defaultDutyPointId: guard.defaultDutyPointId || guard.defaultDutyPoint?.id || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to reactivate guard')
      toast.success(`${guard.fullName} reactivated and restored to roster`)
      await fetchGuards()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDeleteGuard = async () => {
    if (!deletingGuard) return
    setFormSubmitting(true)

    try {
      const res = await fetch(`/api/guards/${deletingGuard.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete guard')
      }

      setDeletingGuard(null)
      toast.success('Guard removed from active roster')
      await fetchGuards()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const PAGE_SIZE = 20

  const [currentPage, setCurrentPage] = useState(1)

  const filteredGuards = useMemo(() => {
    return guards.filter((guard) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        guard.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guard.badgeId.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus =
        statusFilter === 'ALL' || guard.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [guards, searchQuery, statusFilter])

  // Reset to page 1 whenever filter/search changes
  const totalPages = Math.max(1, Math.ceil(filteredGuards.length / PAGE_SIZE))
  const pagedGuards = filteredGuards.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const isSupervisor = session?.user?.role === 'SUPERVISOR'

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Operations' },
          { label: 'Guard Personnel' },
        ]}
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <PageHeader
        icon={Users}
        title="Guard Personnel"
        description="Security personnel registry, badge assignments, and default posts"
        color="blue"
        stats={[
          { label: 'Total Guards', value: guards.length },
          { label: 'Active', value: guards.filter((g) => g.status === 'ACTIVE').length },
          { label: 'Inactive', value: guards.filter((g) => g.status === 'INACTIVE').length },
        ]}
        actions={
          isSupervisor ? (
            <Button
              onClick={handleOpenAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Guard
            </Button>
          ) : undefined
        }
      />

      <Card className="animate-fade-in-up border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Toolbar: Search + Status Tabs */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => {
              const count =
                st === 'ALL'
                  ? guards.length
                  : guards.filter((g) => g.status === st).length
              const isSelected = statusFilter === st

              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {st === 'ALL' ? 'All Personnel' : st === 'ACTIVE' ? 'Active' : 'Inactive'} ({count})
                </button>
              )
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9 h-9 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
              placeholder="Search name or badge ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Guard List */}
        <CardContent className="p-0">
          {loading ? (
            <div className="p-2">
              <TableRowSkeleton rows={8} cols={4} />
            </div>
          ) : filteredGuards.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No guards match the current filter.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagedGuards.map((guard) => (
                  <div
                    key={guard.id}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all duration-150 gap-3"
                  >
                    <Link
                      href={`/guards/${guard.id}`}
                      className="flex items-center gap-3.5 flex-1 min-w-0"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-950/40 dark:group-hover:text-blue-400 transition-colors">
                        {guard.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {guard.fullName}
                          </p>
                          <span className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium">
                            {guard.badgeId}
                          </span>
                          <StatusBadge status={guard.status} />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            {guard.defaultDutyPoint?.name || 'Unassigned Post'}
                          </span>
                          {guard.phone ? (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                              {guard.phone}
                            </span>
                          ) : (
                            <span className="text-slate-400">No phone</span>
                          )}
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                      {isSupervisor && (
                        <>
                          {/* Quick reactivate button for inactive guards */}
                          {guard.status === 'INACTIVE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQuickReactivate(guard)}
                              className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1"
                              title="Reactivate this guard"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Reactivate
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(guard)}
                            className="h-8 px-2 text-xs text-slate-500 hover:text-blue-600 gap-1"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingGuard(guard)}
                            className="h-8 w-8 text-slate-400 hover:text-rose-600"
                            title="Deactivate / Delete Guard"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Link
                        href={`/guards/${guard.id}`}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                  <p className="text-xs text-slate-500">
                    Showing{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredGuards.length)}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredGuards.length}</span>{' '}
                    guards
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                          page === currentPage
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Guard Dialog Modal */}
      <Dialog
        open={showAddModal || !!editingGuard}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false)
            setEditingGuard(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white">
              {editingGuard ? 'Edit Guard Personnel' : 'Add New Security Guard'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingGuard
                ? 'Update credentials, phone number, and default post assignment'
                : 'Register a new guard with official badge credentials'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGuard} className="space-y-4 py-2">
            {/* Inactive guard warning banner */}
            {editingGuard?.status === 'INACTIVE' && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <ShieldOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Guard is currently INACTIVE</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Change &ldquo;Operational Status&rdquo; below to <strong>ACTIVE</strong> to restore them to the roster, or click the button:
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'ACTIVE' }))}
                    className="mt-2 h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Set to ACTIVE
                  </Button>
                </div>
              </div>
            )}

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-medium">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Full Legal Name *
              </Label>
              <Input
                id="fullName"
                required
                placeholder="e.g. Samuel K. Mensah"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="text-sm bg-slate-50 dark:bg-slate-800/80"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="badgeId" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Badge ID *
                </Label>
                <Input
                  id="badgeId"
                  required
                  placeholder="e.g. GT-005"
                  value={formData.badgeId}
                  onChange={(e) => setFormData({ ...formData, badgeId: e.target.value })}
                  className="text-sm font-mono bg-slate-50 dark:bg-slate-800/80"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  placeholder="e.g. 0244123456"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="text-sm font-mono bg-slate-50 dark:bg-slate-800/80"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dutyPoint" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Default Duty Post Assignment
              </Label>
              <Select
                value={formData.defaultDutyPointId}
                onValueChange={(val) => setFormData({ ...formData, defaultDutyPointId: val })}
              >
                <SelectTrigger className="text-sm bg-slate-50 dark:bg-slate-800/80">
                  <SelectValue placeholder="Select duty post..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="">-- None (Unassigned) --</SelectItem>
                  {dutyPoints.map((dp) => (
                    <SelectItem key={dp.id} value={dp.id}>
                      {dp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="photo" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Guard Photo
              </Label>
              <div className="flex items-start gap-3">
                {formData.photoUrl && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                    <img
                      src={formData.photoUrl}
                      alt="Guard photo preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-sm bg-slate-50 dark:bg-slate-800/80"
                  />
                  <p className="text-[10px] text-slate-400">
                    For demo: images stored as base64. In production, use a proper image hosting service.
                  </p>
                  {formData.photoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                      className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      Remove Photo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Operational Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="text-sm bg-slate-50 dark:bg-slate-800/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE (On Roster)</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE (Off Roster)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddModal(false)
                  setEditingGuard(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={formSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {formSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Guard'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete / Deactivate Confirmation Dialog */}
      <Dialog open={!!deletingGuard} onOpenChange={(open) => !open && setDeletingGuard(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              Remove Guard Personnel
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to remove <strong>{deletingGuard?.fullName}</strong> ({deletingGuard?.badgeId})?
              If this guard has past attendance records, their status will be set to <strong>INACTIVE</strong> to preserve audit logs.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingGuard(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={formSubmitting}
              onClick={handleDeleteGuard}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {formSubmitting ? 'Removing...' : 'Confirm Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
