import { useSyncExternalStore } from 'react'
import { getAdminSettings } from './supabase'
import {
  DEFAULT_APPEARANCE,
  appearanceToCssVars,
  appearanceToDarkCssVars,
  mergeSiteAppearance,
} from './appearanceDefaults'

/**
 * Applies the admin-managed appearance preferences to <html> as inline CSS
 * custom properties.
 *
 * Why a module-level store instead of a React context:
 *   * It mirrors the existing cache/subscribe pattern in usePortfolioData.js,
 *     so invalidatePortfolioCache('siteAppearance') refreshes every mounted
 *     consumer at once.
 *   * The vars must land on <html> before first paint to avoid a flash of the
 *     default theme, which a context provider cannot guarantee. A tiny inline
 *     script in index.html handles the pre-paint case from localStorage; this
 *     module then reconciles with Supabase on mount.
 *
 * The document is public-read, so this uses the anon client and never needs a
 * session. Failures are silent: a missing column or offline visitor simply
 * keeps the built-in defaults.
 */

const STORAGE_KEY = 'neural-aurora:appearance:v1'
const THEME_KEY = 'neural-aurora:theme:v1'

const supabaseConfigured =
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co'

let current = DEFAULT_APPEARANCE
let status = 'idle'
const subscribers = new Set()
let inflight = null
let lastFetchedAt = 0

const REFRESH_MS = 5 * 60 * 1000

function emit() {
  subscribers.forEach((callback) => callback())
}

function subscribe(callback) {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

function getSnapshot() {
  return current
}

function readStoredAppearance() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? mergeSiteAppearance(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function writeStoredAppearance(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
  } catch {
    /* storage unavailable — the theme simply re-fetches next load */
  }
}

/** Reads the persisted theme choice, falling back to the configured default. */
export function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* ignore */
  }
  return null
}

export function writeStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* ignore */
  }
}

/** `system` resolves via matchMedia; explicit light/dark wins. */
function resolveTheme(preference) {
  if (preference === 'light' || preference === 'dark') return preference
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'dark'
  }
}

function activeThemePreference() {
  const stored = readStoredTheme()
  if (stored) return stored
  const cfg = current
  if (cfg && cfg.defaultTheme) return cfg.defaultTheme
  return DEFAULT_APPEARANCE.defaultTheme
}

function applyTheme(theme) {
  const root = document.documentElement
  const resolved = resolveTheme(theme)
  const isDark = resolved === 'dark'
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'
}

function applyVars(cfg) {
  const root = document.documentElement
  const vars = appearanceToCssVars(cfg)
  const darkVars = appearanceToDarkCssVars(cfg)
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value)
  }
  for (const [name, value] of Object.entries(darkVars)) {
    root.style.setProperty(name, value)
  }
}

function applyLanguage(cfg) {
  if (typeof document === 'undefined') return
  const preferred = localStorage.getItem('language')
  if (preferred) return
  if (cfg.enabled && cfg.defaultLanguage) {
    const lang = cfg.defaultLanguage
    try {
      import('i18next').then((i18n) => {
        const i18nInstance = i18n.default || i18n
        if (i18nInstance && typeof i18nInstance.changeLanguage === 'function') {
          i18nInstance.changeLanguage(lang)
        }
      })
      document.documentElement.lang = lang
      const rtlLanguages = ['ar', 'he', 'fa', 'ur']
      document.documentElement.dir = rtlLanguages.includes(lang) ? 'rtl' : 'ltr'
      localStorage.setItem('language', lang)
    } catch {
      /* ignore */
    }
  }
}

/**
 * Applies everything to the DOM. Safe to call repeatedly; it is idempotent.
 * Called on module load (pre-paint) and whenever the config changes.
 */
export function applyAppearance(cfg = current) {
  if (typeof document === 'undefined') return
  const normalised = mergeSiteAppearance(cfg)

  if (!normalised.enabled) {
    // Admin disabled custom appearance: strip overrides and fall back to the
    // stylesheet defaults rather than leaving stale inline values behind.
    const root = document.documentElement
    const names = new Set([
      ...Object.keys(appearanceToCssVars(DEFAULT_APPEARANCE)),
      ...Object.keys(appearanceToDarkCssVars(DEFAULT_APPEARANCE)),
    ])
    for (const name of names) {
      root.style.removeProperty(name)
    }
    applyTheme(resolveTheme(activeThemePreference()))
    applyLanguage(normalised)
    return
  }

  applyVars(normalised)
  applyTheme(resolveTheme(activeThemePreference()))
  applyLanguage(normalised)
}

/** Toggle used by the public theme switch: persists the visitor's choice. */
export function setTheme(theme) {
  writeStoredTheme(theme)
  applyAppearance(current)
  emit()
}

/** Adopts a new config document (from admin save or a fresh fetch). */
export function setAppearance(raw, { persist = true } = {}) {
  current = mergeSiteAppearance(raw)
  status = 'success'
  lastFetchedAt = Date.now()
  if (persist) writeStoredAppearance(current)
  applyAppearance(current)
  emit()
}

export function getAppearance() {
  return current
}

/**
 * Fetches from Supabase at most once per REFRESH_MS, deduping concurrent
 * callers. Returns the normalized config; never throws.
 */
export async function refreshAppearance({ force = false } = {}) {
  if (!supabaseConfigured) return current
  if (inflight) return inflight
  if (!force && status === 'success' && Date.now() - lastFetchedAt < REFRESH_MS) {
    return current
  }

  inflight = (async () => {
    try {
      const settings = await getAdminSettings()
      if (settings && 'appearance' in settings) {
        setAppearance(settings.appearance || {})
      } else {
        // Column missing (migration not yet applied): keep current defaults.
        status = 'success'
        lastFetchedAt = Date.now()
      }
    } catch {
      status = 'error'
    } finally {
      inflight = null
    }
    return current
  })()

  return inflight
}

// ---------------------------------------------------------------------------
// Bootstrap: apply the cached config synchronously, then reconcile.
// ---------------------------------------------------------------------------

if (typeof document !== 'undefined') {
  const stored = readStoredAppearance()
  if (stored) current = stored
  applyAppearance(current)

  // React to OS theme changes while the preference is "follow system".
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!readStoredTheme() && current.defaultTheme === 'system') applyAppearance(current)
    })
  } catch {
    /* older browsers: no live OS-theme reaction, still correct on load */
  }

  refreshAppearance()
}

/**
 * Subscribes a component to the appearance config. Returns the normalized
 * config; re-renders when an admin save calls refreshAppearance or
 * invalidatePortfolioCache('siteAppearance').
 */
export function useSiteAppearance() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
