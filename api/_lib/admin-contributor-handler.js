const crypto = require('crypto')
const { newRequestId, logError } = require('./diag')
const { getServiceClient, requireAdmin } = require('./adminAuth')
const { generateLicenseKey, generateLicenseRef, hashLicenseKey } = require('./license')
const { CONTRIBUTOR_PERSONAL_GRANT_TYPE, CONTRIBUTOR_PERSONAL_SOURCE } = require('./entitlement-auth')

const PERSONAL_SCOPE = {
  personal_use_only: true,
  commercial_use: false,
  organization_use: false,
  client_deployment: false,
  redistribution: false,
  transferable: false,
  paid_enterprise_entitlements: false,
}

const PERSONAL_TERMS = [
  'Approved Contributor Personal Use License (APPROVED_CONTRIBUTOR_PERSONAL).',
  'Personal use only. No organisation/company-wide use.',
  'No commercial or client deployment. No resale, redistribution, sublicensing, or transfer.',
  'Does not include paid/enterprise entitlements or IP ownership transfer.',
  'This grant is issued only after explicit admin approval and may be suspended or revoked for misuse or policy violation.',
].join(' ')

function cleanText(value, max) {
  return String(value || '').trim().slice(0, max)
}

async function recordApplicationEvent(supabase, { applicationId, action, oldStatus, newStatus, reason, actorUserId, metadata }) {
  const { error } = await supabase.from('contributor_application_events').insert({
    application_id: applicationId,
    action,
    old_status: oldStatus || null,
    new_status: newStatus || null,
    reason: cleanText(reason, 500),
    actor_user_id: actorUserId || null,
    metadata: metadata || {},
  })
  if (error) throw error
}

async function listApplications(req, res, supabase) {
  const status = cleanText(req.query?.status, 40)
  const search = cleanText(req.query?.search, 120).toLowerCase()
  let query = supabase
    .from('contributor_applications')
    .select(
      'id, application_ref, user_id, email, full_name, github_profile, contribution_summary, intended_use, status, review_notes, reviewed_by, reviewed_at, approved_at, issued_license_id, requested_product_id, products (title, slug), created_at, updated_at'
    )
    .order('created_at', { ascending: false })
    .limit(200)
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error

  const rows = (data || []).filter((row) => {
    if (!search) return true
    return [row.application_ref, row.email, row.full_name, row.github_profile, row.status, row.products?.title, row.products?.slug]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search))
  })

  return res.status(200).json({ applications: rows })
}

async function reviewApplication(req, res, supabase, admin) {
  const id = Number(req.body?.id)
  const action = cleanText(req.body?.action, 40).toLowerCase()
  const reason = cleanText(req.body?.reason, 500)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'A valid application id is required.' })
  if (!['under_review', 'approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid review action.' })
  }
  if (action === 'reject' && reason.length < 3) {
    return res.status(400).json({ error: 'A reason is required to reject an application.' })
  }

  const { data: app, error: lookupError } = await supabase
    .from('contributor_applications')
    .select('id, application_ref, status, email, user_id')
    .eq('id', id)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (!app) return res.status(404).json({ error: 'Application not found.' })

  const now = new Date().toISOString()
  let patch = { reviewed_by: admin.id, reviewed_at: now, review_notes: reason, updated_at: now }
  let nextStatus = app.status
  let eventAction = 'note'

  if (action === 'under_review') {
    if (!['pending', 'under_review'].includes(app.status)) {
      return res.status(409).json({ error: 'Only pending applications can be moved to under review.' })
    }
    nextStatus = 'under_review'
    eventAction = 'under_review'
  } else if (action === 'approve') {
    if (!['pending', 'under_review'].includes(app.status)) {
      return res.status(409).json({ error: 'Only pending or under-review applications can be approved.' })
    }
    nextStatus = 'approved'
    eventAction = 'approved'
    patch.approved_at = now
  } else if (action === 'reject') {
    if (!['pending', 'under_review'].includes(app.status)) {
      return res.status(409).json({ error: 'Only pending or under-review applications can be rejected.' })
    }
    nextStatus = 'rejected'
    eventAction = 'rejected'
  }

  patch.status = nextStatus

  const { data: updated, error: updateError } = await supabase
    .from('contributor_applications')
    .update(patch)
    .eq('id', id)
    .eq('status', app.status)
    .select('id, application_ref, status, review_notes, reviewed_at, approved_at, issued_license_id')
    .maybeSingle()
  if (updateError) throw updateError
  if (!updated) return res.status(409).json({ error: 'Application state changed. Refresh and try again.' })

  await recordApplicationEvent(supabase, {
    applicationId: id,
    action: eventAction,
    oldStatus: app.status,
    newStatus,
    reason,
    actorUserId: admin.id,
    metadata: { application_ref: app.application_ref },
  })

  return res.status(200).json({ application: updated })
}

async function issueContributorLicense(req, res, supabase, admin) {
  const id = Number(req.body?.id)
  const productId = Number(req.body?.product_id)
  const reason = cleanText(req.body?.reason, 500)
  const expiresAtRaw = cleanText(req.body?.expires_at, 40)

  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'A valid application id is required.' })
  if (!Number.isInteger(productId) || productId <= 0) return res.status(400).json({ error: 'A valid product_id is required.' })
  if (reason.length < 3) return res.status(400).json({ error: 'A reason is required for issuance.' })

  let expiresAt = null
  if (expiresAtRaw) {
    const date = new Date(expiresAtRaw)
    if (Number.isNaN(date.getTime())) return res.status(400).json({ error: 'expires_at must be a valid date.' })
    expiresAt = date.toISOString()
  }

  const { data: app, error: appError } = await supabase
    .from('contributor_applications')
    .select('id, application_ref, status, email, user_id, full_name, issued_license_id, requested_product_id')
    .eq('id', id)
    .maybeSingle()
  if (appError) throw appError
  if (!app) return res.status(404).json({ error: 'Application not found.' })
  if (app.status !== 'approved') {
    return res.status(409).json({ error: 'Application must be explicitly approved before issuance.' })
  }
  if (app.issued_license_id) {
    return res.status(409).json({ error: 'This application already has an issued license.' })
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, title, slug, status, contributor_access')
    .eq('id', productId)
    .maybeSingle()
  if (productError) throw productError
  if (!product) return res.status(404).json({ error: 'Product not found.' })
  if (product.contributor_access !== true || product.status === 'archived') {
    return res.status(409).json({
      error: 'This product is not enabled for contributor access. Enable it on the product form first.',
    })
  }

  // Idempotency: if an active/pending contributor grant already exists for same product+email+source, refuse.
  const { data: existingEntitlement, error: entitlementLookupError } = await supabase
    .from('entitlements')
    .select('id, status')
    .eq('product_id', productId)
    .eq('customer_email', app.email)
    .eq('source', CONTRIBUTOR_PERSONAL_SOURCE)
    .is('order_item_id', null)
    .limit(1)
    .maybeSingle()
  if (entitlementLookupError) throw entitlementLookupError
  if (existingEntitlement) {
    return res.status(409).json({ error: 'An approved contributor personal entitlement already exists for this product and email.' })
  }

  // Create entitlement first (no order). Source is explicit and auditable.
  const { data: entitlement, error: entitlementError } = await supabase
    .from('entitlements')
    .insert({
      product_id: productId,
      order_id: null,
      order_item_id: null,
      user_id: app.user_id || null,
      customer_email: app.email,
      source: CONTRIBUTOR_PERSONAL_SOURCE,
      status: 'active',
    })
    .select('id')
    .single()
  if (entitlementError) throw entitlementError

  const key = generateLicenseKey(crypto, 'na')
  const now = new Date().toISOString()
  const licenseRow = {
    license_ref: generateLicenseRef(crypto),
    license_key: key,
    key_hash: hashLicenseKey(crypto, key),
    product_id: productId,
    order_id: null,
    order_item_id: null,
    entitlement_id: entitlement.id,
    license_option_id: null,
    user_id: app.user_id || null,
    customer_email: app.email,
    license_type: 'Approved Contributor Personal Use',
    terms: PERSONAL_TERMS,
    seats: 1,
    status: 'active',
    issued_at: now,
    expires_at: expiresAt,
    grant_type: CONTRIBUTOR_PERSONAL_GRANT_TYPE,
    grant_source: 'admin_grant',
    application_id: app.id,
    scope: PERSONAL_SCOPE,
    approved_by: admin.id,
    approved_at: app.approved_at || now,
    issued_by: admin.id,
  }

  const { data: license, error: licenseError } = await supabase
    .from('licenses')
    .insert(licenseRow)
    .select('id, license_ref, status, grant_type, issued_at, expires_at')
    .single()

  if (licenseError) {
    // Best-effort cleanup: remove entitlement if license insert fails.
    await supabase.from('entitlements').delete().eq('id', entitlement.id)
    throw licenseError
  }

  const { error: appUpdateError } = await supabase
    .from('contributor_applications')
    .update({
      issued_license_id: license.id,
      updated_at: now,
      review_notes: reason,
      reviewed_by: admin.id,
      reviewed_at: now,
    })
    .eq('id', app.id)
    .eq('status', 'approved')
    .is('issued_license_id', null)

  if (appUpdateError) throw appUpdateError

  await recordApplicationEvent(supabase, {
    applicationId: app.id,
    action: 'license_issued',
    oldStatus: 'approved',
    newStatus: 'approved',
    reason,
    actorUserId: admin.id,
    metadata: {
      application_ref: app.application_ref,
      license_id: license.id,
      entitlement_id: entitlement.id,
      product_id: productId,
      grant_type: CONTRIBUTOR_PERSONAL_GRANT_TYPE,
    },
  })

  const { error: licenseEventError } = await supabase.from('license_events').insert({
    license_id: license.id,
    action: 'grant_issued',
    reason: `APPROVED_CONTRIBUTOR_PERSONAL issued for application ${app.application_ref}: ${reason}`,
    actor_user_id: admin.id,
  })
  if (licenseEventError) throw licenseEventError

  return res.status(201).json({ license, entitlement_id: entitlement.id, application_ref: app.application_ref })
}

async function handleAdminContributor(req, res) {
  const requestId = newRequestId()
  const supabase = getServiceClient()
  if (!supabase) return res.status(503).json({ error: 'Contributor administration is unavailable right now.' })

  const admin = await requireAdmin(req, supabase)
  if (!admin) return res.status(403).json({ error: 'Administrator access required.' })

  try {
    if (req.method === 'GET') return await listApplications(req, res, supabase)
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const action = cleanText(req.body?.action, 40).toLowerCase()
    // The review UI sends the review action directly (under_review/approve/reject);
    // keep the older generic "review" envelope working too.
    if (action === 'review' || ['under_review', 'approve', 'reject'].includes(action)) {
      return await reviewApplication(req, res, supabase, admin)
    }
    if (action === 'issue') return await issueContributorLicense(req, res, supabase, admin)
    return res.status(400).json({ error: 'Invalid action.' })
  } catch (err) {
    logError('admin-contributor', requestId, { stage: 'exception', message: err?.message })
    return res.status(500).json({ error: 'Could not complete the contributor action.' })
  }
}

module.exports = { handleAdminContributor }