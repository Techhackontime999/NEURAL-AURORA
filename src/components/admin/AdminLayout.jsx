import { useState } from 'react'
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
  { path: '/admin/social-links', label: 'Social Links', icon: '⊛' },
  { path: '/admin/reviews', label: 'Reviews', icon: '★' },
]

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { signOut, user, profile } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen bg-neural-950">
      <aside className="fixed left-0 top-0 z-40 h-full w-64 -translate-x-full border-r border-white/5 bg-neural-950 transition-transform md:relative md:translate-x-0">
        <div className="flex h-full flex-col">
          <div className="border-b border-white/5 p-4">
            <h2 className="font-display text-lg font-bold text-white">Admin Panel</h2>
            <p className="mt-1 text-xs text-neural-500">{user?.email}</p>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-neural-500/20 text-neural-300'
                      : 'text-neural-500 hover:bg-white/5 hover:text-neural-300'
                  }`
                }
              >
                <span className="text-xs">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-white/5 p-3">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-neural-950/80 backdrop-blur-lg">
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-neural-400 hover:bg-white/5 md:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neural-500">{profile?.role}</span>
              <NavLink
                to="/"
                className="text-xs text-neural-600 underline underline-offset-2 hover:text-neural-400"
              >
                View Site
              </NavLink>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
