// ---------------------------------------------------------------------------
// Affiliate applications.
//
// The public form may only submit an application. Status, commission rate and
// partner access stay admin-only in the database, and approval creates the
// ordinary affiliate row used by checkout. No new API function is involved.
// ---------------------------------------------------------------------------

import { supabase } from './supabase'
import { normaliseAffiliatePayload, normaliseCode, isValidCode } from './adminAffiliates'

export { isValidCode as isValidCodeFromPayload }
export const APPLICATION_STATUSES = ['pending', 'approved', 'rejected']
const DUPLICATE_CODE = 'AFFILIATE_APPLICATION_DUPLICATE'

export function normaliseApplicationPayload(payload = {}) {
  return {
    full_name: String(payload.full_name || '').trim().slice(0, 120),
    email: String(payload.email || '').trim().toLowerCase().slice(0, 254),
    proposed_code: normaliseCode(payload.proposed_code),
    channels: String(payload.channels || '').trim().slice(0, 240),
    message: String(payload.message || '').trim().slice(0, 2000),
  }
}

export function isValidApplicationEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function isDuplicateError(error) {
  return error?.code === '23505' || /duplicate|unique/i.test(String(error?.message || ''))
}

/** Public, anon-safe insert. The database trigger forces a pending status. */
export async function submitAffiliateApplication(payload) {
  const clean = normaliseApplicationPayload(payload)
  const { data, error } = await supabase
    .from('affiliate_applications')
    .insert(clean)
    .select('id')
    .single()

  if (error) {
    if (isDuplicateError(error)) {
      const duplicate = new Error('You already have a pending application with this email.')
      duplicate.code = DUPLICATE_CODE
      throw duplicate
    }
    throw error
  }
  return data
}

/** Admin-only queue. */
export async function listAffiliateApplications({ status = '' } = {}) {
  let query = supabase
    .from('affiliate_applications')
    .select('id, full_name, email, proposed_code, channels, message, status, review_notes, affiliate_id, created_at, reviewed_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (APPLICATION_STATUSES.includes(status)) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/**
 * Approve an application into the existing affiliate table.
 *
 * The admin chooses the final code and commission; the applicant's proposed
 * values are only a starting point. If the audit update fails, the freshly
 * created partner is removed so a failure cannot leave a half-approved row.
 */
export async function approveAffiliateApplication(application, settings = {}) {
  const bps = Number(settings.commission_bps)
  if (!isValidCode(settings.code)) throw new Error('Enter a valid referral code.')
  if (!String(settings.display_name || '').trim()) throw new Error('Enter the partner name.')
  if (!Number.isFinite(bps) || bps <= 0 || bps > 10000) {
    throw new Error('Commission must be between 0 and 100%.')
  }

  const affiliate = normaliseAffiliatePayload({
    code: settings.code,
    display_name: settings.display_name,
    email: settings.email,
    commission_bps: bps,
    product_slugs: settings.product_slugs || [],
    status: 'active',
    notes: settings.notes,
  })

  const { data: created, error: createError } = await supabase
    .from('affiliates')
    .insert(affiliate)
    .select()
    .single()
  if (createError) {
    if (isDuplicateError(createError)) {
      throw new Error('That code or email is already used by another partner.')
    }
    throw createError
  }

  const { data: updated, error: updateError } = await supabase
    .from('affiliate_applications')
    .update({
      status: 'approved',
      affiliate_id: created.id,
      review_notes: String(settings.notes || '').slice(0, 500),
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', application.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (updateError || !updated) {
    await supabase.from('affiliates').delete().eq('id', created.id)
    throw updateError || new Error('This application was already reviewed.')
  }
  return created
}

/** Admin-only rejection with an optional internal reason. */
export async function rejectAffiliateApplication(applicationId, notes = '') {
  const { data, error } = await supabase
    .from('affiliate_applications')
    .update({
      status: 'rejected',
      review_notes: String(notes || '').slice(0, 500),
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('This application was already reviewed.')
  return data
}
