'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  ArrowLeft,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  User,
  Calendar,
  Clock,
  Shield,
  Camera,
  RefreshCw,
  ShieldOff,
  Loader2,
  Upload
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { StatusBadge } from '@/components/ui/status-badge'
import { toast } from '@/components/ui/toast'
import { uploadGuardPhoto, previewUrl, revokePreview } from '@/lib/image-upload'

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
  createdAt: string
  updatedAt: string
}

interface DutyPoint {
  id: string
  name: string
}

interface AttendanceRecord {
  id: string
  shiftDate: string
  signInTime: string | null
  status: string
  minutesLate: number
  dutyPoint: { name: string }
  shift: { name: string }
}

interface LeaveRecord {
  id: string
  type: string
  startDate: string
  endDate: string
  reason: string | null
  refNumber: string | null
  status: string
}

function formatTenure(startDate: string | null) {
  if (!startDate) return null
  const start = new Date(startDate)
  const now = new Date()
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (now.getDate() < start.getDate()) months--
  if (months < 0) return null
  if (months < 1) return 'New'
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem} mo`
  return rem === 0 ? `${years} yr` : `${years} yr ${rem} mo`
}

export default function GuardDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [guard, setGuard] = useState<Guard | null>(null)
  const [dutyPoints, setDutyPoints] = useState<DutyPoint[]>([])
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

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

  const isSupervisor = session?.user?.role === 'SUPERVISOR'

  useEffect(() => {
    if (params.id) {
      fetchGuard()
      fetchDutyPoints()
      fetchAttendanceHistory()
      fetchLeaveRecords()
    }
  }, [params.id])

  const fetchGuard = async () => {
    try {
      const res = await fetch(`/api/guards/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setGuard(data)
      }
    } catch (error) {
      console.error('Error fetching guard:', error)
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

  const fetchAttendanceHistory = async () => {
    try {
      const res = await fetch(`/api/attendance?guardId=${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setAttendanceHistory(data)
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error)
    }
  }

  const fetchLeaveRecords = async () => {
    try {
      const res = await fetch(`/api/leave?guardId=${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setLeaveRecords(data.records || [])
      }
    } catch (error) {
      console.error('Error fetching leave records:', error)
    }
  }

  const handleEdit = () => {
    if (!guard) return
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
    setShowEditModal(true)
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true)
    setFormError('')

    try {
      const data = {
        ...formData,
        startDate: formData.startDate ? new Date(formData.startDate) : null,
      }

      const res = await fetch(`/api/guards/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to update guard')
      }

      setShowEditModal(false)
      toast.success('Guard details updated')
      await fetchGuard()
    } catch (err: any) {
      setFormError(err.message)
      toast.error(err.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!guard) return
    setFormSubmitting(true)

    try {
      const res = await fetch(`/api/guards/${params.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete guard')
      }

      setShowDeleteModal(false)
      toast.success('Guard deleted successfully')
      router.push('/guards')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleReactivate = async () => {
    if (!guard) return
    try {
      const res = await fetch(`/api/guards/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'ACTIVE',
        }),
      })

      if (!res.ok) throw new Error('Failed to reactivate guard')
      toast.success('Guard reactivated successfully')
      await fetchGuard()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading guard details...</div>
      </div>
    )
  }

  if (!guard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Guard not found</div>
      </div>
    )
  }

  const shiftTypeLabel = guard.shiftType === 'DAY' ? 'Day Shift (DS)' : guard.shiftType === 'NIGHT' ? 'Night Shift (NS)' : 'Both Shifts'

  return (
    <div className="space-y-4 pb-8">
      <Breadcrumb
        items={[
          { label: 'Operations' },
          { label: 'Guard Personnel', href: '/guards' },
          { label: guard.fullName },
        ]}
        backHref="/guards"
        backLabel="Back to Guards"
      />

      <PageHeader
        icon={User}
        title={guard.fullName}
        description={`Badge ID: ${guard.badgeId} · ${shiftTypeLabel}`}
        color="blue"
        actions={
          isSupervisor ? (
            <div className="flex gap-2">
              {guard.status === 'INACTIVE' && (
                <Button
                  onClick={handleReactivate}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reactivate
                </Button>
              )}
              <Button onClick={handleEdit} variant="outline">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button onClick={() => setShowDeleteModal(true)} variant="outline" className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Profile Hero */}
      <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
        <div className="h-16 sm:h-20 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700" />
        <CardContent className="px-4 sm:px-6 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12">
            {/* Photo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-lg shrink-0 self-center sm:self-auto">
              {guard.photoUrl ? (
                <img
                  src={guard.photoUrl}
                  alt={guard.fullName}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <User className="h-10 w-10" />
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {guard.fullName}
                </h2>
                <StatusBadge status={guard.status} />
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                  {guard.badgeId}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  guard.shiftType === 'DAY'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : guard.shiftType === 'NIGHT'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {shiftTypeLabel}
                </span>
                {formatTenure(guard.startDate) && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                    <Calendar className="h-3 w-3" />
                    {formatTenure(guard.startDate)} service
                  </span>
                )}
                {guard.designation && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200/70 dark:border-amber-800/60">
                    ★ {guard.designation}
                  </span>
                )}
                {guard.excludeFromDuty && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                    Non-duty staff
                  </span>
                )}
              </div>
            </div>

            {/* Quick contact actions */}
            {guard.phone && (
              <div className="flex items-center justify-center gap-2 shrink-0">
                <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                  <a href={`tel:${guard.phone}`}>
                    <Phone className="h-3.5 w-3.5 mr-1.5" />
                    Call
                  </a>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                  <a
                    href={`https://wa.me/${guard.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${guard.fullName}, this is PCC Security.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/whatsapp.png" alt="" className="w-3.5 h-3.5 mr-1.5" />
                    WhatsApp
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">Phone</p>
              <p className="text-sm font-mono font-medium text-slate-700 dark:text-slate-200 mt-0.5">
                {guard.phone || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">Default Post</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate">{guard.defaultDutyPoint?.name || 'Unassigned'}</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">Start Date</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">
                {guard.startDate
                  ? new Date(guard.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">On Record Since</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">
                {new Date(guard.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Stats */}
      {(() => {
        const counted = attendanceHistory.filter(r => r.status === 'PRESENT' || r.status === 'ABSENT')
        const present = counted.filter(r => r.status === 'PRESENT').length
        const absent = counted.filter(r => r.status === 'ABSENT').length
        const late = attendanceHistory.filter(r => r.minutesLate > 0).length
        const rate = counted.length > 0 ? Math.round((present / counted.length) * 100) : null
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-3.5 text-center">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">Attendance Rate</p>
                <p className={`text-2xl font-black mt-1 ${rate === null ? 'text-slate-400' : rate >= 90 ? 'text-emerald-600 dark:text-emerald-400' : rate >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {rate === null ? '—' : `${rate}%`}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">of counted shifts</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-3.5 text-center">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">Present</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{present}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">shifts</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-3.5 text-center">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">Absent</p>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{absent}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">shifts</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-3.5 text-center">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">Late Arrivals</p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{late}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">records</p>
              </CardContent>
            </Card>
          </div>
        )
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attendance History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No attendance records found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {attendanceHistory.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <p className="font-semibold text-sm">
                          {new Date(record.shiftDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {record.signInTime ? new Date(record.signInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {record.dutyPoint?.name || '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {record.shift?.name || '—'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={record.status} />
                      {record.minutesLate > 0 && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          +{record.minutesLate}m late
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leave & Exeats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave &amp; Exeats</CardTitle>
          </CardHeader>
          <CardContent>
            {leaveRecords.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No leave records</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {leaveRecords.map((record) => {
                  const start = new Date(record.startDate)
                  const end = new Date(record.endDate)
                  const isActive = new Date() >= start && new Date() <= end
                  return (
                    <div
                      key={record.id}
                      className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {record.type.replace(/_/g, ' ')}
                        </span>
                        <StatusBadge status={record.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {isActive && record.status === 'APPROVED' && (
                          <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">· Active now</span>
                        )}
                      </p>
                      {record.refNumber && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{record.refNumber}</p>
                      )}
                      {record.reason && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{record.reason}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white">
              Edit Guard Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update guard information, photo, and shift assignment
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
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
                    <Camera className="h-9 w-9 text-slate-400" />
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
                Full Name
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="text-sm bg-slate-50 dark:bg-slate-800/80"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="badgeId" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Badge ID
              </Label>
              <Input
                id="badgeId"
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
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="text-sm font-mono bg-slate-50 dark:bg-slate-800/80"
              />
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dutyPoint" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Default Duty Point
              </Label>
              <Select
                value={formData.defaultDutyPointId}
                onValueChange={(val) => setFormData({ ...formData, defaultDutyPointId: val })}
              >
                <SelectTrigger className="text-sm bg-slate-50 dark:bg-slate-800/80">
                  <SelectValue placeholder="Select duty point..." />
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
                  Exclude from duty assignments and rosters
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="text-sm bg-slate-50 dark:bg-slate-800/80">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formSubmitting}>
                {formSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white">
              Delete Guard
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to delete {guard.fullName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={formSubmitting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {formSubmitting ? 'Deleting...' : 'Delete Guard'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
