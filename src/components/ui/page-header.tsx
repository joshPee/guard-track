import React from 'react'
import { cn } from '@/lib/utils'

export type PageHeaderColor =
  | 'teal'
  | 'emerald'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'cyan'
  | 'amber'
  | 'rose'
  | 'slate'

export interface PageHeaderStat {
  label: string
  value: string | number
  highlight?: boolean
}

export interface PageHeaderProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  description?: string
  badge?: string
  livePulse?: boolean
  color?: PageHeaderColor
  stats?: PageHeaderStat[]
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

const colorStyles: Record<
  PageHeaderColor,
  {
    badgeBg: string
    badgeText: string
    badgeBorder: string
    iconBg: string
    iconBorder: string
    iconText: string
    glow1: string
    glow2: string
    pulse: string
  }
> = {
  teal: {
    badgeBg: 'bg-teal-500/15',
    badgeText: 'text-teal-200',
    badgeBorder: 'border-teal-400/30',
    iconBg: 'from-teal-500/25 via-emerald-500/15 to-transparent',
    iconBorder: 'border-teal-400/30',
    iconText: 'text-teal-300',
    glow1: 'bg-teal-500/25',
    glow2: 'bg-emerald-500/15',
    pulse: 'bg-teal-400',
  },
  emerald: {
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-200',
    badgeBorder: 'border-emerald-400/30',
    iconBg: 'from-emerald-500/25 via-teal-500/15 to-transparent',
    iconBorder: 'border-emerald-400/30',
    iconText: 'text-emerald-300',
    glow1: 'bg-emerald-500/25',
    glow2: 'bg-teal-500/15',
    pulse: 'bg-emerald-400',
  },
  blue: {
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-200',
    badgeBorder: 'border-blue-400/30',
    iconBg: 'from-blue-500/25 via-indigo-500/15 to-transparent',
    iconBorder: 'border-blue-400/30',
    iconText: 'text-blue-300',
    glow1: 'bg-blue-500/25',
    glow2: 'bg-cyan-500/15',
    pulse: 'bg-blue-400',
  },
  indigo: {
    badgeBg: 'bg-indigo-500/15',
    badgeText: 'text-indigo-200',
    badgeBorder: 'border-indigo-400/30',
    iconBg: 'from-indigo-500/25 via-violet-500/15 to-transparent',
    iconBorder: 'border-indigo-400/30',
    iconText: 'text-indigo-300',
    glow1: 'bg-indigo-500/25',
    glow2: 'bg-purple-500/15',
    pulse: 'bg-indigo-400',
  },
  violet: {
    badgeBg: 'bg-violet-500/15',
    badgeText: 'text-violet-200',
    badgeBorder: 'border-violet-400/30',
    iconBg: 'from-violet-500/25 via-purple-500/15 to-transparent',
    iconBorder: 'border-violet-400/30',
    iconText: 'text-violet-300',
    glow1: 'bg-violet-500/25',
    glow2: 'bg-fuchsia-500/15',
    pulse: 'bg-violet-400',
  },
  cyan: {
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-200',
    badgeBorder: 'border-cyan-400/30',
    iconBg: 'from-cyan-500/25 via-blue-500/15 to-transparent',
    iconBorder: 'border-cyan-400/30',
    iconText: 'text-cyan-300',
    glow1: 'bg-cyan-500/25',
    glow2: 'bg-teal-500/15',
    pulse: 'bg-cyan-400',
  },
  amber: {
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-200',
    badgeBorder: 'border-amber-400/30',
    iconBg: 'from-amber-500/25 via-orange-500/15 to-transparent',
    iconBorder: 'border-amber-400/30',
    iconText: 'text-amber-300',
    glow1: 'bg-amber-500/25',
    glow2: 'bg-orange-500/15',
    pulse: 'bg-amber-400',
  },
  rose: {
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-200',
    badgeBorder: 'border-rose-400/30',
    iconBg: 'from-rose-500/25 via-red-500/15 to-transparent',
    iconBorder: 'border-rose-400/30',
    iconText: 'text-rose-300',
    glow1: 'bg-rose-500/25',
    glow2: 'bg-pink-500/15',
    pulse: 'bg-rose-400',
  },
  slate: {
    badgeBg: 'bg-slate-500/15',
    badgeText: 'text-slate-200',
    badgeBorder: 'border-slate-400/30',
    iconBg: 'from-slate-500/25 via-slate-600/15 to-transparent',
    iconBorder: 'border-slate-400/30',
    iconText: 'text-slate-200',
    glow1: 'bg-slate-500/20',
    glow2: 'bg-slate-600/15',
    pulse: 'bg-slate-400',
  },
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  description,
  badge,
  livePulse = true,
  color = 'teal',
  stats,
  actions,
  className,
  children,
}: PageHeaderProps) {
  const c = colorStyles[color] || colorStyles.teal

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 text-white shadow-2xl backdrop-blur-xl',
        className
      )}
    >
      {/* Decorative ambient glow orbs */}
      <div
        className={cn(
          'absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl pointer-events-none opacity-40 transition-all',
          c.glow1
        )}
      />
      <div
        className={cn(
          'absolute -bottom-24 -left-24 h-72 w-72 rounded-full blur-3xl pointer-events-none opacity-30 transition-all',
          c.glow2
        )}
      />

      {/* Modern subtle micro-grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255, 255, 255, 0.6) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          {/* Badge & pulse */}
          {badge && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border shadow-sm',
                  c.badgeBg,
                  c.badgeText,
                  c.badgeBorder
                )}
              >
                {livePulse && (
                  <span className="relative flex h-2 w-2">
                    <span
                      className={cn(
                        'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                        c.pulse
                      )}
                    />
                    <span
                      className={cn(
                        'relative inline-flex rounded-full h-2 w-2',
                        c.pulse
                      )}
                    />
                  </span>
                )}
                {badge}
              </span>
            </div>
          )}

          {/* Icon + Title */}
          <div className="flex items-center gap-3.5">
            {Icon && (
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br border shadow-md backdrop-blur-sm ring-1 ring-white/10',
                  c.iconBg,
                  c.iconBorder,
                  c.iconText
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                {title}
              </h1>
              {(subtitle || description) && (
                <p className="text-sm text-slate-300/90 mt-1 font-normal leading-relaxed">
                  {subtitle || description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Stats and/or Actions */}
        {(stats || actions || children) && (
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 lg:justify-end w-full lg:w-auto">
            {stats && stats.length > 0 && (
              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                {stats.map((st, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-left shadow-sm min-w-[75px] sm:min-w-[90px]"
                  >
                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 uppercase tracking-wider truncate">
                      {st.label}
                    </p>
                    <p
                      className={cn(
                        'text-lg sm:text-xl font-bold tracking-tight',
                        st.highlight ? c.badgeText : 'text-white'
                      )}
                    >
                      {st.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {actions}
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
