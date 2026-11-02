'use client'

import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LogOut, Sun, Moon } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '@/components/theme-provider'

export function DashboardTopBar() {
  const { data: session } = useSession()
  const { resolvedTheme, toggleTheme } = useTheme()
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)

  const getTimeBasedGreeting = () => {
    let userName = session?.user?.name || 'User'
    const nameParts = userName.split(' ')
    if (nameParts.length > 1) {
      userName = nameParts[nameParts.length - 1]
    }
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    return `${greeting}, ${userName}`
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <>
      <header
        id="dashboard-topbar"
        data-topbar="true"
        className="flex h-16 items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 px-4 md:px-5 min-w-0 w-full sticky top-0 z-30 transition-all duration-200"
      >
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile logo — clean white tile so it never turns black in dark mode */}
            <div className="lg:hidden shrink-0 w-8 h-8 rounded-lg bg-white p-1 shadow-xs border border-slate-200/80 flex items-center justify-center">
              <img src="/pcc.png" alt="PCC Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100">{getTimeBasedGreeting()}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 transition-all duration-200"
            title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-[18px] w-[18px] text-amber-400 animate-scale-in" />
            ) : (
              <Moon className="h-[18px] w-[18px] text-slate-700 animate-scale-in" />
            )}
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 transition-all duration-200"
                title="Profile"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[11px] font-bold">
                  {(session?.user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-slate-900 dark:text-white">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className={`text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit ${
                    session?.user?.role === 'SUPERVISOR'
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {session?.user?.role === 'SUPERVISOR' ? 'Supervisor' : 'Viewer'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowSignOutDialog(true)} className="text-red-600 dark:text-red-400 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Sign Out</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Are you sure you want to sign out? You will need to sign in again to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignOutDialog(false)} className="dark:border-slate-700 dark:hover:bg-slate-800">
              Cancel
            </Button>
            <Button onClick={handleSignOut} className="bg-blue-600 hover:bg-blue-700 text-white">
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
