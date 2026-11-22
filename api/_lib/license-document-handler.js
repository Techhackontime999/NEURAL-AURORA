// ---------------------------------------------------------------------------
// Downloadable license document.
//
// Shared implementation for /api/license-document. The public endpoint is kept
// by a rewrite to /api/license?action=document, so Vercel builds one function
// instead of two. This file lives in _lib and is not a route of its own.
//
// The document is generated from the stored license row, never from decorative
// client data. Ownership is checked server-side with the same rules used by
// the download endpoint: verified account id or verified session email.
// No one can fetch another customer's license by guessing an id.
// ---------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js')
const { newRequestId, envPresence, logError, SUPABASE_ENV_NAMES } = require('./diag')
const { buildLicensePdf, safeFilename } = require('./license-pdf')
const { fetchSignatureImage } = require('./document-signature')

module.exports = async function licenseDocument(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestId = newRequestId()
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey || supabaseUrl === 'https://placeholder.supabase.co') {
    logError('license-document', requestId, {
      stage: 'env-check',
      env: envPresence(SUPABASE_ENV_NAMES),
    })
    return res.status(503).json({ error: 'License documents are unavailable right now.' })
  }

  const header = req.headers?.authorization || req.headers?.Authorization || ''
  if (!header.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'Please sign in to view this license.' })
  }

  let user
  try {
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const { data, error } = await supabase.auth.getUser(header.slice(7).trim())
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
    }
    user = data.user

    if (!user.email || !user.email_confirmed_at) {
      return res.status(403).json({ error: 'Your account needs a verified email address.' })
    }

    const rawId = String(req.query?.id || '').trim()
    if (!/^\d+$/.test(rawId)) {
      return res.status(400).json({ error: 'A valid license reference is required.' })
    }

    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select(
        `id, license_ref, license_key, license_type, terms, seats, status,
         expires_at, issued_at, created_at, customer_email, user_id,
         products (title, slug)`
      )
      .eq('id', Number(rawId))
      .maybeSingle()

    if (licenseError) throw licenseError

    const ownsLicense =
      license &&
      (license.user_id === user.id ||
        (license.customer_email &&
          String(license.customer_email).toLowerCase() === String(user.email).toLowerCase()))

    // Same response for "missing" and "not yours": ids must not be enumerable.
    if (!ownsLicense) {
      return res.status(404).json({ error: 'License not found.' })
    }

    // Signature is decorative: if settings are missing, stale or unreachable,
    // still issue the certificate. Never let an image failure block a licence.
    let signature = null
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('admin_settings')
        .select('document_signature')
        .eq('id', 1)
        .maybeSingle()
      if (settingsError) throw settingsError
      signature = await fetchSignatureImage(settings?.document_signature, requestId)
    } catch (err) {
      logError('license-document', requestId, { stage: 'signature-skipped', message: err?.message })
    }

    const pdf = await buildLicensePdf({
      ...license,
      product_title: license.products?.title || license.products?.slug || '',
      issuer: 'NEURAL AURORA',
      signature,
    })

    const filename = safeFilename(`license-${license.license_ref || license.id}`)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`)
    res.setHeader('Content-Length', String(pdf.length))
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    return res.status(200).send(pdf)
  } catch (err) {
    logError('license-document', requestId, { stage: 'exception', message: err?.message })
    return res.status(500).json({ error: 'Could not prepare your license document.' })
  }
}
