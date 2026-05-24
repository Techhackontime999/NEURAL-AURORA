import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { path: '/admin', label: 'Overview', icon: '◈' },
  { path: '/admin/personal-info', label: 'Personal Info', icon: '◎' },
  { path: '/admin/skills', label: 'Skills', icon: '◆' },
  { path: '/admin/projects', label: 'Projects', icon: '⊞' },
  { path: '/admin/education', label: 'Education', icon: '◇' },
  { path: '/admin/experience', label: 'Experience', icon: '○' },
  { path: '/admin/blog', label: 'Blog Posts', icon: '⊡' },
  { path: '/admin/case-studies', label: 'Case Studies', icon: '▣' },
  { path: '/admin/services', label: 'Services', icon: '⊞' },
  { path: '/admin/social-links', label: 'Social Links', icon: '⊛' },
  { path: '/admin/reviews', label: 'Reviews', icon: '★' },
  { path: '/admin/messages', label: 'Messages', icon: '✉' },
  { path: '/admin/ads', label: 'Dev Ads', icon: '⊡' },
  { path: '/admin/users', label: 'Users', icon: '◎' },
  { path: '/admin/crm-config', label: 'CRM Config', icon: '⚙' },
]

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const { signOut, user, profile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    setIsDark(isDarkMode)
  }, [])

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 border-r transition-transform md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'var(--sidebar-bg)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex h-full flex-col">
          <div
            className="border-b p-5"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <h2
              className="font-display text-lg font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Neural Aurora
            </h2>
            <p
              className="mt-0.5 truncate text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {user?.email}
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                    isActive
                      ? 'font-medium'
                      : ''
                  }`
                }
                style={({ isActive }) => ({
                  background: isActive ? 'var(--hover-bg)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                })}
              >
                <span className="text-xs opacity-60">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div
            className="border-t p-3 space-y-1"
            style={{ borderColor: 'var(--border-color)' }}
          >
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="text-xs">{isDark ? '☀' : '☾'}</span>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>

            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="text-xs">↩</span>
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-30 border-b backdrop-blur-lg"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center justify-center rounded-lg p-2 transition-colors md:hidden"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-3">
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                style={{
                  background: 'var(--hover-bg)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {profile?.role}
              </span>
              <NavLink
                to="/"
                className="text-xs transition-colors hover:underline"
                style={{ color: 'var(--text-tertiary)' }}
              >
                View Site
              </NavLink>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
