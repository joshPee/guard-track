import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  backHref?: string
  backLabel?: string
  className?: string
}

export function Breadcrumb({
  items,
  backHref,
  backLabel,
  className,
}: BreadcrumbProps) {
  // Determine immediate back link if not explicitly provided
  const computedBackHref = backHref || (items.length > 1 ? items[items.length - 2]?.href : undefined)
  const computedBackLabel = backLabel || (items.length > 1 ? items[items.length - 2]?.label : 'Back')

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex items-center justify-between gap-2 py-1 text-xs text-slate-500 dark:text-slate-400',
        className
      )}
    >
      {/* Full Breadcrumb Trail */}
      <ol className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5 min-w-0">
        {/* Home Root */}
        <li className="flex items-center shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60"
            title="Dashboard Overview"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline font-medium">Dashboard</span>
          </Link>
        </li>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1
          return (
            <li key={idx} className="flex items-center gap-1.5 shrink-0 min-w-0">
              <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-600 shrink-0" />
              {isLast || !item.href ? (
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px] sm:max-w-none">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors truncate max-w-[120px] sm:max-w-none hover:underline"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>

      {/* Mobile-Friendly Quick Back Link */}
      {computedBackHref && (
        <div className="shrink-0 flex items-center">
          <Link
            href={computedBackHref}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/60 dark:border-blue-800/60 transition-all active:scale-95"
            title={`Return to ${computedBackLabel}`}
          >
            <ArrowLeft className="h-3 w-3" />
            <span className="hidden xs:inline">Back</span>
          </Link>
        </div>
      )}
    </nav>
  )
}

