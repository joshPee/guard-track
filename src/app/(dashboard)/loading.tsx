import { Skeleton, CardSkeleton, PageHeaderSkeleton, TableRowSkeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2 py-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Page Header skeleton */}
      <PageHeaderSkeleton />

      {/* 4 Summary Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Content Card Skeleton */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
        <TableRowSkeleton rows={6} cols={5} />
      </div>
    </div>
  )
}

