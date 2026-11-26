// ---------------------------------------------------------------------------
// Site-wide search primitives.
//
// Pure, dependency-free scoring used by both the command palette and the
// /search page. Keeping it separate from the data loaders makes the ranking
// deterministic and unit-testable without a browser or database.
// ---------------------------------------------------------------------------

export const SEARCH_TYPES = {
  page: 'Pages',
  project: 'Projects',
  service: 'Services',
  product: 'Digital store',
  blog: 'Journal',
  caseStudy: 'Case studies',
  skill: 'Skills',
  education: 'Education',
  experience: 'Experience',
  certificate: 'Certificates',
  achievement: 'Achievements',
  gallery: 'Gallery',
}

export const SEARCH_TYPE_ORDER = Object.keys(SEARCH_TYPES)

const MAX_QUERY_TOKENS = 8
const MAX_QUERY_LENGTH = 120

/** Lowercase, strip control characters, collapse whitespace, cap length. */
export function normalizeSearchText(value = '') {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .slice(0, MAX_QUERY_LENGTH)
}

export function tokenize(query = '') {
  return normalizeSearchText(query)
    .split(' ')
    .filter(Boolean)
    .slice(0, MAX_QUERY_TOKENS)
}

function asSearchWords(value = '') {
  return normalizeSearchText(value)
    .split(/[^a-z0-9+#.]+/)
    .filter(Boolean)
}

function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => normalizeSearchText(typeof item === 'string' ? item : item?.name || item?.title || ''))
  if (typeof value === 'string') return value.split(',').map((part) => normalizeSearchText(part)).filter(Boolean)
  return []
}

/**
 * Normalise one result document. Callers may pass raw arrays for `keywords`,
 * `tags` and `meta`; they are folded into lowercase searchable strings once.
 */
export function buildSearchDocument(doc = {}) {
  const title = String(doc.title || '').trim()
  const description = String(doc.description || '').trim()
  const keywords = asList(doc.keywords).filter(Boolean)
  const tags = asList(doc.tags).filter(Boolean)
  const meta = asList(doc.meta).filter(Boolean)

  return {
    id: String(doc.id || `${doc.type}:${doc.path || title}`),
    type: SEARCH_TYPES[doc.type] ? doc.type : 'page',
    title,
    description,
    path: String(doc.path || '/'),
    section: String(doc.section || SEARCH_TYPES[doc.type] || 'Page'),
    badge: String(doc.badge || ''),
    keywords,
    tags,
    meta,
    // Precomputed haystacks keep scoring linear and avoid rebuilding strings
    // for every keystroke on large indexes.
    _titleWords: asSearchWords(title),
    _title: normalizeSearchText(title),
    _description: normalizeSearchText(description),
    _keywords: keywords.map(normalizeSearchText),
    _tags: tags.map(normalizeSearchText),
    _meta: meta.map(normalizeSearchText),
    _section: normalizeSearchText(doc.section || SEARCH_TYPES[doc.type] || 'Page'),
  }
}

/**
 * Score one document against every query token.
 *
 * Every token must match somewhere; this prevents a broad three-word query
 * from surfacing unrelated pages that happen to share a single common word.
 * Returns 0 for no match.
 */
export function scoreDocument(doc, tokens, rawQuery = '') {
  if (!tokens.length) return 0

  const titleWords = doc._titleWords || []
  const phrase = normalizeSearchText(rawQuery)
  let score = 0
  let matched = 0

  for (const token of tokens) {
    let tokenScore = 0

    if (doc._title === token) tokenScore += 40
    else if (doc._title.startsWith(`${token} `) || doc._title.startsWith(token)) tokenScore += 24
    else if (titleWords.includes(token)) tokenScore += 18
    else if (titleWords.some((word) => word.startsWith(token))) tokenScore += 12

    if (doc._tags.includes(token)) tokenScore += 14
    if (doc._keywords.some((value) => value === token)) tokenScore += 10
    else if (doc._keywords.some((value) => value.includes(token))) tokenScore += 6
    if (doc._section === token) tokenScore += 6
    else if (doc._section.includes(token)) tokenScore += 3
    if (doc._description.includes(token)) tokenScore += 3
    if (doc._meta.some((value) => value.includes(token))) tokenScore += 2

    if (tokenScore > 0) {
      matched += 1
      score += tokenScore
    }
  }

  if (matched < tokens.length) return 0

  if (phrase && doc._title.includes(phrase)) score += 30
  else if (phrase && doc._description.includes(phrase)) score += 10

  // Short, focused documents outrank long ones when relevance is otherwise
  // identical (a skill page beats a sprawling page that mentions the word).
  if (doc.type === 'page') score -= 2
  if (doc.type === 'product') score += 2

  return Math.max(score, 1)
}

/** Split text into matched/unmatched parts without injecting HTML. */
export function highlightSegments(text = '', tokens = []) {
  const source = String(text ?? '')
  if (!source || !tokens.length) return [{ text: source, match: false }]

  const ranges = []
  const lower = source.toLowerCase()
  for (const token of tokens) {
    if (!token) continue
    let from = 0
    while (from <= lower.length - token.length) {
      const index = lower.indexOf(token, from)
      if (index === -1) break
      ranges.push([index, index + token.length])
      from = index + token.length
    }
  }
  if (!ranges.length) return [{ text: source, match: false }]

  ranges.sort((a, b) => a[0] - b[0])
  const merged = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
    else merged.push([...range])
  }

  const segments = []
  let cursor = 0
  for (const [start, end] of merged) {
    if (start > cursor) segments.push({ text: source.slice(cursor, start), match: false })
    segments.push({ text: source.slice(start, end), match: true })
    cursor = end
  }
  if (cursor < source.length) segments.push({ text: source.slice(cursor), match: false })
  return segments
}

/**
 * Rank prebuilt documents. Results carry highlight segments so components can
 * render <mark> without ever using dangerouslySetInnerHTML.
 */
export function searchSite(documents = [], query = '', options = {}) {
  const tokens = tokenize(query)
  if (!tokens.length || !Array.isArray(documents) || !documents.length) return []

  const { limit = 20, types = [] } = options
  const allowed = Array.isArray(types) ? types.filter((type) => SEARCH_TYPES[type]) : []
  const results = []

  for (const raw of documents) {
    const doc = raw._titleWords ? raw : buildSearchDocument(raw)
    if (allowed.length && !allowed.includes(doc.type)) continue
    const score = scoreDocument(doc, tokens, query)
    if (!score) continue
    results.push({
      ...doc,
      score,
      titleSegments: highlightSegments(doc.title, tokens),
      descriptionSegments: highlightSegments(doc.description, tokens),
    })
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.title.localeCompare(b.title)
  })

  return Number.isFinite(limit) && limit > 0 ? results.slice(0, limit) : results
}

/** Group ranked results by section for palette and page rendering. */
export function groupResults(results = []) {
  const groups = []
  const byType = new Map()
  for (const result of results) {
    if (!byType.has(result.type)) {
      const group = { type: result.type, label: SEARCH_TYPES[result.type] || result.section || 'Results', results: [] }
      byType.set(result.type, group)
      groups.push(group)
    }
    byType.get(result.type).results.push(result)
  }
  return groups
}

export function resultCountLabel(count) {
  return `${count} ${count === 1 ? 'result' : 'results'}`
}
