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
  ShieldOff,
  Calendar,
  Upload,
  Download,
  ArrowUpDown
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { StatusBadge } from '@/components/ui/status-badge'
import { TableRowSkeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import Link from 'next/link'
import { uploadGuardPhoto, previewUrl, revokePreview } from '@/lib/image-upload'

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
  shiftType: string
  designation: string | null
  excludeFromDuty: boolean
  startDate: string | null
}

// Human-readable service length from start date, e.g. "2y 3m", "8m", "New"
function getTenure(startDate: string | null): string | null {
  if (!startDate) return null
  const start = new Date(startDate)
  if (isNaN(start.getTime())) return null
  const now = new Date()
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (now.getDate() < start.getDate()) months -= 1
  if (months < 0) months = 0
  if (months < 1) return 'New'
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem}m`
  if (rem === 0) return `${years}y`
  return `${years}y ${rem}m`
}

export default function GuardsPage() {
  const { data: session } = useSession()
  const [guards, setGuards] = useState<Guard[]>([])
  const [dutyPoints, setDutyPoints] = useState<DutyPoint[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [shiftTypeFilter, setShiftTypeFilter] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL')
  const [sortMode, setSortMode] = useState<'name' | 'badge' | 'newest' | 'status'>('name')
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGuard, setEditingGuard] = useState<Guard | null>(null)
  const [deletingGuard, setDeletingGuard] = useState<Guard | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Form fields
  const [formData, setFormData] = useState({
    fullName: '',
    badgeId: '',
    phone: '',
    status: 'ACTIVE',
    defaultDutyPointId: '',
    photoUrl: '',
    shiftType: 'BOTH',
    designation: '',
    excludeFromDuty: false,
    startDate: '',
  })

  useEffect(() => {
    fetchGuards()
    fetchDutyPoints()
  }, [])

  // Reset to page 1 whenever search or status filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, shiftTypeFilter, sortMode])

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
      shiftType: 'BOTH',
      designation: '',
      excludeFromDuty: false,
      startDate: new Date().toISOString().split('T')[0],
    })
    setFormError('')
    setPhotoPreview(null)
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
      shiftType: guard.shiftType || 'BOTH',
      designation: guard.designation || '',
      excludeFromDuty: guard.excludeFromDuty || false,
      startDate: guard.startDate ? new Date(guard.startDate).toISOString().split('T')[0] : '',
    })
    setFormError('')
    setPhotoPreview(null)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    const preview = previewUrl(file)
    setPhotoPreview(preview)
    setUploadingPhoto(true)
    try {
      const url = await uploadGuardPhoto(file)
      setFormData(prev => ({ ...prev, photoUrl: url }))
      toast.success('Photo uploaded')
    } catch (err: any) {
      setPhotoPreview(null)
      revokePreview(preview)
      toast.error(err.message || 'Photo upload failed')
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
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
          shiftType: formData.shiftType,
          designation: formData.designation || null,
          excludeFromDuty: formData.excludeFromDuty,
          startDate: formData.startDate ? new Date(formData.startDate) : null,
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
          shiftType: guard.shiftType || 'BOTH',
          designation: guard.designation || null,
          excludeFromDuty: guard.excludeFromDuty || false,
          startDate: guard.startDate,
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

      const data = await res.json().catch(() => ({}))
      setDeletingGuard(null)
      toast.success(
        data.deactivated
          ? 'Guard has related records — marked INACTIVE to preserve history'
          : 'Guard permanently deleted'
      )
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
    const filtered = guards.filter((guard) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        guard.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guard.badgeId.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus =
        statusFilter === 'ALL' || guard.status === statusFilter

      const matchesShiftType =
        shiftTypeFilter === 'ALL' || guard.shiftType === shiftTypeFilter

      return matchesSearch && matchesStatus && matchesShiftType
    })

    const sorted = [...filtered]
    switch (sortMode) {
      case 'badge':
        sorted.sort((a, b) => a.badgeId.localeCompare(b.badgeId, undefined, { numeric: true }))
        break
      case 'newest':
        sorted.sort((a, b) => {
          const da = a.startDate ? new Date(a.startDate).getTime() : 0
          const db = b.startDate ? new Date(b.startDate).getTime() : 0
          return db - da
        })
        break
      case 'status':
        sorted.sort((a, b) => a.status.localeCompare(b.status) || a.fullName.localeCompare(b.fullName))
        break
      default:
        sorted.sort((a, b) => a.fullName.localeCompare(b.fullName))
    }
    return sorted
  }, [guards, searchQuery, statusFilter, shiftTypeFilter, sortMode])

  // Export filtered guard list as CSV
  const exportGuardsCSV = () => {
    if (filteredGuards.length === 0) {
      toast.warning('No guards to export for the current filter.')
      return
    }
    try {
      const headers = ['Full Name', 'Badge ID', 'Phone', 'Status', 'Shift Type', 'Duty Point', 'Start Date']
      const rows = filteredGuards.map((g) => [
        `"${g.fullName}"`,
        `"${g.badgeId}"`,
        `"${g.phone || ''}"`,
        `"${g.status}"`,
        `"${g.shiftType === 'DAY' ? 'Day' : g.shiftType === 'NIGHT' ? 'Night' : 'Both'}"`,
        `"${g.defaultDutyPoint?.name || 'Unassigned'}"`,
        `"${g.startDate ? new Date(g.startDate).toISOString().slice(0, 10) : ''}"`,
      ])
      const csvContent = [
        'PCC Security Department - Guard Personnel Roster',
        `Exported: ${new Date().toLocaleString()}`,
        `Total Guards: ${filteredGuards.length}`,
        '',
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pcc-guard-personnel-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Guard list exported to CSV')
    } catch {
      toast.error('Failed to export CSV')
    }
  }

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
        {/* Toolbar: Search + Status Tabs + Shift Type Filter */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-8 w-[140px] text-xs bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Personnel ({guards.length})</SelectItem>
                <SelectItem value="ACTIVE">Active ({guards.filter((g) => g.status === 'ACTIVE').length})</SelectItem>
                <SelectItem value="INACTIVE">Inactive ({guards.filter((g) => g.status === 'INACTIVE').length})</SelectItem>
              </SelectContent>
            </Select>
            <Select value={shiftTypeFilter} onValueChange={(v) => setShiftTypeFilter(v as typeof shiftTypeFilter)}>
              <SelectTrigger className="h-8 w-[130px] text-xs bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Shifts ({guards.length})</SelectItem>
                <SelectItem value="DAY">Day Shift ({guards.filter((g) => g.shiftType === 'DAY').length})</SelectItem>
                <SelectItem value="NIGHT">Night Shift ({guards.filter((g) => g.shiftType === 'NIGHT').length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9 h-9 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                placeholder="Search name or badge ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as typeof sortMode)}>
              <SelectTrigger className="h-9 w-[130px] text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A–Z</SelectItem>
                <SelectItem value="badge">Badge ID</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={exportGuardsCSV}
              className="h-9 text-xs gap-1.5 shrink-0"
              title="Export filtered guard list as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
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
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-950/40 dark:group-hover:text-blue-400 transition-colors flex items-center justify-center">
                        {guard.photoUrl ? (
                          <img
                            src={guard.photoUrl}
                            alt={guard.fullName}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          guard.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {guard.fullName}
                          </p>
                          <span className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium">
                            {guard.badgeId}
                          </span>
                          {guard.designation && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60">
                              ★ {guard.designation}
                            </span>
                          )}
                          {guard.excludeFromDuty && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Non-duty
                            </span>
                          )}
                          <StatusBadge status={guard.status} />
                          {guard.shiftType && guard.shiftType !== 'BOTH' && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${guard.shiftType === 'DAY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'}`}>
                              {guard.shiftType === 'DAY' ? 'DS' : 'NS'}
                            </span>
                          )}
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
                          {guard.startDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                              {new Date(guard.startDate).toLocaleDateString()}
                              {getTenure(guard.startDate) && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                  {getTenure(guard.startDate)}
                                </span>
                              )}
                            </span>
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
                          {guard.status === 'INACTIVE' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingGuard(guard)}
                              className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1"
                              title="Permanently delete this guard"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingGuard(guard)}
                              className="h-8 w-8 text-slate-400 hover:text-rose-600"
                              title="Deactivate / Delete Guard"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
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

            {/* Guard Photo - centered at top */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {(photoPreview || formData.photoUrl) ? (
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 relative">
                    <img
                      src={photoPreview || formData.photoUrl}
                      alt="Guard photo preview"
                      className="w-full h-full object-cover object-top"
                    />
                    {uploadingPhoto && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
                    <User className="h-9 w-9 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-1.5 w-full">
                <Label htmlFor="photo" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Guard Photo
                </Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Label
                  htmlFor="photo"
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                    uploadingPhoto
                      ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingPhoto ? 'Uploading...' : (photoPreview || formData.photoUrl) ? 'Change Photo' : 'Choose Photo'}
                </Label>
                <p className="text-[10px] text-slate-400 text-center">
                  {uploadingPhoto ? 'Uploading photo...' : 'JPG, PNG or WebP. Photos are compressed and stored securely.'}
                </p>
                {formData.photoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setFormData(prev => ({ ...prev, photoUrl: '' })); setPhotoPreview(null) }}
                    className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    Remove Photo
                  </Button>
                )}
              </div>
            </div>

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
              <Label htmlFor="shiftType" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Shift Assignment
              </Label>
              <Select
                value={formData.shiftType}
                onValueChange={(val) => setFormData({ ...formData, shiftType: val })}
              >
                <SelectTrigger className="text-sm bg-slate-50 dark:bg-slate-800/80">
                  <SelectValue placeholder="Select shift type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAY">Day Shift Only (DS)</SelectItem>
                  <SelectItem value="NIGHT">Night Shift Only (NS)</SelectItem>
                  <SelectItem value="BOTH">Both Shifts (Day & Night)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-400">
                Assign guards to day shift, night shift, or both shifts
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="designation" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Designation / Title
              </Label>
              <Input
                id="designation"
                type="text"
                placeholder="e.g. Day Supervisor, 2nd in Command"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="text-sm bg-slate-50 dark:bg-slate-800/80"
              />
              <p className="text-[10px] text-slate-400">
                Optional title shown as a badge on rosters
              </p>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
              <input
                id="excludeFromDuty"
                type="checkbox"
                checked={formData.excludeFromDuty}
                onChange={(e) => setFormData({ ...formData, excludeFromDuty: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="excludeFromDuty" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <span className="font-semibold">Non-duty staff</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  Exclude from duty assignments and rosters (e.g. senior supervisors who don't take posts)
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="text-sm bg-slate-50 dark:bg-slate-800/80"
              />
              <p className="text-[10px] text-slate-400">
                Date when the guard started their duties
              </p>
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
              {deletingGuard?.status === 'INACTIVE'
                ? ' This guard is inactive — they will be permanently deleted unless they have related records, in which case they remain inactive to preserve history.'
                : ' If this guard has past attendance or leave records, their status will be set to INACTIVE to preserve history.'}
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
