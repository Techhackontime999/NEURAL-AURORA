const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { newRequestId, envPresence, logError, SUPABASE_ENV_NAMES } = require('./diag')

function getServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://placeholder.supabase.co') return null
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
}

async function requireUser(req, supabase) {
  const header = req.headers?.authorization || req.headers?.Authorization || ''
  if (!header.toLowerCase().startsWith('bearer ')) return null
  const token = header.slice(7).trim()
  if (!token) return null
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

function makeApplicationRef() {
  return `CA-${new Date().toISOString().slice(0, 4)}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`
}

function cleanText(value, max) {
  return String(value || '').trim().slice(0, max)
}

/**
 * Contributor access is opt-in per product. An applicant may name a product,
 * but only a published, contributor-eligible product can be requested. This is
 * validated server-side because a browser can send any id it likes.
 */
async function resolveRequestedProduct(supabase, rawId) {
  if (rawId === undefined || rawId === null || rawId === '') return { productId: null, error: null }

  const productId = Number(rawId)
  if (!Number.isInteger(productId) || productId <= 0) {
    return { productId: null, error: 'Choose a valid contributor product.' }
  }

  const { data: product, error } = await supabase
    .from('products')
    .select('id, title, status, contributor_access')
    .eq('id', productId)
    .maybeSingle()
  if (error) return { productId: null, error: 'Could not verify that product right now.', lookupError: error }
  if (!product || product.status !== 'published' || product.contributor_access !== true) {
    return { productId: null, error: 'That product is not available under contributor access.' }
  }
  return { productId: product.id, error: null }
}

async function submitApplication(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const requestId = newRequestId()
  const supabase = getServiceClient()
  if (!supabase) {
    logError('contributor-application', requestId, { stage: 'env-check', env: envPresence(SUPABASE_ENV_NAMES) })
    return res.status(503).json({ error: 'Contributor applications are unavailable right now.' })
  }

  const user = await requireUser(req, supabase)
  if (!user?.email) return res.status(401).json({ error: 'Please sign in to submit an application.' })

  const fullName = cleanText(req.body?.full_name, 120)
  const githubProfile = cleanText(req.body?.github_profile, 200)
  const contributionSummary = cleanText(req.body?.contribution_summary, 4000)
  const intendedUse = cleanText(req.body?.intended_use, 1000)
  const personalUse = req.body?.personal_use_attestation === true
  const noCommercial = req.body?.no_commercial_use_attestation === true
  const noRedistribution = req.body?.no_redistribution_attestation === true

  if (fullName.length < 1) return res.status(400).json({ error: 'Full name is required.' })
  if (contributionSummary.length < 10) {
    return res.status(400).json({ error: 'Please describe your contribution (at least 10 characters).' })
  }
  if (!personalUse || !noCommercial || !noRedistribution) {
    return res.status(400).json({
      error: 'You must confirm personal-use-only, no commercial/client deployment, and no redistribution/transfer terms.',
    })
  }

  const { productId, error: productError, lookupError } = await resolveRequestedProduct(
    supabase,
    req.body?.requested_product_id ?? req.body?.product_id
  )
  if (productError) {
    if (lookupError) {
      logError('contributor-application', requestId, { stage: 'product-lookup', message: lookupError.message })
    }
    return res.status(400).json({ error: productError })
  }

  const email = String(user.email).trim().toLowerCase()

  // Prevent duplicate pending/under_review applications for the same email.
  const { data: existing, error: existingError } = await supabase
    .from('contributor_applications')
    .select('id, application_ref, status')
    .eq('email', email)
    .in('status', ['pending', 'under_review'])
    .limit(1)
    .maybeSingle()

  if (existingError) {
    logError('contributor-application', requestId, { stage: 'lookup', message: existingError.message })
    return res.status(500).json({ error: 'Could not submit your application right now.' })
  }
  if (existing) {
    return res.status(409).json({
      error: 'You already have an active contributor application.',
      application_ref: existing.application_ref,
      status: existing.status,
    })
  }

  const application = {
    application_ref: makeApplicationRef(),
    user_id: user.id,
    email,
    full_name: fullName,
    github_profile: githubProfile,
    contribution_summary: contributionSummary,
    intended_use: intendedUse,
    requested_product_id: productId,
    personal_use_attestation: true,
    no_commercial_use_attestation: true,
    no_redistribution_attestation: true,
    status: 'pending',
  }

  const { data: created, error: insertError } = await supabase
    .from('contributor_applications')
    .insert(application)
    .select('id, application_ref, status, created_at')
    .single()

  if (insertError) {
    logError('contributor-application', requestId, { stage: 'insert', message: insertError.message })
    return res.status(500).json({ error: 'Could not submit your application right now.' })
  }

  const { error: eventError } = await supabase.from('contributor_application_events').insert({
    application_id: created.id,
    action: 'submitted',
    old_status: null,
    new_status: 'pending',
    reason: 'Application submitted by user',
    actor_user_id: user.id,
    metadata: { application_ref: created.application_ref },
  })
  if (eventError) {
    logError('contributor-application', requestId, { stage: 'event-insert', message: eventError.message })
  }

  return res.status(201).json({
    application: created,
    message: 'Application submitted. An administrator will review it before any access is granted.',
  })
}

async function listMyApplications(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const requestId = newRequestId()
  const supabase = getServiceClient()
  if (!supabase) {
    logError('contributor-application', requestId, { stage: 'env-check', env: envPresence(SUPABASE_ENV_NAMES) })
    return res.status(503).json({ error: 'Contributor applications are unavailable right now.' })
  }

  const user = await requireUser(req, supabase)
  if (!user?.id) return res.status(401).json({ error: 'Please sign in.' })

  const { data, error } = await supabase
    .from('contributor_applications')
    .select(
      'id, application_ref, status, created_at, updated_at, reviewed_at, approved_at, review_notes, issued_license_id, requested_product_id, products (title, slug)'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    logError('contributor-application', requestId, { stage: 'list', message: error.message })
    return res.status(500).json({ error: 'Could not load your applications.' })
  }

  return res.status(200).json({ applications: data || [] })
}

module.exports = { submitApplication, listMyApplications }