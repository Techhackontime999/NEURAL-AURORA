import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { getAdminSettings, updateAdminSettings } from '../../lib/supabase'
import { invalidatePortfolioCache } from '../../lib/usePortfolioData'
import {
  DEFAULT_STORE_HERO,
  mergeStoreHeroConfig,
} from '../../lib/storeHeroDefaults'
import ImageUpload from '../ui/ImageUpload'

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
      <div className="h-52 bg-white/[0.02] rounded-xl border border-white/[0.04]" />
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

export default function AdminStoreHero() {
  const [cfg, setCfg] = useState(() => mergeStoreHeroConfig(null))
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
      setCfg(mergeStoreHeroConfig(settings?.store_hero))
    } catch {
      /* fall back to defaults; save will surface errors */
    }
    setLoading(false)
  }

  const patch = (partial) => setCfg((current) => ({ ...current, ...partial }))

  const updateImage = (index, partial) =>
    setCfg((current) => ({
      ...current,
      images: current.images.map((image, i) => (i === index ? { ...image, ...partial } : image)),
    }))

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      await updateAdminSettings({ store_hero: JSON.parse(JSON.stringify(cfg)) })
      // Refresh the /offerings/products hero immediately, wherever mounted.
      invalidatePortfolioCache('storeHeroSettings')
      setMessage({ type: 'success', text: 'Store hero carousel saved. The products page picks it up right away.' })
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to save: ${err.message || err}` })
    }
    setSaving(false)
  }

  function handleReset() {
    setCfg(mergeStoreHeroConfig(DEFAULT_STORE_HERO))
    setMessage({ type: 'info', text: 'Defaults restored in the form — press Save to apply them.' })
  }

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Store Hero Carousel
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage the background-image carousel on the digital-store hero
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
            Store Hero Carousel
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            The background-image carousel behind the "Digital Store / Digital Products" hero card
            on /offerings/products. Upload your own images or paste URLs; leave a slot empty to
            use the built-in default.
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
          {cfg.enabled ? 'Carousel visible' : 'Carousel hidden'}
        </button>
      </div>

      {/* Carousel settings */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: shouldReduceMotion ? 0 : 0.1 }}
        className="max-w-3xl rounded-2xl border p-5 md:p-7 space-y-5"
        style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)', boxShadow: '0 4px 24px -8px rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Background images
            </h3>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Wide images (1600×600 or larger) look best. The carousel crossfades between slides
              in the order shown; hidden slots are skipped.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label
              className="text-[11px] uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
              htmlFor="store-hero-interval"
            >
              Slide every
            </label>
            <input
              id="store-hero-interval"
              type="number"
              min="3"
              max="60"
              value={cfg.intervalSeconds}
              onChange={(e) => patch({ intervalSeconds: Number(e.target.value) })}
              className="w-20 rounded-lg border px-2 py-1.5 text-xs outline-none"
              style={inputStyle}
            />
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              sec
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {cfg.images.map((image, index) => (
            <div
              key={index}
              className="rounded-xl border p-3.5 space-y-3"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--input-bg)',
                opacity: image.enabled ? 1 : 0.55,
              }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <label
                  className="flex items-center gap-2 text-[11px] uppercase tracking-wider cursor-pointer"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <input
                    type="checkbox"
                    checked={image.enabled}
                    onChange={(e) => updateImage(index, { enabled: e.target.checked })}
                    className="w-3.5 h-3.5 accent-emerald-500"
                  />
                  Visible
                </label>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--hover-bg)', color: 'var(--text-tertiary)' }}
                >
                  slide {index + 1}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <ImageUpload
                  value={image.url}
                  onChange={(url) => updateImage(index, { url })}
                  label={`slide ${index + 1} image`}
                />
                <Field
                  label="Or image URL"
                  hint="Paste any direct image URL (https://...). Uploaded images override this when saved."
                >
                  <TextInput
                    value={image.url}
                    onChange={(v) => updateImage(index, { url: v })}
                    placeholder="https://..."
                    mono
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <div className="max-w-3xl mt-6 flex items-center gap-3 flex-wrap">
        <motion.button
          onClick={handleSave}
          disabled={saving}
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
