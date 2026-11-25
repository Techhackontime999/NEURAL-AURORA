import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, LoaderCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BrandLogo } from '../ui/BrandLogo'
import { clearAuthIntent, destinationForIntent, normalizeIntent, readAuthIntent } from '../../lib/authCallback'

const MIN_PASSWORD_LENGTH = 8

export default function ResetPassword() {
  const location = useLocation()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { user, loading: authLoading } = useAuth()
  const timerRef = useRef(null)

  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const intent = normalizeIntent(params.get('for') || readAuthIntent())
  const destination = destinationForIntent(intent === 'reset' ? 'library' : intent)
  const forgotPath = intent === 'contributor' ? '/forgot-password?for=contributor' : intent === 'partner' ? '/forgot-password?for=partner' : '/forgot-password'

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { has_password: true },
      })
      if (updateError) throw updateError

      clearAuthIntent()
      setSaved(true)
      timerRef.current = setTimeout(() => navigate(destination, { replace: true }), 950)
    } catch (updateError) {
      setError(updateError?.message || 'Could not update your password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const accent = intent === 'contributor' ? '#38bdf8' : intent === 'partner' ? '#34d399' : 'var(--accent)'

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6" style={{ background: 'var(--bg-primary)' }}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.08), transparent 68%)' }}
      />
      <motion.div
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div
          className="rounded-2xl border p-8"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(32px)',
            boxShadow: 'var(--shadow-diffusion)',
          }}
        >
          <div className="mb-6 flex justify-center">
            <BrandLogo size="large" showWordmark />
          </div>

          {authLoading ? (
            <div className="flex justify-center py-8" role="status" aria-label="Checking your reset link">
              <LoaderCircle className="animate-spin" size={28} style={{ color: accent }} aria-hidden="true" />
            </div>
          ) : saved ? (
            <div className="text-center" role="status" aria-live="polite">
              <div
                className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border"
                style={{ borderColor: `${accent}55`, color: accent, background: `${accent}12` }}
              >
                <Check size={26} strokeWidth={2} aria-hidden="true" />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>
                Password updated
              </h1>
              <p className="mx-auto mt-3 max-w-[34ch] text-sm" style={{ color: 'var(--text-secondary)' }}>
                You can now sign in with your new password. Redirecting you to the next step…
              </p>
            </div>
          ) : !user ? (
            <div className="text-center">
              <h1 className="font-display text-2xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>
                Reset link expired
              </h1>
              <p className="mx-auto mt-3 max-w-[34ch] text-sm" style={{ color: 'var(--text-secondary)' }}>
                Open a fresh reset link from the sign-in screen and try again.
              </p>
              <Link
                to={forgotPath}
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 text-xs font-semibold uppercase tracking-widest"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                Request a new link <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h1 className="text-center font-display text-2xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>
                Choose a new password
              </h1>
              <p className="mx-auto mt-3 max-w-[34ch] text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                Use at least {MIN_PASSWORD_LENGTH} characters. This password is for your NEURAL AURORA account.
              </p>

              <div className="mt-7 space-y-4">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                    New password
                  </span>
                  <input
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--accent)]"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                    Confirm password
                  </span>
                  <input
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--accent)]"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                  />
                </label>
              </div>

              {error && (
                <p className="mt-4 text-sm" role="alert" style={{ color: '#fb923c' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="mt-7 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: accent }}
              >
                {saving ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
