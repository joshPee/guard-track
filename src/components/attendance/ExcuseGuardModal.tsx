'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { Loader2, CalendarX } from 'lucide-react'

interface ExcuseGuard {
  id: string
  fullName: string
  badgeId: string
}

interface ExcuseGuardModalProps {
  open: boolean
  onClose: () => void
  guards: ExcuseGuard[]
  defaultDate: string
  onSuccess?: () => void
}

const EXCUSE_REASONS = [
  { value: 'SICK', label: 'Sick / Ill' },
  { value: 'PERMISSION', label: 'Permission Granted' },
  { value: 'PERSONAL', label: 'Personal Emergency' },
  { value: 'OTHER', label: 'Other' },
] as const

export function ExcuseGuardModal({ open, onClose, guards, defaultDate, onSuccess }: ExcuseGuardModalProps) {
  const [guardId, setGuardId] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [reason, setReason] = useState<string>('SICK')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setGuardId('')
    setDate(defaultDate)
    setReason('SICK')
    setNotes('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!guardId || !date) {
      toast.error('Please select a guard and date.')
      return
    }
    setSaving(true)
    try {
      const reasonLabel = EXCUSE_REASONS.find((r) => r.value === reason)?.label || reason
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardId,
          type: 'EXCUSED',
          startDate: date,
          endDate: date,
          reason: reasonLabel,
          status: 'APPROVED',
          notes: notes.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Failed to excuse guard.')
        return
      }
      toast.success(`${guards.find((g) => g.id === guardId)?.fullName || 'Guard'} excused for ${new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`, 'Excuse Duty')
      handleClose()
      onSuccess?.()
    } catch {
      toast.error('An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <CalendarX className="h-4 w-4 text-violet-500" />
            Excuse Guard from Duty
          </DialogTitle>
          <DialogDescription className="text-xs">
            Records an approved excuse for the selected day — the guard will show as excused instead of absent/unassigned.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Guard</Label>
            <Select value={guardId} onValueChange={setGuardId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select guard..." />
              </SelectTrigger>
              <SelectContent>
                {guards.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.fullName} ({g.badgeId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXCUSE_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. visited clinic, supervisor's note..."
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !guardId} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm Excuse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
