// ---------------------------------------------------------------------------
// Admin-side data layer for the digital store.
//
// Everything here runs as the signed-in administrator, so RLS (`is_admin()`)
// is the real gate — the browser is never trusted. Private product files are
// uploaded to the private `digital-products` bucket; only a storage path is
// stored in the database, and it is never returned to the public catalogue.
// ---------------------------------------------------------------------------

import { supabase } from './supabase'

const PRODUCTS = 'products'
const CATEGORIES = 'product_categories'
const FILES = 'product_files'
const PRIVATE_BUCKET = 'digital-products'

// --- products --------------------------------------------------------------

export async function getAllProducts() {
  const { data, error } = await supabase
    .from(PRODUCTS)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createProduct(payload) {
  const { data, error } = await supabase
    .from(PRODUCTS)
    .insert(normaliseProduct(payload))
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProduct(id, payload) {
  const { data, error } = await supabase
    .from(PRODUCTS)
    .update(normaliseProduct(payload))
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProduct(id) {
  const { error } = await supabase.from(PRODUCTS).delete().eq('id', id)
  if (error) throw error
}

/** draft -> published -> archived. `published` stamps published_at once. */
export async function setProductStatus(id, status) {
  const patch = { status }
  if (status === 'published') {
    const { data: existing } = await supabase
      .from(PRODUCTS)
      .select('published_at')
      .eq('id', id)
      .single()
    if (!existing?.published_at) patch.published_at = new Date().toISOString()
  }

  const { error } = await supabase.from(PRODUCTS).update(patch).eq('id', id)
  if (error) throw error
}

/**
 * Strip fields the admin form must not send. `is_free` is a generated column
 * and `slug` is validated server-side by the DB, so both are only sent when
 * actually provided.
 */
function normaliseProduct(payload) {
  const allowed = [
    'slug',
    'title',
    'short_description',
    'description',
    'category_slug',
    'format',
    'price_paise',
    'compare_at_paise',
    'currency',
    'status',
    'featured',
    'cover_image_url',
    'gallery_urls',
    'includes',
    'requirements',
    'license_type',
    'license_summary',
    'support_policy',
    'refund_policy',
    'faqs',
    'tags',
    'version',
    'release_notes',
    'published_at',
  ]

  const out = {}
  for (const key of allowed) {
    if (payload[key] !== undefined) out[key] = payload[key]
  }
  return out
}

// --- categories ------------------------------------------------------------

export async function getAllCategories() {
  const { data, error } = await supabase
    .from(CATEGORIES)
    .select('*')
    .order('display_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createCategory(payload) {
  const { data, error } = await supabase
    .from(CATEGORIES)
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCategory(id, payload) {
  const { error } = await supabase.from(CATEGORIES).update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteCategory(id) {
  const { error } = await supabase.from(CATEGORIES).delete().eq('id', id)
  if (error) throw error
}

// --- product files (private bucket) ----------------------------------------

export async function getProductFiles(productId) {
  const { data, error } = await supabase
    .from(FILES)
    .select('*')
    .eq('product_id', productId)
    .order('display_order', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Upload a file into the PRIVATE bucket, then record its metadata.
 * The returned `storage_path` is never a working public URL: download access
 * is only ever granted by /api/download after an entitlement check.
 */
export async function uploadProductFile({ productId, file, version = '1.0.0', isPreview = false, displayOrder = 0 }) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `products/${productId}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' })

  if (uploadError) throw uploadError

  try {
    const { data, error } = await supabase
      .from(FILES)
      .insert({
        product_id: productId,
        storage_path: path,
        filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size || 0,
        version,
        is_preview: isPreview,
        display_order: displayOrder,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    // Do not leave an orphaned object behind if the row could not be saved.
    await supabase.storage.from(PRIVATE_BUCKET).remove([path]).catch(() => {})
    throw err
  }
}

export async function deleteProductFile(fileId, storagePath) {
  const { error } = await supabase.from(FILES).delete().eq('id', fileId)
  if (error) throw error

  if (storagePath) {
    await supabase.storage.from(PRIVATE_BUCKET).remove([storagePath]).catch(() => {})
  }
}

// --- orders & entitlements (read-only for admins) --------------------------

export async function getAllOrders(limit = 200) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function getOrderItems(orderIds = []) {
  if (orderIds.length === 0) return []

  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds)

  if (error) throw error
  return data || []
}

export async function getAllEntitlements(limit = 500) {
  const { data, error } = await supabase
    .from('entitlements')
    .select('*')
    .order('granted_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function revokeEntitlement(id) {
  const { error } = await supabase
    .from('entitlements')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

/**
 * Aggregate a coarse sales summary on the client from the orders the admin
 * is allowed to see. Kept deliberately simple; a real reporting workload
 * should move to a SQL view or RPC.
 */
export function summariseOrders(orders) {
  const paid = orders.filter((o) => o.payment_status === 'paid')
  const totalPaise = paid.reduce((sum, o) => sum + (Number(o.total_paise) || 0), 0)

  return {
    total: orders.length,
    paid: paid.length,
    pending: orders.filter((o) => o.payment_status === 'pending').length,
    failed: orders.filter((o) => ['failed', 'cancelled'].includes(o.payment_status)).length,
    refunded: orders.filter((o) => o.payment_status === 'refunded').length,
    revenuePaise: totalPaise,
  }
}
