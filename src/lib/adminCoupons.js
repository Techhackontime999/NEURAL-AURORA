// ---------------------------------------------------------------------------
// Admin coupon CRUD. RLS restricts every call to admins; the anon key is never
// used here. No discount arithmetic lives in the browser — these helpers only
// move configuration in and out of the `coupons` table.
// ---------------------------------------------------------------------------

import { supabase } from './supabase'

const TABLE = 'coupons'
const FIELDS = [
  'code',
  'description',
  'discount_type',
  'value',
  'min_subtotal_paise',
  'max_discount_paise',
  'product_slugs',
  'starts_at',
  'expires_at',
  'usage_limit',
  'per_customer_limit',
  'first_order_only',
  'active',
]

export function normaliseCouponPayload(payload = {}) {
  const out = {}
  for (const field of FIELDS) {
    if (field in payload) out[field] = payload[field]
  }

  if ('code' in out) {
    out.code = String(out.code || '')
      .trim()
      .replace(/\s+/g, '')
      .toUpperCase()
      .slice(0, 24)
  }
  if ('description' in out) out.description = String(out.description || '').slice(0, 240)
  if ('discount_type' in out) {
    out.discount_type = out.discount_type === 'percent' ? 'percent' : 'fixed'
  }

  for (const field of ['value', 'min_subtotal_paise', 'per_customer_limit']) {
    if (field in out) out[field] = Math.max(0, Math.trunc(Number(out[field]) || 0))
  }
  for (const field of ['max_discount_paise', 'usage_limit']) {
    if (field in out) {
      const raw = out[field] === '' || out[field] == null ? null : Number(out[field])
      out[field] = Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : null
    }
  }

  if ('product_slugs' in out) {
    out.product_slugs = Array.isArray(out.product_slugs)
      ? out.product_slugs.map((slug) => String(slug).trim().toLowerCase()).filter(Boolean)
      : []
  }
  for (const field of ['starts_at', 'expires_at']) {
    if (field in out) out[field] = out[field] || null
  }
  for (const field of ['first_order_only', 'active']) {
    if (field in out) out[field] = Boolean(out[field])
  }

  return out
}

export async function listCoupons() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createCoupon(payload) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(normaliseCouponPayload(payload))
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCoupon(id, payload) {
  const { error } = await supabase
    .from(TABLE)
    .update({ ...normaliseCouponPayload(payload), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteCoupon(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

/** Recent redemptions for one coupon, used by the admin usage panel. */
export async function listCouponRedemptions(couponId, limit = 12) {
  const { data, error } = await supabase
    .from('coupon_redemptions')
    .select('id, order_ref, customer_email, discount_paise, created_at')
    .eq('coupon_id', couponId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}
