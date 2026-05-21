import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/admin'

  if (user) {
    navigate(from, { replace: true })
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

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const { data } = await signUp(email, password, { role: 'admin' })
      if (data?.user?.identities?.length === 0) {
        setError('An account with this email already exists')
      } else {
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setMode('signin')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      setError(err.message || 'Registration failed')
    }
    setLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neural-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neural-900/50 via-neural-950 to-neural-950" />

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-md px-6"
        >
          <div className="glass-panel-strong rounded-2xl border border-white/5 p-8">
            <div className="mb-8 text-center">
              <h1 className="mb-2 font-display text-3xl font-bold tracking-tight text-white">
                {mode === 'signin' ? 'Admin Access' : 'Create Account'}
              </h1>
              <p className="text-sm text-neural-400">
                {mode === 'signin'
                  ? 'Sign in to manage your portfolio'
                  : 'Register to manage your portfolio'}
              </p>
            </div>

            <div className="mb-6 flex rounded-lg border border-white/5 p-0.5">
              <button
                onClick={() => setMode('signin')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mode === 'signin'
                    ? 'bg-neural-500/20 text-white'
                    : 'text-neural-500 hover:text-neural-400'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mode === 'signup'
                    ? 'bg-neural-500/20 text-white'
                    : 'text-neural-500 hover:text-neural-400'
                }`}
              >
                Register
              </button>
            </div>

            <form
              onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}
              className="space-y-5"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neural-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neural-600 outline-none transition-colors focus:border-neural-500 focus:ring-1 focus:ring-neural-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neural-300">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neural-600 outline-none transition-colors focus:border-neural-500 focus:ring-1 focus:ring-neural-500"
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neural-300">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neural-600 outline-none transition-colors focus:border-neural-500 focus:ring-1 focus:ring-neural-500"
                  />
                </div>
              )}

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-400"
                >
                  {error}
                </motion.p>
              )}

              {success && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-emerald-400"
                >
                  {success}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-neural-500 px-4 py-2.5 font-medium text-white transition-all hover:bg-neural-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : mode === 'signin' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
