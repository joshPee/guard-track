'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  LayoutDashboard,
  Shield,
  Users,
  MapPin,
  FileText,
  Settings,
  CalendarCheck,
  CalendarDays,
  Calendar as CalendarIcon,
  Contact,
  ClipboardList,
  Search,
} from 'lucide-react'
import { getInitials } from '@/components/attendance/types'

interface PageItem {
  kind: 'page'
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  keywords: string
}

interface GuardItem {
  kind: 'guard'
  label: string
  sublabel: string
  href: string
  badgeId: string
  photoUrl: string | null
}

type PaletteItem = PageItem | GuardItem

const PAGES: PageItem[] = [
  { kind: 'page', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: 'home overview command' },
  { kind: 'page', label: 'Attendance Register', href: '/attendance', icon: Shield, keywords: 'roster logbook sign-in' },
  { kind: 'page', label: 'Guard Personnel', href: '/guards', icon: Users, keywords: 'guards staff personnel badge' },
  { kind: 'page', label: 'Duty Points', href: '/duty-points', icon: MapPin, keywords: 'posts locations zones' },
  { kind: 'page', label: 'Guard Directory', href: '/directory', icon: Contact, keywords: 'personnel directory roster assign' },
  { kind: 'page', label: 'Daily Assignments', href: '/assignments', icon: ClipboardList, keywords: 'duty roster schedule' },
  { kind: 'page', label: 'Leave & Exeats', href: '/leave', icon: CalendarCheck, keywords: 'leave exeat casual medical' },
  { kind: 'page', label: 'Attendance Heatmap', href: '/heatmap', icon: CalendarDays, keywords: 'calendar attendance history' },
  { kind: 'page', label: 'Schedule', href: '/schedule', icon: CalendarIcon, keywords: 'calendar planner shifts' },
  { kind: 'page', label: 'Reports', href: '/reports', icon: FileText, keywords: 'pdf csv export weekly monthly' },
  { kind: 'page', label: 'Settings', href: '/settings', icon: Settings, keywords: 'config shifts alerts organization' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [guards, setGuards] = useState<Array<{ id: string; fullName: string; badgeId: string; photoUrl: string | null; defaultDutyPoint?: { name: string } | null }>>([])
  const [guardsLoaded, setGuardsLoaded] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  // Global Cmd/Ctrl+K shortcut (or custom event from UI triggers)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const openEvent = () => setOpen(true)
    window.addEventListener('keydown', handler)
    window.addEventListener('open-command-palette', openEvent)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('open-command-palette', openEvent)
    }
  }, [])

  // Lazy-load guards the first time the palette opens
  useEffect(() => {
    if (open && !guardsLoaded) {
      fetch('/api/guards?status=ACTIVE')
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          setGuards(Array.isArray(data) ? data : [])
          setGuardsLoaded(true)
        })
        .catch(() => setGuardsLoaded(true))
    }
  }, [open, guardsLoaded])

  // Reset state when opened/closed
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase()

    const matchedPages: PageItem[] = q
      ? PAGES.filter(
          (p) =>
            p.label.toLowerCase().includes(q) ||
            p.keywords.toLowerCase().includes(q) ||
            p.href.toLowerCase().includes(q)
        )
      : PAGES

    const matchedGuards: GuardItem[] = q
      ? guards
          .filter(
            (g) =>
              g.fullName.toLowerCase().includes(q) ||
              g.badgeId.toLowerCase().includes(q)
          )
          .slice(0, 8)
          .map((g) => ({
            kind: 'guard' as const,
            label: g.fullName,
            sublabel: `${g.badgeId}${g.defaultDutyPoint?.name ? ` · ${g.defaultDutyPoint.name}` : ''}`,
            href: `/guards/${g.id}`,
            badgeId: g.badgeId,
            photoUrl: g.photoUrl,
          }))
      : []

    return [...matchedPages, ...matchedGuards]
  }, [query, guards])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const navigate = useCallback(
    (item: PaletteItem) => {
      setOpen(false)
      router.push(item.href)
    },
    [router]
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault()
      navigate(items[selectedIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 top-[15%] translate-y-0">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div className="flex items-center gap-2.5 px-4 border-b border-slate-100 dark:border-slate-800">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages or guards…"
            className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-slate-400 text-slate-900 dark:text-white"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No results for &quot;{query}&quot;
            </p>
          ) : (
            <>
              {items.map((item, idx) => {
                const isSelected = idx === selectedIndex
                const isPage = item.kind === 'page'
                return (
                  <button
                    key={`${item.kind}-${item.href}`}
                    type="button"
                    onClick={() => navigate(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {isPage ? (
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                        {(() => {
                          const Icon = (item as PageItem).icon
                          return <Icon className="h-4 w-4" />
                        })()}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold overflow-hidden shrink-0">
                        {item.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.photoUrl} alt={item.label} className="w-full h-full object-cover" />
                        ) : (
                          getInitials(item.label)
                        )}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {item.label}
                      </span>
                      <span className="block text-[11px] text-slate-500 truncate">
                        {isPage ? item.href : item.sublabel}
                      </span>
                    </span>
                    {!isPage && (
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{item.badgeId}</span>
                    )}
                  </button>
                )
              })}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-slate-200 dark:border-slate-700">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-slate-200 dark:border-slate-700">↵</kbd> open</span>
          <span className="ml-auto">⌘K to toggle</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
