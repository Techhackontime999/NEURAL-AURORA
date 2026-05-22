import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { generateTestData } from '../../lib/supabase'

const categoryConfig = [
  { key: 'projects', label: 'Projects', color: '#3b82f6' },
  { key: 'skills', label: 'Skills', color: '#10b981' },
  { key: 'blog', label: 'Blog Posts', color: '#8b5cf6' },
  { key: 'reviews', label: 'Reviews', color: '#f59e0b' },
  { key: 'education', label: 'Education', color: '#ec4899' },
  { key: 'experience', label: 'Experience', color: '#f97316' },
  { key: 'case_studies', label: 'Case Studies', color: '#06b6d4' },
]

export default function AdminOverview() {
  const [stats, setStats] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [generating, setGenerating] = useState(null)
  const [genMessage, setGenMessage] = useState('')
  const [genCategory, setGenCategory] = useState('projects')
  const [genCount, setGenCount] = useState(3)

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    const results = await Promise.all(
      categoryConfig.map(({ key }) =>
        supabase.from(key).select('*', { count: 'exact', head: true })
      )
    )
    const statsMap = {}
    categoryConfig.forEach(({ key }, i) => {
      statsMap[key] = results[i].count ?? 0
    })
    setStats(statsMap)

    const { count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('approved', false)
    setPendingCount(count ?? 0)
  }

  async function handleGenerate() {
    setGenerating(genCategory)
    setGenMessage('')
    try {
      const msg = await generateTestData(genCategory, genCount)
      setGenMessage(msg)
      fetchStats()
    } catch (err) {
      setGenMessage('Error: ' + err.message)
    }
    setGenerating(null)
    setTimeout(() => setGenMessage(''), 4000)
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Overview of your portfolio content
        </p>
      </div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {categoryConfig.map(({ key, label, color }) => (
          <motion.div
            key={key}
            variants={item}
            className="rounded-xl border p-5 transition-all duration-300 hover:scale-[1.02]"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--card-bg)',
            }}
          >
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              {label}
            </p>
            <p
              className="mt-2 font-display text-3xl font-bold tracking-tight"
              style={{ color }}
            >
              {stats?.[key] ?? '—'}
            </p>
          </motion.div>
        ))}

        {/* Pending Reviews */}
        <motion.div
          variants={item}
          className="rounded-xl border p-5 transition-all duration-300 hover:scale-[1.02]"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--card-bg)',
          }}
        >
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Pending Reviews
          </p>
          <p
            className="mt-2 font-display text-3xl font-bold tracking-tight"
            style={{ color: pendingCount > 0 ? '#ef4444' : '#10b981' }}
          >
            {pendingCount}
          </p>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <div
        className="mt-8 rounded-xl border p-5"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--card-bg)',
        }}
      >
        <h2 className="mb-4 font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Quick Actions
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: '/admin/personal-info', label: 'Edit Personal Info' },
            { href: '/admin/projects', label: 'Manage Projects' },
            { href: '/admin/blog', label: 'Write Blog Post' },
            { href: '/admin/reviews', label: 'Moderate Reviews' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="rounded-lg border px-4 py-3 text-sm transition-all duration-200 hover:scale-[1.02]"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
                background: 'var(--hover-bg)',
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Test Data Generator */}
      <div
        className="mt-8 rounded-xl border p-5"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--card-bg)',
        }}
      >
        <h2 className="mb-1 font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Generate Test Data
        </h2>
        <p className="mb-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Populate your portfolio with sample data for testing
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Category
            </label>
            <select
              value={genCategory}
              onChange={(e) => setGenCategory(e.target.value)}
              className="rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            >
              {categoryConfig.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Count
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={genCount}
              onChange={(e) => setGenCount(Math.max(1, Math.min(20, +e.target.value)))}
              className="w-20 rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating !== null}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {generating === genCategory ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generating...
              </span>
            ) : (
              'Generate'
            )}
          </button>
        </div>

        <AnimatePresence>
          {genMessage && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`mt-3 text-sm ${genMessage.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {genMessage}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
