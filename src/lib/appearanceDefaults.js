/**
 * Defaults for the admin-managed site appearance preferences.
 *
 * The saved document lives in admin_settings.appearance as JSONB so new
 * controls can ship without further migrations. Every key is optional and
 * mergeSiteAppearance() fills in whatever is missing, so a partial or empty
 * document never breaks the theme.
 *
 * Only the three fonts already loaded by index.html are offered — picking a
 * family the page never requested would silently fall back to the system
 * font, which looks broken rather than custom.
 */

export const FONT_OPTIONS = [
  { label: 'Satoshi', value: 'Satoshi', stack: "'Satoshi', system-ui, sans-serif" },
  { label: 'Cabinet Grotesk', value: 'Cabinet Grotesk', stack: "'Cabinet Grotesk', 'Satoshi', sans-serif" },
  { label: 'JetBrains Mono', value: 'JetBrains Mono', stack: "'JetBrains Mono', monospace" },
  { label: 'System UI', value: 'system-ui', stack: 'system-ui, -apple-system, Segoe UI, sans-serif' },
  { label: 'Georgia (serif)', value: 'Georgia', stack: "Georgia, 'Times New Roman', serif" },
]

export const THEME_OPTIONS = [
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
  { label: 'Follow system', value: 'system' },
]

export const DEFAULT_APPEARANCE = {
  enabled: false,
  defaultTheme: 'dark',
  defaultLanguage: 'en',
  accent: '#3a3a5c',
  accentDark: '#52527a',
  bgLight: '#faf8f5',
  bgDark: '#050508',
  surfaceLight: '#ffffff',
  surfaceDark: '#0a0a12',
  fontBody: 'Satoshi',
  fontDisplay: 'Cabinet Grotesk',
  fontMono: 'JetBrains Mono',
  fontScale: 1,
  radiusScale: 1,
}

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const FONT_VALUES = new Set(FONT_OPTIONS.map((option) => option.value))
const THEME_VALUES = new Set(THEME_OPTIONS.map((option) => option.value))
const LANG_VALUES = new Set(['en','es','hi','zh','ar','fr','de','pt','ru','ja','ko','it','tr','id','nl','vi','pl','th','he','uk','bn','ur','fa','sv'])

export const LANG_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'zh', name: '中文' },
  { code: 'ar', name: 'العربية' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'it', name: 'Italiano' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'pl', name: 'Polski' },
  { code: 'th', name: 'ไทย' },
  { code: 'he', name: 'עברית' },
  { code: 'uk', name: 'Українська' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'ur', name: 'اردو' },
  { code: 'fa', name: 'فارسی' },
  { code: 'sv', name: 'Svenska' },
]

export const MIN_FONT_SCALE = 0.85
export const MAX_FONT_SCALE = 1.25
export const MIN_RADIUS_SCALE = 0
export const MAX_RADIUS_SCALE = 2

/** A hex string or null — anything else (XSS attempts, garbage) is rejected. */
export function sanitiseColor(value, fallback) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return HEX_COLOR.test(trimmed) ? trimmed : fallback
}

function clampScale(value, min, max, fallback) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, Number(num.toFixed(2))))
}

/**
 * Normalizes whatever is stored in admin_settings.appearance into a complete,
 * render-safe config. Unknown font names and malformed colors fall back to the
 * built-in defaults rather than reaching the DOM.
 */
export function mergeSiteAppearance(raw) {
  const cfg = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}

  const fontBody = FONT_VALUES.has(cfg.fontBody) ? cfg.fontBody : DEFAULT_APPEARANCE.fontBody
  const fontDisplay = FONT_VALUES.has(cfg.fontDisplay)
    ? cfg.fontDisplay
    : DEFAULT_APPEARANCE.fontDisplay
  const fontMono = FONT_VALUES.has(cfg.fontMono) ? cfg.fontMono : DEFAULT_APPEARANCE.fontMono

  return {
    enabled: cfg.enabled === true,
    defaultTheme: THEME_VALUES.has(cfg.defaultTheme)
      ? cfg.defaultTheme
      : DEFAULT_APPEARANCE.defaultTheme,
    defaultLanguage: LANG_VALUES.has(cfg.defaultLanguage) ? cfg.defaultLanguage : DEFAULT_APPEARANCE.defaultLanguage,
    accent: sanitiseColor(cfg.accent, DEFAULT_APPEARANCE.accent),
    accentDark: sanitiseColor(cfg.accentDark, DEFAULT_APPEARANCE.accentDark),
    bgLight: sanitiseColor(cfg.bgLight, DEFAULT_APPEARANCE.bgLight),
    bgDark: sanitiseColor(cfg.bgDark, DEFAULT_APPEARANCE.bgDark),
    surfaceLight: sanitiseColor(cfg.surfaceLight, DEFAULT_APPEARANCE.surfaceLight),
    surfaceDark: sanitiseColor(cfg.surfaceDark, DEFAULT_APPEARANCE.surfaceDark),
    fontBody,
    fontDisplay,
    fontMono,
    fontScale: clampScale(cfg.fontScale, MIN_FONT_SCALE, MAX_FONT_SCALE, DEFAULT_APPEARANCE.fontScale),
    radiusScale: clampScale(
      cfg.radiusScale,
      MIN_RADIUS_SCALE,
      MAX_RADIUS_SCALE,
      DEFAULT_APPEARANCE.radiusScale
    ),
  }
}

/** Resolves a font value to a full CSS font-family stack. */
export function fontStack(value, fallbackValue) {
  const found = FONT_OPTIONS.find((option) => option.value === value)
  if (found) return found.stack
  const fallback = FONT_OPTIONS.find((option) => option.value === fallbackValue)
  return fallback ? fallback.stack : FONT_OPTIONS[0].stack
}

/**
 * Turns a normalized config into the CSS custom properties applied to <html>.
 * Kept in one place so the admin preview and the live site always agree.
 */
export function appearanceToCssVars(cfg) {
  const scaled = Math.max(12, Math.round(16 * cfg.fontScale))
  return {
    '--accent': cfg.accent,
    '--accent-glow': cfg.accent,
    '--bg-primary': cfg.bgLight,
    '--bg-secondary': cfg.surfaceLight,
    '--card-bg': cfg.surfaceLight,
    '--font-body': fontStack(cfg.fontBody, DEFAULT_APPEARANCE.fontBody),
    '--font-display': fontStack(cfg.fontDisplay, DEFAULT_APPEARANCE.fontDisplay),
    '--font-mono': fontStack(cfg.fontMono, DEFAULT_APPEARANCE.fontMono),
    '--app-font-scale': String(cfg.fontScale),
    '--app-font-size': `${scaled}px`,
    '--app-radius-scale': String(cfg.radiusScale),
  }
}

/** Dark-mode overrides. The `.dark` rule in index.css reads these. */
export function appearanceToDarkCssVars(cfg) {
  return {
    '--accent-dark': cfg.accentDark,
    '--bg-dark': cfg.bgDark,
    '--bg-dark-secondary': cfg.surfaceDark,
  }
}
