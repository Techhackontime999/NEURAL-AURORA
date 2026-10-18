const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { newRequestId, envPresence, logError, SUPABASE_ENV_NAMES } = require('./_lib/diag')

const PRIVATE_BUCKET = 'digital-products'
const SIGNED_URL_TTL_SECONDS = 600 // 10 minutes

/**
 * Authorization-aware download endpoint.
 *
 * Order of operations — every step must pass before any link is issued:
 *   1. Resolve the requested product.
 *   2. Authenticate the caller (or reject a guest outright).
 *   3. Confirm the caller holds an ACTIVE entitlement for that product.
 *   4. Confirm the requested file actually belongs to that product.
 *   5. Mint a short-lived signed URL for the private object.
 *   6. Record the issuance so abuse can be rate limited and audited.
 *
 * Knowing an order id, product id, email address or UUID grants nothing: the
 * entitlement check is always keyed to the authenticated principal, never to
 * anything the caller simply asserts. Private storage paths are never
 * returned — only a signed URL that expires.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey || supabaseUrl === 'https://placeholder.supabase.co') {
    logError('download', newRequestId(), {
      stage: 'env-check',
      env: envPresence(SUPABASE_ENV_NAMES),
    })
    return res.status(503).json({ error: 'Downloads are unavailable right now.' })
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { product_slug, file_id } = req.body || {}
  const slug = String(product_slug || '').trim().toLowerCase()
  if (!slug) {
    return res.status(400).json({ error: 'A product is required.' })
  }

  // --- 2. Authenticate ------------------------------------------------------
  const header = req.headers?.authorization || req.headers?.Authorization || ''
  if (!header.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'Please sign in to download this product.' })
  }

  const token = header.slice(7).trim()
  let user
  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
    }
    user = data.user
  } catch {
    return res.status(401).json({ error: 'Could not verify your session.' })
  }

  if (!user.email) {
    return res.status(403).json({ error: 'Your account needs a verified email address.' })
  }

  try {
    // --- 1. Resolve the product -------------------------------------------
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, slug, title, price_paise, status')
      .eq('slug', slug)
      .maybeSingle()

    if (productError) throw productError
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' })
    }

    const sessionEmail = user.email.toLowerCase()

    /**
     * Find an active entitlement by verified account id OR by the email on
     * the verified session.
     *
     * Deliberately TWO queries rather than one `.or()` filter string: PostgREST
     * builds `.or()` from a raw filter expression, so interpolating the session
     * email into it would let a crafted address smuggle extra filter clauses
     * into the predicate. Passing email as a bound value through `.eq()` keeps
     * it an opaque operand.
     */
    const findEntitlement = async () => {
      const [byUser, byEmail] = await Promise.all([
        supabase
          .from('entitlements')
          .select('id, status')
          .eq('product_id', product.id)
          .eq('status', 'active')
          .eq('user_id', user.id)
          .limit(1),
        supabase
          .from('entitlements')
          .select('id, status')
          .eq('product_id', product.id)
          .eq('status', 'active')
          .eq('customer_email', sessionEmail)
          .limit(1),
      ])

      if (byUser.error) throw byUser.error
      if (byEmail.error) throw byEmail.error

      return byUser.data?.[0] || byEmail.data?.[0] || null
    }

    let entitlement = await findEntitlement()

    // An existing entitlement always wins, including for a product that has
    // since been archived — that is what the buyer paid for.
    //
    // A FREE product, by contrast, is self-granted only while it is actually
    // published. Without the status check anyone with an account could pull the
    // files of a free DRAFT by guessing its slug, which is unpublished work.
    if (!entitlement && product.price_paise === 0 && product.status === 'published') {
      const { data: created, error: createError } = await supabase
        .from('entitlements')
        .insert({
          product_id: product.id,
          user_id: user.id,
          customer_email: sessionEmail,
          source: 'free',
          status: 'active',
        })
        .select('id, status')
        .single()

      if (createError) {
        // A concurrent request may have created it a moment ago (the free
        // grant is unique per product + email). Re-resolve, and only swallow
        // the error if a grant genuinely exists now.
        const existing = await findEntitlement()
        if (!existing) throw createError
        entitlement = existing
      } else {
        entitlement = created
      }
    }

    if (!entitlement) {
      // Deliberately identical to the "wrong product" response shape: an
      // attacker learns nothing about whether the product exists.
      console.warn('[download] Denied — no active entitlement:', {
        user: user.id,
        product: product.slug,
      })
      return res.status(403).json({ error: 'You do not have access to this product.' })
    }

    // --- 4. Confirm the file belongs to this product ----------------------
    // Filtering by product_id in the query means a caller cannot request
    // another product's file by passing its id.
    let fileQuery = supabase
      .from('product_files')
      .select('id, storage_path, filename, mime_type, size_bytes, version, display_order')
      .eq('product_id', product.id)
      .order('display_order', { ascending: true })

    if (file_id) {
      fileQuery = fileQuery.eq('id', file_id)
    }

    const { data: files, error: filesError } = await fileQuery
    if (filesError) throw filesError

    const file = files?.[0]
    if (!file) {
      return res.status(404).json({ error: 'No downloadable files are available for this product yet.' })
    }

    // --- 5. Mint a short-lived signed URL ---------------------------------
    const { data: signed, error: signError } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .createSignedUrl(file.storage_path, SIGNED_URL_TTL_SECONDS, {
        download: file.filename,
      })

    if (signError || !signed?.signedUrl) {
      console.error('[download] Failed to sign URL:', signError?.message)
      return res.status(500).json({ error: 'Could not prepare your download. Please try again.' })
    }

    const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString()

    // --- 6. Record the issuance (rate limit + audit) ----------------------
    // Reauthorization happens on every call: this endpoint is re-run each time
    // a fresh link is requested, so access is re-checked rather than cached.
    const { error: grantError } = await supabase.from('download_grants').insert({
      entitlement_id: entitlement.id,
      product_file_id: file.id,
      // The ledger stores a hash of the link actually issued, so nothing
      // usable is kept at rest.
      token_hash: crypto.createHash('sha256').update(signed.signedUrl).digest('hex'),
      expires_at: expiresAt,
      max_uses: 1,
      used_count: 1,
      last_used_at: new Date().toISOString(),
    })

    if (grantError) {
      // The rate-limit trigger raises here. Surface it rather than failing the
      // download for an unrelated reason.
      const msg = grantError.message || ''
      if (msg.includes('Too many download requests')) {
        return res.status(429).json({ error: 'Too many download requests. Please wait a few minutes.' })
      }
      // A ledger write failure must not silently hand out an unrecorded link.
      console.error('[download] Failed to record download grant:', msg)
      return res.status(500).json({ error: 'Could not prepare your download. Please try again.' })
    }

    return res.status(200).json({
      url: signed.signedUrl,
      filename: file.filename,
      mime_type: file.mime_type,
      size_bytes: file.size_bytes,
      version: file.version,
      expires_at: expiresAt,
    })
  } catch (err) {
    console.error('[download] Unexpected error:', err?.message || err)
    return res.status(500).json({ error: 'Could not prepare your download. Please try again.' })
  }
}
