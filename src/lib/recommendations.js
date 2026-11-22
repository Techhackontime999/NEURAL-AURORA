// ---------------------------------------------------------------------------
// Deterministic product recommendations.
//
// No personal data is used. Candidates are scored from trustworthy product
// fields only, and every score is explainable. A product is excluded when it
// is the current product, unpublished or missing from the candidate list.
// ---------------------------------------------------------------------------

const RECENT_KEY = 'neural-aurora:recent-products:v1'
const MAX_RECENT = 8

/**
 * Score published candidates against the current product.
 * @returns {Array<{product: object, score: number, reasons: string[]}>}
 */
export function rankRelatedProducts(current, candidates = [], limit = 3) {
  if (!current?.id || !Array.isArray(candidates)) return []

  const tags = new Set((Array.isArray(current.tags) ? current.tags : []).map((tag) => String(tag).toLowerCase()))
  const titleWords = new Set(
    String(current.title || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3)
  )

  const scored = candidates
    .filter((item) => item && item.id !== current.id && item.status === 'published')
    .map((item) => {
      let score = 0
      const reasons = []

      if (current.category_slug && item.category_slug === current.category_slug) {
        score += 6
        reasons.push('sameCategory')
      }

      const sharedTags = (Array.isArray(item.tags) ? item.tags : []).filter((tag) =>
        tags.has(String(tag).toLowerCase())
      )
      if (sharedTags.length) {
        score += Math.min(sharedTags.length * 3, 6)
        reasons.push('sharedTags')
      }

      if (current.format && item.format === current.format) {
        score += 2
        reasons.push('sameFormat')
      }

      const sharesTitleWord = String(item.title || '')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .some((word) => word.length > 3 && titleWords.has(word))
      if (sharesTitleWord) {
        score += 1
        reasons.push('similarTitle')
      }

      // Featured is a tie-break only. It must never manufacture a match for
      // an otherwise unrelated product or outrank a real category/tag match.
      return { product: item, score, reasons, featured: Boolean(item.featured) }
    })
    .filter((entry) => entry.score > 0)

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.featured !== b.featured) return a.featured ? -1 : 1
    const aTime = new Date(a.product.published_at || a.product.created_at || 0).getTime() || 0
    const bTime = new Date(b.product.published_at || b.product.created_at || 0).getTime() || 0
    if (bTime !== aTime) return bTime - aTime
    return String(a.product.title || '').localeCompare(String(b.product.title || ''))
  })

  return scored.slice(0, Math.max(0, limit))
}

/** Recently viewed slugs, stored locally and never sent to a server. */
export function getRecentlyViewed() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((slug) => typeof slug === 'string') : []
  } catch {
    return []
  }
}

export function rememberViewedProduct(slug) {
  if (!slug || typeof window === 'undefined') return
  try {
    const next = [slug, ...getRecentlyViewed().filter((item) => item !== slug)].slice(0, MAX_RECENT)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* private browsing / storage disabled: a nice-to-have only */
  }
}
