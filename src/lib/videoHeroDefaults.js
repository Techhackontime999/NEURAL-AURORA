// Shared defaults + normalization for the admin-managed Video Hero showcase.
// Used by both src/components/VideoHero.jsx (public render) and
// src/components/admin/AdminVideoHero.jsx (the editor), so the two can never
// drift apart about the settings shape.
//
// Stored as the `video_hero` JSONB document on `admin_settings`
// (migration 20261019000001_add_video_hero_settings.sql).

// Every icon the quick-jump buttons may use. Anything else falls back to 'more'.
export const VIDEO_HERO_ICONS = [
  'store',
  'offerings',
  'blog',
  'projects',
  'library',
  'more',
  'support',
  'contact',
]

export const DEFAULT_VIDEO_HERO = {
  enabled: true,
  darkVideo: '/hero_dark.mp4',
  lightVideo: '/hero_light.mp4',
  // Copy fields default to '' = "use the translated copy in en.json".
  eyebrow: '',
  titleA: '',
  titleB: '',
  subtitle: '',
  links: [
    { key: 'store', to: '/offerings/products', icon: 'store' },
    { key: 'offerings', to: '/offerings', icon: 'offerings' },
    { key: 'blog', to: '/blog', icon: 'blog' },
    { key: 'projects', to: '#projects', icon: 'projects' },
    { key: 'library', to: '/library', icon: 'library' },
    { key: 'more', to: '/more', icon: 'more' },
    { key: 'support', to: '/support', icon: 'support' },
    { key: 'contact', to: '#contact', icon: 'contact' },
  ],
}

// Keys shipped in DEFAULT_VIDEO_HERO — these get translated label/hint
// fallbacks; custom links added in the admin panel must supply their own text.
export const PRESET_LINK_KEYS = DEFAULT_VIDEO_HERO.links.map((l) => l.key)

const asText = (value) => (typeof value === 'string' ? value.trim() : '')

export function normalizeLink(raw, index = 0) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const key = asText(source.key) || `link-${index + 1}`
  const icon = VIDEO_HERO_ICONS.includes(source.icon)
    ? source.icon
    : PRESET_LINK_KEYS.includes(key)
      ? key
      : 'more'
  return {
    key,
    to: asText(source.to) || '/',
    icon,
    label: asText(source.label),
    hint: asText(source.hint),
    enabled: source.enabled !== false,
  }
}

/**
 * Turns whatever is stored in admin_settings.video_hero (possibly missing,
 * partial, or stale) into a complete, safe configuration object.
 */
export function mergeVideoHeroConfig(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}

  const links = Array.isArray(source.links) && source.links.length
    ? source.links.map(normalizeLink)
    : DEFAULT_VIDEO_HERO.links.map((link, i) => normalizeLink(link, i))

  return {
    enabled: source.enabled !== false,
    darkVideo: asText(source.darkVideo) || DEFAULT_VIDEO_HERO.darkVideo,
    lightVideo: asText(source.lightVideo) || DEFAULT_VIDEO_HERO.lightVideo,
    eyebrow: asText(source.eyebrow),
    titleA: asText(source.titleA),
    titleB: asText(source.titleB),
    subtitle: asText(source.subtitle),
    links,
  }
}

// The links that actually render (disabled ones are hidden, not deleted).
export function activeLinks(config) {
  return config.links.filter((link) => link.enabled !== false)
}
