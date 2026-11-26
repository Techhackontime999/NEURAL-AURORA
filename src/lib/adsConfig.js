// ---------------------------------------------------------------------------
// Ad configuration.
//
// The publisher client can be overridden without touching source. Slot IDs
// are optional: without them AdSense serves responsive auto units, with them
// each placement uses the exact ad unit created in AdSense.
// ---------------------------------------------------------------------------

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}

// Kept as a fallback so existing deployments keep working before env is set.
const DEFAULT_CLIENT = 'ca-pub-2699270619596438'

export const AD_SLOTS = {
  blog_listing: { label: 'Journal listing', description: 'Below the article list', format: 'auto' },
  article_footer: { label: 'Article footer', description: 'After an article or case study', format: 'auto' },
  store_listing: { label: 'Store listing', description: 'Below the product catalogue', format: 'fluid' },
  product_detail: { label: 'Product detail', description: 'Below a product description', format: 'auto' },
  search_results: { label: 'Search results', description: 'Bespoke search results page', format: 'fluid' },
  offerings: { label: 'Offerings', description: 'Below the service list', format: 'auto' },
}

export const AD_PROVIDERS = {
  adsense: 'Google AdSense',
  sponsor: 'Direct sponsor',
  affiliate: 'Affiliate pick',
  custom: 'Custom link',
}

/** Accept only the publisher id shape AdSense itself uses. */
export function sanitizeAdClient(value) {
  const match = String(value || '').trim().match(/^ca-pub-\d{8,}$/)
  return match ? match[0] : ''
}

/** Ad slot ids are numeric strings; anything else is discarded. */
export function sanitizeAdSlot(value) {
  const match = String(value || '').trim().match(/^\d{6,}$/)
  return match ? match[0] : ''
}

export function getAdSenseClient() {
  return sanitizeAdClient(env.VITE_ADSENSE_CLIENT) || DEFAULT_CLIENT
}

function envSlotKey(slot) {
  return `VITE_ADSENSE_SLOT_${String(slot || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`
}

/** Env override for a slot, e.g. VITE_ADSENSE_SLOT_BLOG_LISTING. */
export function getAdSenseSlot(slot) {
  return sanitizeAdSlot(env[envSlotKey(slot)])
}

export function isAdSenseEnabled() {
  return env.VITE_ADSENSE_ENABLED !== 'false' && Boolean(getAdSenseClient())
}

let scriptPromise = null

/** Load the AdSense runtime once per document; never blocks rendering. */
export function loadAdSenseScript(client = getAdSenseClient()) {
  if (typeof document === 'undefined' || !client) return Promise.resolve(false)
  if (window.adsbygoogle) return Promise.resolve(true)
  if (scriptPromise) return scriptPromise

  const existing = document.querySelector('script[data-na-adsense="true"]')
  if (existing) {
    scriptPromise = new Promise((resolve) => {
      const deadline = Date.now() + 5000
      const check = () => {
        if (window.adsbygoogle) resolve(true)
        else if (Date.now() > deadline) resolve(false)
        else window.setTimeout(check, 200)
      }
      check()
    })
    return scriptPromise
  }

  scriptPromise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
    script.async = true
    script.crossOrigin = 'anonymous'
    script.setAttribute('data-na-adsense', 'true')
    script.onload = () => resolve(Boolean(window.adsbygoogle))
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
  return scriptPromise
}

/** Ask AdSense to fill a mounted <ins>. Returns false when blocked/offline. */
export function pushAdSense() {
  if (typeof window === 'undefined') return false
  try {
    window.adsbygoogle = window.adsbygoogle || []
    window.adsbygoogle.push({})
    return true
  } catch {
    return false
  }
}
