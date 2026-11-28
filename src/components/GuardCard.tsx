'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  MapPin,
  Phone,
  Sun,
  Moon,
  Building2,
  CalendarCheck,
  Copy,
  Check,
  Info,
} from 'lucide-react'

export interface GuardCardGuard {
  id: string
  fullName: string
  badgeId: string
  phone: string | null
  photoUrl: string | null
  shiftType: string
  designation?: string | null
}

export interface GuardCardProps {
  guard: GuardCardGuard
  /** Assigned duty point name (if any) */
  dutyPointName?: string | null
  /** Default duty point name (shown as fallback hint when unassigned) */
  defaultDutyPointName?: string | null
  /** Whether the guard is excused for this date */
  excused?: boolean
  excuseReason?: string | null
  /** Active shift context ('DAY' | 'NIGHT' | null) to hide redundant shift badges */
  activeShiftContext?: 'DAY' | 'NIGHT' | null
  /** Optional custom top slot (e.g. Assign Mode dropdown) */
  topSlot?: React.ReactNode
  /** Selection checkbox support */
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  /** Highlight card as modified (unsaved draft) */
  modified?: boolean
  /** Optional click handler for guard avatar/name to open detail modal */
  onOpenDetail?: () => void
}

export function getGuardInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function GuardCard({
  guard,
  dutyPointName,
  defaultDutyPointName,
  excused = false,
  excuseReason,
  activeShiftContext = null,
  topSlot,
  selectable = false,
  selected = false,
  onToggleSelect,
  modified = false,
  onOpenDetail,
}: GuardCardProps) {
  const [copiedPhone, setCopiedPhone] = useState(false)

  const lowerDuty = (dutyPointName || '').toLowerCase()
  const isOffDuty = lowerDuty.includes('off duty') || lowerDuty.includes('off day')
  const isOutside = lowerDuty.includes('outside deployment') || lowerDuty.includes('outside')

  const topAccentClass = excused
    ? 'bg-violet-500'
    : isOffDuty
    ? 'bg-slate-400 dark:bg-slate-600'
    : isOutside
    ? 'bg-blue-500'
    : dutyPointName
    ? 'bg-emerald-500'
    : 'bg-slate-200 dark:bg-slate-700'

  const avatarRingClass = excused
    ? 'ring-2 ring-violet-400/80 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
    : isOffDuty
    ? 'ring-1 ring-slate-300 dark:ring-slate-600'
    : isOutside
    ? 'ring-2 ring-blue-400/80 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
    : dutyPointName
    ? 'ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
    : 'ring-1 ring-slate-200 dark:ring-slate-700'

  const showShiftBadge =
    !isOutside &&
    (activeShiftContext === null ||
      guard.shiftType === 'BOTH' ||
      guard.shiftType !== activeShiftContext)

  const handleCopyPhone = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!guard.phone) return
    try {
      await navigator.clipboard.writeText(guard.phone)
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 1800)
    } catch {
      // Clipboard API unavailable
    }
  }

  const renderStatusStrip = () => {
    if (topSlot) return topSlot

    if (excused) {
      const label = `Excused${excuseReason ? ` — ${excuseReason}` : ''}`
      return (
        <div
          title={label}
          className="w-full inline-flex items-center gap-1.5 bg-violet-50/90 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800/70 px-2.5 py-1.5 rounded-xl text-violet-700 dark:text-violet-300"
        >
          <CalendarCheck className="h-3.5 w-3.5 text-violet-500 shrink-0" />
          <span className="font-semibold text-xs truncate">{label}</span>
        </div>
      )
    }

    if (isOffDuty) {
      return (
        <div
          title="Off Duty (Day Off)"
          className="w-full inline-flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 px-2.5 py-1.5 rounded-xl text-slate-600 dark:text-slate-300"
        >
          <Moon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="font-semibold text-xs truncate">Off Duty (Day Off)</span>
        </div>
      )
    }

    if (isOutside) {
      return (
        <div
          title={dutyPointName || 'Outside Deployment'}
          className="w-full inline-flex items-center gap-1.5 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/70 px-2.5 py-1.5 rounded-xl text-blue-700 dark:text-blue-300"
        >
          <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="font-semibold text-xs truncate">Outside Deployment</span>
        </div>
      )
    }

    if (dutyPointName) {
      return (
        <div
          title={dutyPointName}
          className="w-full inline-flex items-center gap-1.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70 px-2.5 py-1.5 rounded-xl text-emerald-800 dark:text-emerald-300"
        >
          <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold text-xs truncate">{dutyPointName}</span>
        </div>
      )
    }

    const fallbackText = defaultDutyPointName ? `Default: ${defaultDutyPointName}` : 'Unassigned'
    return (
      <div
        title={fallbackText}
        className="w-full inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 px-2.5 py-1.5 rounded-xl text-slate-500 dark:text-slate-400"
      >
        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span className="font-medium text-xs truncate">{fallbackText}</span>
      </div>
    )
  }

  const avatarContent = guard.photoUrl ? (
    <img
      src={guard.photoUrl}
      alt={guard.fullName}
      className="w-full h-full object-cover object-top"
    />
  ) : (
    <span className="font-bold text-xs text-slate-600 dark:text-slate-300 tracking-wider">
      {getGuardInitials(guard.fullName)}
    </span>
  )

  return (
    <Card
      className={`group relative border shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-white dark:bg-slate-900/95 rounded-2xl overflow-hidden flex flex-col justify-between ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-50/20 dark:bg-blue-950/25'
          : modified
          ? 'border-amber-400 ring-2 ring-amber-300/40 dark:border-amber-600 dark:ring-amber-800/40'
          : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Subtle Top Status Accent Bar */}
      <div className={`h-1 w-full ${topAccentClass}`} />

      <CardContent className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
        {/* Duty Point Pill or Assign Dropdown */}
        <div>{renderStatusStrip()}</div>

        {/* Guard Identity Row */}
        <div className="flex items-center gap-3">
          {onOpenDetail ? (
            <button
              type="button"
              onClick={onOpenDetail}
              className={`relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 shrink-0 flex items-center justify-center cursor-pointer transition-transform duration-200 group-hover:scale-105 ${avatarRingClass}`}
              title="View guard details"
            >
              {avatarContent}
            </button>
          ) : (
            <div
              className={`relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 shrink-0 flex items-center justify-center ${avatarRingClass}`}
            >
              {avatarContent}
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-1.5">
              {onOpenDetail ? (
                <button
                  type="button"
                  onClick={onOpenDetail}
                  className="text-left font-semibold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 hover:underline transition-colors cursor-pointer"
                  title={guard.fullName}
                >
                  {guard.fullName}
                </button>
              ) : (
                <h3
                  className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                  title={guard.fullName}
                >
                  {guard.fullName}
                </h3>
              )}

              {selectable && onToggleSelect && (
                <label
                  className="flex items-center justify-center p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                  title={selected ? 'Deselect guard' : 'Select guard for batch action'}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={onToggleSelect}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-700 focus:ring-blue-500 cursor-pointer"
                  />
                </label>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100/90 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                {guard.badgeId}
              </span>

              {showShiftBadge && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    guard.shiftType === 'DAY'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      : guard.shiftType === 'NIGHT'
                      ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {guard.shiftType === 'DAY' ? (
                    <>
                      <Sun className="w-2.5 h-2.5" /> Day
                    </>
                  ) : guard.shiftType === 'NIGHT' ? (
                    <>
                      <Moon className="w-2.5 h-2.5" /> Night
                    </>
                  ) : (
                    'Both'
                  )}
                </span>
              )}

              {guard.designation && (
                <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
                  ★ {guard.designation}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Phone Action Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5">
          {guard.phone ? (
            <>
              <a
                href={`tel:${guard.phone}`}
                className="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors min-w-0"
                title="Click to call guard"
              >
                <div className="flex items-center gap-1.5 font-mono text-xs truncate">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{guard.phone}</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 ml-1">
                  Call →
                </span>
              </a>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="p-1.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shrink-0"
                title={copiedPhone ? 'Copied!' : 'Copy phone number'}
              >
                {copiedPhone ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </>
          ) : (
            <div className="flex-1 text-center text-[11px] text-slate-400 italic py-1">
              No phone on file
            </div>
          )}

          {onOpenDetail && (
            <button
              type="button"
              onClick={onOpenDetail}
              className="p-1.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
              title="Guard details"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
