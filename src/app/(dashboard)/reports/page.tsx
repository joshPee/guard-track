'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Download,
  FileText,
  FileBarChart,
  Search,
  User,
  Users,
  TrendingUp,
  Calendar,
  Clock,
  FileDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  ChevronDown,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { toast } from '@/components/ui/toast'
import {
  exportDailyReportPDF,
  exportWeeklyReportPDF,
  exportMonthlyReportPDF,
  exportSingleGuardWeeklyPDF,
  exportSingleGuardMonthlyPDF,
  GuardReportItem,
} from '@/lib/pdf-export'
import {
  exportDailyReportCSV,
  exportWeeklyReportCSV,
  exportMonthlyReportCSV,
  exportSingleGuardWeeklyCSV,
  exportSingleGuardMonthlyCSV,
} from '@/lib/csv-export'

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-emerald-500',
  LATE: 'bg-amber-400',
  ABSENT: 'bg-rose-500',
  OFF: 'bg-slate-400',
  LEAVE: 'bg-blue-400',
  EXCUSED: 'bg-purple-400',
}

const STATUS_TEXT: Record<string, string> = {
  PRESENT: 'P',
  LATE: 'L',
  ABSENT: 'A',
  OFF: 'O',
  LEAVE: 'LV',
  EXCUSED: 'E',
}

const STATUS_BADGE: Record<string, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  LATE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  ABSENT: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  OFF: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  LEAVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  EXCUSED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
}

export default function ReportsPage() {
  const [tab, setTab] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [guard, setGuard] = useState('all')
  const [shift, setShift] = useState('day-shift')
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [guards, setGuards] = useState<any[]>([])
  const [guardSearch, setGuardSearch] = useState('')

  // Result-level search and status filter (passed down to sub-reports)
  const [resultSearch, setResultSearch] = useState('')
  const [resultStatusFilter, setResultStatusFilter] = useState('ALL')

  // Guard scope selector mode: 'all' | 'specific'
  const [scopeMode, setScopeMode] = useState<'all' | 'specific'>('all')
  const [specificGuardSearch, setSpecificGuardSearch] = useState('')

  // Mobile: collapsible filter card
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    fetchGuards()
  }, [])

  useEffect(() => {
    generateReport()
  }, [date, shift, guard])

  // Reset result search/filter whenever new report data arrives
  useEffect(() => {
    setResultSearch('')
    setResultStatusFilter('ALL')
  }, [reportData])

  const fetchGuards = async () => {
    try {
      const res = await fetch('/api/guards')
      if (res.ok) setGuards(await res.json())
    } catch (e) { console.error(e) }
  }

  const generateReport = useCallback(async (overrideTab?: 'daily' | 'weekly' | 'monthly') => {
    setLoading(true)
    const activeTab = overrideTab || tab
    try {
      let url = ''
      const params = new URLSearchParams()
      if (activeTab === 'daily') {
        url = '/api/reports/daily'
        params.append('date', date)
        params.append('shiftId', shift)
      } else if (activeTab === 'weekly') {
        url = '/api/reports/weekly'
        params.append('weekStart', date)
      } else {
        url = '/api/reports/monthly'
        params.append('month', date)
      }
      if (guard !== 'all') params.append('guardId', guard)
      const res = await fetch(`${url}?${params.toString()}`)
      if (res.ok) setReportData(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [tab, date, shift, guard])

  const selectedGuardObj = guards.find(g => g.id === guard)
  const selectedGuardName = selectedGuardObj?.fullName

  // PDF Export handler
  const handleExportPDF = (targetGuardItem?: GuardReportItem) => {
    if (!reportData) {
      toast.warning('No report data available to export.', 'Export PDF')
      return
    }
    try {
      if (tab === 'daily') {
        exportDailyReportPDF(reportData, date, shift, selectedGuardName)
      } else if (tab === 'weekly') {
        if (targetGuardItem) {
          exportSingleGuardWeeklyPDF(targetGuardItem, reportData.days, date)
        } else {
          exportWeeklyReportPDF(reportData, date, { guardId: guard, guardName: selectedGuardName })
        }
      } else {
        if (targetGuardItem) {
          exportSingleGuardMonthlyPDF(targetGuardItem, reportData.days, date)
        } else {
          exportMonthlyReportPDF(reportData, date, { guardId: guard, guardName: selectedGuardName })
        }
      }

      const scopeName = targetGuardItem
        ? targetGuardItem.guard.fullName
        : guard !== 'all' && selectedGuardName
        ? selectedGuardName
        : 'All Guards'
      toast.success(`${tab.toUpperCase()} PDF for ${scopeName} downloaded successfully.`, 'Export PDF')
    } catch (e) {
      console.error(e)
      toast.error('Failed to export PDF report. Please try again.', 'Export Failed')
    }
  }

  // CSV Export handler
  const handleExportCSV = (targetGuardItem?: GuardReportItem) => {
    if (!reportData) {
      toast.warning('No report data available to export.', 'Export CSV')
      return
    }
    try {
      if (tab === 'daily') {
        exportDailyReportCSV(reportData, date, shift, selectedGuardName)
      } else if (tab === 'weekly') {
        if (targetGuardItem) {
          exportSingleGuardWeeklyCSV(targetGuardItem, reportData.days, date)
        } else {
          exportWeeklyReportCSV(reportData, date, { guardId: guard, guardName: selectedGuardName })
        }
      } else {
        if (targetGuardItem) {
          exportSingleGuardMonthlyCSV(targetGuardItem, reportData.days, date)
        } else {
          exportMonthlyReportCSV(reportData, date, { guardId: guard, guardName: selectedGuardName })
        }
      }

      const scopeName = targetGuardItem
        ? targetGuardItem.guard.fullName
        : guard !== 'all' && selectedGuardName
        ? selectedGuardName
        : 'All Guards'
      toast.success(`${tab.toUpperCase()} CSV spreadsheet for ${scopeName} downloaded successfully.`, 'Export CSV')
    } catch (e) {
      console.error(e)
      toast.error('Failed to export CSV report. Please try again.', 'Export Failed')
    }
  }

  // Filtered guard list for the specific-guard search input
  const filteredGuardSearch = guardSearch.trim()
    ? guards.filter(g =>
        g.fullName.toLowerCase().includes(guardSearch.toLowerCase()) ||
        g.badgeId.toLowerCase().includes(guardSearch.toLowerCase())
      )
    : guards

  // Specific guard mode: inline search filter
  const filteredSpecificGuards = specificGuardSearch.trim()
    ? guards.filter(g =>
        g.fullName.toLowerCase().includes(specificGuardSearch.toLowerCase()) ||
        g.badgeId.toLowerCase().includes(specificGuardSearch.toLowerCase())
      )
    : guards

  const tabs: Array<{ id: 'daily' | 'weekly' | 'monthly'; label: string; icon: any }> = [
    { id: 'weekly', label: 'Weekly Report', icon: TrendingUp },
    { id: 'monthly', label: 'Monthly Report', icon: FileBarChart },
    { id: 'daily', label: 'Daily Shift', icon: Calendar },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Reports' },
          { label: 'Attendance Reports' },
        ]}
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <PageHeader
        icon={FileBarChart}
        title="Attendance Reports"
        description="Generate, preview, and export weekly and monthly reports for each guard or all guards as a whole"
        color="blue"
      />

      {/* Tab Switcher */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id)
              setReportData(null)
              generateReport(t.id)
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/30'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters Card — collapsible on mobile, always open on desktop */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <span>{tab === 'daily' ? 'Daily Report Parameters' : tab === 'weekly' ? 'Weekly Report Parameters' : 'Monthly Report Parameters'}</span>
            </CardTitle>

            <div className="flex items-center gap-2">
              {/* Scope Pill */}
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${
                guard === 'all'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
              }`}>
                {guard === 'all' ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                <span>Scope: {guard === 'all' ? 'All Guards as a Whole' : `${selectedGuardName || 'Selected Guard'}`}</span>
              </span>

              {guard !== 'all' && (
                <button
                  type="button"
                  onClick={() => { setGuard('all'); setScopeMode('all'); setSpecificGuardSearch('') }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  (Reset to All)
                </button>
              )}

              {/* Mobile toggle button */}
              <button
                type="button"
                onClick={() => setFiltersOpen(o => !o)}
                className="sm:hidden flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Filters
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </CardHeader>

        {/* Filter body: always visible on sm+, toggle on mobile */}
        <div className={`${filtersOpen ? 'block' : 'hidden'} sm:block`}>
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3 items-end">
            {/* ── Guard Scope Segmented Toggle ── */}
            <div className="w-full sm:col-span-2 lg:flex-1 min-w-0">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                Guard Scope (All or Individual)
              </Label>

              {/* Segmented toggle */}
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden h-10">
                <button
                  type="button"
                  onClick={() => { setScopeMode('all'); setGuard('all'); setSpecificGuardSearch('') }}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all px-3 ${
                    scopeMode === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  All Guards
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode('specific')}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all px-3 border-l border-slate-200 dark:border-slate-700 ${
                    scopeMode === 'specific'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  Specific Guard
                </button>
              </div>

              {/* Specific guard inline search — only shows when mode is 'specific' */}
              {scopeMode === 'specific' && (
                <div className="mt-2 space-y-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      className="w-full pl-8 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Search guard name or badge ID…"
                      value={specificGuardSearch}
                      onChange={e => setSpecificGuardSearch(e.target.value)}
                      autoFocus
                    />
                    {specificGuardSearch && (
                      <button
                        type="button"
                        onClick={() => setSpecificGuardSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Inline dropdown list */}
                  {filteredSpecificGuards.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-lg divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredSpecificGuards.slice(0, 20).map(g => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => { setGuard(g.id); setSpecificGuardSearch(g.fullName) }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors ${
                            guard === g.id ? 'bg-blue-50 dark:bg-blue-950/30 font-bold text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>👤 {g.fullName}</span>
                          <span className="font-mono text-slate-400">{g.badgeId}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {tab === 'daily' && (
              <div className="w-full lg:flex-1 min-w-0">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Shift</Label>
                <Select value={shift} onValueChange={setShift}>
                  <SelectTrigger className="h-10 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day-shift">Day Shift (06:00 – 18:00)</SelectItem>
                    <SelectItem value="night-shift">Night Shift (18:00 – 06:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="w-full lg:flex-1 min-w-0">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                {tab === 'daily' ? 'Date' : tab === 'weekly' ? 'Week Starting (Monday)' : 'Month'}
              </Label>
              <Input
                type={tab === 'monthly' ? 'month' : 'date'}
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-10 text-xs sm:text-sm font-medium"
              />
            </div>

            <Button
              onClick={() => generateReport()}
              disabled={loading}
              className="w-full sm:w-auto h-10 bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold text-xs sm:text-sm"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <TrendingUp className="h-3.5 w-3.5" />
                  Generate
                </>
              )}
            </Button>
          </CardContent>
        </div>
      </Card>

      {/* Results Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle className="text-base">
              {guard === 'all'
                ? `All Guards ${tab === 'weekly' ? 'Weekly' : tab === 'monthly' ? 'Monthly' : 'Daily'} Report`
                : `${selectedGuardName || 'Guard'} — ${tab === 'weekly' ? 'Weekly' : tab === 'monthly' ? 'Monthly' : 'Daily'} Report`}
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {tab === 'weekly' ? `Week of ${date}` : tab === 'monthly' ? `Month of ${date}` : `Date: ${date}`} · Ready to print or export
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex gap-2 flex-wrap items-center w-full sm:w-auto">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleExportPDF()}
              disabled={!reportData || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 h-9"
              title="Download formatted PDF document"
            >
              <FileText className="h-4 w-4" />
              <span>Export {guard === 'all' ? 'All Guards' : 'Guard'} PDF</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCSV()}
              disabled={!reportData || loading}
              className="text-xs gap-1.5 h-9"
              title="Download Excel/CSV spreadsheet"
            >
              <Download className="h-4 w-4" />
              <span>Export {guard === 'all' ? 'All Guards' : 'Guard'} CSV</span>
            </Button>

            {guard !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setGuard('all')
                }}
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 h-9"
              >
                View All Guards
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {loading ? (
            <div className="space-y-3 py-4">
              {/* Summary cards skeleton */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                ))}
              </div>
              {/* Table rows skeleton */}
              {[1,2,3,4,5,6,7,8].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 border-b border-slate-100 dark:border-slate-800">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-14 hidden sm:block" />
                  <Skeleton className="h-4 w-14 hidden sm:block" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : !reportData ? (
            <div className="py-16 text-center text-slate-400">
              <FileBarChart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No report data available</p>
              <p className="text-sm mt-1">Try adjusting the filters above</p>
            </div>
          ) : tab === 'daily' ? (
            <DailyReport
              data={reportData}
              isSingleGuard={guard !== 'all'}
              resultSearch={resultSearch}
              setResultSearch={setResultSearch}
              resultStatusFilter={resultStatusFilter}
              setResultStatusFilter={setResultStatusFilter}
            />
          ) : tab === 'weekly' ? (
            <WeeklyReport
              data={reportData}
              isSingleGuard={guard !== 'all'}
              onExportGuardPDF={(item) => handleExportPDF(item)}
              onExportGuardCSV={(item) => handleExportCSV(item)}
              resultSearch={resultSearch}
              setResultSearch={setResultSearch}
            />
          ) : (
            <MonthlyReport
              data={reportData}
              isSingleGuard={guard !== 'all'}
              onExportGuardPDF={(item) => handleExportPDF(item)}
              onExportGuardCSV={(item) => handleExportCSV(item)}
              resultSearch={resultSearch}
              setResultSearch={setResultSearch}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY REPORT VIEW
// ─────────────────────────────────────────────────────────────────────────────

function DailyReport({
  data,
  isSingleGuard,
  resultSearch,
  setResultSearch,
  resultStatusFilter,
  setResultStatusFilter,
}: {
  data: any[]
  isSingleGuard: boolean
  resultSearch: string
  setResultSearch: (v: string) => void
  resultStatusFilter: string
  setResultStatusFilter: (v: string) => void
}) {
  // Compute totals from ALL data (not filtered) for the summary cards
  const present = data.filter(r => r.status === 'PRESENT').length
  const late = data.filter(r => r.status === 'LATE').length
  const absent = data.filter(r => r.status === 'ABSENT').length
  const off = data.filter(r => r.status === 'OFF').length
  const leave = data.filter(r => r.status === 'LEAVE' || r.status === 'EXCUSED').length

  // Status filter pills for daily report
  const DAILY_STATUS_PILLS = [
    { key: 'ALL',     label: 'All',     count: data.length,                                                              cls: 'bg-slate-600' },
    { key: 'PRESENT', label: 'Present', count: present,                                                                  cls: 'bg-emerald-600' },
    { key: 'LATE',    label: 'Late',    count: late,                                                                     cls: 'bg-amber-600' },
    { key: 'ABSENT',  label: 'Absent',  count: absent,                                                                   cls: 'bg-rose-600' },
    { key: 'OFF',     label: 'Off',     count: off,                                                                      cls: 'bg-slate-500' },
    { key: 'LEAVE',   label: 'Leave',   count: data.filter(r => r.status === 'LEAVE').length,                            cls: 'bg-blue-600' },
    { key: 'EXCUSED', label: 'Excused', count: data.filter(r => r.status === 'EXCUSED').length,                          cls: 'bg-purple-600' },
  ] as const

  // Apply client-side filters to displayed rows
  const filteredData = data.filter(r => {
    const matchesSearch =
      resultSearch.trim() === '' ||
      r.guard.fullName.toLowerCase().includes(resultSearch.toLowerCase()) ||
      r.guard.badgeId.toLowerCase().includes(resultSearch.toLowerCase())
    const matchesStatus =
      resultStatusFilter === 'ALL' || r.status === resultStatusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4">
      {/* Summary cards (always from full data) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4">
        <div className="rounded-xl py-3 px-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{present}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Present</p>
        </div>
        <div className="rounded-xl py-3 px-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{late}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">Late</p>
        </div>
        <div className="rounded-xl py-3 px-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center">
          <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{absent}</p>
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5">Absent</p>
        </div>
        <div className="rounded-xl py-3 px-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-xl font-bold text-slate-700 dark:text-slate-300">{off}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">Off Day</p>
        </div>
        <div className="rounded-xl py-3 px-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center col-span-2 sm:col-span-1">
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{leave}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">Leave / Exeat</p>
        </div>
      </div>

      {/* Search + Status filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        {/* Search input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            className="w-full pl-8 pr-8 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            placeholder="Search guard name or badge ID…"
            value={resultSearch}
            onChange={e => setResultSearch(e.target.value)}
          />
          {resultSearch && (
            <button
              type="button"
              onClick={() => setResultSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-0.5 flex-shrink-0">
          {DAILY_STATUS_PILLS.map(({ key, label, count, cls }) => (
            <button
              key={key}
              type="button"
              onClick={() => setResultStatusFilter(key)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                resultStatusFilter === key
                  ? `${cls} text-white shadow-sm`
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              {label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                resultStatusFilter === key ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      {(resultSearch || resultStatusFilter !== 'ALL') && (
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredData.length}</span> of <span className="font-semibold">{data.length}</span> records
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full table-enhanced text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase">Guard</th>
              <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase">Badge ID</th>
              <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase">Duty Point</th>
              <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase">Sign-In Time</th>
              <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase">Late Min</th>
              <th className="text-left p-2.5 text-xs font-semibold text-slate-500 uppercase">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400 text-sm">
                  No records match your search or filter criteria.
                </td>
              </tr>
            ) : (
              filteredData.map((record: any) => (
                <tr key={record.id} className="border-b hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-2.5 font-medium">{record.guard.fullName}</td>
                  <td className="p-2.5 font-mono text-slate-500">{record.guard.badgeId}</td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">{record.dutyPoint?.name || '—'}</td>
                  <td className="p-2.5">
                    {record.signInTime
                      ? <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400" />{new Date(record.signInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="p-2.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[record.status] || ''}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-500">{record.minutesLate > 0 ? `+${record.minutesLate}m` : '—'}</td>
                  <td className="p-2.5 text-slate-500 text-xs">{record.remarks || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PAGINATION COMPONENT (used by Weekly & Monthly)
// ─────────────────────────────────────────────────────────────────────────────

function ReportPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
}) {
  // Show up to 7 page numbers, with ellipsis for large sets
  const pageNumbers: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i)
  } else {
    pageNumbers.push(1)
    if (page > 3) pageNumbers.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pageNumbers.push(i)
    if (page < totalPages - 2) pageNumbers.push('…')
    pageNumbers.push(totalPages)
  }

  return (
    <div className="flex items-center justify-between px-1 py-2 border-t border-slate-100 dark:border-slate-800 mt-2">
      <p className="text-xs text-slate-500">
        Showing{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
        </span>{' '}
        of{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-300">{total}</span> guards
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        {pageNumbers.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                p === page
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY REPORT VIEW
// ─────────────────────────────────────────────────────────────────────────────

function WeeklyReport({
  data,
  isSingleGuard,
  onExportGuardPDF,
  onExportGuardCSV,
  resultSearch,
  setResultSearch,
}: {
  data: any
  isSingleGuard: boolean
  onExportGuardPDF: (guardItem: GuardReportItem) => void
  onExportGuardCSV: (guardItem: GuardReportItem) => void
  resultSearch: string
  setResultSearch: (v: string) => void
}) {
  const PAGE_SIZE = 20
  const [page, setPage] = useState(1)
  const allGuards: any[] = data.guards || []

  // Client-side search filter on the guard list
  const filteredGuards = allGuards.filter(gd =>
    resultSearch.trim() === '' ||
    gd.guard.fullName.toLowerCase().includes(resultSearch.toLowerCase()) ||
    gd.guard.badgeId.toLowerCase().includes(resultSearch.toLowerCase())
  )

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1) }, [resultSearch])

  const totalPages = Math.max(1, Math.ceil(filteredGuards.length / PAGE_SIZE))
  const pagedGuards = filteredGuards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Summary stats bar for weekly
  const avgRate = allGuards.length > 0
    ? (allGuards.reduce((sum, gd) => sum + parseFloat(gd.attendanceRate || '0'), 0) / allGuards.length).toFixed(1)
    : '0.0'
  const perfect = allGuards.filter(gd => parseFloat(gd.attendanceRate) >= 100).length
  const poor = allGuards.filter(gd => parseFloat(gd.attendanceRate) < 75).length

  return (
    <div className="space-y-4">
      {/* Summary stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg py-2.5 px-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{allGuards.length}</p>
          <p className="text-[11px] text-slate-500 font-medium">Total Guards</p>
        </div>
        <div className="rounded-lg py-2.5 px-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
          <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{avgRate}%</p>
          <p className="text-[11px] text-blue-500 font-medium">Avg Attendance</p>
        </div>
        <div className="rounded-lg py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{perfect}</p>
          <p className="text-[11px] text-emerald-500 font-medium">100% Attendance</p>
        </div>
        <div className="rounded-lg py-2.5 px-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center">
          <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{poor}</p>
          <p className="text-[11px] text-rose-500 font-medium">Below 75%</p>
        </div>
      </div>

      {/* Search + summary line */}
      <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-500 mb-2 flex-wrap justify-between">
        {/* Result search bar */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            placeholder="Search guard or badge…"
            value={resultSearch}
            onChange={e => setResultSearch(e.target.value)}
          />
          {resultSearch && (
            <button
              type="button"
              onClick={() => setResultSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span><strong className="text-slate-900 dark:text-white">{filteredGuards.length}</strong>{filteredGuards.length !== allGuards.length ? ` / ${allGuards.length}` : ''} guards</span>
          <span>·</span>
          <span><strong className="text-slate-900 dark:text-white">{data.days?.length || 0}</strong> days</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(STATUS_BADGE).map(([s, cls]) => (
            <span key={s} className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
              {s === 'PRESENT' ? 'P=Present' : s === 'LATE' ? 'L=Late' : s === 'ABSENT' ? 'A=Absent' : s === 'OFF' ? 'O=Off' : s === 'LEAVE' ? 'LV=Leave' : 'E=Excused'}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-enhanced text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2.5 font-semibold text-slate-500 uppercase min-w-[130px]">Guard</th>
              <th className="text-left p-2.5 font-semibold text-slate-500 uppercase">Badge</th>
              {data.days?.map((day: string) => (
                <th key={day} className="text-center p-2 font-semibold text-slate-500 uppercase min-w-[48px]">
                  <div>{new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="text-slate-400 font-normal">{new Date(day + 'T12:00:00').getDate()}</div>
                </th>
              ))}
              <th className="text-center p-2 font-semibold text-emerald-600 uppercase">P</th>
              <th className="text-center p-2 font-semibold text-amber-600 uppercase">L</th>
              <th className="text-center p-2 font-semibold text-rose-600 uppercase">A</th>
              <th className="text-center p-2 font-semibold text-slate-600 uppercase">Off</th>
              <th className="text-center p-2 font-semibold text-blue-600 uppercase">Leave</th>
              <th className="text-center p-2 font-semibold text-slate-500 uppercase">Late Min</th>
              <th className="text-center p-2 font-semibold text-slate-500 uppercase min-w-[90px]">Export</th>
            </tr>
          </thead>
          <tbody>
            {pagedGuards.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-10 text-center text-slate-400 text-sm">
                  No guards match your search.
                </td>
              </tr>
            ) : (
              pagedGuards.map((gd: any) => (
                <tr key={gd.guard.id} className="border-b hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-2.5 font-medium text-slate-900 dark:text-white">{gd.guard.fullName}</td>
                  <td className="p-2.5 font-mono text-slate-400">{gd.guard.badgeId}</td>
                  {data.days?.map((day: string) => {
                    const d = gd.days[day]
                    return (
                      <td key={day} className="p-1 text-center">
                        {d ? (
                          <span
                            title={`${d.status}${d.signInTime ? ' · ' + new Date(d.signInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}${d.dutyPoint ? ' · ' + d.dutyPoint : ''}${d.remarks ? ' · ' + d.remarks : ''}`}
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-white text-xs font-bold ${STATUS_COLORS[d.status] || 'bg-slate-300'}`}
                          >
                            {STATUS_TEXT[d.status] || '?'}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="p-2 text-center font-bold text-emerald-700 dark:text-emerald-400">{gd.totals.present}</td>
                  <td className="p-2 text-center font-bold text-amber-700 dark:text-amber-400">{gd.totals.late}</td>
                  <td className="p-2 text-center font-bold text-rose-700 dark:text-rose-400">{gd.totals.absent}</td>
                  <td className="p-2 text-center font-medium text-slate-600 dark:text-slate-400">{gd.totals.off || 0}</td>
                  <td className="p-2 text-center font-medium text-blue-600 dark:text-blue-400">{(gd.totals.leave || 0) + (gd.totals.excused || 0)}</td>
                  <td className="p-2 text-center text-slate-500">{gd.totals.minutesLate > 0 ? `${gd.totals.minutesLate}m` : '—'}</td>
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onExportGuardPDF(gd)}
                        title={`Export Weekly PDF for ${gd.guard.fullName}`}
                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onExportGuardCSV(gd)}
                        title={`Export Weekly CSV for ${gd.guard.fullName}`}
                        className="p-1 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <ReportPagination
          page={page}
          totalPages={totalPages}
          total={filteredGuards.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTHLY REPORT VIEW
// ─────────────────────────────────────────────────────────────────────────────

function MonthlyReport({
  data,
  isSingleGuard,
  onExportGuardPDF,
  onExportGuardCSV,
  resultSearch,
  setResultSearch,
}: {
  data: any
  isSingleGuard: boolean
  onExportGuardPDF: (guardItem: GuardReportItem) => void
  onExportGuardCSV: (guardItem: GuardReportItem) => void
  resultSearch: string
  setResultSearch: (v: string) => void
}) {
  const CARD_PAGE_SIZE = 12
  const TABLE_PAGE_SIZE = 20
  const [cardPage, setCardPage] = useState(1)
  const [tablePage, setTablePage] = useState(1)

  const allGuards: any[] = data.guards || []

  // Client-side search filter
  const filteredGuards = allGuards.filter(gd =>
    resultSearch.trim() === '' ||
    gd.guard.fullName.toLowerCase().includes(resultSearch.toLowerCase()) ||
    gd.guard.badgeId.toLowerCase().includes(resultSearch.toLowerCase())
  )

  // Reset pages when search changes
  useEffect(() => { setCardPage(1); setTablePage(1) }, [resultSearch])

  const cardTotalPages = Math.max(1, Math.ceil(filteredGuards.length / CARD_PAGE_SIZE))
  const tableTotalPages = Math.max(1, Math.ceil(filteredGuards.length / TABLE_PAGE_SIZE))
  const pagedCardGuards = filteredGuards.slice((cardPage - 1) * CARD_PAGE_SIZE, cardPage * CARD_PAGE_SIZE)
  const pagedTableGuards = filteredGuards.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE)

  // Summary stats bar for monthly
  const avgRate = allGuards.length > 0
    ? (allGuards.reduce((sum, gd) => sum + parseFloat(gd.attendanceRate || '0'), 0) / allGuards.length).toFixed(1)
    : '0.0'
  const perfect = allGuards.filter(gd => parseFloat(gd.attendanceRate) >= 100).length
  const poor = allGuards.filter(gd => parseFloat(gd.attendanceRate) < 75).length

  return (
    <div className="space-y-6">
      {/* Summary stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg py-2.5 px-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{allGuards.length}</p>
          <p className="text-[11px] text-slate-500 font-medium">Total Guards</p>
        </div>
        <div className="rounded-lg py-2.5 px-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
          <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{avgRate}%</p>
          <p className="text-[11px] text-blue-500 font-medium">Avg Attendance</p>
        </div>
        <div className="rounded-lg py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{perfect}</p>
          <p className="text-[11px] text-emerald-500 font-medium">100% Attendance</p>
        </div>
        <div className="rounded-lg py-2.5 px-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center">
          <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{poor}</p>
          <p className="text-[11px] text-rose-500 font-medium">Below 75%</p>
        </div>
      </div>

      {/* Result search bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            placeholder="Search guard or badge…"
            value={resultSearch}
            onChange={e => setResultSearch(e.target.value)}
          />
          {resultSearch && (
            <button
              type="button"
              onClick={() => setResultSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {resultSearch && (
          <p className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredGuards.length}</span> of <span className="font-semibold">{allGuards.length}</span> guards
          </p>
        )}
      </div>

      {/* Guard Summary Cards */}
      {filteredGuards.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Individual Guard Monthly Summaries
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pagedCardGuards.map((gd: any) => {
              const rate = parseFloat(gd.attendanceRate)
              const rateColor = rate >= 90 ? 'text-emerald-600 dark:text-emerald-400' : rate >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
              return (
                <div key={gd.guard.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                        {gd.guard.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">{gd.guard.fullName}</p>
                        <p className="text-xs text-slate-400 font-mono">{gd.guard.badgeId} · {gd.guard.defaultDutyPoint?.name || 'Duty Point'}</p>
                      </div>
                      <div className={`ml-auto text-xl font-bold ${rateColor}`}>{gd.attendanceRate}%</div>
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-center text-xs mb-3">
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg py-1.5">
                        <div className="font-bold text-emerald-700 dark:text-emerald-300">{gd.totals.present}</div>
                        <div className="text-[10px] text-emerald-500">Present</div>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg py-1.5">
                        <div className="font-bold text-amber-700 dark:text-amber-300">{gd.totals.late}</div>
                        <div className="text-[10px] text-amber-500">Late</div>
                      </div>
                      <div className="bg-rose-50 dark:bg-rose-950/30 rounded-lg py-1.5">
                        <div className="font-bold text-rose-700 dark:text-rose-300">{gd.totals.absent}</div>
                        <div className="text-[10px] text-rose-500">Absent</div>
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg py-1.5">
                        <div className="font-bold text-slate-700 dark:text-slate-300">{gd.totals.off + gd.totals.leave + gd.totals.excused}</div>
                        <div className="text-[10px] text-slate-500">Off/Leave</div>
                      </div>
                    </div>
                  </div>

                  {/* Individual Guard Export Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => onExportGuardPDF(gd)}
                      className="flex-1 text-xs py-1.5 px-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>PDF Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onExportGuardCSV(gd)}
                      className="flex-1 text-xs py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>CSV Export</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Card Pagination */}
          {cardTotalPages > 1 && (
            <ReportPagination
              page={cardPage}
              totalPages={cardTotalPages}
              total={filteredGuards.length}
              pageSize={CARD_PAGE_SIZE}
              onPageChange={setCardPage}
            />
          )}
        </div>
      )}

      {/* Full Monthly Matrix */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Daily Matrix Breakdown (All Days of Month)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full table-enhanced text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-semibold text-slate-500 uppercase min-w-[130px]">Guard</th>
                <th className="text-left p-2 font-semibold text-slate-500 uppercase">Badge</th>
                {data.days?.map((day: string) => (
                  <th key={day} className="text-center p-1 font-semibold text-slate-500 min-w-[24px]">
                    {new Date(day + 'T12:00:00').getDate()}
                  </th>
                ))}
                <th className="text-center p-2 font-semibold text-emerald-600">P</th>
                <th className="text-center p-2 font-semibold text-amber-600">L</th>
                <th className="text-center p-2 font-semibold text-rose-600">A</th>
                <th className="text-center p-2 font-semibold text-slate-600">Rate</th>
                <th className="text-center p-2 font-semibold text-slate-500">Export</th>
              </tr>
            </thead>
            <tbody>
              {pagedTableGuards.length === 0 ? (
                <tr>
                  <td colSpan={20} className="py-10 text-center text-slate-400 text-sm">
                    No guards match your search.
                  </td>
                </tr>
              ) : (
                pagedTableGuards.map((gd: any) => (
                  <tr key={gd.guard.id} className="border-b hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-2 font-medium text-slate-900 dark:text-white">{gd.guard.fullName}</td>
                    <td className="p-2 font-mono text-slate-400">{gd.guard.badgeId}</td>
                    {data.days?.map((day: string) => {
                      const d = gd.days[day]
                      return (
                        <td key={day} className="p-0.5 text-center">
                          {d ? (
                            <span
                              title={`${d.status}${d.signInTime ? ' · ' + new Date(d.signInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`}
                              className={`inline-flex items-center justify-center w-5 h-5 rounded text-white font-bold text-[9px] ${STATUS_COLORS[d.status] || 'bg-slate-300'}`}
                            >
                              {STATUS_TEXT[d.status] || '?'}
                            </span>
                          ) : (
                            <span className="text-slate-200 dark:text-slate-700">·</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="p-2 text-center font-bold text-emerald-700 dark:text-emerald-400">{gd.totals.present}</td>
                    <td className="p-2 text-center font-bold text-amber-700 dark:text-amber-400">{gd.totals.late}</td>
                    <td className="p-2 text-center font-bold text-rose-700 dark:text-rose-400">{gd.totals.absent}</td>
                    <td className="p-2 text-center font-semibold">{gd.attendanceRate}%</td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onExportGuardPDF(gd)}
                          title={`Export Monthly PDF for ${gd.guard.fullName}`}
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onExportGuardCSV(gd)}
                          title={`Export Monthly CSV for ${gd.guard.fullName}`}
                          className="p-1 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {tableTotalPages > 1 && (
          <ReportPagination
            page={tablePage}
            totalPages={tableTotalPages}
            total={filteredGuards.length}
            pageSize={TABLE_PAGE_SIZE}
            onPageChange={setTablePage}
          />
        )}
      </div>

      {/* Late Arrival Ranking */}
      {data.lateRanking?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Monthly Punctuality & Late Arrival Ranking
          </h3>
          <div className="space-y-2">
            {data.lateRanking.filter((g: any) => g.totals.minutesLate > 0).map((g: any, i: number) => (
              <div key={g.guard.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0 ${i === 0 ? 'bg-rose-500' : i === 1 ? 'bg-orange-500' : i === 2 ? 'bg-amber-500' : 'bg-slate-400'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-slate-900 dark:text-white">{g.guard.fullName}</p>
                  <p className="text-xs text-slate-400 font-mono">{g.guard.badgeId}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{g.totals.minutesLate} min</p>
                  <p className="text-xs text-slate-400">total late</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
