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
  MIN_BLUR,
  MAX_BLUR,
  MIN_GRADIENT_ANGLE,
  MAX_GRADIENT_ANGLE,
  mergeSiteAppearance,
} from '../../lib/appearanceDefaults'
import { applyAppearance, getAppearance, setAppearance } from '../../lib/useSiteAppearance'

const inputStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
}

const PRESETS = [
  {
    id: 'aurora',
    name: 'Aurora',
    desc: 'Cyan/Purple/Gold gradient',
    cfg: {
      accent: '#00f0ff',
      accentDark: '#00f0ff',
      gradientEnabled: true,
      gradientStart: '#00f0ff',
      gradientMiddle: '#b829dd',
      gradientEnd: '#f0c040',
      gradientAngle: 135,
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    desc: 'Deep violet glow',
    cfg: {
      accent: '#8b5cf6',
      accentDark: '#a78bfa',
      bgDark: '#040410',
      surfaceDark: '#0b0b1a',
      gradientEnabled: true,
      gradientStart: '#8b5cf6',
      gradientMiddle: '#06b6d4',
      gradientEnd: '#22d3ee',
      gradientAngle: 120,
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    desc: 'Cool cyan tones',
    cfg: {
      accent: '#06b6d4',
      accentDark: '#22d3ee',
      gradientEnabled: true,
      gradientStart: '#06b6d4',
      gradientMiddle: '#3b82f6',
      gradientEnd: '#6366f1',
      gradientAngle: 130,
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    desc: 'Warm orange glow',
    cfg: {
      accent: '#f59e0b',
      accentDark: '#fbbf24',
      gradientEnabled: true,
      gradientStart: '#f59e0b',
      gradientMiddle: '#ef4444',
      gradientEnd: '#ec4899',
      gradientAngle: 135,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    desc: 'Clean monochrome',
    cfg: {
      accent: '#1d1d1f',
      accentDark: '#f1f1f5',
      gradientEnabled: false,
      radiusScale: 0.8,
    },
  },
]

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-7 w-56 rounded-lg bg-white/[0.05]" />
      <div className="h-4 w-80 rounded-lg bg-white/[0.03]" />
      <div className="h-64 rounded-xl border border-white/[0.04] bg-white/[0.02]" />
    </div>
  )
}

function Section({ title, description, children, headerAction }) {
  return (
    <div
      className="max-w-4xl space-y-5 rounded-2xl border p-5 md:p-7 backdrop-blur-sm"
      style={{
        borderColor: 'var(--border-color)',
        background: 'linear-gradient(180deg, var(--card-bg) 0%, color-mix(in srgb, var(--card-bg) 95%, transparent) 100%)',
        boxShadow: '0 1px 1px rgba(255,255,255,0.02), 0 20px 40px -20px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
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
        {headerAction}
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-2">
      <label
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]"
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
    <div className="flex items-center gap-2.5">
      <div className="relative">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-lg border p-0.5"
          style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="w-28 rounded-lg border px-3 py-2 font-mono text-[11px] uppercase outline-none transition-all focus:ring-1"
        style={inputStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.boxShadow = '0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)'
          e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04)'
        }}
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
      className="w-full max-w-xs rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all focus:ring-1"
      style={inputStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.boxShadow = '0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent)'
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-color)'
        e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04)'
      }}
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
        className="h-1.5 w-full max-w-sm cursor-pointer appearance-none rounded-full"
        style={{
          background: `linear-gradient(to right, var(--accent) ${( (value - min) / (max - min) ) * 100}%, var(--hover-bg) ${( (value - min) / (max - min) ) * 100}%)`,
        }}
      />
      <span
        className="w-16 shrink-0 text-right text-xs tabular-nums"
        style={{ color: 'var(--text-secondary)' }}
      >
        {format ? format(value) : value}
      </span>
    </div>
  )
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-all hover:translate-y-[-1px]"
      style={{
        borderColor: checked ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : 'var(--border-color)',
        background: checked ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'transparent',
      }}
    >
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            {description}
          </p>
        )}
      </div>
      <span
        className="relative h-5 w-9 rounded-full transition-colors"
        style={{ background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.15)' }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all"
          style={{ left: checked ? '18px' : '2px' }}
        />
      </span>
    </button>
  )
}

function Preview({ cfg }) {
  const isDark = cfg._previewDark
  const bg = isDark ? cfg.bgDark : cfg.bgLight
  const surface = isDark ? cfg.surfaceDark : cfg.surfaceLight
  const accent = isDark ? cfg.accentDark : cfg.accent
  const text = isDark ? (cfg.textPrimaryDark ?? '#f1f1f5') : (cfg.textPrimaryLight ?? '#1d1d1f')
  const subtle = isDark ? (cfg.textSecondaryDark ?? 'rgba(241,241,245,0.72)') : (cfg.textSecondaryLight ?? '#52525b')
  const tertiary = isDark ? (cfg.textTertiaryDark ?? 'rgba(241,241,245,0.55)') : (cfg.textTertiaryLight ?? '#6b6b76')
  const border = isDark ? (cfg.borderDark ?? 'rgba(255,255,255,0.08)') : (cfg.borderLight ?? 'rgba(0,0,0,0.06)')
  const bodyStack = FONT_OPTIONS.find((f) => f.value === cfg.fontBody)?.stack
  const displayStack = FONT_OPTIONS.find((f) => f.value === cfg.fontDisplay)?.stack
  const radius = Math.round(16 * cfg.radiusScale)
  const blur = cfg.blurStrength ?? 20
  const glassBg = `rgba(${isDark ? '255,255,255' : '255,255,255'}, ${isDark ? (cfg.glassOpacityDark ?? 0.03) : (cfg.glassOpacityLight ?? 0.8)})`
  const gradientStyle = cfg.gradientEnabled
    ? {
        background: `linear-gradient(${cfg.gradientAngle ?? 135}deg, ${cfg.gradientStart}, ${cfg.gradientMiddle}, ${cfg.gradientEnd})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }
    : {}

  return (
    <div
      className="overflow-hidden border transition-all duration-500"
      style={{
        background: bg,
        borderColor: border,
        borderRadius: radius,
        color: text,
        fontFamily: bodyStack,
        boxShadow: isDark ? '0 60px 120px -80px rgba(0,240,255,0.25)' : '0 60px 120px -80px rgba(0,0,0,0.25)',
      }}
    >
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: border }}>
        <span style={{ fontFamily: displayStack, fontWeight: 700, fontSize: 15, ...gradientStyle }}>
          Neural Aurora
        </span>
        <span
          className="px-3 py-1 text-[11px] font-medium"
          style={{ background: accent, color: isDark ? '#050508' : '#ffffff', borderRadius: radius / 2 }}
        >
          Accent
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div
          className="border p-4 transition-all"
          style={{
            background: surface,
            borderColor: border,
            borderRadius: radius,
            backdropFilter: `blur(${blur}px)`,
            WebkitBackdropFilter: `blur(${blur}px)`,
          }}
        >
          <p style={{ fontFamily: displayStack, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
            Sample heading
          </p>
          <p style={{ color: subtle, fontSize: 12, lineHeight: 1.7 }}>
            Body text preview with your typography, spacing and colors applied.
          </p>
          <p style={{ color: tertiary, fontSize: 11, marginTop: 6 }}>Tertiary text sample</p>
        </div>
        <div
          className="flex items-center justify-between gap-3 border px-3 py-2"
          style={{
            background: glassBg,
            borderColor: border,
            borderRadius: radius,
            backdropFilter: `blur(${blur}px)`,
            WebkitBackdropFilter: `blur(${blur}px)`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="h-6 w-6" style={{ background: accent, borderRadius: radius / 2 }} />
            <span className="h-6 w-6" style={{ background: text, borderRadius: radius / 2 }} />
            <span className="h-6 w-6" style={{ background: subtle, borderRadius: radius / 2 }} />
            <span className="h-6 w-6 border" style={{ background: surface, borderColor: border, borderRadius: radius / 2 }} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: tertiary }}>
            Glass
          </span>
        </div>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'effects', label: 'Effects & Gradient' },
  { id: 'shape', label: 'Shape' },
]

export default function AdminAppearance() {
  const [cfg, setCfg] = useState(() => mergeSiteAppearance(null))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [previewDark, setPreviewDark] = useState(true)
  const [activeTab, setActiveTab] = useState('general')
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const settings = await getAdminSettings()
      const doc = settings?.appearance
      const hasSavedDoc =
        doc && typeof doc === 'object' && !Array.isArray(doc) && Object.keys(doc).length > 0
      // admin_settings.appearance defaults to '{}'. Treating that as "defaults"
      // would preview (and then persist on unmount) the built-in palette over
      // the one the site is actually showing. Start from whatever is live.
      setCfg(mergeSiteAppearance(hasSavedDoc ? doc : getAppearance()))
    } catch {
      setCfg(mergeSiteAppearance(getAppearance()))
    }
    setLoading(false)
  }

  const patch = (partial) => setCfg((current) => ({ ...current, ...partial }))

  useEffect(() => {
    if (loading) return
    applyAppearance(cfg)
    return () => {
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
      setAppearance(payload)
      invalidatePortfolioCache('siteAppearance')
      setMessage({ type: 'success', text: 'Preferences saved. Live site updated instantly.' })
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to save: ${err.message || err}` })
    }
    setSaving(false)
  }

  function handleReset() {
    setCfg(mergeSiteAppearance(DEFAULT_APPEARANCE))
    setMessage({ type: 'info', text: 'Defaults restored in the form — press Save to apply them.' })
  }

  function applyPreset(preset) {
    patch(preset.cfg)
    setMessage({ type: 'info', text: `${preset.name} preset applied. Tweak and save to publish.` })
  }

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Site Preferences
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Loading advanced appearance settings
          </p>
        </div>
        <div className="max-w-4xl" style={{ color: 'var(--text-tertiary)' }}>
          <Skeleton />
        </div>
      </div>
    )
  }

  const spring = shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 80, damping: 18 }

  return (
    <motion.div initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Site Preferences
            </h1>
            <span
              className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{
                borderColor: cfg.enabled ? 'rgba(16,185,129,0.4)' : 'var(--border-color)',
                color: cfg.enabled ? '#10b981' : 'var(--text-tertiary)',
                background: cfg.enabled ? 'rgba(16,185,129,0.08)' : 'transparent',
              }}
            >
              {cfg.enabled ? 'Custom theme enabled' : 'Using original theme'}
            </span>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Advanced theming: colors, typography, gradients, glass, blur and more. Live preview before publishing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => patch({ enabled: !cfg.enabled })}
          className="flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs font-semibold transition-all hover:scale-[1.02]"
          style={{
            borderColor: cfg.enabled ? 'rgba(16,185,129,0.4)' : 'var(--border-color)',
            background: cfg.enabled ? 'linear-gradient(90deg, rgba(16,185,129,0.12) 0%, transparent 100%)' : 'var(--hover-bg)',
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
          {cfg.enabled ? 'Disable custom theme' : 'Enable custom theme'}
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="rounded-full px-4 py-1.5 text-xs font-medium transition-all"
            style={{
              background: activeTab === tab.id ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
              border: `1px solid ${activeTab === tab.id ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : 'var(--border-color)'}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <Section
                title="Defaults"
                description="Applied to visitors who haven't chosen their own language or theme yet. Visitor preferences always override."
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
                    hint="Follow system respects OS preference. Manual toggle overrides this."
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

              <Section
                title="Custom theme control"
                description="When disabled, the entire site uses original built-in styles regardless of values below."
              >
                <Toggle
                  checked={cfg.enabled}
                  onChange={(v) => patch({ enabled: v })}
                  label="Enable site-wide custom theme"
                  description="Applies all color, font, effect and shape overrides to public pages."
                />
              </Section>

              <Section
                title="Quick presets"
                description="Curated best combinations. Apply, fine-tune, and save when ready."
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      className="group relative overflow-hidden rounded-xl border p-4 text-left transition-all hover:translate-y-[-2px]"
                      style={{ borderColor: 'var(--border-color)', background: 'transparent' }}
                    >
                      <div
                        className="absolute inset-x-0 top-0 h-1"
                        style={{
                          background: preset.cfg.gradientEnabled
                            ? `linear-gradient(90deg, ${preset.cfg.gradientStart}, ${preset.cfg.gradientMiddle}, ${preset.cfg.gradientEnd})`
                            : preset.cfg.accent,
                        }}
                      />
                      <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {preset.name}
                      </p>
                      <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {preset.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {activeTab === 'colors' && (
            <div
              className={`space-y-6 transition-opacity ${cfg.enabled ? '' : 'pointer-events-none opacity-40'}`}
            >
              <Section title="Accent colors" description="Used for buttons, links, highlights and interactive elements.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Accent — light">
                    <ColorInput id="accent" value={cfg.accent} onChange={(v) => patch({ accent: v })} />
                  </Field>
                  <Field label="Accent — dark">
                    <ColorInput id="accent-dark" value={cfg.accentDark} onChange={(v) => patch({ accentDark: v })} />
                  </Field>
                </div>
              </Section>

              <Section title="Backgrounds" description="Page backgrounds for light and dark modes.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Background — light">
                    <ColorInput id="bg-light" value={cfg.bgLight} onChange={(v) => patch({ bgLight: v })} />
                  </Field>
                  <Field label="Background — dark">
                    <ColorInput id="bg-dark" value={cfg.bgDark} onChange={(v) => patch({ bgDark: v })} />
                  </Field>
                </div>
              </Section>

              <Section title="Surfaces & Cards" description="Panels, cards and elevated surfaces.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Surface — light">
                    <ColorInput id="surface-light" value={cfg.surfaceLight} onChange={(v) => patch({ surfaceLight: v })} />
                  </Field>
                  <Field label="Surface — dark">
                    <ColorInput id="surface-dark" value={cfg.surfaceDark} onChange={(v) => patch({ surfaceDark: v })} />
                  </Field>
                </div>
              </Section>

              <Section title="Text colors" description="Fine-tune readability per mode.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Primary text — light">
                    <ColorInput id="text-primary-light" value={cfg.textPrimaryLight} onChange={(v) => patch({ textPrimaryLight: v })} />
                  </Field>
                  <Field label="Primary text — dark">
                    <ColorInput id="text-primary-dark" value={cfg.textPrimaryDark} onChange={(v) => patch({ textPrimaryDark: v })} />
                  </Field>
                  <Field label="Secondary text — light">
                    <ColorInput id="text-secondary-light" value={cfg.textSecondaryLight} onChange={(v) => patch({ textSecondaryLight: v })} />
                  </Field>
                  <Field label="Secondary text — dark">
                    <ColorInput id="text-secondary-dark" value={cfg.textSecondaryDark} onChange={(v) => patch({ textSecondaryDark: v })} />
                  </Field>
                  <Field label="Tertiary text — light">
                    <ColorInput id="text-tertiary-light" value={cfg.textTertiaryLight} onChange={(v) => patch({ textTertiaryLight: v })} />
                  </Field>
                  <Field label="Tertiary text — dark">
                    <ColorInput id="text-tertiary-dark" value={cfg.textTertiaryDark} onChange={(v) => patch({ textTertiaryDark: v })} />
                  </Field>
                </div>
              </Section>

              <Section title="Borders" description="Dividers, inputs and outlines.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Border — light">
                    <ColorInput id="border-light" value={cfg.borderLight} onChange={(v) => patch({ borderLight: v })} />
                  </Field>
                  <Field label="Border — dark">
                    <ColorInput id="border-dark" value={cfg.borderDark} onChange={(v) => patch({ borderDark: v })} />
                  </Field>
                </div>
              </Section>
            </div>
          )}

          {activeTab === 'typography' && (
            <div
              className={`space-y-6 transition-opacity ${cfg.enabled ? '' : 'pointer-events-none opacity-40'}`}
            >
              <Section title="Font families" description="Only fonts loaded by the site are available.">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Body font">
                    <Select id="font-body" value={cfg.fontBody} onChange={(v) => patch({ fontBody: v })} options={FONT_OPTIONS} />
                  </Field>
                  <Field label="Heading font">
                    <Select id="font-display" value={cfg.fontDisplay} onChange={(v) => patch({ fontDisplay: v })} options={FONT_OPTIONS} />
                  </Field>
                  <Field label="Code font">
                    <Select id="font-mono" value={cfg.fontMono} onChange={(v) => patch({ fontMono: v })} options={FONT_OPTIONS} />
                  </Field>
                </div>
              </Section>

              <Section title="Scale" description="Global text scaling for better readability across devices.">
                <Field label="Text size" hint="1.00× is default. Keep between 0.95× and 1.10× for best results.">
                  <Slider
                    value={cfg.fontScale}
                    onChange={(v) => patch({ fontScale: v })}
                    min={MIN_FONT_SCALE}
                    max={MAX_FONT_SCALE}
                    format={(v) => `${v.toFixed(2)}×`}
                  />
                </Field>
              </Section>
            </div>
          )}

          {activeTab === 'effects' && (
            <div
              className={`space-y-6 transition-opacity ${cfg.enabled ? '' : 'pointer-events-none opacity-40'}`}
            >
              <Section title="Glass & transparency" description="Control backdrop blur and glass panel opacity.">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Blur strength" hint="Higher values create stronger frosted glass.">
                    <Slider
                      value={cfg.blurStrength ?? 20}
                      onChange={(v) => patch({ blurStrength: v })}
                      min={MIN_BLUR}
                      max={MAX_BLUR}
                      step={1}
                      format={(v) => `${v}px`}
                    />
                  </Field>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Glass opacity — light">
                    <Slider
                      value={cfg.glassOpacityLight ?? 0.8}
                      onChange={(v) => patch({ glassOpacityLight: v })}
                      min={0}
                      max={1}
                      step={0.01}
                      format={(v) => `${Math.round(v * 100)}%`}
                    />
                  </Field>
                  <Field label="Glass opacity — dark">
                    <Slider
                      value={cfg.glassOpacityDark ?? 0.03}
                      onChange={(v) => patch({ glassOpacityDark: v })}
                      min={0}
                      max={0.2}
                      step={0.01}
                      format={(v) => `${Math.round(v * 100)}%`}
                    />
                  </Field>
                </div>
              </Section>

              <Section
                title="Gradient text & accents"
                description="Apply a vibrant gradient to headings/logos for a premium look."
                headerAction={
                  <Toggle
                    checked={cfg.gradientEnabled}
                    onChange={(v) => patch({ gradientEnabled: v })}
                    label=""
                    description=""
                  />
                }
              >
                <div className={cfg.gradientEnabled ? '' : 'pointer-events-none opacity-40'}>
                  <div className="grid gap-5 sm:grid-cols-3">
                    <Field label="Start color">
                      <ColorInput id="grad-start" value={cfg.gradientStart} onChange={(v) => patch({ gradientStart: v })} />
                    </Field>
                    <Field label="Middle color">
                      <ColorInput id="grad-mid" value={cfg.gradientMiddle} onChange={(v) => patch({ gradientMiddle: v })} />
                    </Field>
                    <Field label="End color">
                      <ColorInput id="grad-end" value={cfg.gradientEnd} onChange={(v) => patch({ gradientEnd: v })} />
                    </Field>
                  </div>
                  <div className="mt-5">
                    <Field label="Gradient angle" hint="Control the direction of the gradient.">
                      <Slider
                        value={cfg.gradientAngle ?? 135}
                        onChange={(v) => patch({ gradientAngle: v })}
                        min={MIN_GRADIENT_ANGLE}
                        max={MAX_GRADIENT_ANGLE}
                        step={1}
                        format={(v) => `${v}°`}
                      />
                    </Field>
                  </div>
                  <div
                    className="mt-4 h-2 rounded-full"
                    style={{
                      background: `linear-gradient(${cfg.gradientAngle ?? 135}deg, ${cfg.gradientStart}, ${cfg.gradientMiddle}, ${cfg.gradientEnd})`,
                    }}
                  />
                </div>
              </Section>
            </div>
          )}

          {activeTab === 'shape' && (
            <div
              className={`space-y-6 transition-opacity ${cfg.enabled ? '' : 'pointer-events-none opacity-40'}`}
            >
              <Section title="Corner radius" description="Control rounding for cards, buttons and inputs site-wide.">
                <Field label="Global radius" hint="0× = sharp, 1× = default, 2× = fully rounded.">
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
          )}
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-tertiary)' }}>
              Live preview
            </span>
            <button
              type="button"
              onClick={() => setPreviewDark((v) => !v)}
              className="rounded-full border px-3 py-1 text-[11px] font-medium transition-all hover:scale-[1.02]"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              {previewDark ? 'Dark mode' : 'Light mode'} ⇄
            </button>
          </div>
          <Preview cfg={{ ...cfg, _previewDark: previewDark }} />
          {!cfg.enabled && (
            <div
              className="mt-3 rounded-xl border p-3 text-[11px]"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)', background: 'transparent' }}
            >
              Custom theme is off. Enable it to publish colors, fonts, effects and gradients.
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-4 mt-8">
        <div
          className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 backdrop-blur-xl"
          style={{
            borderColor: 'var(--border-color)',
            background: 'color-mix(in srgb, var(--card-bg) 90%, transparent)',
            boxShadow: '0 40px 80px -60px rgba(0,0,0,0.8)',
          }}
        >
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span className={`h-1.5 w-1.5 rounded-full ${isDirty ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            {isDirty ? 'Unsaved changes' : 'All changes saved'}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleReset}
              className="rounded-xl border px-4 py-2 text-sm font-medium transition-all hover:translate-y-[-1px]"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }}
            >
              Reset to defaults
            </button>
            <motion.button
              onClick={handleSave}
              disabled={saving || !isDirty}
              whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              className="rounded-xl px-5 py-2 text-sm font-medium text-white transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(90deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 70%, #ffffff) 100%)' }}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={shouldReduceMotion ? undefined : { rotate: 360 }}
                    transition={shouldReduceMotion ? { duration: 0 } : { duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="h-3.5 w-3.5 rounded-full border-2 border-white/20 border-t-white/80"
                  />
                  Saving
                </span>
              ) : (
                'Save Preferences'
              )}
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
            className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2"
          >
            <div
              className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur-xl"
              style={{
                borderColor: 'var(--border-color)',
                background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
                color:
                  message.type === 'success'
                    ? '#10b981'
                    : message.type === 'info'
                      ? '#38bdf8'
                      : '#ef4444',
              }}
            >
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  message.type === 'success' ? 'bg-emerald-400' : message.type === 'info' ? 'bg-sky-400' : 'bg-red-400'
                }`}
              />
              {message.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
