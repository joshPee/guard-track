'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Settings,
  Building2,
  Clock,
  Users,
  CheckCircle,
  Shield,
  Loader2,
  Lock,
  Mail,
  UserCheck,
  Bell,
  AlertTriangle,
  TrendingUp,
  Plus,
  KeyRound,
  UserX,
  UserCog,
} from 'lucide-react'
import { toast } from '@/components/ui/toast'

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  graceMinutes: number
}

interface AppUser {
  id: string
  name: string
  email: string
  role: string
  shiftScope?: string | null
  isActive: boolean
  createdAt: string
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [orgName, setOrgName] = useState('PCC Security Department')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [appUsers, setAppUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [savingOrg, setSavingOrg] = useState(false)
  const [savedOrg, setSavedOrg] = useState(false)
  const [savingShiftId, setSavingShiftId] = useState<string | null>(null)
  const [shiftDrafts, setShiftDrafts] = useState<Record<string, string>>({})

  // Alert settings
  const [alertSettings, setAlertSettings] = useState({
    highAbsenteeismThreshold: 20,
    highLateThreshold: 15,
    lowAttendanceThreshold: 70,
    enableAlerts: true,
  })
  const [savingAlerts, setSavingAlerts] = useState(false)

  // User management state
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'SUPERVISOR', shiftScope: '' })
  const [creatingUser, setCreatingUser] = useState(false)
  const [userActionId, setUserActionId] = useState<string | null>(null)
  const [resetPwUser, setResetPwUser] = useState<AppUser | null>(null)
  const [resetPwValue, setResetPwValue] = useState('')

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      const [shiftsRes, settingsRes, usersRes] = await Promise.all([
        fetch('/api/shifts'),
        fetch('/api/settings'),
        fetch('/api/users'),
      ])

      if (shiftsRes.ok) {
        setShifts(await shiftsRes.json())
      }

      if (settingsRes.ok) {
        const settings = await settingsRes.json()
        if (settings.organization_name) {
          setOrgName(settings.organization_name)
        }
        if (settings.alert_settings) {
          setAlertSettings(JSON.parse(settings.alert_settings))
        }
      }

      if (usersRes.ok) {
        setAppUsers(await usersRes.json())
      }
    } catch (error) {
      console.error('Error fetching settings data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshUsers = async () => {
    const res = await fetch('/api/users')
    if (res.ok) setAppUsers(await res.json())
  }

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || newUser.password.length < 8) {
      toast.error('Name, email and an 8+ character password are required.')
      return
    }
    setCreatingUser(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Failed to create user.')
        return
      }
      toast.success(`${newUser.name} can now sign in.`, 'User Created')
      setAddUserOpen(false)
      setNewUser({ name: '', email: '', password: '', role: 'SUPERVISOR', shiftScope: '' })
      refreshUsers()
    } catch {
      toast.error('An error occurred while creating the user.')
    } finally {
      setCreatingUser(false)
    }
  }

  const patchUser = async (id: string, data: Record<string, unknown>, successMsg: string) => {
    setUserActionId(id)
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const resp = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(resp.error || 'Update failed.')
        return
      }
      toast.success(successMsg, 'User Updated')
      refreshUsers()
    } catch {
      toast.error('An error occurred.')
    } finally {
      setUserActionId(null)
    }
  }

  const handleResetPassword = async () => {
    if (!resetPwUser || resetPwValue.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    await patchUser(resetPwUser.id, { password: resetPwValue }, `Password reset for ${resetPwUser.name}`)
    setResetPwUser(null)
    setResetPwValue('')
  }

  const updateShift = async (id: string, data: Partial<Shift>) => {
    setSavingShiftId(id)
    try {
      const res = await fetch(`/api/shifts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const shiftsRes = await fetch('/api/shifts')
        if (shiftsRes.ok) setShifts(await shiftsRes.json())
        toast.success('Shift timings saved successfully')
      }
    } catch (error) {
      console.error('Error updating shift:', error)
      toast.error('Failed to update shift timing')
    } finally {
      setTimeout(() => setSavingShiftId(null), 1000)
    }
  }

  const handleSaveOrg = async () => {
    setSavingOrg(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'organization_name',
          value: orgName,
        }),
      })
      if (res.ok) {
        setSavedOrg(true)
        toast.success('Organization details updated')
        setTimeout(() => setSavedOrg(false), 3000)
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to save organization details')
    } finally {
      setSavingOrg(false)
    }
  }

  const handleSaveAlerts = async () => {
    setSavingAlerts(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'alert_settings',
          value: JSON.stringify(alertSettings),
        }),
      })
      if (res.ok) {
        toast.success('Alert settings saved successfully')
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to save alert settings')
    } finally {
      setSavingAlerts(false)
    }
  }

  const isSupervisor = session?.user?.role === 'SUPERVISOR'

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Management' },
          { label: 'Settings & Configuration' },
        ]}
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <PageHeader
        icon={Settings}
        title="Settings & Configuration"
        description="Configure organization details, operational shift hours, and security credentials"
        color="indigo"
        stats={[
          { label: 'Access Level', value: isSupervisor ? 'Supervisor' : 'Viewer' },
          { label: 'Active Shifts', value: shifts.length },
          { label: 'System Users', value: appUsers.length || 2 },
        ]}
      />

      <div className="space-y-4 sm:space-y-6">
        {/* Organization Settings */}
        <Card className="animate-fade-in-up border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Organization Details</CardTitle>
                <CardDescription className="text-xs text-slate-500">Official name shown on exports and portal headers</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="max-w-md">
              <Label htmlFor="orgName" className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                Organization / Facility Name
              </Label>
              <div className="flex gap-2">
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={!isSupervisor || savingOrg}
                  className="bg-slate-50/70 dark:bg-slate-800/60 font-medium"
                />
                {isSupervisor && (
                  <Button
                    onClick={handleSaveOrg}
                    disabled={savingOrg}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                  >
                    {savingOrg ? (
                      <span className="flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving</span>
                    ) : savedOrg ? (
                      'Saved ✓'
                    ) : (
                      'Save'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shift Settings */}
        <Card className="animate-fade-in-up animation-delay-1 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Shift Timings & Grace Periods</CardTitle>
                <CardDescription className="text-xs text-slate-500">Control start and end hours, plus late threshold allowances</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="space-y-4 py-2">
                {[1, 2].map((i) => (
                  <div key={i} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-9 w-48 rounded-lg" />
                      <Skeleton className="h-8 w-20 rounded-lg" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Skeleton className="h-9 rounded-lg" />
                      <Skeleton className="h-9 rounded-lg" />
                      <Skeleton className="h-9 rounded-lg" />
                      <Skeleton className="h-9 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : shifts.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No shifts configured.</p>
            ) : (
              <div className="space-y-4">
                {shifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/60 dark:bg-slate-800/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-full max-w-sm">
                        <Label htmlFor={`name-${shift.id}`} className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                          Shift Title
                        </Label>
                        <Input
                          id={`name-${shift.id}`}
                          value={shiftDrafts[shift.id] ?? shift.name}
                          onChange={(e) => setShiftDrafts(prev => ({ ...prev, [shift.id]: e.target.value }))}
                          onBlur={(e) => {
                            const val = e.target.value.trim()
                            if (val && val !== shift.name) {
                              updateShift(shift.id, { name: val })
                            }
                          }}
                          disabled={!isSupervisor}
                          className="bg-white dark:bg-slate-900 font-medium text-sm"
                        />
                      </div>
                      {savingShiftId === shift.id && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle className="h-3.5 w-3.5" /> Saving...
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <Label htmlFor={`start-${shift.id}`} className="text-xs font-medium text-slate-500 mb-1 block">
                          Start Time
                        </Label>
                        <Input
                          id={`start-${shift.id}`}
                          type="time"
                          value={shift.startTime}
                          onChange={(e) => updateShift(shift.id, { startTime: e.target.value })}
                          disabled={!isSupervisor}
                          className="bg-white dark:bg-slate-900 text-sm font-mono"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`end-${shift.id}`} className="text-xs font-medium text-slate-500 mb-1 block">
                          End Time
                        </Label>
                        <Input
                          id={`end-${shift.id}`}
                          type="time"
                          value={shift.endTime}
                          onChange={(e) => updateShift(shift.id, { endTime: e.target.value })}
                          disabled={!isSupervisor}
                          className="bg-white dark:bg-slate-900 text-sm font-mono"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`grace-${shift.id}`} className="text-xs font-medium text-slate-500 mb-1 block">
                          Grace Period (Minutes)
                        </Label>
                        <Input
                          id={`grace-${shift.id}`}
                          type="number"
                          value={shift.graceMinutes}
                          onChange={(e) => updateShift(shift.id, { graceMinutes: parseInt(e.target.value) || 0 })}
                          disabled={!isSupervisor}
                          className="bg-white dark:bg-slate-900 text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System User Accounts */}
        <Card className="animate-fade-in-up animation-delay-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  <Shield className="h-4 w-4" />
                </span>
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Authorized System Users</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Accounts with portal access — supervisors can assign duties and approve leave</CardDescription>
                </div>
              </div>
              <Button size="sm" onClick={() => setAddUserOpen(true)} className="gap-1.5 text-xs shrink-0">
                <Plus className="h-3.5 w-3.5" />
                Add User
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {appUsers.length > 0 ? (
                appUsers.map((user) => (
                  <div key={user.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {user.name}
                          {!user.isActive && (
                            <span className="ml-2 text-[10px] font-bold text-rose-600 dark:text-rose-400">INACTIVE</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {user.id !== session?.user?.id && (
                        <>
                          <button
                            onClick={() => patchUser(user.id, { role: user.role === 'SUPERVISOR' ? 'VIEWER' : 'SUPERVISOR' }, `${user.name} is now ${user.role === 'SUPERVISOR' ? 'VIEWER' : 'SUPERVISOR'}`)}
                            disabled={userActionId === user.id}
                            className="text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                            title="Toggle role"
                          >
                            {user.role === 'SUPERVISOR' ? 'Make Viewer' : 'Make Supervisor'}
                          </button>
                          <button
                            onClick={() => {
                              setResetPwUser(user)
                              setResetPwValue('')
                            }}
                            disabled={userActionId === user.id}
                            className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                            title="Reset password"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => patchUser(user.id, { isActive: !user.isActive }, user.isActive ? `${user.name} deactivated` : `${user.name} reactivated`)}
                            disabled={userActionId === user.id}
                            className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${
                              user.isActive
                                ? 'text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                            title={user.isActive ? 'Deactivate account' : 'Reactivate account'}
                          >
                            {userActionId === user.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : user.isActive ? (
                              <UserX className="h-3.5 w-3.5" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </>
                      )}
                      {user.role === 'SUPERVISOR' && user.id !== session?.user?.id && (
                        <select
                          value={user.shiftScope || ''}
                          onChange={(e) =>
                            patchUser(user.id, { shiftScope: e.target.value || null }, `${user.name}'s shift scope updated`)
                          }
                          disabled={userActionId === user.id}
                          className="h-7 text-[10px] font-bold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 text-slate-600 dark:text-slate-300 disabled:opacity-40"
                          title="Shift scope"
                        >
                          <option value="">All shifts</option>
                          <option value="DAY">Day</option>
                          <option value="NIGHT">Night</option>
                          <option value="BOTH">Both</option>
                        </select>
                      )}
                      {user.role === 'SUPERVISOR' && user.id === session?.user?.id && user.shiftScope && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                          {user.shiftScope === 'DAY' ? 'Day' : user.shiftScope === 'NIGHT' ? 'Night' : 'Both'} shift
                        </span>
                      )}
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          user.role === 'SUPERVISOR'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{session?.user?.name || 'Administrator'}</p>
                    <p className="text-xs text-slate-500">{session?.user?.email}</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    {session?.user?.role || 'SUPERVISOR'}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alert Settings */}
        <Card className="animate-fade-in-up animation-delay-3 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Bell className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Attendance Alert Thresholds</CardTitle>
                <CardDescription className="text-xs text-slate-500">Configure automatic alerts for attendance patterns and issues</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Enable Alerts</span>
                <span className="text-xs text-slate-500">Show notifications when thresholds are exceeded</span>
              </div>
              <button
                type="button"
                onClick={() => setAlertSettings(prev => ({ ...prev, enableAlerts: !prev.enableAlerts }))}
                disabled={!isSupervisor}
                className={`relative w-12 h-6 rounded-full transition-colors ${alertSettings.enableAlerts ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${alertSettings.enableAlerts ? 'translate-x-6' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                  High Absenteeism %
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={alertSettings.highAbsenteeismThreshold}
                    onChange={(e) => setAlertSettings(prev => ({ ...prev, highAbsenteeismThreshold: parseInt(e.target.value) || 0 }))}
                    disabled={!isSupervisor || !alertSettings.enableAlerts}
                    className="bg-white dark:bg-slate-900 text-sm font-mono"
                  />
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Alert when absent &gt; X%</p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                  High Late Arrivals %
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={alertSettings.highLateThreshold}
                    onChange={(e) => setAlertSettings(prev => ({ ...prev, highLateThreshold: parseInt(e.target.value) || 0 }))}
                    disabled={!isSupervisor || !alertSettings.enableAlerts}
                    className="bg-white dark:bg-slate-900 text-sm font-mono"
                  />
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Alert when late &gt; X%</p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Low Attendance %
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={alertSettings.lowAttendanceThreshold}
                    onChange={(e) => setAlertSettings(prev => ({ ...prev, lowAttendanceThreshold: parseInt(e.target.value) || 0 }))}
                    disabled={!isSupervisor || !alertSettings.enableAlerts}
                    className="bg-white dark:bg-slate-900 text-sm font-mono"
                  />
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Alert when attendance &lt; X%</p>
              </div>
            </div>

            {isSupervisor && (
              <Button
                onClick={handleSaveAlerts}
                disabled={savingAlerts || !alertSettings.enableAlerts}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {savingAlerts ? (
                  <span className="flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</span>
                ) : (
                  'Save Alert Settings'
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserCog className="h-4 w-4 text-indigo-500" />
              Create System User
            </DialogTitle>
            <DialogDescription className="text-xs">
              Supervisors can assign duties, approve leave and manage the roster. Viewers get read-only access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full Name</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="e.g. Vida Daboro"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email / Username</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="vida@pcc.gov.gh"
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password</Label>
                <Input
                  type="text"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Min 8 characters"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</Label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                >
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shift Scope (supervisors only)</Label>
              <select
                value={newUser.shiftScope}
                onChange={(e) => setNewUser({ ...newUser, shiftScope: e.target.value })}
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              >
                <option value="">All shifts (admin)</option>
                <option value="DAY">Day shift only</option>
                <option value="NIGHT">Night shift only</option>
                <option value="BOTH">Both shifts</option>
              </select>
              <p className="text-[11px] text-slate-400">
                Scoped supervisors only see and assign guards for their shift on the Directory page.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddUserOpen(false)} disabled={creatingUser}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={creatingUser} className="gap-2">
              {creatingUser && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPwUser} onOpenChange={(v) => !v && setResetPwUser(null)}>
        <DialogContent className="sm:max-w-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-blue-500" />
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set a new password for {resetPwUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">New Password</Label>
            <Input
              type="text"
              value={resetPwValue}
              onChange={(e) => setResetPwValue(e.target.value)}
              placeholder="Min 8 characters"
              className="text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetPwUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={userActionId === resetPwUser?.id} className="gap-2">
              {userActionId === resetPwUser?.id && <Loader2 className="h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
