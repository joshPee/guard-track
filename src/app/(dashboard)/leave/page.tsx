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
  X,
  Edit2,
  Trash2,
  Calendar,
  CalendarCheck,
  CalendarX,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  FileBadge,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Shield,
  RefreshCw,
  Phone,
  MapPin,
  Check,
  Loader2,
  Send,
  Sparkles
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { TableRowSkeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { format, differenceInCalendarDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns'

interface Guard {
  id: string
  fullName: string
  badgeId: string
  phone: string | null
  status: string
  defaultDutyPoint?: { name: string } | null
}

interface LeaveRecord {
  id: string
  guardId: string
  guardName: string
  guardBadgeId: string
  guardPhone: string | null
  guardStatus: string
  dutyPointName: string | null
  type: 'CASUAL' | 'EXCUSED_CLINIC' | 'EXEAT' | 'EMERGENCY' | 'ANNUAL' | 'OFF_DUTY'
  startDate: string
  endDate: string
  reason: string | null
  refNumber: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  approvedBy: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

const PAGE_SIZE = 15

export default function LeaveManagementPage() {
  const { data: session } = useSession()
  const isSupervisor = session?.user?.role === 'SUPERVISOR'

  const [records, setRecords] = useState<LeaveRecord[]>([])
  const [guards, setGuards] = useState<Guard[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    activeToday: 0,
    pending: 0,
    approved: 0,
    clinicExcused: 0,
    exeat: 0,
  })

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE_TODAY' | 'PENDING' | 'APPROVED' | 'CLINIC_EXEAT' | 'REJECTED'>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [currentPage, setCurrentPage] = useState(1)

  // Dialog states
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<LeaveRecord | null>(null)
  const [deletingRecord, setDeletingRecord] = useState<LeaveRecord | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Form fields
  const [formData, setFormData] = useState({
    guardId: '',
    type: 'CASUAL',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
    refNumber: '',
    reason: '',
    status: 'PENDING',
    notes: '',
  })

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true)
      const [leaveRes, guardsRes] = await Promise.all([
        fetch('/api/leave'),
        fetch('/api/guards?status=ALL'),
      ])

      if (leaveRes.ok) {
        const data = await leaveRes.json()
        setRecords(data.records || [])
        if (data.stats) setStats(data.stats)
      }

      if (guardsRes.ok) {
        const guardsData = await guardsRes.json()
        setGuards(guardsData || [])
      }
    } catch (err) {
      console.error('Failed to load leave records:', err)
      toast.error('Failed to load leave records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusTab, typeFilter])

  // Filtered records
  const filteredRecords = useMemo(() => {
    const today = new Date()
    return records.filter((r) => {
      // Status Tab filter
      if (statusTab === 'ACTIVE_TODAY') {
        if (r.status !== 'APPROVED') return false
        const s = new Date(r.startDate)
        const e = new Date(r.endDate)
        e.setHours(23, 59, 59, 999)
        if (today < s || today > e) return false
      } else if (statusTab === 'PENDING') {
        if (r.status !== 'PENDING') return false
      } else if (statusTab === 'APPROVED') {
        if (r.status !== 'APPROVED') return false
      } else if (statusTab === 'CLINIC_EXEAT') {
        if (r.type !== 'EXCUSED_CLINIC' && r.type !== 'EXEAT') return false
      } else if (statusTab === 'REJECTED') {
        if (r.status !== 'REJECTED' && r.status !== 'CANCELLED') return false
      }

      // Type filter
      if (typeFilter !== 'ALL' && r.type !== typeFilter) {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match =
          r.guardName?.toLowerCase().includes(q) ||
          r.guardBadgeId?.toLowerCase().includes(q) ||
          r.refNumber?.toLowerCase().includes(q) ||
          r.reason?.toLowerCase().includes(q) ||
          r.dutyPointName?.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [records, statusTab, typeFilter, searchQuery])

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE) || 1
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredRecords.slice(start, start + PAGE_SIZE)
  }, [filteredRecords, currentPage])

  // Auto-generate reference request code
  const generateRefCode = (type: string, recordsList: LeaveRecord[] = records) => {
    const prefixMap: Record<string, string> = {
      EXEAT: 'EX',
      EXCUSED_CLINIC: 'MED',
      CASUAL: 'LV',
      ANNUAL: 'ANN',
      EMERGENCY: 'EMG',
      OFF_DUTY: 'OFF',
    }
    const prefix = prefixMap[type] || 'REQ'
    const year = new Date().getFullYear()

    let maxSeq = 0
    for (const r of recordsList) {
      if (r.refNumber) {
        const cleaned = r.refNumber.toUpperCase()
        if (cleaned.startsWith(prefix) || (prefix === 'MED' && (cleaned.startsWith('CL') || cleaned.includes('CL-')))) {
          const matches = cleaned.match(/(\d+)$/)
          if (matches) {
            const num = parseInt(matches[1], 10)
            if (!isNaN(num) && num > maxSeq) {
              maxSeq = num
            }
          }
        }
      }
    }

    const nextNum = String(maxSeq + 1).padStart(3, '0')
    return `${prefix}-${year}-${nextNum}`
  }

  // Open Add Dialog
  const handleOpenAdd = () => {
    setEditingRecord(null)
    const initialType = 'CASUAL'
    setFormData({
      guardId: guards[0]?.id || '',
      type: initialType,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
      refNumber: generateRefCode(initialType),
      reason: '',
      status: isSupervisor ? 'APPROVED' : 'PENDING',
      notes: '',
    })
    setFormError('')
    setShowModal(true)
  }

  // Open Edit Dialog
  const handleOpenEdit = (rec: LeaveRecord) => {
    setEditingRecord(rec)
    setFormData({
      guardId: rec.guardId,
      type: rec.type,
      startDate: format(new Date(rec.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(rec.endDate), 'yyyy-MM-dd'),
      refNumber: rec.refNumber || '',
      reason: rec.reason || '',
      status: rec.status,
      notes: rec.notes || '',
    })
    setFormError('')
    setShowModal(true)
  }

  // Submit Save/Update
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true)
    setFormError('')

    try {
      const isEdit = !!editingRecord
      const url = isEdit ? `/api/leave/${editingRecord.id}` : '/api/leave'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to save leave record')
      }

      toast.success(isEdit ? 'Leave record updated' : 'New leave / exeat registered')
      setShowModal(false)
      setEditingRecord(null)
      await fetchData()
    } catch (err: any) {
      setFormError(err.message)
      toast.error(err.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  // Quick Approve
  const handleQuickApprove = async (rec: LeaveRecord) => {
    try {
      const res = await fetch(`/api/leave/${rec.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })
      if (!res.ok) throw new Error('Failed to approve')
      toast.success(`Leave approved for ${rec.guardName}`)
      await fetchData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Quick Reject
  const handleQuickReject = async (rec: LeaveRecord) => {
    try {
      const res = await fetch(`/api/leave/${rec.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      })
      if (!res.ok) throw new Error('Failed to reject')
      toast.success(`Leave request rejected`)
      await fetchData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Delete Record
  const handleDelete = async () => {
    if (!deletingRecord) return
    setFormSubmitting(true)
    try {
      const res = await fetch(`/api/leave/${deletingRecord.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Leave record removed')
      setDeletingRecord(null)
      await fetchData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  // Type badge styling helper
  const getTypeBadge = (type: LeaveRecord['type']) => {
    switch (type) {
      case 'EXCUSED_CLINIC':
        return {
          label: 'Clinic Excuse',
          icon: Stethoscope,
          bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
        }
      case 'EXEAT':
        return {
          label: 'Campus Exeat',
          icon: FileBadge,
          bg: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60',
        }
      case 'EMERGENCY':
        return {
          label: 'Emergency Leave',
          icon: AlertCircle,
          bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
        }
      case 'ANNUAL':
        return {
          label: 'Annual Leave',
          icon: CalendarCheck,
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/60',
        }
      case 'OFF_DUTY':
        return {
          label: 'Off-Duty Roster',
          icon: Clock,
          bg: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        }
      case 'CASUAL':
      default:
        return {
          label: 'Casual Leave',
          icon: FileText,
          bg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/60',
        }
    }
  }

  // Status badge styling helper
  const getStatusBadge = (status: LeaveRecord['status']) => {
    switch (status) {
      case 'APPROVED':
        return {
          label: 'Approved',
          icon: CheckCircle2,
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        }
      case 'PENDING':
        return {
          label: 'Pending Review',
          icon: Clock,
          bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        }
      case 'REJECTED':
        return {
          label: 'Rejected',
          icon: XCircle,
          bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
        }
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          icon: CalendarX,
          bg: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        }
    }
  }

  // Active today badge check
  const isCurrentlyActive = (rec: LeaveRecord) => {
    if (rec.status !== 'APPROVED') return false
    const now = new Date()
    const s = new Date(rec.startDate)
    const e = new Date(rec.endDate)
    e.setHours(23, 59, 59, 999)
    return now >= s && now <= e
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Operations', href: '/attendance' },
          { label: 'Leave & Exeats' },
        ]}
      />

      {/* Header Banner */}
      <PageHeader
        icon={CalendarCheck}
        color="emerald"
        title="Leave & Exeat Register"
        subtitle="Manage official campus exeat forms, clinic excuse duty slips, and scheduled guard leaves"
        badge="Security Personnel Ops"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="h-9 gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/80"
              title="Refresh records"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {isSupervisor && (
              <Button
                size="sm"
                onClick={handleOpenAdd}
                className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>New Exeat / Leave</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 shrink-0">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">On Leave Today</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{stats.activeToday}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">Pending Review</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{stats.pending}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 shrink-0">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">Clinic Excuses</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{stats.clinicExcused}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 shrink-0">
              <FileBadge className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">Total Exeats & Leaves</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{stats.total}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & List Card */}
      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 space-y-3">
          {/* Top Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-xs">
            <button
              onClick={() => setStatusTab('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                statusTab === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Records ({stats.total})
            </button>
            <button
              onClick={() => setStatusTab('ACTIVE_TODAY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                statusTab === 'ACTIVE_TODAY'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Today ({stats.activeToday})
            </button>
            <button
              onClick={() => setStatusTab('PENDING')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                statusTab === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setStatusTab('APPROVED')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                statusTab === 'APPROVED'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Approved ({stats.approved})
            </button>
            <button
              onClick={() => setStatusTab('CLINIC_EXEAT')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                statusTab === 'CLINIC_EXEAT'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Clinic & Exeats ({stats.clinicExcused + stats.exeat})
            </button>
            <button
              onClick={() => setStatusTab('REJECTED')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                statusTab === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Rejected
            </button>
          </div>

          {/* Search Bar & Type Filter */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by guard name, badge ID (e.g. GT-008), slip/exeat #, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="w-full sm:w-56 shrink-0">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Filter by Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Leave Types</SelectItem>
                  <SelectItem value="CASUAL">Casual Leave</SelectItem>
                  <SelectItem value="EXCUSED_CLINIC">Clinic Excuse (Medical)</SelectItem>
                  <SelectItem value="EXEAT">Campus Exeat Slip</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency Leave</SelectItem>
                  <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                  <SelectItem value="OFF_DUTY">Off-Duty Rest Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-2">
              <TableRowSkeleton rows={6} cols={5} />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No records found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                {searchQuery
                  ? `No applications matched "${searchQuery}". Try clearing search filters.`
                  : 'No leave applications or exeat slips match the selected filter category.'}
              </p>
              {isSupervisor && !searchQuery && (
                <Button
                  size="sm"
                  onClick={handleOpenAdd}
                  className="mt-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Register First Exeat / Leave
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Guard Personnel</th>
                      <th className="py-3 px-3">Type & Ref</th>
                      <th className="py-3 px-3">Duration & Dates</th>
                      <th className="py-3 px-3">Reason / Details</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedRecords.map((rec) => {
                      const typeBadge = getTypeBadge(rec.type)
                      const statusBadge = getStatusBadge(rec.status)
                      const isToday = isCurrentlyActive(rec)
                      const startDateObj = new Date(rec.startDate)
                      const endDateObj = new Date(rec.endDate)
                      const days = Math.max(1, differenceInCalendarDays(endDateObj, startDateObj) + 1)
                      const TypeIcon = typeBadge.icon
                      const StatusIcon = statusBadge.icon

                      return (
                        <tr
                          key={rec.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0">
                                {rec.guardName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-white truncate">
                                    {rec.guardName}
                                  </span>
                                  {isToday && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                      Active Today
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                  <span className="font-mono font-medium text-slate-600 dark:text-slate-400">
                                    {rec.guardBadgeId}
                                  </span>
                                  {rec.dutyPointName && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate">{rec.dutyPointName}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${typeBadge.bg}`}
                              >
                                <TypeIcon className="h-3 w-3" />
                                {typeBadge.label}
                              </span>
                              {rec.refNumber && (
                                <div className="text-[11px] font-mono text-slate-500">
                                  Ref: <span className="font-semibold text-slate-700 dark:text-slate-300">{rec.refNumber}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="space-y-0.5">
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {format(startDateObj, 'MMM d, yyyy')} – {format(endDateObj, 'MMM d, yyyy')}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {days} {days === 1 ? 'day' : 'days'}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 max-w-xs">
                            <p className="text-slate-700 dark:text-slate-300 text-xs line-clamp-2">
                              {rec.reason || <span className="text-slate-400 italic">No reason stated</span>}
                            </p>
                            {rec.notes && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                Note: {rec.notes}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadge.bg}`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {statusBadge.label}
                              </span>
                              {rec.approvedBy && (
                                <div className="text-[10px] text-slate-400">
                                  by {rec.approvedBy}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isSupervisor && rec.status === 'PENDING' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleQuickApprove(rec)}
                                    className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                    title="Approve leave"
                                  >
                                    <Check className="h-3 w-3" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleQuickReject(rec)}
                                    className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 border-rose-200 dark:border-rose-900"
                                    title="Reject leave"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              )}

                              {isSupervisor && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEdit(rec)}
                                    className="h-7 px-2 text-[11px] text-slate-500 hover:text-blue-600"
                                    title="Edit record"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingRecord(rec)}
                                    className="h-7 px-2 text-[11px] text-slate-400 hover:text-rose-600"
                                    title="Delete record"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedRecords.map((rec) => {
                  const typeBadge = getTypeBadge(rec.type)
                  const statusBadge = getStatusBadge(rec.status)
                  const isToday = isCurrentlyActive(rec)
                  const startDateObj = new Date(rec.startDate)
                  const endDateObj = new Date(rec.endDate)
                  const days = Math.max(1, differenceInCalendarDays(endDateObj, startDateObj) + 1)
                  const TypeIcon = typeBadge.icon
                  const StatusIcon = statusBadge.icon

                  return (
                    <div key={rec.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              {rec.guardName}
                            </span>
                            <span className="text-xs font-mono text-slate-500 font-medium">
                              ({rec.guardBadgeId})
                            </span>
                            {isToday && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                                Active Today
                              </span>
                            )}
                          </div>
                          {rec.dutyPointName && (
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {rec.dutyPointName}
                            </p>
                          )}
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${statusBadge.bg}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusBadge.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${typeBadge.bg}`}
                        >
                          <TypeIcon className="h-3 w-3" />
                          {typeBadge.label}
                        </span>
                        {rec.refNumber && (
                          <span className="text-[11px] font-mono text-slate-500">
                            Ref: <strong>{rec.refNumber}</strong>
                          </span>
                        )}
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                          <span>{format(startDateObj, 'MMM d, yyyy')} – {format(endDateObj, 'MMM d, yyyy')}</span>
                          <span className="text-slate-500 font-mono">({days}d)</span>
                        </div>
                        {rec.reason && (
                          <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                            {rec.reason}
                          </p>
                        )}
                      </div>

                      {/* Mobile Actions */}
                      {isSupervisor && (
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          {rec.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleQuickApprove(rec)}
                                className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickReject(rec)}
                                className="h-7 px-2 text-xs text-rose-600 border-rose-200"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(rec)}
                            className="h-7 px-2 text-xs text-slate-500"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingRecord(rec)}
                            className="h-7 px-2 text-xs text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                  <p className="text-xs text-slate-500">
                    Showing{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRecords.length)}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredRecords.length}</span>{' '}
                    records
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                          page === currentPage
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {/* Add / Edit Dialog Modal */}
      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowModal(false)
            setEditingRecord(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-emerald-600" />
              {editingRecord ? 'Edit Leave / Exeat Record' : 'Register New Leave or Campus Exeat'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingRecord
                ? 'Update application dates, reference number, and approval status'
                : 'Enter official exeat slip or clinic excuse details for security personnel'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-medium">
                {formError}
              </div>
            )}

            {/* Guard Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Security Guard Personnel *
              </Label>
              <Select
                value={formData.guardId}
                onValueChange={(val) => setFormData({ ...formData, guardId: val })}
                disabled={!!editingRecord}
              >
                <SelectTrigger className="text-xs bg-slate-50 dark:bg-slate-800/80">
                  <SelectValue placeholder="Select guard..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {guards.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="font-medium">{g.fullName}</span>{' '}
                      <span className="font-mono text-slate-400">({g.badgeId})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Leave Type & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Application Type *
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) => {
                    setFormData((prev) => ({
                      ...prev,
                      type: val,
                      refNumber: !editingRecord ? generateRefCode(val) : prev.refNumber,
                    }))
                  }}
                >
                  <SelectTrigger className="text-xs bg-slate-50 dark:bg-slate-800/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASUAL">Casual Leave</SelectItem>
                    <SelectItem value="EXCUSED_CLINIC">PCC Clinic Excuse Slip</SelectItem>
                    <SelectItem value="EXEAT">Campus Exeat Slip</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency Leave</SelectItem>
                    <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                    <SelectItem value="OFF_DUTY">Off-Duty Rest Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Slip / Request Code
                  </Label>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, refNumber: generateRefCode(prev.type) }))}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-semibold flex items-center gap-1 hover:underline"
                    title="Generate new sequential code"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    Auto-generate
                  </button>
                </div>
                <div className="relative">
                  <Input
                    placeholder="Auto-generated (e.g. EX-2026-001)"
                    value={formData.refNumber}
                    onChange={(e) => setFormData({ ...formData, refNumber: e.target.value })}
                    className="text-xs font-mono font-medium bg-slate-50 dark:bg-slate-800/80 pr-16"
                  />
                  <span className="absolute right-2 top-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 pointer-events-none">
                    AUTO
                  </span>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Start Date *
                </Label>
                <Input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="text-xs font-mono bg-slate-50 dark:bg-slate-800/80"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  End Date *
                </Label>
                <Input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="text-xs font-mono bg-slate-50 dark:bg-slate-800/80"
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Reason & Details
              </Label>
              <Input
                placeholder="e.g. Medical diagnosis, doctor recommendations, travel destination"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="text-xs bg-slate-50 dark:bg-slate-800/80"
              />
            </div>

            {/* Status & Approver Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Approval Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                  disabled={!isSupervisor}
                >
                  <SelectTrigger className="text-xs bg-slate-50 dark:bg-slate-800/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">PENDING (Awaiting Review)</SelectItem>
                    <SelectItem value="APPROVED">APPROVED (Active / Authorized)</SelectItem>
                    <SelectItem value="REJECTED">REJECTED (Disapproved)</SelectItem>
                    <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Supervisor Notes
                </Label>
                <Input
                  placeholder="e.g. Replacement guard posted to Gate"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="text-xs bg-slate-50 dark:bg-slate-800/80"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowModal(false)
                  setEditingRecord(null)
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
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    {editingRecord ? 'Update Record' : 'Save & Register'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingRecord}
        onOpenChange={(open) => {
          if (!open) setDeletingRecord(null)
        }}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Leave Record
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to remove the leave / exeat record for{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {deletingRecord?.guardName}
              </strong>{' '}
              ({deletingRecord?.refNumber || 'No ref'})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingRecord(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={formSubmitting}
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
            >
              {formSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Record'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

