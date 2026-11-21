// ---------------------------------------------------------------------------
// Pure PostgREST filter helpers for the public product catalogue.
//
// Keeping this string-building out of `products.js` makes the search contract
// unit-testable in Node without importing the browser Supabase client. The
// caller still owns the single Supabase query; this module only produces the
// `or(...)` expression that query uses.
// ---------------------------------------------------------------------------

const MAX_TERM_LENGTH = 60
const MAX_TAG_TOKENS = 5

/**
 * PostgREST `or()` values are raw syntax, so no punctuation from user input may
 * survive: braces/quotes/backslashes would change the array literal, commas and
 * parentheses would add extra filters, and dots would change operator parsing.
 */
export function sanitiseSearchTerm(value) {
  return String(value ?? '')
    .replace(/[{}\[\]",.()\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TERM_LENGTH)
    .trim()
}

/** A pragmatic title case for the common single-word tags used by the store. */
function displayCase(token) {
  if (!token) return token
  // Two-letter tokens are treated as acronyms (UI, AI); longer words keep
  // ordinary title case so a stored "Kit" still matches a lowercase query.
  if (token.length <= 2) return token.toUpperCase()
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
}

/**
 * Build bounded `tags.cs.{...}` alternatives. Exact case variants are included
 * because PostgREST array containment is case-sensitive; the GIN index still
 * services every alternative.
 */
export function buildTagFilters(term) {
  const clean = sanitiseSearchTerm(term)
  if (!clean) return []

  const tokens = [clean, ...clean.split(/\s+/)]
    .filter(Boolean)
    .slice(0, MAX_TAG_TOKENS)

  const values = new Set()
  for (const token of tokens) {
    for (const variant of [token, token.toLowerCase(), displayCase(token)]) {
      if (variant) values.add(variant)
    }
  }

  return [...values].map((value) => `tags.cs.{${JSON.stringify(value)}}`)
}

/**
 * The full search expression: free-text columns plus indexed tag containment.
 * Returns null for an empty/whitespace-only term so callers can skip `or()`.
 */
export function buildProductSearchExpression(term) {
  const clean = sanitiseSearchTerm(term)
  if (!clean) return null

  return [
    `title.ilike.%${clean}%`,
    `short_description.ilike.%${clean}%`,
    `description.ilike.%${clean}%`,
    ...buildTagFilters(clean),
  ].join(',')
}
