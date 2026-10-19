const { newRequestId, envPresence, log, logError, SUPABASE_ENV_NAMES } = require('./_lib/diag')
const { getServiceClient } = require('./_lib/adminAuth')
const { normalisePhone } = require('./_lib/phone')

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

function requestOrigin(req) {
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '')
    .split(',')[0]
    .trim()
  if (!host) return null

  const proto = String(req.headers?.['x-forwarded-proto'] || 'https')
    .split(',')[0]
    .trim()

  return `${proto || 'https'}://${host}`
}

function actionLinkOf(data) {
  const link = data?.properties?.action_link || data?.action_link
  return typeof link === 'string' && link.startsWith('http') ? link : null
}

function isAlreadyRegistered(error) {
  const code = error?.code || ''
  const message = String(error?.message || '').toLowerCase()
  return (
    code === 'email_exists' ||
    message.includes('already been registered') ||
    message.includes('already registered') ||
    message.includes('already exists')
  )
}

/** Get latest customer phone for this email (digits-only, tolerant). */
async function latestCustomerPhone(supabase, email) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('customer_phone')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) return ''
    const row = (data || []).find((entry) => normalisePhone(entry?.customer_phone))
    return normalisePhone(row?.customer_phone)
  } catch {
    return ''
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestId = newRequestId()
  const supabase = getServiceClient()
  if (!supabase) {
    logError('customer-signin-link', requestId, {
      stage: 'env-check',
      env: envPresence(SUPABASE_ENV_NAMES),
    })
    return res.status(503).json({ error: 'Sign-in links are unavailable right now.' })
  }

  let email = String(req.body?.email || '').trim().toLowerCase()
  if (!email) {
    return res.status(400).json({ error: 'Provide the email address you used at checkout.' })
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'That does not look like a valid email address.' })
  }

  try {
    // Must have a purchase
    const { data: existingOrder, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle()

    if (orderError) {
      logError('customer-signin-link', requestId, {
        stage: 'order-lookup-failed',
        db_error: orderError.message,
      })
      return res.status(500).json({ error: 'Could not verify your purchase.' })
    }
    if (!existingOrder) {
      return res.status(404).json({ error: 'No purchase found for that email address.' })
    }

    const origin = requestOrigin(req)
    const redirectTo = `${origin || ''}/library`.replace(/\/$/, '/library') || '/library'

    let link = null
    let accountCreated = false

    const generateOpts = {
      type: 'magiclink',
      email,
      options: { redirectTo },
    }

    const { data: linkData, error: generateError } = await supabase.auth.admin.generateLink(
      generateOpts
    )
    if (generateError) {
      if (isAlreadyRegistered(generateError)) {
        const retry = await supabase.auth.admin.generateLink(generateOpts)
        if (retry.error) {
          logError('customer-signin-link', requestId, {
            stage: 'generate-link-retry-failed',
            auth_error: retry.error.message,
          })
          return res.status(500).json({ error: 'Could not generate a sign-in link.' })
        }
        link = actionLinkOf(retry.data)
      } else {
        logError('customer-signin-link', requestId, {
          stage: 'generate-link-failed',
          auth_error: generateError.message,
        })
        return res.status(500).json({ error: 'Could not generate a sign-in link.' })
      }
    } else {
      link = actionLinkOf(linkData)
      accountCreated = !!(linkData?.user?.created_at && linkData?.user?.last_sign_in_at === null)
    }

    if (!link) {
      logError('customer-signin-link', requestId, { stage: 'link-missing' })
      return res.status(500).json({ error: 'Could not generate a sign-in link.' })
    }

    const phone = await latestCustomerPhone(supabase, email)

    log('customer-signin-link', requestId, {
      stage: 'ok',
      email_domain: email.split('@')[1] || '',
      account_created: accountCreated,
      has_phone: !!phone,
    })

    return res.status(200).json({
      ok: true,
      email,
      link,
      redirect_to: redirectTo,
      account_created: accountCreated,
      phone: phone || null,
    })
  } catch (error) {
    logError('customer-signin-link', requestId, {
      stage: 'exception',
      message: error?.message,
    })
    return res.status(500).json({ error: 'Could not generate a sign-in link.' })
  }
}
