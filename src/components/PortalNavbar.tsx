'use client'

import { signOut, useSession } from 'next-auth/react'
import {
  Printer,
  Sun,
  Moon,
  User,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { useTheme } from '@/components/theme-provider'

interface PortalNavbarProps {
  onPrint?: () => void
  extraActions?: React.ReactNode
  subtitle?: string
  hideProfile?: boolean
}

export function PortalNavbar({
  onPrint,
  extraActions,
  subtitle,
  hideProfile = false,
}: PortalNavbarProps) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 transition-colors shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header Row - strictly in-line horizontally */}
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-1.5 shadow-sm border border-slate-200/80 shrink-0">
              <img src="/pcc.png" alt="PCC Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                PCC Security Unit
              </span>
              {subtitle && (
                <span className="hidden lg:inline text-slate-300 dark:text-slate-700">·</span>
              )}
              {subtitle && (
                <span className="hidden lg:inline text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {extraActions}

            {/* Profile / Sign out (only when signed in) */}
            {session?.user && !hideProfile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title={session.user.name || 'Account'}
                  >
                    {session.user.photoUrl ? (
                      <img
                        src={session.user.photoUrl}
                        alt={session.user.name || 'Profile'}
                        className="w-7 h-7 rounded-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[11px] font-bold">
                        {(session.user.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-slate-900 dark:text-white">
                        {session.user.name || 'User'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {session.user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 dark:text-red-400 cursor-pointer"
                    onClick={() => signOut({ callbackUrl: '/directory' })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {onPrint && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrint}
                className="inline-flex items-center gap-1.5 h-9 text-xs font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Print official duty sheet"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print Sheet</span>
              </Button>
            )}
          </div>
        </div>

      </div>
    </header>
  )
}
