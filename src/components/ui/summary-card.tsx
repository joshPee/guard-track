import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

export type BadgeVariant = 'emerald' | 'blue' | 'rose' | 'amber' | 'indigo' | 'teal'

export interface SummaryCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  iconColor?: string
  iconBgColor?: string
  valueColor?: string
  badge?: {
    text: string
    variant: BadgeVariant
  }
  footerAvatars?: string[]
  footerText?: string
  href?: string
  liveIndicator?: boolean
  className?: string
}

const badgeStyles: Record<BadgeVariant, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  indigo: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  teal: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800',
}

export function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-600 dark:text-blue-300',
  iconBgColor = 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50',
  valueColor,
  badge,
  footerAvatars,
  footerText,
  href,
  liveIndicator = false,
  className,
}: SummaryCardProps) {
  const CardContent = (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-200 card-lift',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {title}
            </p>
            <p
              className={cn(
                'text-xl sm:text-2xl font-bold tracking-tight',
                valueColor || 'text-slate-900 dark:text-white'
              )}
            >
              {value}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          </div>

          <div
            className={cn(
              'flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg border shadow-sm',
              iconBgColor,
              iconColor
            )}
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>

        {badge && (
          <div className="mt-3">
            <span
              className={cn(
                'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
                badgeStyles[badge.variant]
              )}
            >
              {badge.text}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      {(footerAvatars || footerText) && (
        <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            {footerAvatars && (
              <div className="flex -space-x-2">
                {footerAvatars.map((avatar, idx) => (
                  <div
                    key={idx}
                    className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-medium text-slate-600 dark:text-slate-300"
                  >
                    {avatar}
                  </div>
                ))}
              </div>
            )}
            {footerText && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{footerText}</p>
            )}
          </div>
        </div>
      )}

      {/* Live indicator */}
      {liveIndicator && (
        <div className="absolute top-3 right-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block group">
        {CardContent}
        <div className="mt-2 flex items-center justify-center text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
          View Details
          <ArrowRight className="ml-1 h-3 w-3" />
        </div>
      </Link>
    )
  }

  return CardContent
}
