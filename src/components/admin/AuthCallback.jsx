import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, ArrowRight, Check, LoaderCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { BrandLogo } from '../ui/BrandLogo'
import {
  AUTH_CALLBACK_PATH,
  clearAuthIntent,
  destinationForIntent,
  normalizeIntent,
  readAuthIntent,
  safeAuthDestination,
  verifyOtpType,
} from '../../lib/authCallback'

async function waitForSession() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const { data } = await supabase.auth.getSession()
    if (data?.session?.user) return data.session
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('That link took too long to sign you in. Please request a new one.')
}

function destinationLabel(path) {
  if (path.startsWith('/contributor-apply')) return 'your contributor application'
  if (path.startsWith('/partner')) return 'your partner dashboard'
  if (path.startsWith('/admin')) return 'your dashboard'
  if (path.startsWith('/reset-password')) return 'the password reset screen'
  if (path.startsWith('/login')) return 'sign in'
  return 'your library'
}

function quietStorageSet(key, value) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // The acknowledgement still works without session storage.
  }
}

export default function AuthCallback() {
  const location = useLocation()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const timerRef = useRef(null)

  const intent = normalizeIntent(params.get('for') || readAuthIntent())
  const linkType = String(params.get('type') || '').toLowerCase()
  const safeNext = safeAuthDestination(params.get('next'))
  const destination = safeNext
    ? safeNext.startsWith('/reset-password') && !safeNext.includes('for=')
      ? `${safeNext}?for=${intent}`
      : safeNext
    : linkType === 'recovery'
      ? '/reset-password'
      : destinationForIntent(intent)

  const [status, setStatus] = useState('working')
  const [message, setMessage] = useState('Confirming your email…')

  useEffect(() => {
    let cancelled = false

    async function confirmLink() {
      try {
        const errorDescription = params.get('error_description')
        if (errorDescription) throw new Error(errorDescription)

        const tokenHash = params.get('token_hash')
        const code = params.get('code')
        const type = params.get('type')

        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: verifyOtpType(type || intent),
          })
          if (error) throw error
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else {
          await waitForSession()
        }

        if (cancelled) return

        quietStorageSet('neural-aurora-verified', 'true')
        if (!destination.startsWith('/reset-password')) clearAuthIntent()

        const title =
          linkType === 'recovery' || destination.startsWith('/reset-password')
            ? 'Reset link verified'
            : linkType === 'signup'
              ? 'Email confirmed'
              : 'Sign-in link verified'
        setMessage(title)
        setStatus('success')

        timerRef.current = setTimeout(() => {
          navigate(destination, { replace: true })
        }, 950)
      } catch (error) {
        if (cancelled) return
        setStatus('error')
        setMessage(error?.message || 'This link could not be verified.')
      }
    }

    confirmLink()
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [destination, intent, linkType, navigate, params])

  const accent = intent === 'contributor' ? '#38bdf8' : intent === 'partner' ? '#34d399' : 'var(--accent)'
  const signInPath =
    intent === 'contributor' ? '/contributor-login' : intent === 'partner' ? '/affiliate-login' : '/library'

  return (
    <div
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6"
      style={{ background: 'var(--bg-primary)' }}
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.08), transparent 68%)',
        }}
      />
      <motion.div
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div
          className="rounded-2xl border p-8 text-center"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(32px)',
            boxShadow: 'var(--shadow-diffusion)',
          }}
        >
          <div className="mb-7 flex justify-center">
            <BrandLogo size="large" showWordmark />
          </div>

          <div
            className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border"
            style={{
              borderColor: status === 'error' ? 'rgba(251, 146, 60, 0.4)' : `${accent}55`,
              color: status === 'error' ? '#fb923c' : accent,
              background: status === 'error' ? 'rgba(251, 146, 60, 0.08)' : `${accent}12`,
            }}
          >
            {status === 'working' ? (
              <LoaderCircle className="animate-spin" size={24} strokeWidth={1.8} aria-hidden="true" />
            ) : status === 'success' ? (
              <Check size={26} strokeWidth={2} aria-hidden="true" />
            ) : (
              <AlertCircle size={24} strokeWidth={1.8} aria-hidden="true" />
            )}
          </div>

          <h1
            className="font-display text-2xl font-bold tracking-tighter"
            style={{ color: 'var(--text-primary)' }}
          >
            {status === 'working' ? 'Just a moment' : status === 'success' ? 'All set' : 'Link needs attention'}
          </h1>
          <p
            className="mx-auto mt-3 max-w-[34ch] text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {status === 'working'
              ? 'We are confirming your email link and preparing your next step.'
              : status === 'success'
                ? `${message}. Taking you to ${destinationLabel(destination)}…`
                : `${message}. Open a fresh sign-in link to continue.`}
          </p>

          <div className="mt-7 h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--border-color)' }}>
            {status !== 'error' && (
              <motion.div
                className="h-full rounded-full"
                style={{ background: accent }}
                initial={shouldReduceMotion ? undefined : { width: '8%' }}
                animate={{ width: status === 'success' ? '100%' : '62%' }}
                transition={{ duration: status === 'success' ? 0.9 : 1.8, ease: 'easeOut' }}
              />
            )}
          </div>

          {status === 'success' && (
            <button
              type="button"
              onClick={() => navigate(destination, { replace: true })}
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
            >
              Continue now <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}

          {status === 'error' && (
            <Link
              to={signInPath}
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 text-xs font-semibold uppercase tracking-widest transition-colors"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              Back to sign in <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )}

          <p className="mt-6 text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-tertiary)' }}>
            {AUTH_CALLBACK_PATH}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
