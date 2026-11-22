import { useEffect, useId, useMemo, useRef, useState } from 'react'
import * as LucideIcons from 'lucide-react'
import {
  EMOJI_ICON_OPTIONS,
  ICON_ALIASES,
  LUCIDE_ICON_OPTIONS,
  normalizeIconOptions,
} from '../../lib/iconCatalog'

const EMOJI_LIKE = /[\p{Extended_Pictographic}\p{So}\u{1F1E6}-\u{1F1FF}]/u

function findOption(options, value) {
  if (!value) return null
  return options.find((option) => option.value === value) || null
}

function isTextGlyph(value) {
  return typeof value === 'string' && (EMOJI_LIKE.test(value) || value.length <= 3)
}

/** Renders a stored icon string without changing it. */
export function IconGlyph({ value, options = LUCIDE_ICON_OPTIONS, className = 'w-4 h-4' }) {
  const normalized = useMemo(() => normalizeIconOptions(options), [options])
  const glyph = findOption(normalized, value)?.glyph || ICON_ALIASES[value]

  if (glyph) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex items-center justify-center leading-none ${className}`}
        title={value || undefined}
      >
        {glyph}
      </span>
    )
  }

  if (isTextGlyph(value)) {
    return <span aria-hidden="true" className={`inline-flex items-center justify-center leading-none ${className}`}>{value}</span>
  }

  const Icon = LucideIcons[value]
  if (Icon) return <Icon aria-hidden="true" className={className} />

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded border border-dashed text-[10px] leading-none ${className}`}
      style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}
      title={`Unknown icon: ${value || 'empty'}`}
    >
      ?
    </span>
  )
}

/**
 * Searchable icon + emoji picker for admin forms.
 *
 * The picker never rewrites a value: custom strings can be typed and stored as
 * entered, so existing rows and any provider-specific icon name stay valid.
 */
export default function IconPicker({
  value = '',
  onChange,
  options = LUCIDE_ICON_OPTIONS,
  label = 'Icon',
  compact = false,
  allowCustom = true,
  disabled = false,
  id,
}) {
  const generatedId = useId()
  const controlId = id || generatedId
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const searchRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('icons')
  const [query, setQuery] = useState('')
  const [custom, setCustom] = useState(value || '')
  const [coords, setCoords] = useState(null)

  const iconOptions = useMemo(() => normalizeIconOptions(options), [options])
  const activeOptions = tab === 'emoji' ? EMOJI_ICON_OPTIONS : iconOptions
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return activeOptions
    return activeOptions.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(needle)
    )
  }, [activeOptions, query])

  useEffect(() => {
    if (!open) return undefined

    setCustom(value || '')
    setQuery('')
    const focusFrame = requestAnimationFrame(() => searchRef.current?.focus())
    return () => cancelAnimationFrame(focusFrame)
  }, [open, value])

  useEffect(() => {
    if (!open) return undefined

    function measure() {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(compact ? 288 : 340, window.innerWidth - 24)
      const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12))
      const below = window.innerHeight - rect.bottom
      const panelHeight = 330
      const top = below >= panelHeight + 16
        ? rect.bottom + 8
        : Math.max(12, rect.top - panelHeight - 8)
      setCoords({ left, top, width })
    }

    function handlePointerDown(event) {
      if (panelRef.current?.contains(event.target)) return
      if (triggerRef.current?.contains(event.target)) return
      setOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [compact, open])

  function choose(nextValue) {
    onChange(nextValue)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function applyCustom() {
    const nextValue = custom.trim()
    if (nextValue) choose(nextValue)
  }

  function handleTriggerKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }
  }

  return (
    <div className="relative min-w-0" data-icon-picker>
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        disabled={disabled}
        aria-label={`${label}: ${value || 'none'}. Choose an icon or emoji`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        className={`flex w-full items-center gap-2 rounded border text-left outline-none transition-colors ${
          compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'
        } disabled:cursor-not-allowed disabled:opacity-50`}
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--input-bg)',
          color: 'var(--text-primary)',
        }}
      >
        <IconGlyph value={value} options={iconOptions} className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span className="min-w-0 flex-1 truncate font-mono">{value || 'Choose…'}</span>
        <LucideIcons.ChevronDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0 opacity-50" />
      </button>

      {open && coords && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`Choose ${label.toLowerCase()}`}
          className="fixed z-[100] overflow-hidden rounded-xl border shadow-2xl"
          style={{
            left: coords.left,
            top: coords.top,
            width: coords.width,
            borderColor: 'var(--border-color)',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
          }}
        >
          <div className="space-y-2 border-b p-2.5" style={{ borderColor: 'var(--border-color)' }}>
            <div className="relative">
              <LucideIcons.Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 w-3.5 h-3.5 -translate-y-1/2 opacity-50"
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search icons…"
                aria-label="Search icons"
                className="w-full rounded-lg border py-2 pl-8 pr-2 text-xs outline-none"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div className="flex gap-1" role="tablist" aria-label="Icon type">
              {[
                ['icons', 'Icons'],
                ['emoji', 'Emoji'],
              ].map(([key, text]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors"
                  style={{
                    background: tab === key ? 'var(--accent)' : 'var(--hover-bg)',
                    color: tab === key ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          <div className="grid max-h-52 grid-cols-5 gap-1 overflow-y-auto p-2" role="listbox" aria-label="Available icons">
            {filtered.map((option) => (
              <button
                key={`${tab}-${option.value}`}
                type="button"
                role="option"
                aria-selected={value === option.value}
                title={option.label}
                onClick={() => choose(option.value)}
                className="flex h-10 flex-col items-center justify-center gap-0.5 rounded-lg border text-[9px] transition-colors hover:border-[var(--accent)]"
                style={{
                  borderColor: value === option.value ? 'var(--accent)' : 'transparent',
                  background: value === option.value ? 'var(--hover-bg)' : 'transparent',
                  color: 'var(--text-secondary)',
                }}
              >
                <span className="flex h-4 items-center justify-center text-sm">
                  <IconGlyph value={option.value} options={tab === 'icons' ? iconOptions : EMOJI_ICON_OPTIONS} className="w-4 h-4" />
                </span>
                <span className="w-full truncate px-0.5 text-center">{option.label}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-5 py-4 text-center text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                No matches. Use a custom value below.
              </p>
            )}
          </div>

          {allowCustom && (
            <div className="flex gap-1.5 border-t p-2" style={{ borderColor: 'var(--border-color)' }}>
              <input
                type="text"
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    applyCustom()
                  }
                }}
                placeholder="Custom icon name or emoji"
                aria-label="Custom icon name or emoji"
                className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-[11px] outline-none"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                onClick={applyCustom}
                disabled={!custom.trim()}
                className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white transition-opacity disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                Use
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
