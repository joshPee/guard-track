'use client'

import * as React from 'react'
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Check, X, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'destructive' | 'error' | 'warning' | 'info' | 'default'

export interface ToastOptions {
  id?: string
  title?: string
  message: string
  variant?: ToastVariant
  duration?: number
}

interface ToastContextType {
  showToast: (options: ToastOptions | string, variant?: ToastVariant) => void
  hideToast: () => void
  toast: {
    success: (message: string, title?: string) => void
    error: (message: string, title?: string) => void
    warning: (message: string, title?: string) => void
    info: (message: string, title?: string) => void
  }
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

// Singleton listener so `import { toast }` works outside React (matches previous API)
type ToastFn = (message: string, variant?: ToastVariant, title?: string) => void
let globalToastFn: ToastFn | null = null

export const toast = {
  success: (message: string, title?: string) => globalToastFn?.(message, 'success', title),
  error: (message: string, title?: string) => globalToastFn?.(message, 'error', title),
  warning: (message: string, title?: string) => globalToastFn?.(message, 'warning', title),
  info: (message: string, title?: string) => globalToastFn?.(message, 'info', title),
}

function getStatusIcon(variant: ToastVariant) {
  switch (variant) {
    case 'destructive':
    case 'error':
      return (
        <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 shadow-sm">
          <X className="w-3.5 h-3.5 stroke-[3]" />
        </div>
      )
    case 'warning':
      return (
        <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      )
    case 'info':
      return (
        <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Info className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      )
    case 'success':
    default:
      return (
        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </div>
      )
  }
}

function getDefaultTitle(variant: ToastVariant): string {
  switch (variant) {
    case 'destructive':
    case 'error':
      return 'ERROR!'
    case 'warning':
      return 'WARNING!'
    case 'info':
      return 'INFORMATION!'
    case 'success':
    default:
      return 'SUCCESS!'
  }
}

export function ToastCard({
  title,
  message,
  variant = 'success',
  onClose,
  className,
}: {
  title?: string
  message?: React.ReactNode
  variant?: ToastVariant
  onClose?: () => void
  className?: string
}) {
  const displayTitle = title || getDefaultTitle(variant)

  return (
    <div
      className={cn(
        'relative w-[92vw] sm:w-[420px] max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.4)] border border-slate-100 dark:border-slate-800 px-6 py-4 transition-all duration-200 animate-fade-in-up',
        className
      )}
      role="alert"
    >
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          aria-label="Close notification"
          className="absolute top-3.5 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          {getStatusIcon(variant)}
          <span className="font-bold text-xs sm:text-sm tracking-wider text-slate-900 dark:text-white uppercase">
            {displayTitle}
          </span>
        </div>

        {message && (
          <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal leading-relaxed mt-0.5">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [currentToast, setCurrentToast] = useState<ToastOptions | null>(null)

  const hideToast = useCallback(() => {
    setCurrentToast(null)
  }, [])

  const showToast = useCallback(
    (options: ToastOptions | string, variant: ToastVariant = 'success') => {
      if (typeof options === 'string') {
        setCurrentToast({
          message: options,
          variant,
          duration: 4000,
        })
      } else {
        setCurrentToast({
          duration: 4000,
          ...options,
          variant: options.variant || variant || 'success',
        })
      }
    },
    []
  )

  useEffect(() => {
    globalToastFn = (message, variant, title) => {
      showToast({ message, variant: variant || 'success', title })
    }
    return () => {
      globalToastFn = null
    }
  }, [showToast])

  useEffect(() => {
    if (!currentToast) return

    const timer = setTimeout(() => {
      setCurrentToast(null)
    }, currentToast.duration ?? 4000)

    return () => clearTimeout(timer)
  }, [currentToast])

  const toastHelpers = React.useMemo(
    () => ({
      success: (message: string, title?: string) =>
        showToast({ message, title, variant: 'success' }),
      error: (message: string, title?: string) =>
        showToast({ message, title, variant: 'destructive' }),
      warning: (message: string, title?: string) =>
        showToast({ message, title, variant: 'warning' }),
      info: (message: string, title?: string) =>
        showToast({ message, title, variant: 'info' }),
    }),
    [showToast]
  )

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toast: toastHelpers }}>
      {children}
      {currentToast && (
        <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[99999] pointer-events-auto">
          <ToastCard
            title={currentToast.title}
            message={currentToast.message}
            variant={currentToast.variant}
            onClose={hideToast}
          />
        </div>
      )}
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
