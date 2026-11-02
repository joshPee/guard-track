'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        const errorMsg = 'Invalid email or password'
        setError(errorMsg)
        toast.error('Authentication failed: Please check your credentials.', 'Sign In Error')
      } else {
        toast.success('Signed in successfully. Redirecting...', 'Welcome')
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 400)
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred. Please try again.'
      setError(errorMsg)
      toast.error(errorMsg, 'Connection Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7fb] dark:bg-slate-950 px-4 py-8">
      {/* Main Login Card - Designed to match Staff & Admin Portal Reference */}
      <div className="w-full max-w-[420px] bg-white dark:bg-slate-900 rounded-[24px] shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 overflow-hidden animate-scale-in">
        {/* Tricolor Top Banner Stripe (Navy Blue, Gold, Red) */}
        <div className="w-full h-1.5 flex">
          <div className="flex-1 bg-[#0b2d64]" />
          <div className="flex-1 bg-[#e5a823]" />
          <div className="flex-1 bg-[#cc1f2e]" />
        </div>

        <div className="p-7 sm:p-9">
          {/* Centered Logo Box */}
          <div className="flex justify-center mb-5">
            <div className="w-[84px] h-[84px] rounded-2xl border border-slate-100 dark:border-slate-800 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex items-center justify-center p-3.5">
              <img
                src="/pcc.png"
                alt="Pentecost Convention Centre Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Heading Section */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#0c2b58] dark:text-white tracking-tight">
              Staff & Admin Portal
            </h1>
            <p className="mt-1 text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium">
              Pentecost Convention Centre • GuardTrack
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 px-3.5 py-2.5 rounded-xl text-xs font-medium animate-fade-in-up flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Controls */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Username Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2"
              >
                EMAIL OR USERNAME
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="admin@pcc.gov.gh"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 bg-[#edf2f9] dark:bg-slate-800/80 border border-transparent focus:border-[#0b2d64]/40 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl text-sm font-medium transition-all outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2"
              >
                PASSWORD
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-10 pr-10 bg-[#edf2f9] dark:bg-slate-800/80 border border-transparent focus:border-[#0b2d64]/40 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl text-sm font-medium transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Primary Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#0b2d64] hover:bg-[#08224d] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to GuardTrack</span>
                    <span className="text-base font-semibold">→</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Bottom Back Link */}
          <div className="mt-7 text-center">
            <Link
              href="/attendance"
              className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors inline-flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Back to Guard Attendance Kiosk</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
