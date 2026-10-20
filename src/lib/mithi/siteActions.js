/**
 * Mithi's site map.
 *
 * A single, declarative catalog of the real, navigable destinations on this
 * site. It is the contract between:
 *
 *   * the assistant, which may propose one of these `id`s as an action, and
 *   * the UI, which turns a proposed `id` into a clickable button.
 *
 * The AI never receives raw URLs — it only sees these `id`s, labels and
 * descriptions. That keeps navigation safe: an action can only ever point at a
 * route in this list, never at an arbitrary destination injected by a model.
 *
 * Adding a page to the site means adding one entry here (and mirroring it in
 * `api/_lib/site-capabilities.js` so the assistant can suggest it).
 */
export const SITE_ACTIONS = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    hint: 'The landing page and the starting point of the site.',
  },
  {
    id: 'projects',
    label: 'See projects',
    path: '/#projects',
    hint: 'Portfolio projects and case builds.',
  },
  {
    id: 'products',
    label: 'Browse products',
    path: '/offerings/products',
    hint: 'Digital products available for purchase, with prices and previews.',
  },
  {
    id: 'services',
    label: 'View services',
    path: '/offerings',
    hint: 'Services offered and how to collaborate or hire.',
  },
  {
    id: 'blog',
    label: 'Read the blog',
    path: '/blog',
    hint: 'Articles and write-ups.',
  },
  {
    id: 'more',
    label: 'More about the work',
    path: '/more',
    hint: 'Certificates, achievements, experience and gallery.',
  },
  {
    id: 'support',
    label: 'Get support',
    path: '/support',
    hint: 'Contact and support options.',
  },
  {
    id: 'library',
    label: 'My purchases',
    path: '/library',
    hint: 'Previously purchased products and downloads.',
  },
]

const ACTION_MAP = new Map(SITE_ACTIONS.map((action) => [action.id, action]))

/** Resolve an action id to its definition, or null when unknown. */
export function getSiteAction(id) {
  if (typeof id !== 'string') return null
  return ACTION_MAP.get(id) || null
}

/** The allow-listed id set, used to filter any AI-proposed actions. */
export const SITE_ACTION_IDS = SITE_ACTIONS.map((action) => action.id)

/**
 * Filter a model-proposed action list down to safe, known actions only.
 * Anything unknown, duplicated, or oversized is dropped silently.
 */
export function sanitiseActions(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const result = []
  for (const entry of raw) {
    const id = typeof entry === 'string' ? entry : entry?.id
    if (typeof id !== 'string') continue
    if (seen.has(id)) continue
    const action = ACTION_MAP.get(id)
    if (!action) continue
    seen.add(id)
    result.push({ id: action.id, label: action.label, path: action.path })
    if (result.length >= 3) break
  }
  return result
}
