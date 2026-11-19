export interface Guard {
  id: string
  fullName: string
  badgeId: string
  phone?: string | null
  photoUrl?: string | null
  shiftType?: string
  defaultDutyPoint: { id: string; name: string } | null
}

export interface DutyPoint {
  id: string
  name: string
}

export interface AttendanceRow {
  guardId: string
  guardName: string
  badgeId: string
  photoUrl?: string | null
  dutyPointId: string
  signInTime: string
  status: string
  remarks: string
}

export interface RecentBookEntry {
  guardName: string
  badgeId: string
  dutyPointName: string
  signInTime: string
  status: string
  timestamp: string
}

export interface LeaveInfo {
  type: string
  refNumber: string | null
}

export const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
  LATE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
  ABSENT: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800',
  OFF: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
  LEAVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-800',
  EXCUSED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-800',
}

export type StatusFilter = 'ALL' | 'PENDING' | 'PRESENT' | 'LATE' | 'ABSENT' | 'OFF' | 'EXCUSED' | 'LEAVE'
export type ShiftTypeFilter = 'ALL' | 'DS' | 'NS'
export type SortMode = 'alpha' | 'status' | 'pending'

export interface RosterStats {
  total: number
  present: number
  late: number
  absent: number
  off: number
  excused: number
  leave: number
  recorded: number
  pending: number
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
