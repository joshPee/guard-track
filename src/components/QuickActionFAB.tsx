'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, UserCheck, FileBadge, AlertTriangle, X } from 'lucide-react'
import { useSession } from 'next-auth/react'

export function QuickActionFAB() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const isSupervisor = session?.user?.role === 'SUPERVISOR'

  const actions = [
    {
      icon: UserCheck,
      label: 'Quick Attendance',
      href: '/attendance',
      color: 'bg-emerald-500',
      description: 'Record guard check-in',
    },
    {
      icon: FileBadge,
      label: 'Add Leave/Exeat',
      href: '/leave',
      color: 'bg-blue-500',
      description: 'Register leave request',
      supervisorOnly: true,
    },
    {
      icon: AlertTriangle,
      label: 'Report Incident',
      href: '/dashboard',
      color: 'bg-rose-500',
      description: 'Log security incident',
    },
  ]

  const filteredActions = actions.filter(a => !a.supervisorOnly || isSupervisor)

  return (
    <div className="fixed bottom-20 right-4 z-40 lg:hidden">
      {isOpen && (
        <div className="space-y-2 mb-2">
          {filteredActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                router.push(action.href)
                setIsOpen(false)
              }}
              className="flex items-center gap-3 w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className={`p-2 rounded-lg ${action.color} text-white`}>
                <action.icon className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {action.label}
                </p>
                <p className="text-xs text-slate-500">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-rose-500 hover:bg-rose-600'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Plus className="h-6 w-6 text-white" />
        )}
      </button>
    </div>
  )
}
