// ---------------------------------------------------------------------------
// Dependency-free document head management.
//
// The SPA shell in index.html carries the site-wide defaults. Route components
// replace only the tags marked with `data-na-head`, so canonical URLs, social
// cards and structured data always describe the page the visitor is actually
// looking at instead of the homepage.
// ---------------------------------------------------------------------------

export const SITE_NAME = 'NEURAL AURORA'
export const SITE_ORIGIN = 'https://neural-aurora.vercel.app'

export const DEFAULT_HEAD = {
  title: `${SITE_NAME} - Techhackontime999`,
  description:
    'The Synaptic Portfolio of Amit Kumar (Techhackontime999). A full-stack developer and UI/UX architect crafting neural-inspired digital experiences.',
  path: '/',
  image: `${SITE_ORIGIN}/og-image.png`,
  imageAlt: `${SITE_NAME} digital products`,
  type: 'website',
  robots: 'index, follow',
}

/** Strip markup from DB-backed copy before using it in a meta description. */
export function toPlainText(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Resolve a stored image reference to an absolute HTTPS URL where possible. */
export function toAbsoluteUrl(value) {
  if (!value) return ''
  const str = String(value).trim()
  if (/^https?:\/\//i.test(str)) return str
  if (str.startsWith('/')) return `${SITE_ORIGIN}${str}`
  return ''
}

function absoluteCanonical(path) {
  const value = String(path || '/')
  if (/^https?:\/\//i.test(value)) return value
  try {
    return new URL(value, SITE_ORIGIN).toString()
  } catch {
    return `${SITE_ORIGIN}/`
  }
}

/**
 * Pure head descriptor. Kept separate from DOM mutation so tests can assert
 * canonical URLs, social tags and JSON-LD without a browser.
 */
export function buildDocumentHead(head = {}) {
  const merged = { ...DEFAULT_HEAD, ...head }
  const title = merged.title || DEFAULT_HEAD.title
  const description = toPlainText(merged.description || DEFAULT_HEAD.description)
  const canonical = absoluteCanonical(merged.path)
  const image = toAbsoluteUrl(merged.image) || DEFAULT_HEAD.image
  const imageAlt = merged.imageAlt || DEFAULT_HEAD.imageAlt
  const type = merged.type || 'website'
  const robots = merged.robots || 'index, follow'

  const tags = [
    ['meta', { name: 'description', content: description }],
    ['meta', { name: 'robots', content: robots }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:type', content: type }],
    ['meta', { property: 'og:url', content: canonical }],
    ['meta', { property: 'og:site_name', content: SITE_NAME }],
    ['meta', { property: 'og:locale', content: 'en_US' }],
    ['meta', { property: 'og:image', content: image }],
    ['meta', { property: 'og:image:secure_url', content: image }],
    ['meta', { property: 'og:image:type', content: 'image/png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: imageAlt }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:description', content: description }],
    ['meta', { name: 'twitter:image', content: image }],
    ['meta', { name: 'twitter:image:alt', content: imageAlt }],
    ['link', { rel: 'canonical', href: canonical }],
  ]

  return {
    title,
    description,
    canonical,
    image,
    imageAlt,
    tags,
    jsonLd: merged.jsonLd || null,
  }
}

/** Replace managed head tags and return the elements that were inserted. */
export function applyDocumentHead(head = {}) {
  if (typeof document === 'undefined') return []

  const { title, tags, jsonLd } = buildDocumentHead(head)
  document.title = title
  document.head.querySelectorAll('[data-na-head]').forEach((node) => node.remove())

  const created = []
  for (const [tagName, attrs] of tags) {
    const node = document.createElement(tagName)
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) node.setAttribute(key, String(value))
    })
    node.setAttribute('data-na-head', 'metadata')
    document.head.appendChild(node)
    created.push(node)
  }

  if (jsonLd) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(jsonLd)
    script.setAttribute('data-na-head', 'jsonld')
    document.head.appendChild(script)
    created.push(script)
  }

  return created
}
