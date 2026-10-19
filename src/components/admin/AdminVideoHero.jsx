import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { getAdminSettings, updateAdminSettings } from '../../lib/supabase'
import { invalidatePortfolioCache } from '../../lib/usePortfolioData'
import {
  DEFAULT_VIDEO_HERO,
  PRESET_LINK_KEYS,
  VIDEO_HERO_ICONS,
  mergeVideoHeroConfig,
} from '../../lib/videoHeroDefaults'
import en from '../../locales/en.json'

const COPY_PLACEHOLDERS = {
  eyebrow: en.videoHero.eyebrow,
  titleA: en.videoHero.titleA,
  titleB: en.videoHero.titleB,
  subtitle: en.videoHero.subtitle,
}

const labelLink = (key) =>
  en.videoHero.links[key] || ''

const hintLink = (key) =>
  en.videoHero.hints[key] || ''

const inputStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-7 bg-white/[0.05] rounded-lg w-48" />
      <div className="h-4 bg-white/[0.03] rounded-lg w-72" />
      <div className="h-40 bg-white/[0.02] rounded-xl border border-white/[0.04]" />
      <div className="h-52 bg-white/[0.02] rounded-xl border border-white/[0.04]" />
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-2">
      <label
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, mono }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all duration-200 ${
        mono ? 'font-mono tracking-wide' : ''
      }`}
      style={inputStyle}
      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
    />
  )
}

function VideoPreview({ src, label, color }) {
  return (
    <div className="relative overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
      {src ? (
        <video
          key={src}
          src={src}
          className="w-full h-28 object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="w-full h-28 flex items-center justify-center text-xs" style={{ background: 'var(--hover-bg)', color: 'var(--text-tertiary)' }}>
          No video
        </div>
      )}
      <span
        className="absolute top-2 left-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(0,0,0,0.55)', color }}
      >
        {label}
      </span>
    </div>
  )
}

export default function AdminVideoHero() {
  const [cfg, setCfg] = useState(() => mergeVideoHeroConfig(null))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const settings = await getAdminSettings()
      setCfg(mergeVideoHeroConfig(settings?.video_hero))
    } catch {
      /* fall back to defaults; save will surface errors */
    }
    setLoading(false)
  }

  const patch = (partial) => setCfg((current) => ({ ...current, ...partial }))

  const updateLink = (index, partial) =>
    setCfg((current) => ({
      ...current,
      links: current.links.map((link, i) => (i === index ? { ...link, ...partial } : link)),
    }))

  const moveLink = (index, delta) =>
    setCfg((current) => {
      const next = [...current.links]
      const target = index + delta
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...current, links: next }
    })

  const removeLink = (index) =>
    setCfg((current) => ({ ...current, links: current.links.filter((_, i) => i !== index) }))

  const addLink = () =>
    setCfg((current) => ({
      ...current,
      links: [
        ...current.links,
        {
          key: `custom-${current.links.length + 1}`,
          to: '/',
          icon: 'more',
          label: '',
          hint: '',
          enabled: true,
        },
      ],
    }))

  async function handleSave() {
    const custom = cfg.links.filter((link) => !PRESET_LINK_KEYS.includes(link.key))
    const invalid = custom.find((link) => !link.label || !link.to)
    if (invalid) {
      setMessage({
        type: 'error',
        text: `Custom link "${invalid.key}" needs both a label and a destination.`,
      })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      await updateAdminSettings({ video_hero: JSON.parse(JSON.stringify(cfg)) })
      // Refresh the public section immediately, wherever it is mounted.
      invalidatePortfolioCache('videoHeroSettings')
      setMessage({ type: 'success', text: 'Video Hero saved. The homepage picks it up right away.' })
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to save: ${err.message || err}` })
    }
    setSaving(false)
  }

  function handleReset() {
    setCfg(mergeVideoHeroConfig(DEFAULT_VIDEO_HERO))
    setMessage({ type: 'info', text: 'Defaults restored in the form — press Save to apply them.' })
  }

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Video Hero
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage the showcase section below the main hero
          </p>
        </div>
        <div className="max-w-3xl" style={{ color: 'var(--text-tertiary)' }}>
          <Skeleton />
        </div>
      </div>
    )
  }

  const spring = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 80, damping: 18 }

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Video Hero
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            The video showcase section under the main hero — one video per theme, plus its copy and quick-jump buttons.
          </p>
        </div>

        <button
          type="button"
          onClick={() => patch({ enabled: !cfg.enabled })}
          className="flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs font-semibold transition-colors"
          style={{
            borderColor: cfg.enabled ? 'rgba(16,185,129,0.4)' : 'var(--border-color)',
            background: cfg.enabled ? 'rgba(16,185,129,0.08)' : 'var(--hover-bg)',
            color: cfg.enabled ? '#10b981' : 'var(--text-tertiary)',
          }}
          aria-pressed={cfg.enabled}
        >
          <span
            className="w-8 h-4 rounded-full relative transition-colors"
            style={{ background: cfg.enabled ? '#10b981' : 'rgba(255,255,255,0.15)' }}
          >
            <span
              className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
              style={{ left: cfg.enabled ? '18px' : '2px' }}
            />
          </span>
          {cfg.enabled ? 'Section visible' : 'Section hidden'}
        </button>
      </div>

      {/* Videos */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: shouldReduceMotion ? 0 : 0.1 }}
        className="max-w-3xl rounded-2xl border p-5 md:p-7 space-y-6"
        style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)', boxShadow: '0 4px 24px -8px rgba(0,0,0,0.08)' }}
      >
        <h3 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Background videos
        </h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3">
            <VideoPreview src={cfg.darkVideo} label="Dark mode" color="#8beeff" />
            <Field
              label="Dark mode video"
              hint={'Drop the file into the public/ folder and reference it as "/your-file.mp4", or paste any URL.'}
            >
              <TextInput value={cfg.darkVideo} onChange={(v) => patch({ darkVideo: v })} placeholder="/hero_dark.mp4" mono />
            </Field>
          </div>

          <div className="space-y-3">
            <VideoPreview src={cfg.lightVideo} label="Light mode" color="#ffd166" />
            <Field
              label="Light mode video"
              hint={'Used whenever the site is in light mode. The section swaps automatically on theme change.'}
            >
              <TextInput value={cfg.lightVideo} onChange={(v) => patch({ lightVideo: v })} placeholder="/hero_light.mp4" mono />
            </Field>
          </div>
        </div>
      </motion.div>

      {/* Copy */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: shouldReduceMotion ? 0 : 0.16 }}
        className="max-w-3xl mt-6 rounded-2xl border p-5 md:p-7 space-y-5"
        style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
      >
        <div>
          <h3 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Section copy
          </h3>
          <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            Leave a field empty to use the translated default copy.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Eyebrow">
            <TextInput value={cfg.eyebrow} onChange={(v) => patch({ eyebrow: v })} placeholder={COPY_PLACEHOLDERS.eyebrow} />
          </Field>
          <Field label="Subtitle">
            <TextInput value={cfg.subtitle} onChange={(v) => patch({ subtitle: v })} placeholder={COPY_PLACEHOLDERS.subtitle} />
          </Field>
          <Field label="Title — first part">
            <TextInput value={cfg.titleA} onChange={(v) => patch({ titleA: v })} placeholder={COPY_PLACEHOLDERS.titleA} />
          </Field>
          <Field label="Title — gradient part">
            <TextInput value={cfg.titleB} onChange={(v) => patch({ titleB: v })} placeholder={COPY_PLACEHOLDERS.titleB} />
          </Field>
        </div>
      </motion.div>

      {/* Quick links */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: shouldReduceMotion ? 0 : 0.22 }}
        className="max-w-3xl mt-6 rounded-2xl border p-5 md:p-7 space-y-4"
        style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Quick-jump buttons
            </h3>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              The floating buttons the left/right arrows swap. Reorder, retitle, retarget or hide them.
              Preset links fall back to the translated defaults when left blank; custom links need a label.
            </p>
          </div>
          <button
            type="button"
            onClick={addLink}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', background: 'var(--hover-bg)' }}
          >
            + Add link
          </button>
        </div>

        <div className="space-y-3">
          {cfg.links.map((link, index) => {
            const preset = PRESET_LINK_KEYS.includes(link.key)
            return (
              <div
                key={link.key}
                className="rounded-xl border p-3.5 space-y-3"
                style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)', opacity: link.enabled ? 1 : 0.55 }}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>
                    <input
                      type="checkbox"
                      checked={link.enabled}
                      onChange={(e) => updateLink(index, { enabled: e.target.checked })}
                      className="w-3.5 h-3.5 accent-emerald-500"
                    />
                    Visible
                  </label>

                  <select
                    value={link.icon}
                    onChange={(e) => updateLink(index, { icon: e.target.value })}
                    className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                    style={inputStyle}
                  >
                    {VIDEO_HERO_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>

                  {preset && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--hover-bg)', color: 'var(--text-tertiary)' }}
                    >
                      preset · {link.key}
                    </span>
                  )}

                  <span className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveLink(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                      className="w-7 h-7 rounded-lg border text-xs disabled:opacity-30"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(index, 1)}
                      disabled={index === cfg.links.length - 1}
                      aria-label="Move down"
                      className="w-7 h-7 rounded-lg border text-xs disabled:opacity-30"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      aria-label="Remove link"
                      className="w-7 h-7 rounded-lg border text-xs"
                      style={{ borderColor: 'rgba(239,68,68,0.25)', color: '#ef4444' }}
                    >
                      ✕
                    </button>
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      Label
                    </span>
                    <TextInput
                      value={link.label}
                      onChange={(v) => updateLink(index, { label: v })}
                      placeholder={labelLink(link.key) || 'Label (required)'}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      Hint
                    </span>
                    <TextInput
                      value={link.hint}
                      onChange={(v) => updateLink(index, { hint: v })}
                      placeholder={hintLink(link.key) || 'Small text under the label'}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      Destination
                    </span>
                    <TextInput value={link.to} onChange={(v) => updateLink(index, { to: v })} placeholder="/blog" mono />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Actions */}
      <div className="max-w-3xl mt-6 flex items-center gap-3 flex-wrap">
        <motion.button
          onClick={handleSave}
          disabled={saving || !cfg.links.length}
          whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          className="rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-40"
          style={{ background: 'var(--accent)' }}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <motion.div
                animate={shouldReduceMotion ? undefined : { rotate: 360 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/80"
              />
              Saving
            </span>
          ) : (
            'Save Configuration'
          )}
        </motion.button>

        <button
          onClick={handleReset}
          className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all border"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }}
        >
          Reset to defaults
        </button>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
            className="max-w-3xl mt-4 flex items-center gap-2 text-sm"
          >
            <div
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                message.type === 'success' ? 'bg-emerald-400' : message.type === 'info' ? 'bg-sky-400' : 'bg-red-400'
              }`}
            />
            <p style={{ color: message.type === 'success' ? '#10b981' : message.type === 'info' ? '#38bdf8' : '#ef4444' }}>
              {message.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
