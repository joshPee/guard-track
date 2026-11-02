import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: { wrapper: 'py-8', iconBox: 'h-12 w-12', icon: 'h-5 w-5', title: 'text-sm font-semibold', desc: 'text-xs' },
  md: { wrapper: 'py-14', iconBox: 'h-16 w-16', icon: 'h-7 w-7', title: 'text-base font-semibold', desc: 'text-sm' },
  lg: { wrapper: 'py-20', iconBox: 'h-20 w-20', icon: 'h-9 w-9', title: 'text-lg font-semibold', desc: 'text-sm' },
}

export function EmptyState({ icon: Icon, title, description, action, className, size = 'md' }: EmptyStateProps) {
  const s = sizeMap[size]
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', s.wrapper, className)}>
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl mb-4',
            'bg-slate-100 dark:bg-slate-800/80',
            'border border-slate-200 dark:border-slate-700',
            s.iconBox
          )}
        >
          <Icon className={cn('text-slate-400 dark:text-slate-500', s.icon)} />
        </div>
      )}
      <p className={cn('text-slate-700 dark:text-slate-200 mb-1', s.title)}>{title}</p>
      {description && (
        <p className={cn('text-slate-500 dark:text-slate-400 max-w-xs', s.desc)}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
