import { SITE_NAME, SITE_ORIGIN } from './documentHead.js'

// Share URLs always use the public canonical origin. Local preview hosts,
// session query strings and referral codes are deliberately excluded. Embeds are
// the one place a partner code is allowed, because the iframe owns the referral.
export const AFFILIATE_QUERY_KEY = 'aff'

export function productSharePath(slug) {
  return `/offerings/products/${encodeURIComponent(String(slug || '').trim())}`
}

export function productShareUrl(slug) {
  return `${SITE_ORIGIN}${productSharePath(slug)}`
}

/** Mirrors the store's affiliate normaliser so an embed never leaks junk. */
export function normaliseAffiliateCode(value) {
  const code = String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .slice(0, 24)
  return /^[A-Z0-9][A-Z0-9_-]{2,23}$/.test(code) ? code : ''
}

export function productEmbedPath(slug) {
  return `/embed/products/${encodeURIComponent(String(slug || '').trim())}`
}

export function productEmbedUrl(slug, affiliateCode = '') {
  const code = normaliseAffiliateCode(affiliateCode)
  const query = code ? `?${AFFILIATE_QUERY_KEY}=${encodeURIComponent(code)}` : ''
  return `${SITE_ORIGIN}${productEmbedPath(slug)}${query}`
}

function escapeHtmlAttribute(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function productEmbedSnippet({
  slug,
  title = '',
  affiliateCode = '',
  width = 420,
  height = 320,
} = {}) {
  const parsedWidth = Number(width)
  const parsedHeight = Number(height)
  const safeWidth = Number.isFinite(parsedWidth)
    ? Math.max(280, Math.min(720, Math.trunc(parsedWidth)))
    : 420
  const safeHeight = Number.isFinite(parsedHeight)
    ? Math.max(220, Math.min(600, Math.trunc(parsedHeight)))
    : 320
  const label = escapeHtmlAttribute(`${title || SITE_NAME} — ${SITE_NAME}`)

  return `<iframe src="${productEmbedUrl(slug, affiliateCode)}" title="${label}" width="${safeWidth}" height="${safeHeight}" style="max-width:100%;border:0;border-radius:16px;" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`
}

function compactDescription(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140)
}

export function nativeSharePayload({ slug, title, description = '' }) {
  const url = productShareUrl(slug)
  const shortDescription = compactDescription(description)
  return {
    title: `${title || SITE_NAME} — ${SITE_NAME}`,
    text: shortDescription ? `${title} — ${shortDescription}` : title || SITE_NAME,
    url,
  }
}

export function productShareLinks({ slug, title, description = '' }) {
  const url = productShareUrl(slug)
  const text = nativeSharePayload({ slug, title, description }).text
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(text)
  const encodedTitle = encodeURIComponent(title || SITE_NAME)

  return [
    {
      id: 'x',
      labelKey: 'store.channelX',
      mark: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      external: true,
    },
    {
      id: 'linkedin',
      labelKey: 'store.channelLinkedIn',
      mark: 'in',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      external: true,
    },
    {
      id: 'facebook',
      labelKey: 'store.channelFacebook',
      mark: 'f',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      external: true,
    },
    {
      id: 'whatsapp',
      labelKey: 'store.channelWhatsApp',
      mark: 'WA',
      href: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
      external: true,
    },
    {
      id: 'telegram',
      labelKey: 'store.channelTelegram',
      mark: 'TG',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      external: true,
    },
    {
      id: 'email',
      labelKey: 'store.channelEmail',
      mark: '@',
      href: `mailto:?subject=${encodedTitle}&body=${encodedText}%20${encodedUrl}`,
      external: false,
    },
  ]
}
