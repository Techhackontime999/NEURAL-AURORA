import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { BrandLogo } from '../ui/BrandLogo'
import {
  getLoginLockoutStatus,
  recordLoginFailure,
  recordLoginSuccess,
} from '../../lib/rateLimit'

function LoadingState() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="flex min-h-[100dvh] items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <motion.div
        animate={shouldReduceMotion ? undefined : { rotate: 360 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 1, repeat: Infinity, ease: 'linear' }}
        className="h-8 w-8 rounded-full border-2 border-t-transparent"
        style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent)' }}
      />
    </div>
  )
}

function InputField({ label, type, value, onChange, placeholder, autoComplete, disabled }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {label}
      </label>
      <motion.div
        initial={false}
        whileFocus={shouldReduceMotion ? undefined : { scale: 1.005 }}
        transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
      >
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          disabled={disabled}
          autoComplete={autoComplete}
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 ease-out focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--input-bg)',
            color: 'var(--text-primary)',
          }}
        />
      </motion.div>
    </div>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem('remember_me') !== 'false'
    } catch (_) {
      return true
    }
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)

  const { signIn, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()

  const from = location.state?.from?.pathname || '/admin'

  // Restore saved email if Remember Me was previously enabled
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('remember_email')
      const shouldRemember = localStorage.getItem('remember_me') !== 'false'
      if (shouldRemember && savedEmail) {
        setEmail(savedEmail)
      }
    } catch (_) {}
  }, [])

  // Check lockout on mount and manage countdown interval
  useEffect(() => {
    const status = getLoginLockoutStatus()
    if (status.isLocked) {
      setLockoutSeconds(status.remainingSeconds)
      setError(`Too many failed attempts. Temporary lockout in effect (${status.remainingSeconds}s remaining).`)
    }
  }, [])

  useEffect(() => {
    if (lockoutSeconds <= 0) return
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setError('')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [lockoutSeconds])

  if (authLoading) {
    return <LoadingState />
  }

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true })
    }
  }, [user, navigate, from])

  if (user) {
    return null
  }

  const isLockedOut = lockoutSeconds > 0

  async function handleSignIn(e) {
    e.preventDefault()
    if (isLockedOut) return

    // Guard before proceeding
    const status = getLoginLockoutStatus()
    if (status.isLocked) {
      setLockoutSeconds(status.remainingSeconds)
      setError(`Too many failed attempts. Please wait ${status.remainingSeconds}s before trying again.`)
      return
    }

    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      
      // Clear lockout history on successful login
      recordLoginSuccess()

      // Handle Remember Me persistence
      try {
        if (rememberMe) {
          localStorage.setItem('remember_me', 'true')
          localStorage.setItem('remember_email', email.trim())
        } else {
          localStorage.setItem('remember_me', 'false')
          localStorage.removeItem('remember_email')
        }
      } catch (_) {}

      navigate(from, { replace: true })
    } catch (err) {
      const lockResult = recordLoginFailure()
      if (lockResult.isLocked) {
        setLockoutSeconds(lockResult.remainingSeconds)
        setError(`Account locked due to too many failed attempts. Try again in ${lockResult.remainingSeconds}s.`)
      } else {
        const remainingMsg = lockResult.remainingAttempts > 0 && lockResult.remainingAttempts < 3
          ? ` (${lockResult.remainingAttempts} attempts remaining)`
          : ''
        setError((err.message || 'Invalid login credentials') + remainingMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleInputChange(setter) {
    return (e) => {
      if (!isLockedOut) setError('')
      setter(e.target.value)
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--accent-glow)]/8 via-[var(--bg-primary)] to-[var(--bg-primary)]" />

      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md px-4 sm:px-6"
      >
        <div
          className="rounded-2xl border p-6 sm:p-8 md:p-10"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            boxShadow: 'var(--shadow-diffusion)',
          }}
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { scale: 0.9, opacity: 0 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.1, type: 'spring', stiffness: 120, damping: 14 }}
              className="mb-5"
            >
              <BrandLogo size="large" showWordmark />
            </motion.div>
            <h1 className="mb-2 font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter leading-none" style={{ color: 'var(--text-primary)' }}>
              Admin Access
            </h1>
            <p className="text-xs sm:text-sm max-w-[28ch]" style={{ color: 'var(--text-secondary)' }}>
              Sign in to manage your portfolio
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-5">
            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={handleInputChange(setEmail)}
              placeholder="your@email.com"
              autoComplete="email"
              disabled={isLockedOut || loading}
            />

            <InputField
              label="Password"
              type="password"
              value={password}
              onChange={handleInputChange(setPassword)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isLockedOut || loading}
            />

            {error && (
              <motion.div
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8, height: 0 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, height: 'auto' }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, height: 0 }}
                transition={shouldReduceMotion ? { duration: 0 } : undefined}
                className={`overflow-hidden rounded-lg p-3 text-xs sm:text-sm ${
                  isLockedOut
                    ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'text-red-400'
                }`}
              >
                {isLockedOut ? (
                  <div className="flex items-center gap-2">
                    <span>🔒</span>
                    <span>{`Temporarily locked out for security. Try again in ${lockoutSeconds}s.`}</span>
                  </div>
                ) : (
                  error
                )}
              </motion.div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLockedOut || loading}
                  className="h-3.5 w-3.5 rounded border-gray-600 accent-[var(--accent)]"
                />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-xs transition-colors hover:underline"
                style={{ color: 'var(--text-secondary)' }}
              >
                Forgot password?
              </Link>
            </div>

            <motion.button
              type="submit"
              disabled={loading || isLockedOut}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              className="relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: isLockedOut ? 'var(--border-color)' : 'var(--accent)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={shouldReduceMotion ? undefined : { rotate: 360 }}
                    transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                  />
                  Signing in...
                </span>
              ) : isLockedOut ? (
                `Locked (${lockoutSeconds}s)`
              ) : (
                'Sign In'
              )}
            </motion.button>

          </form>

          <motion.p
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.3 }}
            className="mt-6 text-center text-xs sm:text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Don't have an account?{' '}
            <Link to="/register" className="font-medium transition-colors hover:underline" style={{ color: 'var(--accent)' }}>
              Register here
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  )
}
