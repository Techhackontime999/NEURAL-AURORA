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
  surfaceLight: '#ffffff',
  surfaceDark: '#0a0a12',
  textPrimaryLight: '#1d1d1f',
  textSecondaryLight: '#52525b',
  textTertiaryLight: '#6b6b76',
  textPrimaryDark: '#f1f1f5',
  textSecondaryDark: 'rgba(241, 241, 245, 0.72)',
  textTertiaryDark: 'rgba(241, 241, 245, 0.55)',
  borderLight: 'rgba(0,0,0,0.06)',
  borderDark: 'rgba(255,255,255,0.06)',
  glassOpacityLight: 0.8,
  glassOpacityDark: 0.03,
  blurStrength: 20,
  gradientEnabled: false,
  gradientStart: '#00f0ff',
  gradientMiddle: '#b829dd',
  gradientEnd: '#f0c040',
  gradientAngle: 135,
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
export const MIN_BLUR = 0
export const MAX_BLUR = 60
export const MIN_OPACITY = 0
export const MAX_OPACITY = 1
export const MIN_GRADIENT_ANGLE = 0
export const MAX_GRADIENT_ANGLE = 360

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
function sanitiseAlpha(value, fallback) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(1, Math.max(0, Number(num.toFixed(3))))
}

function sanitiseNumber(value, min, max, fallback) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, Number(num.toFixed(2))))
}

function sanitiseRgbaOrHex(value, fallback) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (HEX_COLOR.test(trimmed)) return trimmed
  // Allow rgba() with basic validation
  if (/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+))?\s*\)$/i.test(trimmed)) {
    return trimmed
  }
  return fallback
}

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
    surfaceLight: sanitiseColor(cfg.surfaceLight, DEFAULT_APPEARANCE.surfaceLight),
    surfaceDark: sanitiseColor(cfg.surfaceDark, DEFAULT_APPEARANCE.surfaceDark),
    textPrimaryLight: sanitiseRgbaOrHex(cfg.textPrimaryLight, DEFAULT_APPEARANCE.textPrimaryLight),
    textSecondaryLight: sanitiseRgbaOrHex(cfg.textSecondaryLight, DEFAULT_APPEARANCE.textSecondaryLight),
    textTertiaryLight: sanitiseRgbaOrHex(cfg.textTertiaryLight, DEFAULT_APPEARANCE.textTertiaryLight),
    textPrimaryDark: sanitiseRgbaOrHex(cfg.textPrimaryDark, DEFAULT_APPEARANCE.textPrimaryDark),
    textSecondaryDark: sanitiseRgbaOrHex(cfg.textSecondaryDark, DEFAULT_APPEARANCE.textSecondaryDark),
    textTertiaryDark: sanitiseRgbaOrHex(cfg.textTertiaryDark, DEFAULT_APPEARANCE.textTertiaryDark),
    borderLight: sanitiseRgbaOrHex(cfg.borderLight, DEFAULT_APPEARANCE.borderLight),
    borderDark: sanitiseRgbaOrHex(cfg.borderDark, DEFAULT_APPEARANCE.borderDark),
    glassOpacityLight: sanitiseAlpha(cfg.glassOpacityLight, DEFAULT_APPEARANCE.glassOpacityLight),
    glassOpacityDark: sanitiseAlpha(cfg.glassOpacityDark, DEFAULT_APPEARANCE.glassOpacityDark),
    blurStrength: sanitiseNumber(cfg.blurStrength, 0, 60, DEFAULT_APPEARANCE.blurStrength),
    gradientEnabled: cfg.gradientEnabled === true,
    gradientStart: sanitiseColor(cfg.gradientStart, DEFAULT_APPEARANCE.gradientStart),
    gradientMiddle: sanitiseColor(cfg.gradientMiddle, DEFAULT_APPEARANCE.gradientMiddle),
    gradientEnd: sanitiseColor(cfg.gradientEnd, DEFAULT_APPEARANCE.gradientEnd),
    gradientAngle: sanitiseNumber(cfg.gradientAngle, 0, 360, DEFAULT_APPEARANCE.gradientAngle),
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
 *
 * The page background (--bg-primary) is deliberately absent: the site keeps
 * its built-in aurora backdrop, and only its surfaces/cards are themable.
 *
 * The semantic variables (surfaces, text, borders, glass, accent) are
 * resolved for the *active* theme rather than always emitting the light
 * palette. Inline style beats the `.dark` rules in index.css, so emitting the
 * light values unconditionally would pin dark-mode visitors to the light
 * palette even though the `dark` class was present — which is exactly the
 * bug this signature exists to prevent.
 *
 * @param {object} cfg - normalized config (mergeSiteAppearance output)
 * @param {'light'|'dark'} [theme='light'] - theme the vars are being applied for
 */
export function appearanceToCssVars(cfg, theme = 'light') {
  const dark = theme === 'dark'
  const scaled = Math.max(12, Math.round(16 * cfg.fontScale))
  const glassOpacity = dark
    ? cfg.glassOpacityDark ?? DEFAULT_APPEARANCE.glassOpacityDark
    : cfg.glassOpacityLight ?? DEFAULT_APPEARANCE.glassOpacityLight
  const glassBg = `rgba(255,255,255,${glassOpacity})`
  const vars = {
    '--accent': dark ? cfg.accentDark : cfg.accent,
    '--accent-glow': dark ? cfg.accentDark : cfg.accent,
    '--bg-secondary': dark ? cfg.surfaceDark : cfg.surfaceLight,
    '--card-bg': dark ? cfg.surfaceDark : cfg.surfaceLight,
    '--text-primary': dark
      ? cfg.textPrimaryDark ?? DEFAULT_APPEARANCE.textPrimaryDark
      : cfg.textPrimaryLight ?? DEFAULT_APPEARANCE.textPrimaryLight,
    '--text-secondary': dark
      ? cfg.textSecondaryDark ?? DEFAULT_APPEARANCE.textSecondaryDark
      : cfg.textSecondaryLight ?? DEFAULT_APPEARANCE.textSecondaryLight,
    '--text-tertiary': dark
      ? cfg.textTertiaryDark ?? DEFAULT_APPEARANCE.textTertiaryDark
      : cfg.textTertiaryLight ?? DEFAULT_APPEARANCE.textTertiaryLight,
    '--border-color': dark
      ? cfg.borderDark ?? DEFAULT_APPEARANCE.borderDark
      : cfg.borderLight ?? DEFAULT_APPEARANCE.borderLight,
    '--glass-bg': glassBg,
    '--font-body': fontStack(cfg.fontBody, DEFAULT_APPEARANCE.fontBody),
    '--font-display': fontStack(cfg.fontDisplay, DEFAULT_APPEARANCE.fontDisplay),
    '--font-mono': fontStack(cfg.fontMono, DEFAULT_APPEARANCE.fontMono),
    '--app-font-scale': String(cfg.fontScale),
    '--app-font-size': `${scaled}px`,
    '--app-radius-scale': String(cfg.radiusScale),
    '--app-blur': `${cfg.blurStrength ?? DEFAULT_APPEARANCE.blurStrength}px`,
  }
  if (cfg.gradientEnabled) {
    const angle = cfg.gradientAngle ?? DEFAULT_APPEARANCE.gradientAngle
    const start = cfg.gradientStart ?? DEFAULT_APPEARANCE.gradientStart
    const middle = cfg.gradientMiddle ?? DEFAULT_APPEARANCE.gradientMiddle
    const end = cfg.gradientEnd ?? DEFAULT_APPEARANCE.gradientEnd
    vars['--text-gradient'] = `linear-gradient(${angle}deg, ${start} 0%, ${middle} 50%, ${end} 100%)`
  }
  return vars
}

/**
 * Names an older release wrote for the page background. The page background is
 * no longer admin-managed, so applying the theme strips these to let the
 * built-in aurora backdrop show through.
 */
export const LEGACY_BACKGROUND_VARS = Object.freeze([
  '--bg-primary',
  '--bg-dark',
  '--bg-dark-secondary',
])

/**
 * Every custom property the appearance feature may ever write. Used when the
 * admin switches the feature off so no stale inline override (including the
 * optional gradient and the retired background vars) survives the fallback to
 * the stylesheet defaults.
 */
export function appearanceVarNames() {
  const names = new Set(Object.keys(appearanceToCssVars(DEFAULT_APPEARANCE)))
  for (const name of Object.keys(appearanceToDarkCssVars(DEFAULT_APPEARANCE))) {
    names.add(name)
  }
  names.add('--text-gradient')
  for (const name of LEGACY_BACKGROUND_VARS) names.add(name)
  return names
}

/**
 * Dark-mode overrides. The `.dark` rule in index.css reads these. There is no
 * dark page background here on purpose — only the surface colour is themable.
 */
export function appearanceToDarkCssVars(cfg) {
  const glassBg = `rgba(255,255,255,${cfg.glassOpacityDark ?? DEFAULT_APPEARANCE.glassOpacityDark})`
  return {
    '--accent-dark': cfg.accentDark,
    '--surface-dark': cfg.surfaceDark,
    '--text-primary-dark': cfg.textPrimaryDark ?? DEFAULT_APPEARANCE.textPrimaryDark,
    '--text-secondary-dark': cfg.textSecondaryDark ?? DEFAULT_APPEARANCE.textSecondaryDark,
    '--text-tertiary-dark': cfg.textTertiaryDark ?? DEFAULT_APPEARANCE.textTertiaryDark,
    '--border-color-dark': cfg.borderDark ?? DEFAULT_APPEARANCE.borderDark,
    '--glass-bg-dark': glassBg,
  }
}
