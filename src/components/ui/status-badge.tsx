import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    if (!status) return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'

    const statusLower = status.toLowerCase()

    if (statusLower === 'active' || statusLower === 'available' || statusLower === 'completed' || statusLower === 'returned' || statusLower === 'fully_returned' || statusLower === 'present') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
    }

    if (statusLower === 'pending' || statusLower === 'issued' || statusLower === 'in progress' || statusLower === 'partially_returned') {
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800'
    }

    if (statusLower === 'warning' || statusLower === 'low stock' || statusLower === 'damaged' || statusLower === 'slightly_damaged' || statusLower === 'late') {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
    }

    if (statusLower === 'error' || statusLower === 'missing' || statusLower === 'inactive' || statusLower === 'cancelled' || statusLower === 'absent') {
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800'
    }

    return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  }

  // Format the status for display
  const formatStatus = (status: string) => {
    if (!status) return 'Unknown'
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getStatusStyles(status),
        className
      )}
    >
      {formatStatus(status)}
    </span>
  )
}
