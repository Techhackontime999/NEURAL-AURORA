import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { BrandLogo } from '../ui/BrandLogo'

function LoadingState() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="h-8 w-8 rounded-full border-2 border-t-transparent"
        style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent)' }}
      />
    </div>
  )
}

function InputField({ label, type, value, onChange, placeholder, autoComplete }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {label}
      </label>
      <motion.div
        initial={false}
        whileFocus={{ scale: 1.005 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          autoComplete={autoComplete}
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 ease-out focus:ring-2"
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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/admin'

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

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid login credentials')
    }
    setLoading(false)
  }

  function handleInputChange(setter) {
    return (e) => {
      setError('')
      setter(e.target.value)
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--accent-glow)]/8 via-[var(--bg-primary)] to-[var(--bg-primary)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 14 }}
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
            />

            <InputField
              label="Password"
              type="password"
              value={password}
              onChange={handleInputChange(setPassword)}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="overflow-hidden text-xs sm:text-sm text-red-400"
              >
                {error}
              </motion.p>
            )}

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-600 accent-[var(--accent)]" />
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
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                  />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
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
