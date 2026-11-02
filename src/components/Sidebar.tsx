'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Shield,
  Users,
  MapPin,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  CalendarCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

function getNavigationSections(role?: string) {
  const isSupervisor = role === 'SUPERVISOR'

  const commonSections = [
    {
      label: 'OVERVIEW',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'OPERATIONS',
      items: [
        { name: 'Attendance', href: '/attendance', icon: Shield },
        { name: 'Guards', href: '/guards', icon: Users },
        { name: 'Duty Points', href: '/duty-points', icon: MapPin },
        { name: 'Leave & Exeats', href: '/leave', icon: CalendarCheck },
      ],
    },
    {
      label: 'REPORTS',
      items: [
        { name: 'Reports', href: '/reports', icon: FileText },
      ],
    },
  ]

  if (isSupervisor) {
    commonSections.push({
      label: 'MANAGEMENT',
      items: [
        { name: 'Settings', href: '/settings', icon: Settings },
      ],
    })
  }

  return commonSections
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const sections = getNavigationSections(session?.user?.role)

  return (
    // Only visible on desktop (lg+). Mobile uses MobileBottomNav instead.
    <div className={cn(
      'hidden lg:flex flex-col sidebar-gradient border-r border-slate-200/60 dark:border-slate-800/60 transition-all duration-300 h-screen flex-shrink-0',
      isCollapsed ? 'w-20' : 'w-72'
    )}>
      {/* Logo Section */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white p-1.5 shadow-sm border border-slate-200/80 shrink-0">
            <img src="/pcc.png" alt="PCC Logo" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white whitespace-nowrap">PCC Security</h1>
              <p className="text-[11px] text-slate-500/80 dark:text-slate-400/80 whitespace-nowrap font-medium">Guard Attendance</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-200 transform hover:scale-110",
            isCollapsed && "mx-auto"
          )}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.label} className="mb-5">
            {!isCollapsed && (
              <p className="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.08em]">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center px-3 py-2.5 text-[13px] font-medium rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold nav-active-indicator'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white hover:translate-x-0.5',
                      isCollapsed && 'justify-center'
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon className={cn(
                      'h-[18px] w-[18px] transition-colors',
                      !isCollapsed && 'mr-3',
                      isActive ? 'text-emerald-600 dark:text-emerald-400' : ''
                    )} />
                    {!isCollapsed && item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="border-t border-slate-200/60 dark:border-slate-800/60 p-4">
        {!isCollapsed && (
          <div className="mb-3">
            <p className="text-sm font-medium text-slate-900 dark:text-white">{session?.user?.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{session?.user?.role}</p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 text-[13px] font-medium rounded-lg transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300',
            isCollapsed && 'justify-center'
          )}
          title={isCollapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-[18px] w-[18px]" />
          {!isCollapsed && 'Sign Out'}
        </button>
      </div>
    </div>
  )
}

export default function Sidebar() {
  return <DashboardSidebar />
}
