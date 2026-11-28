'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { StatusBadge } from '@/components/ui/status-badge'
import { toast } from '@/components/ui/toast'
import { uploadGuardPhoto, previewUrl, revokePreview } from '@/lib/image-upload'
import { User, Mail, Shield, Calendar, KeyRound, Save, Loader2, Camera } from 'lucide-react'

interface Profile {
  id: string
  name: string
  email: string
  role: string
  photoUrl: string | null
  isActive: boolean
  createdAt: string
}

export function ProfilePanel({
  showPasswordForm = true,
  homeHref = '/dashboard',
  homeLabel = 'Dashboard',
}: {
  showPasswordForm?: boolean
  homeHref?: string
  homeLabel?: string
}) {
  const { data: session, update } = useSession()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/users/me')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setName(data.name)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    setSavingName(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update name')
      setProfile(data)
      await update({ name: data.name })
      toast.success('Profile updated')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingName(false)
    }
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
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save photo')
      setProfile(data)
      setPhotoPreview(null)
      revokePreview(preview)
      await update({ photoUrl: url })
      toast.success('Profile photo updated')
    } catch (err: any) {
      setPhotoPreview(null)
      revokePreview(preview)
      toast.error(err.message || 'Photo upload failed')
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in all password fields')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to change password')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password changed successfully')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-slate-500">Profile not found</p>
      </div>
    )
  }

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="space-y-4 pb-8">
      <Breadcrumb
        items={[
          { label: 'Account' },
          { label: 'My Profile' },
        ]}
        homeHref={homeHref}
        homeLabel={homeLabel}
      />

      <PageHeader
        icon={User}
        title="My Profile"
        description="Manage your account details and security"
        color="blue"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Identity Card */}
        <Card className="lg:col-span-1 border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-white dark:border-slate-900">
                {photoPreview || profile.photoUrl ? (
                  <img
                    src={photoPreview || profile.photoUrl!}
                    alt={profile.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  initials
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <label
                htmlFor="profile-photo"
                className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 ${
                  uploadingPhoto ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-blue-700'
                }`}
                title="Change photo"
              >
                <Camera className="h-3.5 w-3.5" />
              </label>
              <input
                id="profile-photo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{profile.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 mt-1">
                <Mail className="h-3.5 w-3.5" />
                {profile.email}
              </p>
            </div>
            <StatusBadge status={profile.role === 'SUPERVISOR' ? 'Supervisor' : 'Viewer'} />
            <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-left">
              <div className="flex items-center gap-2.5 text-sm">
                <Shield className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">Role</span>
                <span className="ml-auto font-medium text-slate-700 dark:text-slate-200">
                  {profile.role === 'SUPERVISOR' ? 'Supervisor' : 'Viewer'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">Member since</span>
                <span className="ml-auto font-medium text-slate-700 dark:text-slate-200">
                  {new Date(profile.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <KeyRound className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span className="ml-auto">
                  <StatusBadge status={profile.isActive ? 'Active' : 'Inactive'} />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editable sections */}
        <div className="lg:col-span-2 space-y-4">
          {/* Name form */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">Display Name</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveName} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-sm bg-slate-50 dark:bg-slate-800/80"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" size="sm" disabled={savingName || name.trim() === profile.name} className="gap-1.5">
                    {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Password form — admin-managed accounts only */}
          {showPasswordForm && (
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Current Password
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="text-sm bg-slate-50 dark:bg-slate-800/80"
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="text-sm bg-slate-50 dark:bg-slate-800/80"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="text-sm bg-slate-50 dark:bg-slate-800/80"
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" size="sm" disabled={savingPassword} className="gap-1.5">
                  {savingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                  Change Password
                </Button>
              </form>
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </div>
  )
}
