'use client'

import { RefObject } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  CheckCircle, XCircle, AlertCircle,
  Search, Clock, UserCheck, X,
  BookOpen, Check, ArrowRight, UserX,
  Sparkles, Coffee, FileBadge, Stethoscope,
  CalendarCheck,
} from 'lucide-react'
import { Guard, DutyPoint, AttendanceRow, RecentBookEntry, LeaveInfo, STATUS_COLORS } from './types'
import { GuardAvatar } from './GuardAvatar'

interface BookEntryModeProps {
  isSupervisor: boolean
  pendingCount: number
  onMarkRestAbsent: () => void

  guards: Guard[]
  attendanceRows: AttendanceRow[]
  dutyPoints: DutyPoint[]
  leaveMap: Record<string, LeaveInfo>

  bookSearch: string
  setBookSearch: (v: string) => void
  selectedGuard: Guard | null
  onSelectGuard: (g: Guard) => void
  onClearSelectedGuard: () => void
  searchDropdownOpen: boolean
  setSearchDropdownOpen: (v: boolean) => void
  filteredSearchGuards: Guard[]
  unloggedGuards: Guard[]

  bookDutyPointId: string
  setBookDutyPointId: (v: string) => void

  bookTime: string
  setBookTime: (v: string) => void
  timePresets: string[]
  shift: string
  onPresetTime: (t: string) => void

  bookStatus: string
  setBookStatus: (v: string) => void
  bookRemarks: string
  setBookRemarks: (v: string) => void

  onSubmit: () => void
  bookSaving: boolean
  searchInputRef: RefObject<HTMLInputElement>
  dropdownRef: RefObject<HTMLDivElement>

  recentEntries: RecentBookEntry[]
}

export function BookEntryMode(props: BookEntryModeProps) {
  const {
    isSupervisor, pendingCount, onMarkRestAbsent,
    attendanceRows, dutyPoints, leaveMap,
    bookSearch, setBookSearch, selectedGuard, onSelectGuard, onClearSelectedGuard,
    searchDropdownOpen, setSearchDropdownOpen, filteredSearchGuards, unloggedGuards,
    bookDutyPointId, setBookDutyPointId,
    bookTime, setBookTime, timePresets, shift, onPresetTime,
    bookStatus, setBookStatus, bookRemarks, setBookRemarks,
    onSubmit, bookSaving, searchInputRef, dropdownRef,
    recentEntries,
  } = props

  const selectedLeave = selectedGuard ? leaveMap[selectedGuard.id] : undefined

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/40 via-white to-slate-50 dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 shadow-md">
        <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Physical Logbook Entry
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Sequential entry directly from the paper attendance book
                </p>
              </div>
            </div>

            {isSupervisor && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMarkRestAbsent}
                disabled={pendingCount === 0}
                className="text-xs h-8 text-rose-600 dark:text-rose-400 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
                title="Mark anyone who did not write their name as absent"
              >
                <UserX className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Finished Book? Mark Rest Absent ({pendingCount})</span>
                <span className="sm:hidden">Rest Absent ({pendingCount})</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* STEP 1: Guard Selector / Quick Tap Bar */}
          <div className="space-y-1.5" ref={dropdownRef}>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                1. Guard Name / Badge (from book row)
              </Label>
              {selectedGuard && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Selected: {selectedGuard.fullName}
                </span>
              )}
            </div>

            {selectedLeave && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs">
                <CalendarCheck className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{selectedGuard?.fullName}</strong> has approved <strong>{selectedLeave.type.replace(/_/g, ' ')}</strong>
                  {selectedLeave.refNumber ? ` (${selectedLeave.refNumber})` : ''} overlapping this date.
                </span>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                ref={searchInputRef}
                className="pl-10 pr-9 h-12 text-sm sm:text-base font-medium rounded-xl border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 shadow-sm"
                placeholder="Type guard name or badge ID (e.g. John, GT-002)..."
                value={bookSearch}
                onChange={(e) => {
                  setBookSearch(e.target.value)
                  setSearchDropdownOpen(true)
                  if (selectedGuard && e.target.value !== selectedGuard.fullName) {
                    onClearSelectedGuard()
                  }
                }}
                onFocus={() => setSearchDropdownOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (filteredSearchGuards.length > 0 && !selectedGuard) {
                      onSelectGuard(filteredSearchGuards[0])
                    } else if (selectedGuard) {
                      onSubmit()
                    }
                  }
                }}
              />
              {bookSearch && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  onClick={() => {
                    onClearSelectedGuard()
                    setBookSearch('')
                    searchInputRef.current?.focus()
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Instant Search Dropdown */}
            {searchDropdownOpen && filteredSearchGuards.length > 0 && !selectedGuard && (
              <div className="relative z-50">
                <div className="absolute top-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredSearchGuards.map((g) => {
                    const isAlreadyLogged = attendanceRows.find(r => r.guardId === g.id && r.signInTime && r.status !== 'ABSENT')
                    const gLeave = leaveMap[g.id]
                    return (
                      <button
                        key={g.id}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-between transition-colors"
                        onClick={() => onSelectGuard(g)}
                      >
                        <div className="flex items-center gap-3">
                          <GuardAvatar name={g.fullName} photoUrl={g.photoUrl} />
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{g.fullName}</p>
                            <p className="text-xs text-slate-500">
                              {g.badgeId} · {g.defaultDutyPoint?.name || 'Default Duty Point'}
                              {gLeave && (
                                <span className="ml-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                                  · On {gLeave.type.replace(/_/g, ' ')}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        {isAlreadyLogged ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                            Logged ({isAlreadyLogged.signInTime})
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            Select <ArrowRight className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quick Unlogged Guards Scrollable Chips (Saves typing on phone!) */}
            {unloggedGuards.length > 0 && (
              <div className="pt-1.5">
                <p className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Tap an unlogged guard to fill immediately ({unloggedGuards.length} remaining):
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {unloggedGuards.slice(0, 10).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onSelectGuard(g)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium flex-shrink-0 transition-all ${selectedGuard?.id === g.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                        }`}
                    >
                      {g.fullName.split(' ')[0]} ({g.badgeId})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Duty Point Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              2. Duty Point / Post
            </Label>
            <Select value={bookDutyPointId} onValueChange={setBookDutyPointId}>
              <SelectTrigger className="h-11 text-sm font-medium rounded-xl">
                <SelectValue placeholder="Select duty point..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {dutyPoints.map((dp, idx) => (
                  <SelectItem key={dp.id} value={dp.id}>
                    #{String(idx + 1).padStart(2, '0')} · {dp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* STEP 3: Sign-In Time with Instant One-Tap Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                3. Sign-In Time (Written in Book)
              </Label>
              <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">
                Selected: {bookTime}
              </span>
            </div>

            {/* Big One-Tap Time Buttons (Critical for Mobile!) */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {timePresets.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onPresetTime(t)}
                  className={`py-2 px-1 text-center font-mono text-xs font-bold rounded-lg transition-all ${bookTime === t
                      ? 'bg-blue-600 text-white shadow ring-2 ring-blue-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Manual Time Input fallback */}
            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="time"
                  value={bookTime}
                  onChange={(e) => {
                    setBookTime(e.target.value)
                    const cutoff = shift === 'day-shift' ? '06:15' : '18:15'
                    setBookStatus(e.target.value <= cutoff ? 'PRESENT' : 'LATE')
                  }}
                  className="pl-9 h-10 text-sm font-mono rounded-lg"
                />
              </div>

              {/* One-tap "Now" button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date().toTimeString().slice(0, 5)
                  onPresetTime(now)
                }}
                className="h-10 text-xs px-3 font-semibold"
              >
                Use Now
              </Button>
            </div>
          </div>

          {/* STEP 4: Status Selector (Large Touch Targets with Off, Excused & Exeat/Leave) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              4. Attendance Status
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBookStatus('PRESENT')}
                className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${bookStatus === 'PRESENT'
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  }`}
              >
                <CheckCircle className="h-4 w-4" />
                Present
              </button>

              <button
                type="button"
                onClick={() => setBookStatus('LATE')}
                className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${bookStatus === 'LATE'
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400'
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}
              >
                <AlertCircle className="h-4 w-4" />
                Late
              </button>

              <button
                type="button"
                onClick={() => {
                  setBookStatus('ABSENT')
                  setBookTime('')
                }}
                className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${bookStatus === 'ABSENT'
                    ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400'
                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
              >
                <XCircle className="h-4 w-4" />
                Absent
              </button>
            </div>

            {/* Additional Special Authorized Status Toggles */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setBookStatus('OFF')
                  setBookTime('')
                  if (!bookRemarks) setBookRemarks('Roster Off Day')
                }}
                className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${bookStatus === 'OFF'
                    ? 'bg-slate-700 text-white shadow-md ring-2 ring-slate-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                  }`}
                title="Regular scheduled off-duty day"
              >
                <Coffee className="h-3.5 w-3.5" />
                Off Day
              </button>

              <button
                type="button"
                onClick={() => {
                  setBookStatus('EXCUSED')
                  setBookTime('')
                  if (!bookRemarks) setBookRemarks('Excuse Duty: Illness / Medical')
                }}
                className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${bookStatus === 'EXCUSED'
                    ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400'
                    : 'bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  }`}
                title="Excuse duty due to sickness or clinic visit"
              >
                <Stethoscope className="h-3.5 w-3.5" />
                Excuse Duty
              </button>

              <button
                type="button"
                onClick={() => {
                  setBookStatus('LEAVE')
                  setBookTime('')
                  if (!bookRemarks) setBookRemarks('On Exeat / Casual Leave')
                }}
                className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${bookStatus === 'LEAVE'
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400'
                    : 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  }`}
                title="Approved Exeat or casual leave"
              >
                <FileBadge className="h-3.5 w-3.5" />
                On Exeat
              </button>
            </div>
          </div>

          {/* Optional Remarks input (shows prompt for exeat number or medical note) */}
          <div className="space-y-1">
            <Label htmlFor="bookRemarks" className="text-xs text-slate-500 flex items-center justify-between">
              <span>Remarks / Notes / Exeat Form Ref</span>
              {(bookStatus === 'LEAVE' || bookStatus === 'EXCUSED') && (
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  Include Exeat Form # or Clinic Note
                </span>
              )}
            </Label>
            <Input
              id="bookRemarks"
              value={bookRemarks}
              onChange={(e) => setBookRemarks(e.target.value)}
              placeholder={
                bookStatus === 'LEAVE'
                  ? 'e.g. Exeat Form #EF-042, Emergency travel...'
                  : bookStatus === 'EXCUSED'
                    ? 'e.g. Excuse duty slip from PCC Clinic, malaria...'
                    : 'e.g. Relieved Guard Kofi, Gate duty...'
              }
              className="h-9 text-xs rounded-lg"
            />
          </div>

          {/* STEP 5: Big "Record Entry & Next Guard" Action Button */}
          <div className="pt-2">
            <Button
              onClick={onSubmit}
              disabled={!selectedGuard || bookSaving}
              className="w-full h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
            >
              <UserCheck className="h-5 w-5" />
              {bookSaving ? (
                'Recording Entry...'
              ) : selectedGuard ? (
                `Save "${selectedGuard.fullName}" & Next Line (↵)`
              ) : (
                'Select Guard to Record'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* RECENTLY LOGGED ENTRIES (Live Cross-Check with the Physical Book) */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="py-3 px-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Live Logbook Feed ({recentEntries.length} just logged)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Matches your paper book order
          </span>
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          {recentEntries.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              No book entries logged in this session yet. Type a guard name above to start.
            </div>
          ) : (
            <div className="space-y-2">
              {recentEntries.map((entry, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-mono font-bold text-slate-400 w-5 text-right">
                      #{recentEntries.length - idx}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {entry.guardName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {entry.badgeId} · {entry.dutyPointName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {entry.signInTime || 'N/A'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[entry.status] || ''}`}>
                      {entry.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
