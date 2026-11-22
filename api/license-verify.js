// ---------------------------------------------------------------------------
// Optional online license verification.
//
// This endpoint answers ONE narrow question: does this key belong to this
// product, and is it currently active? It never returns the customer's name,
// email, order or the key itself. Keys are looked up by SHA-256 hash, and a
// small hashed ledger makes blind guessing noisy. Signing secrets are never
// exposed — verification is a database lookup, not a locally forged token.
// ---------------------------------------------------------------------------

const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { newRequestId, envPresence, logError, SUPABASE_ENV_NAMES } = require('./_lib/diag')
const { hashLicenseKey } = require('./_lib/license')

const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 20

function callerHash(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim()
  const address = forwarded || String(req.headers?.['x-real-ip'] || 'unknown')
  const agent = String(req.headers?.['user-agent'] || '')
  return crypto.createHash('sha256').update(`${address}|${agent}`).digest('hex')
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey || supabaseUrl === 'https://placeholder.supabase.co') {
    logError('license-verify', newRequestId(), {
      stage: 'env-check',
      env: envPresence(SUPABASE_ENV_NAMES),
    })
    return res.status(503).json({ error: 'License verification is unavailable right now.' })
  }

  const rawSlug = String(req.body?.product_slug || '').trim().toLowerCase()
  const rawKey = String(req.body?.license_key || '').trim()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rawSlug) || rawKey.length < 12 || rawKey.length > 80) {
    return res.status(400).json({ valid: false })
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const hash = callerHash(req)

  try {
    const since = new Date(Date.now() - WINDOW_MS).toISOString()
    const { count, error: countError } = await supabase
      .from('license_verification_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('caller_hash', hash)
      .gte('created_at', since)

    if (countError) throw countError
    if ((count || 0) >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many verification attempts. Try again shortly.' })
    }

    const keyHash = hashLicenseKey(crypto, rawKey)
    const [{ data: product, error: productError }, { data: license, error: licenseError }] =
      await Promise.all([
        supabase.from('products').select('id').eq('slug', rawSlug).maybeSingle(),
        supabase
          .from('licenses')
          .select('id, status, license_type, expires_at, product_id')
          .eq('key_hash', keyHash)
          .maybeSingle(),
      ])

    if (productError || licenseError) throw productError || licenseError

    const matched = Boolean(
      product && license && product.id === license.product_id
    )
    const recordError = await supabase.from('license_verification_attempts').insert({
      caller_hash: hash,
      product_slug: rawSlug,
      successful: matched,
    })
    if (recordError.error) throw recordError.error

    if (!matched) return res.status(200).json({ valid: false })

    return res.status(200).json({
      valid: license.status === 'active',
      status: license.status,
      license_type: license.license_type,
      expires_at: license.expires_at || null,
      product_slug: rawSlug,
    })
  } catch (err) {
    logError('license-verify', newRequestId(), { stage: 'exception', message: err?.message })
    return res.status(503).json({ error: 'License verification is unavailable right now.' })
  }
}
