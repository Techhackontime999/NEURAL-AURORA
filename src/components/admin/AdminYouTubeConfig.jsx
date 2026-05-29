import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAdminSettings, updateAdminSettings } from '../../lib/supabase'

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-7 bg-white/[0.05] rounded-lg w-48" />
      <div className="h-4 bg-white/[0.03] rounded-lg w-72" />
      <div className="h-28 bg-white/[0.02] rounded-xl border border-white/[0.04]" />
    </div>
  )
}

export default function AdminYouTubeConfig() {
  const [channelId, setChannelId] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [testStatus, setTestStatus] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const settings = await getAdminSettings()
      if (settings?.youtube_channel_id) setChannelId(settings.youtube_channel_id)
    } catch {}
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      await updateAdminSettings({ youtube_channel_id: channelId.trim() })
      setMessage({ type: 'success', text: 'YouTube channel ID saved successfully.' })
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to save: ${err.message || err}` })
    }
    setSaving(false)
  }

  async function handleTestConnection() {
    setTestStatus({ type: 'testing', text: 'Testing connection...' })
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
    if (!apiKey) {
      setTestStatus({ type: 'error', text: 'VITE_YOUTUBE_API_KEY not set in .env file' })
      return
    }
    if (!channelId.trim()) {
      setTestStatus({ type: 'error', text: 'Please enter a channel ID first' })
      return
    }
    try {
      const r = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId.trim()}&key=${apiKey}`
      )
      const data = await r.json()
      if (data.items?.length) {
        const ch = data.items[0]
        setTestStatus({
          type: 'success',
          text: `Connected to "${ch.snippet.title}" — ${parseInt(ch.statistics.subscriberCount || 0).toLocaleString()} subscribers`,
        })
      } else {
        setTestStatus({ type: 'error', text: 'Channel not found. Check the channel ID.' })
      }
    } catch (err) {
      setTestStatus({ type: 'error', text: `Connection failed: ${err.message}` })
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            YouTube Channel Config
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Configure your YouTube channel for the verification loader browse mode
          </p>
        </div>
        <div className="max-w-xl" style={{ color: 'var(--text-tertiary)' }}>
          <Skeleton />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
    >
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          YouTube Channel Config
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Configure your YouTube channel for the <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--hover-bg)' }}>Channel Stream</span> verification mode
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 80, damping: 18 }}
        className="max-w-xl rounded-2xl border p-5 md:p-7 space-y-6"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--card-bg)',
          boxShadow: '0 4px 24px -8px rgba(0,0,0,0.08)',
        }}
      >
        {/* Channel ID input */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
              <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 001.94-2A29 29 0 0023 12a29 29 0 00-.46-5.58z" strokeLinecap="round" />
              <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" strokeLinejoin="round" />
            </svg>
            YouTube Channel ID
          </label>
          <div className="relative">
            <input
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="UC_x5XG1OV2P6uZZ5FSM9Ttw"
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all duration-200 font-mono tracking-wide"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Find your channel ID at{' '}
              <a href="https://youtube.com/account_advanced" target="_blank" rel="noopener noreferrer"
                className="underline underline-offset-2 decoration-white/10 hover:decoration-white/30 transition-colors" style={{ color: 'var(--accent)' }}
              >youtube.com/account_advanced</a>
              {' '}or in YouTube Studio settings.
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Your YouTube Data API key goes in{' '}
              <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--hover-bg)', color: 'var(--accent)' }}>.env</code>
              {' '}as{' '}
              <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--hover-bg)', color: 'var(--accent)' }}>VITE_YOUTUBE_API_KEY</code>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <motion.button
            onClick={handleSave}
            disabled={saving || !channelId.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/80"
                />
                Saving
              </span>
            ) : (
              'Save Configuration'
            )}
          </motion.button>

          <motion.button
            onClick={handleTestConnection}
            disabled={testStatus?.type === 'testing'}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all border disabled:opacity-40"
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
              background: 'transparent',
            }}
          >
            {testStatus?.type === 'testing' ? (
              <span className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-3.5 h-3.5 rounded-full border-2 border-white/10 border-t-white/30"
                />
                Testing
              </span>
            ) : (
              'Test Connection'
            )}
          </motion.button>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              className="flex items-center gap-2 text-sm overflow-hidden"
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${message.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <p style={{ color: message.type === 'success' ? '#10b981' : '#ef4444' }}>
                {message.text}
              </p>
            </motion.div>
          )}

          {testStatus && testStatus.type !== 'testing' && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              className="flex items-start gap-2.5 text-sm overflow-hidden p-3 rounded-xl"
              style={{
                background: testStatus.type === 'success' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${testStatus.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
              }}
            >
              {testStatus.type === 'success' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" className="w-4 h-4 mt-0.5 shrink-0"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" /><polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="w-4 h-4 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10" strokeLinecap="round" /><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" /><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" /></svg>
              )}
              <div>
                <p className="text-sm font-medium" style={{ color: testStatus.type === 'success' ? '#10b981' : '#ef4444' }}>
                  {testStatus.type === 'success' ? 'Connected' : 'Failed'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{testStatus.text}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Setup guide */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 80, damping: 18 }}
        className="max-w-xl mt-6 rounded-2xl border p-5 md:p-7"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--card-bg)',
        }}
      >
        <h3 className="text-sm font-semibold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>
          Quick Setup Guide
        </h3>
        <div className="space-y-2.5">
          {[
            ['Get a YouTube Data API v3 key', 'Go to Google Cloud Console, enable YouTube Data API v3, and create an API key.'],
            ['Add the key to .env', 'Add VITE_YOUTUBE_API_KEY=your_key to your .env file.'],
            ['Find your Channel ID', 'Go to YouTube Studio -> Settings -> Channel -> Advanced Settings. Copy the Channel ID.'],
            ['Save & Test', 'Paste the Channel ID above, click "Test Connection", then save.'],
          ].map(([title, desc], i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 100, damping: 20 }}
              className="flex gap-3"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5"
                style={{ background: 'var(--hover-bg)' }}
              >
                <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--text-tertiary)' }}>{i + 1}</span>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
