/**
 * Defaults for the image carousel behind the digital-store hero card
 * (/offerings/products). The saved document lives in admin_settings.store_hero
 * as JSONB so new fields can ship without further migrations:
 *
 * {
 *   "enabled": true,
 *   "intervalSeconds": 6,
 *   "images": [ { "url": "...", "enabled": true } ]
 * }
 *
 * Until an admin replaces them, three curated royalty-free Unsplash images
 * (abstract 3D art, code, design render) are used — all direct CDN URLs that
 * work in <img> tags without an API key.
 */
export const DEFAULT_STORE_HERO_IMAGES = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=70',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1600&q=70',
  'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=1600&q=70',
]

export const DEFAULT_STORE_HERO = {
  enabled: true,
  intervalSeconds: 6,
  images: DEFAULT_STORE_HERO_IMAGES.map((url) => ({ url, enabled: true })),
}

const MIN_INTERVAL = 3
const MAX_INTERVAL = 60

/**
 * Normalizes whatever is stored in admin_settings.store_hero into a complete
 *, render-safe config. An empty/partial document falls back to the defaults
 * so the carousel never blanks out.
 */
export function mergeStoreHeroConfig(raw) {
  const cfg = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const rawImages = Array.isArray(cfg.images) ? cfg.images : []

  // Each default slot can be overridden or removed by the admin; slots the
  // admin never touched keep the default image.
  const images = DEFAULT_STORE_HERO_IMAGES.map((defaultUrl, index) => {
    const slot = rawImages[index]
    if (!slot) return { url: defaultUrl, enabled: true }
    const url = typeof slot.url === 'string' ? slot.url.trim() : ''
    return { url: url || defaultUrl, enabled: slot.enabled !== false }
  })

  // Extra slots beyond the three defaults are preserved (up to a sane cap).
  rawImages.slice(DEFAULT_STORE_HERO_IMAGES.length, 6).forEach((slot) => {
    const url = typeof slot?.url === 'string' ? slot.url.trim() : ''
    if (url) images.push({ url, enabled: slot.enabled !== false })
  })

  const interval = Number(cfg.intervalSeconds)
  return {
    enabled: cfg.enabled !== false,
    intervalSeconds:
      Number.isFinite(interval) && interval >= MIN_INTERVAL && interval <= MAX_INTERVAL
        ? interval
        : DEFAULT_STORE_HERO.intervalSeconds,
    images,
  }
}
