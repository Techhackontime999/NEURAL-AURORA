import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { BrandLogo } from '../ui/BrandLogo'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent)' }} />
      </div>
    )
  }

  if (user) {
    navigate('/admin', { replace: true })
    return null
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to create account')
    }
    setLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-primary)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--accent-glow)]/10 via-[var(--bg-primary)] to-[var(--bg-primary)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div
          className="rounded-2xl border border-[var(--border-color)] p-8"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(32px)',
            boxShadow: 'var(--shadow-diffusion)',
          }}
        >
          {success ? (
            <div className="flex flex-col items-center text-center">
              <div className="mb-4">
                <BrandLogo size="large" showWordmark />
              </div>
              <h1 className="mb-2 font-display text-2xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>
                Check Your Email
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                We sent a confirmation link to <strong className="text-cyan-400">{email}</strong>. Click it to activate your account, then sign in.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-block rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ background: 'var(--accent)' }}
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 flex flex-col items-center text-center">
                <div className="mb-4">
                  <BrandLogo size="large" showWordmark />
                </div>
                <h1 className="mb-2 font-display text-3xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>
                  Create Account
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Register to access the admin dashboard
                </p>
              </div>

              <form onSubmit={handleSignUp} className="space-y-5">
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

                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-1"
                    style={{
                      borderColor: 'var(--border-color)',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
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
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-400"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg px-4 py-2.5 font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creating account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                Already have an account?{' '}
                <Link to="/login" className="text-cyan-400 hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
