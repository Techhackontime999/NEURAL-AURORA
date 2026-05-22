import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send reset email')
    }
    setLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--accent-glow)]/10 via-[var(--bg-primary)] to-[var(--bg-primary)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md px-6"
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
          <div className="mb-8 text-center">
            <h1 className="mb-2 font-display text-3xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>
              Reset Password
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {sent ? 'Check your email for the reset link' : 'Enter your email to receive a reset link'}
            </p>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <svg className="h-8 w-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                If an account exists with that email, you will receive a password reset link shortly.
              </p>
              <Link
                to="/login"
                className="text-sm font-medium transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-1"
                  style={{
                    borderColor: 'var(--border-color)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400">
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg px-4 py-2.5 font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <p className="text-center">
                <Link
                  to="/login"
                  className="text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Back to Sign In
                </Link>
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
