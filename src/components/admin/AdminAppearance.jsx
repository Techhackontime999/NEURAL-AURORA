import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { getAdminSettings, updateAdminSettings } from '../../lib/supabase'
import { invalidatePortfolioCache } from '../../lib/usePortfolioData'
import {
  DEFAULT_APPEARANCE,
  FONT_OPTIONS,
  THEME_OPTIONS,
  LANG_OPTIONS,
  MAX_FONT_SCALE,
  MAX_RADIUS_SCALE,
  MIN_FONT_SCALE,
  MIN_RADIUS_SCALE,
  mergeSiteAppearance,
} from '../../lib/appearanceDefaults'
import { applyAppearance, setAppearance } from '../../lib/useSiteAppearance'

const inputStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-7 w-56 rounded-lg bg-white/[0.05]" />
      <div className="h-4 w-80 rounded-lg bg-white/[0.03]" />
      <div className="h-64 rounded-xl border border-white/[0.04] bg-white/[0.02]" />
    </div>
  )
}

function Section({ title, description, children }) {
  return (
    <div
      className="max-w-3xl space-y-5 rounded-2xl border p-5 md:p-7"
      style={{
        borderColor: 'var(--border-color)',
        background: 'var(--card-bg)',
        boxShadow: '0 4px 24px -8px rgba(0,0,0,0.08)',
      }}
    >
      <div>
        <h3 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            {description}
          </p>
        )}
      </div>
      {children}
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

function ColorInput({ value, onChange, id }) {
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border p-1"
        style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="w-32 rounded-lg border px-3 py-2 font-mono text-xs uppercase outline-none transition-colors"
        style={inputStyle}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
      />
    </div>
  )
}

function Select({ value, onChange, options, id }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full max-w-xs rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors"
      style={inputStyle}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function Slider({ value, onChange, min, max, step = 0.05, format }) {
  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full max-w-xs cursor-pointer appearance-none rounded-full accent-emerald-500"
        style={{ background: 'var(--hover-bg)' }}
      />
      <span
        className="w-16 shrink-0 text-xs tabular-nums"
        style={{ color: 'var(--text-secondary)' }}
      >
        {format ? format(value) : value}
      </span>
    </div>
  )
}

/** Live swatch preview — renders the current palette and fonts inline. */
function Preview({ cfg }) {
  const isDark = cfg._previewDark
  const bg = isDark ? cfg.bgDark : cfg.bgLight
  const surface = isDark ? cfg.surfaceDark : cfg.surfaceLight
  const accent = isDark ? cfg.accentDark : cfg.accent
  const text = isDark ? '#f1f1f5' : '#1d1d1f'
  const subtle = isDark ? 'rgba(241,241,245,0.6)' : '#6b6b76'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const bodyStack = FONT_OPTIONS.find((f) => f.value === cfg.fontBody)?.stack
  const displayStack = FONT_OPTIONS.find((f) => f.value === cfg.fontDisplay)?.stack
  const radius = Math.round(16 * cfg.radiusScale)

  return (
    <div
      className="overflow-hidden border transition-colors"
      style={{ background: bg, borderColor: border, borderRadius: radius, color: text, fontFamily: bodyStack }}
    >
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: border }}>
        <span style={{ fontFamily: displayStack, fontWeight: 700, fontSize: 15 }}>Neural Aurora</span>
        <span
          className="px-3 py-1 text-[11px] font-medium"
          style={{ background: accent, color: isDark ? '#050508' : '#ffffff', borderRadius: radius / 2 }}
        >
          Accent
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div
          className="border p-4"
          style={{ background: surface, borderColor: border, borderRadius: radius }}
        >
          <p style={{ fontFamily: displayStack, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
            Sample heading
          </p>
          <p style={{ color: subtle, fontSize: 12, lineHeight: 1.6 }}>
            Body text in {cfg.fontBody}. Adjust the controls to see the palette, type and corner
            radius update here before saving.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-6 w-6"
            style={{ background: accent, borderRadius: radius / 2 }}
          />
          <span className="h-6 w-6" style={{ background: text, borderRadius: radius / 2 }} />
          <span className="h-6 w-6" style={{ background: subtle, borderRadius: radius / 2 }} />
          <span className="h-6 w-6 border" style={{ background: surface, borderColor: border, borderRadius: radius / 2 }} />
        </div>
      </div>
    </div>
  )
}

export default function AdminAppearance() {
  const [cfg, setCfg] = useState(() => mergeSiteAppearance(null))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [previewDark, setPreviewDark] = useState(true)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const settings = await getAdminSettings()
      setCfg(mergeSiteAppearance(settings?.appearance))
    } catch {
      /* fall back to defaults; save will surface errors */
    }
    setLoading(false)
  }

  const patch = (partial) => setCfg((current) => ({ ...current, ...partial }))

  // Live-preview the draft as the admin edits, so the effect is visible before
  // saving. Reverted to the saved config if they navigate away without saving.
  useEffect(() => {
    if (loading) return
    applyAppearance(cfg)
    return () => {
      // Restore whatever is actually persisted.
      setAppearance(cfg, { persist: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, loading])

  const isDirty = useMemo(
    () => JSON.stringify(mergeSiteAppearance(cfg)) !== JSON.stringify(mergeSiteAppearance(DEFAULT_APPEARANCE)),
    [cfg]
  )

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const payload = mergeSiteAppearance(cfg)
      delete payload._previewDark
      await updateAdminSettings({ appearance: payload })
      // Adopt locally (writes the localStorage cache) and refresh any mounted
      // public components reading the same resource.
      setAppearance(payload)
      invalidatePortfolioCache('siteAppearance')
      setMessage({ type: 'success', text: 'Preferences saved. The live site updates immediately.' })
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to save: ${err.message || err}` })
    }
    setSaving(false)
  }

  function handleReset() {
    setCfg(mergeSiteAppearance(DEFAULT_APPEARANCE))
    setMessage({ type: 'info', text: 'Defaults restored in the form — press Save to apply them.' })
  }

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Site Appearance
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Customize the look of the whole site
          </p>
        </div>
        <div className="max-w-3xl" style={{ color: 'var(--text-tertiary)' }}>
          <Skeleton />
        </div>
      </div>
    )
  }

  const spring = shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 80, damping: 18 }

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Site Preferences
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Customize the look and language of the whole site. Changes below preview live —
            press Save to publish them.
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
            className="relative h-4 w-8 rounded-full transition-colors"
            style={{ background: cfg.enabled ? '#10b981' : 'rgba(255,255,255,0.15)' }}
          >
            <span
              className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all"
              style={{ left: cfg.enabled ? '18px' : '2px' }}
            />
          </span>
          {cfg.enabled ? 'Custom theme enabled' : 'Using original theme'}
        </button>
      </div>

      <div className="mb-6 max-w-3xl space-y-6">
        {/* Language & Theme Defaults */}
        <Section
          title="Defaults"
          description="Set defaults for visitors who haven't chosen preferences yet. Visitor choices always take priority."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Default language">
              <Select
                id="default-language"
                value={cfg.defaultLanguage}
                onChange={(v) => patch({ defaultLanguage: v })}
                options={LANG_OPTIONS.map((o) => ({ label: o.name, value: o.code }))}
              />
            </Field>
            <Field
              label="Default theme"
              hint="“Follow system” respects the visitor's OS setting. A visitor's own toggle always wins."
            >
              <Select
                id="default-theme"
                value={cfg.defaultTheme}
                onChange={(v) => patch({ defaultTheme: v })}
                options={THEME_OPTIONS}
              />
            </Field>
          </div>
        </Section>
      </div>

      <div
        className={`grid gap-6 transition-opacity lg:grid-cols-[1fr_340px] ${cfg.enabled ? '' : 'pointer-events-none opacity-50'}`}
      >
        <div className="space-y-6">
          {/* Palette */}
          <Section
            title="Colors"
            description="Light and dark palettes are stored separately, so switching theme uses the right values."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Accent — light" hint="Buttons, links and highlights in light mode.">
                <ColorInput id="accent" value={cfg.accent} onChange={(v) => patch({ accent: v })} />
              </Field>
              <Field label="Accent — dark" hint="Buttons, links and highlights in dark mode.">
                <ColorInput id="accent-dark" value={cfg.accentDark} onChange={(v) => patch({ accentDark: v })} />
              </Field>
              <Field label="Background — light">
                <ColorInput id="bg-light" value={cfg.bgLight} onChange={(v) => patch({ bgLight: v })} />
              </Field>
              <Field label="Background — dark">
                <ColorInput id="bg-dark" value={cfg.bgDark} onChange={(v) => patch({ bgDark: v })} />
              </Field>
              <Field label="Surface — light" hint="Cards and panels in light mode.">
                <ColorInput
                  id="surface-light"
                  value={cfg.surfaceLight}
                  onChange={(v) => patch({ surfaceLight: v })}
                />
              </Field>
              <Field label="Surface — dark" hint="Cards and panels in dark mode.">
                <ColorInput
                  id="surface-dark"
                  value={cfg.surfaceDark}
                  onChange={(v) => patch({ surfaceDark: v })}
                />
              </Field>
            </div>
          </Section>

          {/* Typography */}
          <Section
            title="Typography"
            description="Only fonts already loaded by the site are offered — other families would silently fall back and look broken."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Body font">
                <Select
                  id="font-body"
                  value={cfg.fontBody}
                  onChange={(v) => patch({ fontBody: v })}
                  options={FONT_OPTIONS}
                />
              </Field>
              <Field label="Heading font">
                <Select
                  id="font-display"
                  value={cfg.fontDisplay}
                  onChange={(v) => patch({ fontDisplay: v })}
                  options={FONT_OPTIONS}
                />
              </Field>
              <Field label="Code font">
                <Select
                  id="font-mono"
                  value={cfg.fontMono}
                  onChange={(v) => patch({ fontMono: v })}
                  options={FONT_OPTIONS}
                />
              </Field>
            </div>

            <Field
              label="Text size"
              hint="Scales the whole site. 1.00× is the default; stay near it for best readability."
            >
              <Slider
                value={cfg.fontScale}
                onChange={(v) => patch({ fontScale: v })}
                min={MIN_FONT_SCALE}
                max={MAX_FONT_SCALE}
                format={(v) => `${v.toFixed(2)}×`}
              />
            </Field>
          </Section>

          {/* Shape */}
          <Section
            title="Shape"
            description="Corner roundness across cards and buttons."
          >
            <Field label="Corner radius" hint="0× is square, 1× is the default, 2× is fully rounded.">
              <Slider
                value={cfg.radiusScale}
                onChange={(v) => patch({ radiusScale: v })}
                min={MIN_RADIUS_SCALE}
                max={MAX_RADIUS_SCALE}
                format={(v) => `${v.toFixed(2)}×`}
              />
            </Field>
          </Section>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-3 flex items-center justify-between">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Live preview
            </span>
            <button
              type="button"
              onClick={() => setPreviewDark((v) => !v)}
              className="rounded-full border px-3 py-1 text-[11px] font-medium transition-colors"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              {previewDark ? 'Dark' : 'Light'} ⇄
            </button>
          </div>
          <Preview cfg={{ ...cfg, _previewDark: previewDark }} />
          {!cfg.enabled && (
            <p className="mt-3 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Custom theme is off — the site is using its built-in defaults. Turn it on to publish
              these settings.
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex max-w-3xl flex-wrap items-center gap-3">
        <motion.button
          onClick={handleSave}
          disabled={saving || !isDirty}
          whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          className="rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-40"
          style={{ background: 'var(--accent)' }}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <motion.div
                animate={shouldReduceMotion ? undefined : { rotate: 360 }}
                transition={
                  shouldReduceMotion ? { duration: 0 } : { duration: 1, repeat: Infinity, ease: 'linear' }
                }
                className="h-3.5 w-3.5 rounded-full border-2 border-white/20 border-t-white/80"
              />
              Saving
            </span>
          ) : (
            'Save Preferences'
          )}
        </motion.button>

        <button
          onClick={handleReset}
          className="rounded-xl border px-4 py-2.5 text-sm font-medium transition-all"
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
            className="mt-4 flex max-w-3xl items-center gap-2 text-sm"
          >
            <div
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                message.type === 'success'
                  ? 'bg-emerald-400'
                  : message.type === 'info'
                    ? 'bg-sky-400'
                    : 'bg-red-400'
              }`}
            />
            <p
              style={{
                color:
                  message.type === 'success' ? '#10b981' : message.type === 'info' ? '#38bdf8' : '#ef4444',
              }}
            >
              {message.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
