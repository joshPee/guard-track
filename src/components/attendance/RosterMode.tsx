'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Shield, CheckCircle, XCircle, AlertCircle,
  Search, X, Check,
  ListFilter, Layers, Coffee, FileBadge, Stethoscope,
  Download, CalendarCheck,
} from 'lucide-react'
import {
  Guard, DutyPoint, AttendanceRow, LeaveInfo, STATUS_COLORS,
  StatusFilter, ShiftTypeFilter, SortMode, RosterStats,
} from './types'
import { GuardAvatar } from './GuardAvatar'

interface RosterModeProps {
  isSupervisor: boolean
  attendanceRows: AttendanceRow[]
  filteredRows: AttendanceRow[]
  dutyPoints: DutyPoint[]
  shift: string
  leaveMap: Record<string, LeaveInfo>

  rosterSearch: string
  setRosterSearch: (v: string) => void
  statusFilter: StatusFilter
  setStatusFilter: (v: StatusFilter) => void
  shiftTypeFilter: ShiftTypeFilter
  setShiftTypeFilter: (v: ShiftTypeFilter) => void
  sortMode: SortMode
  onCycleSort: () => void
  stats: RosterStats

  hasChanges: boolean
  saving: boolean
  onSave: () => void
  onAllOnTime: () => void
  onExport: () => void

  selectedGuardIds: Set<string>
  setSelectedGuardIds: (s: Set<string>) => void
  toggleSelectGuard: (guardId: string) => void
  toggleSelectAll: () => void

  updateRow: (index: number, field: keyof AttendanceRow, value: string) => void
  markRowPresent: (index: number, presetTime?: string) => void
  markRowLate: (index: number, presetTime?: string) => void
  markRowAbsent: (index: number) => void
  markRowOff: (index: number) => void
  markRowExcused: (index: number) => void
  markRowLeave: (index: number) => void

  bulkMarkPresent: () => void
  bulkMarkLate: () => void
  bulkMarkAbsent: () => void
  bulkMarkOff: () => void
  bulkAssignDutyPoint: (dutyPointId: string) => void

  successMsg: string
}

function LeaveBadge({ info }: { info?: LeaveInfo }) {
  if (!info) return null
  return (
    <span
      className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400"
      title={`Approved ${info.type.replace(/_/g, ' ')}${info.refNumber ? ` (${info.refNumber})` : ''} overlapping this date`}
    >
      <CalendarCheck className="h-3.5 w-3.5" />
    </span>
  )
}

export function RosterMode(props: RosterModeProps) {
  const {
    isSupervisor, attendanceRows, filteredRows, dutyPoints, shift, leaveMap,
    rosterSearch, setRosterSearch, statusFilter, setStatusFilter,
    shiftTypeFilter, setShiftTypeFilter, sortMode, onCycleSort, stats,
    hasChanges, saving, onSave, onAllOnTime, onExport,
    selectedGuardIds, setSelectedGuardIds, toggleSelectGuard, toggleSelectAll,
    updateRow, markRowPresent, markRowLate, markRowAbsent, markRowOff, markRowExcused, markRowLeave,
    bulkMarkPresent, bulkMarkLate, bulkMarkAbsent, bulkMarkOff, bulkAssignDutyPoint,
    successMsg,
  } = props

  const shiftTypeBadge = shift === 'day-shift' ? 'DS' : 'NS'
  const shiftTypeBadgeCls = shift === 'day-shift'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'

  const allFilteredSelected = filteredRows.length > 0 && selectedGuardIds.size === filteredRows.length

  return (
    <Card className="animate-fade-in-up border-slate-200 dark:border-slate-800">
      <CardHeader className="p-4 sm:p-6 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <CardTitle className="text-base sm:text-lg">Shift Attendance Roster</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {filteredRows.length} of {attendanceRows.length} guards for this shift
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {/* Select All Checkbox */}
          {isSupervisor && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="h-9 px-3 flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${allFilteredSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                {allFilteredSelected && (
                  <Check className="h-3 w-3 text-white" />
                )}
              </div>
              <span className="hidden sm:inline">Select All</span>
            </button>
          )}

          {/* Search roster — with clear button */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              className="pl-8 pr-8 w-full sm:w-52 h-9 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
              placeholder="Search guard or badge ID..."
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
            />
            {rosterSearch && (
              <button
                type="button"
                onClick={() => setRosterSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort cycle button */}
          <button
            type="button"
            onClick={onCycleSort}
            title={`Sort: ${sortMode === 'alpha' ? 'A→Z' : sortMode === 'status' ? 'By Status' : 'Pending First'}`}
            className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
          >
            {sortMode === 'alpha' ? (
              <><span className="text-slate-400 text-[10px]">A→Z</span><span>Alpha</span></>
            ) : sortMode === 'status' ? (
              <><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /><span>By Status</span></>
            ) : (
              <><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /><span>Pending First</span></>
            )}
          </button>

          {/* Export CSV button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={attendanceRows.length === 0}
            className="h-9 text-xs gap-1.5"
            title="Export shift roster to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span> CSV
          </Button>

          {isSupervisor && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onAllOnTime}
                className="h-9 text-xs"
                title="Mark all guards as present at shift start"
              >
                All On-Time
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={!hasChanges || saving}
                className={`h-9 text-xs font-semibold ${hasChanges
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    : ''
                  }`}
              >
                {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved ✓'}
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      {/* Status Filter Chips — colour-coded with live count badges */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1 flex-shrink-0 uppercase tracking-wider">
            <ListFilter className="h-3 w-3" /> Filter:
          </span>
          {(
            [
              { key: 'ALL', label: 'All', count: stats.total, activeCls: 'bg-blue-600 text-white', dot: '' },
              { key: 'PENDING', label: 'Pending', count: stats.pending, activeCls: 'bg-amber-500 text-white', dot: 'bg-amber-400' },
              { key: 'PRESENT', label: 'Present', count: stats.present, activeCls: 'bg-emerald-600 text-white', dot: 'bg-emerald-500' },
              { key: 'LATE', label: 'Late', count: stats.late, activeCls: 'bg-amber-600 text-white', dot: 'bg-amber-500' },
              { key: 'ABSENT', label: 'Absent', count: stats.absent, activeCls: 'bg-rose-600 text-white', dot: 'bg-rose-500' },
              { key: 'OFF', label: 'Off Day', count: stats.off, activeCls: 'bg-slate-600 text-white', dot: 'bg-slate-400' },
              { key: 'EXCUSED', label: 'Excuse Duty', count: stats.excused, activeCls: 'bg-purple-600 text-white', dot: 'bg-purple-500' },
              { key: 'LEAVE', label: 'On Leave / Exeat', count: stats.leave, activeCls: 'bg-blue-500 text-white', dot: 'bg-blue-400' },
            ] as const
          ).map(({ key, label, count, activeCls, dot }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${statusFilter === key
                  ? `${activeCls} shadow-sm`
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
            >
              {dot && statusFilter !== key && (
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
              )}
              {label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusFilter === key ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Shift Type Filter Chips (DS/NS) */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1 flex-shrink-0 uppercase tracking-wider">
            <Layers className="h-3 w-3" /> Shift Type:
          </span>
          {(
            [
              { key: 'ALL', label: 'All Shifts', activeCls: 'bg-slate-600 text-white' },
              { key: 'DS', label: 'Day Shift (DS)', activeCls: 'bg-blue-600 text-white' },
              { key: 'NS', label: 'Night Shift (NS)', activeCls: 'bg-purple-600 text-white' },
            ] as const
          ).map(({ key, label, activeCls }) => (
            <button
              key={key}
              type="button"
              onClick={() => setShiftTypeFilter(key)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${shiftTypeFilter === key
                  ? `${activeCls} shadow-sm`
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedGuardIds.size > 0 && isSupervisor && (
        <div className="mx-4 sm:mx-6 my-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                {selectedGuardIds.size} guard{selectedGuardIds.size !== 1 ? 's' : ''} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedGuardIds(new Set())}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={bulkMarkPresent}
                className="h-8 text-xs gap-1"
              >
                <CheckCircle className="h-3 w-3" />
                Present
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={bulkMarkLate}
                className="h-8 text-xs gap-1"
              >
                <AlertCircle className="h-3 w-3" />
                Late
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={bulkMarkAbsent}
                className="h-8 text-xs gap-1"
              >
                <XCircle className="h-3 w-3" />
                Absent
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={bulkMarkOff}
                className="h-8 text-xs gap-1"
              >
                <Coffee className="h-3 w-3" />
                Off
              </Button>
              <Select onValueChange={bulkAssignDutyPoint}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Assign post..." />
                </SelectTrigger>
                <SelectContent>
                  {dutyPoints.map(dp => (
                    <SelectItem key={dp.id} value={dp.id}>
                      {dp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="mx-4 sm:mx-6 my-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {successMsg}
        </div>
      )}

      <CardContent className="p-3 sm:p-6">
        {attendanceRows.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No roster loaded for this date and shift.</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No guards match your search / filter criteria.</p>
          </div>
        ) : (
          <>
            {/* ------------------------------------------------------------- */}
            {/* MOBILE VIEW (< md): Touch-Friendly Cards (No horizontal scroll) */}
            {/* ------------------------------------------------------------- */}
            <div className="block md:hidden space-y-3">
              {filteredRows.map((row) => {
                const realIndex = attendanceRows.findIndex(r => r.guardId === row.guardId)
                const isRecorded = row.signInTime && row.status !== 'ABSENT'
                const isSelected = selectedGuardIds.has(row.guardId)

                return (
                  <div
                    key={row.guardId}
                    className={`p-3.5 rounded-xl border transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''} ${row.status === 'PRESENT'
                        ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : row.status === 'LATE'
                          ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10'
                          : row.status === 'ABSENT' && row.signInTime
                            ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                  >
                    {/* Header: Guard Name, Badge, Status, Checkbox */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSupervisor && (
                          <button
                            type="button"
                            onClick={() => toggleSelectGuard(row.guardId)}
                            className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </button>
                        )}
                        <GuardAvatar name={row.guardName} photoUrl={row.photoUrl} />
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {row.guardName}
                          </p>
                          <p className="text-xs font-mono text-slate-500">
                            {row.badgeId}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {leaveMap[row.guardId] && <LeaveBadge info={leaveMap[row.guardId]} />}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${shiftTypeBadgeCls}`}>
                          {shiftTypeBadge}
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[row.status] || ''}`}>
                          {row.status}
                        </span>
                      </div>
                    </div>

                    {/* Duty Point Selector */}
                    <div className="mb-2.5">
                      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                        Duty Post
                      </Label>
                      <Select
                        value={row.dutyPointId}
                        onValueChange={(val) => updateRow(realIndex, 'dutyPointId', val)}
                        disabled={!isSupervisor}
                      >
                        <SelectTrigger className="w-full h-9 text-xs font-medium">
                          <SelectValue placeholder="Assign post..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {dutyPoints.map((dp, idx) => (
                            <SelectItem key={dp.id} value={dp.id}>
                              #{String(idx + 1).padStart(2, '0')} · {dp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sign-In Time & Fast Time Chips */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Sign-In Time
                        </Label>
                        {row.signInTime && (
                          <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                            {row.signInTime}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Input
                          type="time"
                          value={row.signInTime}
                          onChange={(e) => updateRow(realIndex, 'signInTime', e.target.value)}
                          disabled={!isSupervisor}
                          className="h-9 text-xs font-mono flex-1"
                        />
                        {/* Fast chips */}
                        {isSupervisor && (
                          <>
                            <button
                              type="button"
                              onClick={() => markRowPresent(realIndex, shift === 'day-shift' ? '06:00' : '18:00')}
                              className="h-9 px-2 text-[11px] font-mono font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                            >
                              {shift === 'day-shift' ? '06:00' : '18:00'}
                            </button>
                            <button
                              type="button"
                              onClick={() => markRowLate(realIndex, shift === 'day-shift' ? '06:20' : '18:20')}
                              className="h-9 px-2 text-[11px] font-mono font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                            >
                              {shift === 'day-shift' ? '06:20' : '18:20'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Fast Status Action Segment (Big Touch Targets) */}
                    {isSupervisor && (
                      <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => markRowPresent(realIndex)}
                            className={`py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${row.status === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                              }`}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Present
                          </button>

                          <button
                            type="button"
                            onClick={() => markRowLate(realIndex)}
                            className={`py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${row.status === 'LATE'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                              }`}
                          >
                            <AlertCircle className="h-3.5 w-3.5" />
                            Late
                          </button>

                          <button
                            type="button"
                            onClick={() => markRowAbsent(realIndex)}
                            className={`py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${row.status === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                              }`}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Absent
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => markRowOff(realIndex)}
                            className={`py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${row.status === 'OFF'
                                ? 'bg-slate-700 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                              }`}
                            title="Roster off day"
                          >
                            <Coffee className="h-3.5 w-3.5" />
                            Off Day
                          </button>

                          <button
                            type="button"
                            onClick={() => markRowExcused(realIndex)}
                            className={`py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${row.status === 'EXCUSED'
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                              }`}
                            title="Excuse duty (illness)"
                          >
                            <Stethoscope className="h-3.5 w-3.5" />
                            Excuse
                          </button>

                          <button
                            type="button"
                            onClick={() => markRowLeave(realIndex)}
                            className={`py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${row.status === 'LEAVE'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                              }`}
                            title="On exeat / casual leave"
                          >
                            <FileBadge className="h-3.5 w-3.5" />
                            Exeat
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* DESKTOP VIEW (>= md): Full Data Table                         */}
            {/* ------------------------------------------------------------- */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[900px] table-enhanced">
                <thead>
                  <tr className="border-b">
                    {isSupervisor && (
                      <th className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className={`w-5 h-5 rounded border flex items-center justify-center mx-auto ${allFilteredSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}
                        >
                          {allFilteredSelected && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </button>
                      </th>
                    )}
                    <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Guard</th>
                    <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Badge ID</th>
                    <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Duty Point</th>
                    <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sign-In</th>
                    <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Remarks</th>
                    {isSupervisor && <th className="text-center p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const realIndex = attendanceRows.findIndex(r => r.guardId === row.guardId)
                    const isSelected = selectedGuardIds.has(row.guardId)
                    return (
                      <tr key={row.guardId} className={`border-b hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                        {isSupervisor && (
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectGuard(row.guardId)}
                              className={`w-5 h-5 rounded border flex items-center justify-center mx-auto ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}
                            >
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </button>
                          </td>
                        )}
                        <td className="p-2.5">
                          <div className="flex items-center gap-2.5">
                            <GuardAvatar name={row.guardName} photoUrl={row.photoUrl} size="sm" />
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                                {row.guardName}
                                <LeaveBadge info={leaveMap[row.guardId]} />
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-2.5 text-sm text-slate-500 font-mono">{row.badgeId}</td>
                        <td className="p-2.5">
                          <Select
                            value={row.dutyPointId}
                            onValueChange={(val) => updateRow(realIndex, 'dutyPointId', val)}
                            disabled={!isSupervisor}
                          >
                            <SelectTrigger className="w-44 h-8 text-xs font-medium">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                              {dutyPoints.map((dp, idx) => (
                                <SelectItem key={dp.id} value={dp.id}>
                                  #{String(idx + 1).padStart(2, '0')} · {dp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2.5">
                          <Input
                            type="time"
                            value={row.signInTime}
                            onChange={(e) => updateRow(realIndex, 'signInTime', e.target.value)}
                            disabled={!isSupervisor}
                            className="w-32 h-8 text-xs font-mono"
                          />
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${shiftTypeBadgeCls}`}>
                              {shiftTypeBadge}
                            </span>
                            {isSupervisor ? (
                              <Select
                                value={row.status}
                                onValueChange={(val) => updateRow(realIndex, 'status', val)}
                              >
                                <SelectTrigger className="w-28 h-8 text-xs font-semibold">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PRESENT">Present</SelectItem>
                                  <SelectItem value="LATE">Late</SelectItem>
                                  <SelectItem value="ABSENT">Absent</SelectItem>
                                  <SelectItem value="OFF">Off</SelectItem>
                                  <SelectItem value="LEAVE">Leave</SelectItem>
                                  <SelectItem value="EXCUSED">Excused</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[row.status] || ''}`}>
                                {row.status}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <Input
                            value={row.remarks}
                            onChange={(e) => updateRow(realIndex, 'remarks', e.target.value)}
                            disabled={!isSupervisor}
                            placeholder="Remarks..."
                            className="w-40 h-8 text-xs"
                          />
                        </td>
                        {isSupervisor && (
                          <td className="p-2.5">
                            <div className="flex gap-0.5 justify-center">
                              <button
                                onClick={() => markRowPresent(realIndex)}
                                title="Mark Present"
                                className={`p-1.5 rounded-lg transition-colors ${row.status === 'PRESENT' ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}`}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => markRowLate(realIndex)}
                                title="Mark Late"
                                className={`p-1.5 rounded-lg transition-colors ${row.status === 'LATE' ? 'bg-amber-600 text-white' : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'}`}
                              >
                                <AlertCircle className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => markRowAbsent(realIndex)}
                                title="Mark Absent"
                                className={`p-1.5 rounded-lg transition-colors ${row.status === 'ABSENT' ? 'bg-rose-600 text-white' : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30'}`}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => markRowOff(realIndex)}
                                title="Off Day"
                                className={`p-1.5 rounded-lg transition-colors ${row.status === 'OFF' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                              >
                                <Coffee className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => markRowExcused(realIndex)}
                                title="Excuse Duty (Illness)"
                                className={`p-1.5 rounded-lg transition-colors ${row.status === 'EXCUSED' ? 'bg-purple-600 text-white' : 'text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30'}`}
                              >
                                <Stethoscope className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => markRowLeave(realIndex)}
                                title="On Exeat / Casual Leave"
                                className={`p-1.5 rounded-lg transition-colors ${row.status === 'LEAVE' ? 'bg-blue-600 text-white' : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30'}`}
                              >
                                <FileBadge className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
