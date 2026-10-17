// ---------------------------------------------------------------------------
// Digital products — public catalogue data layer.
//
// Reading `products` straight from Supabase is safe here: RLS only ever
// returns `status = 'published'` rows to anon/authenticated, and no private
// storage path lives on this table. Paid assets live in `product_files`,
// which has no public SELECT policy at all.
// ---------------------------------------------------------------------------

import { supabase } from './supabase'

export const PRODUCT_SORTS = {
  featured: { label: 'Featured', columns: [['featured', false], ['published_at', false]] },
  newest: { label: 'Newest', columns: [['published_at', false]] },
  'price-asc': { label: 'Price: Low to High', columns: [['price_paise', true]] },
  'price-desc': { label: 'Price: High to Low', columns: [['price_paise', false]] },
  title: { label: 'A–Z', columns: [['title', true]] },
}

// PostgREST filter values must not contain `,`, `.` or `()` unescaped.
function escapeFilter(value) {
  return String(value).replace(/[,.()]/g, ' ').trim()
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
 * @param {number}  [options.limit]
 */
export async function getPublishedProducts({
  search = '',
  category = '',
  format = '',
  sort = 'featured',
  freeOnly = false,
  featuredOnly = false,
  limit,
} = {}) {
  let query = supabase.from('products').select('*').eq('status', 'published')

  if (category) query = query.eq('category_slug', category)
  if (format) query = query.eq('format', format)
  if (freeOnly) query = query.eq('price_paise', 0)
  if (featuredOnly) query = query.eq('featured', true)

  const term = escapeFilter(search)
  if (term) {
    // `ilike` on an array column needs a different operator, so tags are
    // matched separately and OR-ed in.
    query = query.or(
      `title.ilike.%${term}%,short_description.ilike.%${term}%,description.ilike.%${term}%`
    )
  }

  const sortSpec = PRODUCT_SORTS[sort] || PRODUCT_SORTS.featured
  for (const [column, ascending] of sortSpec.columns) {
    query = query.order(column, {
      ascending,
      nullsFirst: false,
    })
  }

  if (limit) query = query.limit(limit)

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

/** Other published products in the same category. */
export async function getRelatedProducts(product, limit = 4) {
  if (!product?.category_slug) return []

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'published')
    .eq('category_slug', product.category_slug)
    .neq('id', product.id)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) throw error
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
