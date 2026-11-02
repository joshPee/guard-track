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
  MoreHorizontal,
  LogOut,
  CalendarCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface NavItem {
  name: string
  href: string
  icon: any
}

const bottomNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Attendance', href: '/attendance', icon: Shield },
  { name: 'Guards', href: '/guards', icon: Users },
  { name: 'Reports', href: '/reports', icon: FileText },
]

const moreItems: NavItem[] = [
  { name: 'Duty Points', href: '/duty-points', icon: MapPin },
  { name: 'Leave & Exeats', href: '/leave', icon: CalendarCheck },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  const handleNavClick = () => {
    if (navigator.vibrate) navigator.vibrate(10)
  }

  const handleSignOut = async () => {
    if (navigator.vibrate) navigator.vibrate(10)
    try {
      await signOut({ redirect: false })
    } catch {}
    window.location.href = '/login'
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 z-50 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around h-16 px-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex flex-col items-center justify-center w-full h-full min-w-0 px-1 py-1 relative rounded-xl transition-all duration-200',
                  isActive ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                {isActive && (
                  <span className="absolute top-1.5 w-6 h-1 rounded-full bg-emerald-500 shadow-sm" />
                )}
                <item.icon
                  className={cn(
                    'h-5 w-5 mb-1 transition-transform duration-200',
                    isActive ? 'scale-110 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] leading-tight truncate max-w-full tracking-tight',
                    isActive ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'font-medium'
                  )}
                >
                  {item.name}
                </span>
              </Link>
            )
          })}
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10)
              setIsMoreOpen(!isMoreOpen)
            }}
            className={cn(
              'flex flex-col items-center justify-center w-full h-full min-w-0 px-1 py-1 relative rounded-xl transition-all duration-200',
              isMoreOpen ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            {isMoreOpen && (
              <span className="absolute top-1.5 w-6 h-1 rounded-full bg-emerald-500 shadow-sm" />
            )}
            <MoreHorizontal className={cn(
              'h-5 w-5 mb-1 transition-transform duration-200',
              isMoreOpen ? 'scale-110 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
            )} />
            <span className={cn(
              'text-[10px] leading-tight tracking-tight',
              isMoreOpen ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'font-medium'
            )}>
              More
            </span>
          </button>
        </div>
      </div>

      {/* More Menu - Bottom Sheet */}
      {isMoreOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMoreOpen(false)}
          />
          <div className="fixed bottom-16 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 lg:hidden rounded-t-2xl p-4">
            <div className="space-y-1">
              {moreItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(10)
                      setIsMoreOpen(false)
                    }}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                )
              })}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
