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

export default function GuardDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [guard, setGuard] = useState<Guard | null>(null)
  const [dutyPoints, setDutyPoints] = useState<DutyPoint[]>([])
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
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
    startDate: '',
  })

  const isSupervisor = session?.user?.role === 'SUPERVISOR'

  useEffect(() => {
    if (params.id) {
      fetchGuard()
      fetchDutyPoints()
      fetchAttendanceHistory()
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Guard Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Guard Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Photo */}
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700">
                {guard.photoUrl ? (
                  <img
                    src={guard.photoUrl}
                    alt={guard.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User className="h-12 w-12" />
                  </div>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-500">Full Name</Label>
                <p className="font-semibold text-sm">{guard.fullName}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Badge ID</Label>
                <p className="font-mono text-sm">{guard.badgeId}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Phone</Label>
                <p className="font-mono text-sm">{guard.phone || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Shift Assignment</Label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    guard.shiftType === 'DAY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                    guard.shiftType === 'NIGHT' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {shiftTypeLabel}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Default Duty Point</Label>
                <p className="text-sm flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  {guard.defaultDutyPoint?.name || 'Unassigned'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Status</Label>
                <StatusBadge status={guard.status} />
              </div>
              {guard.startDate && (
                <div>
                  <Label className="text-xs text-slate-500">Start Date</Label>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    {new Date(guard.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{attendanceHistory.length}</p>
                  <p className="text-xs text-slate-500">Records</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {attendanceHistory.filter(r => r.status === 'PRESENT').length}
                  </p>
                  <p className="text-xs text-slate-500">Present</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                      className="w-full h-full object-cover"
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
