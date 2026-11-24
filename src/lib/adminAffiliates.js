// ---------------------------------------------------------------------------
// Admin affiliate management. RLS restricts every call to admins. Commission
// amounts are NEVER entered here: an admin only moves an earned ledger row
// through its payout states and records the external bank/UPI reference.
// ---------------------------------------------------------------------------

import { supabase } from './supabase'

const TABLE = 'affiliates'
const FIELDS = [
  'code',
  'display_name',
  'email',
  'commission_bps',
  'product_slugs',
  'status',
  'notes',
]

export const AFFILIATE_STATUSES = ['active', 'paused', 'pending']
export const COMMISSION_STATUSES = ['pending', 'approved', 'paid', 'void']

export function normaliseCode(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .slice(0, 24)
}

export function isValidCode(value) {
  return /^[A-Z0-9][A-Z0-9_-]{2,23}$/.test(normaliseCode(value))
}

export function percentToBps(value) {
  const percent = Number(value)
  if (!Number.isFinite(percent)) return 0
  return Math.max(0, Math.min(10000, Math.round(percent * 100)))
}

export function bpsToPercent(value) {
  return (Number(value) || 0) / 100
}

export function normaliseAffiliatePayload(payload = {}) {
  const out = {}
  for (const field of FIELDS) {
    if (field in payload) out[field] = payload[field]
  }

  if ('code' in out) out.code = normaliseCode(out.code)
  if ('display_name' in out) out.display_name = String(out.display_name || '').trim().slice(0, 120)
  if ('email' in out) {
    const email = String(out.email || '').trim().toLowerCase()
    out.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
  }
  if ('commission_bps' in out) out.commission_bps = percentToBps(out.commission_bps)
  if ('product_slugs' in out) {
    out.product_slugs = Array.isArray(out.product_slugs)
      ? [...new Set(out.product_slugs.map((slug) => String(slug).trim().toLowerCase()).filter(Boolean))]
      : []
  }
  if ('status' in out) {
    out.status = AFFILIATE_STATUSES.includes(out.status) ? out.status : 'paused'
  }
  if ('notes' in out) out.notes = String(out.notes || '').slice(0, 500)
  return out
}

export async function listAffiliates() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createAffiliate(payload) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(normaliseAffiliatePayload(payload))
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAffiliate(id, payload) {
  const { error } = await supabase
    .from(TABLE)
    .update({ ...normaliseAffiliatePayload(payload), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** Product slugs offered to the scope picker. */
export async function listProductOptions() {
  const { data, error } = await supabase
    .from('products')
    .select('slug, title')
    .order('title', { ascending: true })
    .limit(500)
  if (error) throw error
  return (data || []).filter((row) => row?.slug)
}

/** All or filtered ledger rows, newest first. */
export async function listAffiliateCommissions({ affiliateId = null, status = '', limit = 100 } = {}) {
  let query = supabase
    .from('affiliate_commissions')
    .select('id, affiliate_id, order_ref, net_paise, commission_bps, commission_paise, currency, status, payout_reference, paid_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (affiliateId) query = query.eq('affiliate_id', affiliateId)
  if (COMMISSION_STATUSES.includes(status)) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function approveCommission(id) {
  const { error } = await supabase
    .from('affiliate_commissions')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['pending'])
  if (error) throw error
}

export async function markCommissionPaid(id, reference) {
  const { error } = await supabase
    .from('affiliate_commissions')
    .update({
      status: 'paid',
      payout_reference: String(reference || '').trim().slice(0, 120),
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .in('status', ['pending', 'approved'])
  if (error) throw error
}

export async function voidCommission(id) {
  const { error } = await supabase
    .from('affiliate_commissions')
    .update({ status: 'void', updated_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['pending', 'approved'])
  if (error) throw error
}
