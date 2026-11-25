import { SITE_NAME, SITE_ORIGIN } from './documentHead.js'

// Share URLs always use the public canonical origin. Local preview hosts,
// session query strings and referral codes are deliberately excluded.
export function productSharePath(slug) {
  return `/offerings/products/${encodeURIComponent(String(slug || '').trim())}`
}

export function productShareUrl(slug) {
  return `${SITE_ORIGIN}${productSharePath(slug)}`
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
      labelKey: 'store.shareOnX',
      mark: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      external: true,
    },
    {
      id: 'linkedin',
      labelKey: 'store.shareOnLinkedIn',
      mark: 'in',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      external: true,
    },
    {
      id: 'facebook',
      labelKey: 'store.shareOnFacebook',
      mark: 'f',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      external: true,
    },
    {
      id: 'whatsapp',
      labelKey: 'store.shareOnWhatsApp',
      mark: 'WA',
      href: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
      external: true,
    },
    {
      id: 'telegram',
      labelKey: 'store.shareOnTelegram',
      mark: 'TG',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      external: true,
    },
    {
      id: 'email',
      labelKey: 'store.shareByEmail',
      mark: '@',
      href: `mailto:?subject=${encodedTitle}&body=${encodedText}%20${encodedUrl}`,
      external: false,
    },
  ]
}
