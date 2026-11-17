'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  Shield,
  LayoutDashboard,
  Printer,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PortalNavbarProps {
  currentPage: 'directory' | 'assignments'
  onPrint?: () => void
  extraActions?: React.ReactNode
}

export function PortalNavbar({ currentPage, onPrint, extraActions }: PortalNavbarProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group focus:outline-hidden"
              title="Go to PCC GuardTrack Dashboard"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white p-1.5 shadow-sm border border-slate-200/80 group-hover:border-blue-400 group-hover:shadow-md transition-all duration-200 shrink-0">
                <img src="/pcc.png" alt="PCC Logo" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                    PCC Security Unit
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                    <Sparkles className="w-2.5 h-2.5" />
                    Portal
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                  Pentecost Convention Centre · Gomoa Fetteh
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Switcher Tabs */}
          <nav className="flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 text-xs font-semibold shadow-inner">
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

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            {extraActions}

            {onPrint && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrint}
                className="hidden sm:inline-flex items-center gap-1.5 h-9 text-xs font-medium border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Print official duty sheet"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Sheet</span>
              </Button>
            )}

            <Button
              asChild
              variant="default"
              size="sm"
              className="h-9 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700 gap-1.5 shadow-xs"
            >
              <Link href="/dashboard">
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
                <ChevronRight className="w-3 h-3 text-slate-400 dark:text-blue-200" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
