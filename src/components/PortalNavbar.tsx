'use client'

import Link from 'next/link'
import {
  Users,
  Shield,
  Printer,
  Sparkles,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PortalNavbarProps {
  currentPage?: 'directory' | 'assignments'
  onPrint?: () => void
  extraActions?: React.ReactNode
  showPageSwitcher?: boolean
  subtitle?: string
}

export function PortalNavbar({
  currentPage = 'assignments',
  onPrint,
  extraActions,
  showPageSwitcher = false,
  subtitle,
}: PortalNavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 transition-colors shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header Row - strictly in-line horizontally */}
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-1.5 shadow-sm border border-slate-200/80 shrink-0">
              <img src="/pcc.png" alt="PCC Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                PCC Security Unit
              </span>
              {!showPageSwitcher && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                  <Eye className="w-2.5 h-2.5" />
                  View Only
                </span>
              )}
              {subtitle && (
                <span className="hidden lg:inline text-slate-300 dark:text-slate-700">·</span>
              )}
              {subtitle && (
                <span className="hidden lg:inline text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          {/* Desktop Navigation Switcher Tabs (Only rendered when showPageSwitcher is true) */}
          {showPageSwitcher && (
            <nav className="hidden md:flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 text-xs font-semibold shadow-inner shrink-0">
              <Link
                href="/directory"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200',
                  currentPage === 'directory'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Directory</span>
              </Link>
              <Link
                href="/assignments"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200',
                  currentPage === 'assignments'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Duty Assignments</span>
              </Link>
            </nav>
          )}

          {/* Action Tools */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {extraActions}

            {onPrint && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrint}
                className="inline-flex items-center gap-1.5 h-9 text-xs font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Print official duty sheet"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print Sheet</span>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Page Switcher Row (Only when showPageSwitcher is true, on small screens below md) */}
        {showPageSwitcher && (
          <div className="md:hidden pb-2.5 pt-0.5 flex justify-center">
            <nav className="flex items-center w-full max-w-xs p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 text-xs font-semibold shadow-inner">
              <Link
                href="/directory"
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all duration-200 text-center',
                  currentPage === 'directory'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Directory</span>
              </Link>
              <Link
                href="/assignments"
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all duration-200 text-center',
                  currentPage === 'assignments'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Duty Assignments</span>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
