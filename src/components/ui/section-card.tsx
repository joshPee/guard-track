import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SectionCardProps {
  title: string
  children: React.ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
}

export function SectionCard({
  title,
  children,
  className,
  headerClassName,
  contentClassName,
}: SectionCardProps) {
  return (
    <Card className={cn('border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 flex flex-col', className)}>
      <CardHeader className={cn('pb-4', headerClassName)}>
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('pt-0 flex-1', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
