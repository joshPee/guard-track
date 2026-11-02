'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  title?: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  toasts: ToastItem[]
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void
  removeToast: (id: string) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

// Export a singleton listener for direct toast(...) function calls
type ToastListener = (message: string, type: ToastType, title?: string, duration?: number) => void
let globalToastListener: ToastListener | null = null

export const toast = {
  success: (message: string, title?: string) => {
    globalToastListener?.(message, 'success', title)
  },
  error: (message: string, title?: string) => {
    globalToastListener?.(message, 'error', title)
  },
  warning: (message: string, title?: string) => {
    globalToastListener?.(message, 'warning', title)
  },
  info: (message: string, title?: string) => {
    globalToastListener?.(message, 'info', title)
  },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: ToastItem = { id, message, type, title, duration }

      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  // Register global listener
  React.useEffect(() => {
    globalToastListener = (msg, type, title, dur) => {
      showToast(msg, type, title, dur)
    }
    return () => {
      globalToastListener = null
    }
  }, [showToast])

  const success = useCallback((msg: string, title?: string) => showToast(msg, 'success', title), [showToast])
  const error = useCallback((msg: string, title?: string) => showToast(msg, 'error', title), [showToast])
  const warning = useCallback((msg: string, title?: string) => showToast(msg, 'warning', title), [showToast])
  const info = useCallback((msg: string, title?: string) => showToast(msg, 'info', title), [showToast])

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      {/* Toast Render Portal Container */}
      <div className="fixed top-5 right-5 sm:bottom-5 sm:top-auto z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-slide-in-left',
              t.type === 'success' && 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-500/20',
              t.type === 'error' && 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 ring-1 ring-rose-500/20',
              t.type === 'warning' && 'bg-amber-50/95 dark:bg-amber-950/95 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/20',
              t.type === 'info' && 'bg-slate-50/95 dark:bg-slate-900/95 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 ring-1 ring-slate-500/20'
            )}
          >
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
              {t.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
              {t.type === 'info' && <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              {t.title && <p className="font-semibold text-xs mb-0.5">{t.title}</p>}
              <p className="text-xs leading-relaxed">{t.message}</p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
