// ---------------------------------------------------------------------------
// Centralised entitlement / grant authorisation helpers.
//
// This module is the server-side policy point for protected digital access.
// Callers must still authenticate the principal and resolve the requested
// resource; this module decides whether an entitlement/grant actually permits
// access.
//
// APPROVED_CONTRIBUTOR_PERSONAL grants are personal-use only. They are not
// commercial, not transferable, not organisation/company-wide, and not a
// substitute for paid/enterprise entitlements. Technical enforcement here is
// intentionally fail-closed: inactive, expired, revoked, suspended, or
// out-of-scope grants do not unlock protected downloads.
// ---------------------------------------------------------------------------

const ACTIVE_LICENSE_STATUSES = new Set(['active'])
const CONTRIBUTOR_PERSONAL_GRANT_TYPE = 'APPROVED_CONTRIBUTOR_PERSONAL'
const CONTRIBUTOR_PERSONAL_SOURCE = 'approved_contributor_personal'

function isExpired(expiresAt, now = new Date()) {
  if (!expiresAt) return false
  const date = new Date(expiresAt)
  return !Number.isNaN(date.getTime()) && date.getTime() <= now.getTime()
}

function normaliseScope(scope) {
  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) return {}
  return scope
}

function scopeAllowsPersonalUse(scope) {
  const s = normaliseScope(scope)
  if (s.personal_use_only === false) return false
  if (s.commercial_use === true) return false
  if (s.organisation_use === true || s.organization_use === true) return false
  if (s.client_deployment === true) return false
  if (s.redistribution === true) return false
  if (s.transferable === true) return false
  return true
}

async function loadLicenseForEntitlement(supabase, entitlement) {
  if (!entitlement?.id) return { license: null, error: null }

  const { data, error } = await supabase
    .from('licenses')
    .select(
      'id, status, expires_at, grant_type, grant_source, scope, license_type, user_id, customer_email, product_id'
    )
    .eq('entitlement_id', entitlement.id)
    .order('issued_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { license: data || null, error }
}

/**
 * Evaluate whether an active entitlement grants access to a protected download.
 * Returns { ok: true, entitlement, license } or { ok: false, status, error }.
 */
async function authorizeEntitlementDownload(supabase, entitlement, { now = new Date() } = {}) {
  if (!entitlement || entitlement.status !== 'active') {
    return { ok: false, status: 403, error: 'You do not have access to this product.' }
  }

  if (entitlement.source !== CONTRIBUTOR_PERSONAL_SOURCE) {
    return { ok: true, entitlement, license: null }
  }

  const { license, error } = await loadLicenseForEntitlement(supabase, entitlement)
  if (error) {
    return { ok: false, status: 500, error: 'Could not verify your access right now.' }
  }
  if (!license) {
    return { ok: false, status: 403, error: 'This contributor grant is not available for download.' }
  }

  if (license.grant_type !== CONTRIBUTOR_PERSONAL_GRANT_TYPE) {
    return { ok: false, status: 403, error: 'This grant is not valid for this access.' }
  }

  if (!ACTIVE_LICENSE_STATUSES.has(String(license.status || '').toLowerCase())) {
    return { ok: false, status: 403, error: 'This contributor license is not active.' }
  }

  if (isExpired(license.expires_at, now)) {
    return { ok: false, status: 403, error: 'This contributor license has expired.' }
  }

  if (!scopeAllowsPersonalUse(license.scope)) {
    return { ok: false, status: 403, error: 'This contributor license is not valid for this use.' }
  }

  return { ok: true, entitlement, license }
}

module.exports = {
  ACTIVE_LICENSE_STATUSES,
  CONTRIBUTOR_PERSONAL_GRANT_TYPE,
  CONTRIBUTOR_PERSONAL_SOURCE,
  isExpired,
  scopeAllowsPersonalUse,
  authorizeEntitlementDownload,
  loadLicenseForEntitlement,
}