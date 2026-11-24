// ---------------------------------------------------------------------------
// Administrator license management.
//
// Authorization is always server-side through the shared admin gate. Status
// changes and reissues are recorded in `license_events` with the admin actor
// and a reason, so an action can never be silent or unattributed.
// ---------------------------------------------------------------------------

const crypto = require('crypto')
const { newRequestId, envPresence, logError, SUPABASE_ENV_NAMES } = require('./_lib/diag')
const { getServiceClient, requireAdmin } = require('./_lib/adminAuth')
const { handleAdminContributor } = require('./_lib/admin-contributor-handler')
const {
  generateLicenseKey,
  generateLicenseRef,
  hashLicenseKey,
} = require('./_lib/license')

const ALLOWED_ACTIONS = new Set(['suspend', 'revoke', 'reinstate', 'reissue', 'delete'])

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey || supabaseUrl === 'https://placeholder.supabase.co') {
    logError('admin-license', newRequestId(), {
      stage: 'env-check',
      env: envPresence(SUPABASE_ENV_NAMES),
    })
    return res.status(503).json({ error: 'License management is unavailable right now.' })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return res.status(503).json({ error: 'License management is unavailable right now.' })
  }

  const admin = await requireAdmin(req, supabase)
  if (!admin) {
    return res.status(403).json({ error: 'Administrator access required.' })
  }

  const requestId = newRequestId()

  try {
    const resource = String(req.query?.resource || req.body?.resource || '').trim().toLowerCase()
    if (resource === 'contributor-applications' || resource === 'contributor_application') {
      return await handleAdminContributor(req, res)
    }
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('licenses')
        .select(
          `id, license_ref, license_type, status, seats, issued_at, expires_at,
           revoked_at, revocation_reason, customer_email, product_id,
           products (title, slug), orders (order_ref)`
        )
        .order('issued_at', { ascending: false })
        .limit(200)

      if (error) throw error

      const term = String(req.query?.search || '').trim().toLowerCase()
      const status = String(req.query?.status || '').trim()
      const rows = (data || []).filter((row) => {
        if (status && row.status !== status) return false
        if (!term) return true
        return [
          row.license_ref,
          row.customer_email,
          row.products?.title,
          row.products?.slug,
          row.orders?.order_ref,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      })

      const ids = rows.map((row) => row.id)
      const { data: events, error: eventsError } = ids.length
        ? await supabase
            .from('license_events')
            .select('id, license_id, action, reason, created_at')
            .in('license_id', ids)
            .order('created_at', { ascending: false })
            .limit(400)
        : { data: [], error: null }

      if (eventsError) throw eventsError

      return res.status(200).json({
        licenses: rows,
        events: events || [],
      })
    }

    const id = String(req.body?.id || '').trim()
    const action = String(req.body?.action || '').trim().toLowerCase()
    const reason = String(req.body?.reason || '').trim().slice(0, 500)

    if (!/^\d+$/.test(id) || !ALLOWED_ACTIONS.has(action)) {
      return res.status(400).json({ error: 'A valid license and action are required.' })
    }
    if (['suspend', 'revoke', 'delete'].includes(action) && reason.length < 3) {
      return res.status(400).json({ error: 'A reason is required for this change.' })
    }

    const { data: license, error: lookupError } = await supabase
      .from('licenses')
      .select('id, license_ref, status, license_key, license_option_id, product_id, customer_email, user_id, entitlement_id')
      .eq('id', Number(id))
      .maybeSingle()

    if (lookupError) throw lookupError
    if (!license) return res.status(404).json({ error: 'License not found.' })

    if (action === 'delete') {
      // Write the audit row first and embed the reference in its reason: the
      // license id is about to disappear. The event's foreign key is SET NULL
      // on delete, so the audit trail itself survives.
      const auditReason = `Deleted by administrator · ${license.license_ref}${reason ? ` · ${reason}` : ''}`
      const { error: auditError } = await supabase.from('license_events').insert({
        license_id: license.id,
        action: 'deleted',
        reason: auditReason.slice(0, 500),
        actor_user_id: admin.id,
      })
      if (auditError) throw auditError

      if (license.entitlement_id) {
        const { error: entitlementSyncError } = await supabase
          .from('entitlements')
          .update({ status: 'revoked', revoked_at: new Date().toISOString() })
          .eq('id', license.entitlement_id)
        if (entitlementSyncError) throw entitlementSyncError
      }

      const { error: deleteError } = await supabase
        .from('licenses')
        .delete()
        .eq('id', license.id)
      if (deleteError) throw deleteError

      logError('admin-license', requestId, {
        stage: 'audit',
        action,
        license_id: license.id,
        actor: admin.id,
      })
      return res.status(200).json({ deleted: true, license_ref: license.license_ref, action })
    }

    const now = new Date().toISOString()
    const patch = { updated_at: now }

    if (action === 'suspend') {
      if (license.status === 'revoked') {
        return res.status(409).json({ error: 'A revoked license cannot be suspended.' })
      }
      patch.status = 'suspended'
      patch.revocation_reason = reason
    } else if (action === 'revoke') {
      patch.status = 'revoked'
      patch.revoked_at = now
      patch.revocation_reason = reason
    } else if (action === 'reinstate') {
      if (!['suspended', 'revoked', 'expired'].includes(license.status)) {
        return res.status(409).json({ error: 'Only a suspended, revoked or expired license can be reinstated.' })
      }
      patch.status = 'active'
      patch.revoked_at = null
      patch.revocation_reason = ''
    } else if (action === 'reissue') {
      const key = generateLicenseKey(crypto, 'na')
      patch.license_key = key
      patch.key_hash = hashLicenseKey(crypto, key)
      patch.license_ref = generateLicenseRef(crypto)
    }

    const { data: updated, error: updateError } = await supabase
      .from('licenses')
      .update(patch)
      .eq('id', license.id)
      .select('id, license_ref, license_type, status, seats, issued_at, expires_at')
      .maybeSingle()

    if (updateError) throw updateError

    if (license.entitlement_id && ['suspend', 'revoke', 'reinstate'].includes(action)) {
      const entitlementPatch = action === 'reinstate'
        ? { status: 'active', revoked_at: null }
        : { status: 'revoked', revoked_at: now }
      const { error: entitlementSyncError } = await supabase
        .from('entitlements')
        .update(entitlementPatch)
        .eq('id', license.entitlement_id)
      if (entitlementSyncError) throw entitlementSyncError
    }

    const { error: eventError } = await supabase.from('license_events').insert({
      license_id: license.id,
      action,
      reason: reason || (action === 'reissue' ? 'Key rotated by administrator' : ''),
      actor_user_id: admin.id,
    })
    if (eventError) throw eventError

    logError('admin-license', requestId, {
      stage: 'audit',
      action,
      license_id: license.id,
      actor: admin.id,
    })

    return res.status(200).json({ license: updated, action })
  } catch (err) {
    logError('admin-license', requestId, { stage: 'exception', message: err?.message })
    return res.status(500).json({ error: 'Could not complete the license action.' })
  }
}
