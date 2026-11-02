'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FileDown, Loader2, Calendar, FileText, ChevronDown, TrendingUp } from 'lucide-react'
import { toast } from '@/components/ui/toast'
import {
  exportGuardDossierPDF,
  exportSingleGuardWeeklyPDF,
  exportSingleGuardMonthlyPDF,
  GuardDossierData
} from '@/lib/pdf-export'

export function ExportGuardDossierButton({
  data,
  guardId,
  className,
}: {
  data: GuardDossierData
  guardId?: string
  className?: string
}) {
  const [downloading, setDownloading] = useState(false)
  const [downloadLabel, setDownloadLabel] = useState('')

  const handleExportDossier = async () => {
    try {
      setDownloading(true)
      setDownloadLabel('Generating Dossier...')
      exportGuardDossierPDF(data)
      toast.success(
        `Career dossier for ${data.guard.fullName} generated and downloaded.`,
        'Export Dossier'
      )
    } catch (error) {
      console.error('Failed to export dossier:', error)
      toast.error('Could not generate PDF dossier. Please try again.', 'Export Failed')
    } finally {
      setDownloading(false)
      setDownloadLabel('')
    }
  }

  const handleExportWeekly = async () => {
    try {
      setDownloading(true)
      setDownloadLabel('Generating Weekly Report...')
      const now = new Date()
      const mondayStr = new Date(now.setDate(now.getDate() - ((now.getDay() + 6) % 7)))
        .toISOString()
        .split('T')[0]

      const targetId = guardId || (data.guard as any).id
      const res = await fetch(`/api/reports/weekly?weekStart=${mondayStr}${targetId ? `&guardId=${targetId}` : ''}`)
      if (!res.ok) throw new Error('Failed to fetch weekly data')
      const reportData = await res.json()

      const guardItem = reportData.guards?.[0]
      if (!guardItem) {
        toast.warning('No attendance records found for this guard this week.', 'Weekly Report')
        return
      }

      exportSingleGuardWeeklyPDF(guardItem, reportData.days, mondayStr)
      toast.success(`Weekly attendance report for ${data.guard.fullName} exported.`, 'Weekly Report')
    } catch (error) {
      console.error('Failed to export weekly report:', error)
      toast.error('Could not generate weekly report. Please try again.', 'Export Failed')
    } finally {
      setDownloading(false)
      setDownloadLabel('')
    }
  }

  const handleExportMonthly = async () => {
    try {
      setDownloading(true)
      setDownloadLabel('Generating Monthly Report...')
      const now = new Date()
      const monthStr = now.toISOString().slice(0, 7) // YYYY-MM

      const targetId = guardId || (data.guard as any).id
      const res = await fetch(`/api/reports/monthly?month=${monthStr}${targetId ? `&guardId=${targetId}` : ''}`)
      if (!res.ok) throw new Error('Failed to fetch monthly data')
      const reportData = await res.json()

      const guardItem = reportData.guards?.[0]
      if (!guardItem) {
        toast.warning('No attendance records found for this guard this month.', 'Monthly Report')
        return
      }

      exportSingleGuardMonthlyPDF(guardItem, reportData.days, monthStr)
      toast.success(`Monthly attendance report for ${data.guard.fullName} exported.`, 'Monthly Report')
    } catch (error) {
      console.error('Failed to export monthly report:', error)
      toast.error('Could not generate monthly report. Please try again.', 'Export Failed')
    } finally {
      setDownloading(false)
      setDownloadLabel('')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={downloading}
          variant="outline"
          size="sm"
          className={className || 'h-9 px-3 gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-white/20'}
        >
          {downloading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{downloadLabel || 'Generating...'}</span>
            </>
          ) : (
            <>
              <FileDown className="h-3.5 w-3.5" />
              <span>Export Guard Reports</span>
              <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DropdownMenuLabel className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
          Guard Report Exports
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleExportWeekly}
          className="cursor-pointer gap-2.5 py-2 text-xs font-medium"
        >
          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 dark:text-white">This Week's Attendance (PDF)</span>
            <span className="text-[10px] text-slate-400">Current week Mon–Sun schedule</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleExportMonthly}
          className="cursor-pointer gap-2.5 py-2 text-xs font-medium"
        >
          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 dark:text-white">This Month's Attendance (PDF)</span>
            <span className="text-[10px] text-slate-400">Current full calendar month breakdown</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleExportDossier}
          className="cursor-pointer gap-2.5 py-2 text-xs font-medium"
        >
          <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 dark:text-white">Complete Service Dossier (PDF)</span>
            <span className="text-[10px] text-slate-400">Full career attendance history</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
