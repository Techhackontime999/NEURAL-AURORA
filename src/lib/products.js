// ---------------------------------------------------------------------------
// Digital products — public catalogue data layer.
//
// Reading `products` straight from Supabase is safe here: RLS only ever
// returns `status = 'published'` rows to anon/authenticated, and no private
// storage path lives on this table. Paid assets live in `product_files`,
// which has no public SELECT policy at all.
// ---------------------------------------------------------------------------

import { supabase } from './supabase'
import { buildProductSearchExpression } from './productQuery'
import { rankRelatedProducts } from './recommendations'

/** Client-side catalogue pagination. Bounded so a large table cannot flood the UI. */
export const PRODUCT_PAGE_SIZE = 24
export const PRODUCT_MAX_RESULTS = 200

export const PRODUCT_SORTS = {
  featured: { label: 'Featured', columns: [['featured', false], ['published_at', false]] },
  newest: { label: 'Newest', columns: [['published_at', false]] },
  'price-asc': { label: 'Price: Low to High', columns: [['price_paise', true]] },
  'price-desc': { label: 'Price: High to Low', columns: [['price_paise', false]] },
  title: { label: 'A–Z', columns: [['title', true]] },
}

/**
 * Fetch published products with search, category/format filters and sorting.
 *
 * @param {object}  [options]
 * @param {string}  [options.search]  Free-text query across title/summary/tags.
 * @param {string}  [options.category] Category slug.
 * @param {string}  [options.format]  Product format.
 * @param {string}  [options.sort]    Key of PRODUCT_SORTS.
 * @param {boolean} [options.freeOnly]
 * @param {boolean} [options.featuredOnly]
 * @param {number}  [options.limit]   Page size; request `limit + 1` to detect more.
 * @param {number}  [options.offset]  0-based row offset for "load more".
 */
export async function getPublishedProducts({
  search = '',
  category = '',
  format = '',
  sort = 'featured',
  freeOnly = false,
  featuredOnly = false,
  limit,
  offset = 0,
} = {}) {
  let query = supabase.from('products').select('*').eq('status', 'published')

  if (category) query = query.eq('category_slug', category)
  if (format) query = query.eq('format', format)
  if (freeOnly) query = query.eq('price_paise', 0)
  if (featuredOnly) query = query.eq('featured', true)

  const searchExpression = buildProductSearchExpression(search)
  if (searchExpression) query = query.or(searchExpression)

  const sortSpec = PRODUCT_SORTS[sort] || PRODUCT_SORTS.featured
  for (const [column, ascending] of sortSpec.columns) {
    query = query.order(column, {
      ascending,
      nullsFirst: false,
    })
  }

  if (limit) {
    // `range` is inclusive on both ends; `limit` is used for the first page so
    // existing callers keep the original PostgREST request shape.
    query = offset > 0 ? query.range(offset, offset + limit - 1) : query.limit(limit)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/** Distinct formats present in the published catalogue (for the filter UI). */
export async function getPublishedFormats() {
  const { data, error } = await supabase
    .from('products')
    .select('format')
    .eq('status', 'published')
    .not('format', 'is', null)
    .order('format', { ascending: true })

  if (error) throw error
  const seen = []
  for (const row of data || []) {
    if (row.format && !seen.includes(row.format)) seen.push(row.format)
  }
  return seen
}

/** Configurable categories, ordered for display. */
export async function getCategories() {
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) throw error
  return data || []
}

/** A single published product by its URL slug. */
export async function getProductBySlug(slug) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw error
  return data || null
}

/**
 * Deterministic related products. One bounded query fetches the candidate
 * pool; `rankRelatedProducts` applies explainable category/tag/format rules.
 * This avoids N+1 requests and never exposes private customer data.
 */
export async function getRelatedProducts(product, limit = 4) {
  if (!product?.id) return []

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'published')
    .neq('id', product.id)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(100)

  if (error) throw error
  return rankRelatedProducts(product, data || [], limit).map((entry) => entry.product)
}

/** Recently viewed products, resolved in one bounded query. */
export async function getProductsBySlugs(slugs = [], limit = 4) {
  const unique = [...new Set(slugs.filter(Boolean))].slice(0, limit)
  if (!unique.length) return []

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'published')
    .in('slug', unique)

  if (error) throw error
  const bySlug = new Map((data || []).map((item) => [item.slug, item]))
  return unique.map((slug) => bySlug.get(slug)).filter(Boolean)
}

/** Public, non-sensitive file metadata for a published product. */
export async function getProductFileManifest(productId) {
  if (!productId) return []
  const { data, error } = await supabase
    .from('public_product_file_manifest')
    .select('id, filename, mime_type, size_bytes, version, display_order, is_preview')
    .eq('product_id', productId)
    .order('display_order', { ascending: true })

  // The view arrives with the licensing migration. Older deployments simply
  // omit the "what you'll receive" section; the store itself keeps working.
  if (error) return []
  return data || []
}

// ---------------------------------------------------------------------------
// Pricing helpers. Money is INTEGER minor units (paise); never float.
// ---------------------------------------------------------------------------

/**
 * Format integer minor units for display.
 * @param {number} paise
 * @param {string} [currency] 'INR' | 'USD'
 */
export function formatPrice(paise, currency = 'INR') {
  const amount = (Number(paise) || 0) / 100
  try {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount)
  } catch {
    const symbol = currency === 'USD' ? '$' : '₹'
    return `${symbol}${amount.toLocaleString('en-IN')}`
  }
}

/** Cheap guard so a non-integer can never reach a price calculation. */
export function toPaise(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n)
}

/** Human file size for the catalogue / download UI. */
export function formatBytes(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * The signed-in customer's purchase library.
 *
 * RLS does the authorization: the `entitlements` policy only returns rows
 * matching `auth.uid()` or the verified email on the session, so this query
 * cannot be widened from the browser. Products are embedded through the
 * entitlements foreign key, and a separate policy lets owners still read a
 * product they bought even after it is archived.
 */
export async function getMyLibrary() {
  const { data, error } = await supabase
    .from('entitlements')
    .select(
      `id, status, source, granted_at, product_id,
       products (id, slug, title, cover_image_url, version, format, currency, price_paise, category_slug, updated_at, release_notes)`
    )
    .eq('status', 'active')
    .order('granted_at', { ascending: false })

  if (error) throw error

  return (data || []).map((row) => ({ ...row, product: row.products || null }))
}
