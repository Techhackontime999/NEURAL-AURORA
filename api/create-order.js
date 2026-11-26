const crypto = require('crypto')
const Razorpay = require('razorpay')
const { createClient } = require('@supabase/supabase-js')
const {
  collectRequestedItems,
  priceProductOrder,
  generateOrderRef,
} = require('./_lib/order-pricing')
const {
  newRequestId,
  envPresence,
  log,
  logError,
  SUPABASE_ENV_NAMES,
} = require('./_lib/diag')
const { normalisePhone } = require('./_lib/phone')
const { normaliseCouponCode, applyCoupon, REASONS } = require('./_lib/coupons')
const {
  normaliseAffiliateCode,
  isAffiliateCode,
} = require('./_lib/affiliate-commissions')

// Static fallback data when Supabase is unreachable or in offline dev mode
const fallbackServices = [
  {
    service_id: 'web-dev',
    title: 'Web Development',
    price_paise: 250000,
    pricing: [
      { label: 'Landing Page', price_paise: 150000 },
      { label: 'Multi-Page App', price_paise: 250000 },
      { label: 'E-commerce', price_paise: 500000 },
      { label: 'Custom Web App', price_paise: 1000000 },
    ],
  },
  {
    service_id: 'ui-ux',
    title: 'UI/UX Design',
    price_paise: 150000,
    pricing: [
      { label: 'UI Audit', price_paise: 80000 },
      { label: 'Wireframe & Prototype', price_paise: 150000 },
      { label: 'Design System', price_paise: 300000 },
      { label: 'Full Product Design', price_paise: 600000 },
    ],
  },
  {
    service_id: 'consulting',
    title: 'Technical Consulting',
    price_paise: 500000,
    pricing: [
      { label: 'Code Review', price_paise: 300000 },
      { label: 'Architecture Consult', price_paise: 500000 },
      { label: 'Team Workshop', price_paise: 800000 },
      { label: 'Fractional CTO', price_paise: 1500000 },
    ],
  },
  {
    service_id: 'custom-projects',
    title: 'Custom Projects',
    price_paise: 1000000,
    pricing: [
      { label: 'MVP Development', price_paise: 500000 },
      { label: 'Full Product', price_paise: 1000000 },
      { label: 'Integration', price_paise: 400000 },
      { label: 'Maintenance', price_paise: 200000 },
    ],
  },
]

const fallbackPackages = [
  { name: 'Starter', price_paise: 250000 },
  { name: 'Growth', price_paise: 700000 },
  { name: 'Enterprise', price_paise: 1500000 },
]

const fallbackDonationPresets = [100, 300, 500, 1000]

/**
 * Parses freeform price string like '2.5k', '500', '₹1,500' to paise
 */
function parsePriceStringToPaise(str) {
  if (!str || typeof str !== 'string') return 0
  const cleaned = str.replace(/[^0-9.kK]/g, '')
  if (!cleaned) return 0
  const isK = /k/i.test(cleaned)
  const num = parseFloat(cleaned.replace(/k/i, ''))
  if (isNaN(num) || num <= 0) return 0
  return isK ? Math.round(num * 1000 * 100) : Math.round(num * 100)
}

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://placeholder.supabase.co') {
    return null
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  })
}

/**
 * Resolve the caller's Supabase account from a Bearer token, if one was sent.
 * Returns null for guests. Never trusts a client-supplied user id.
 */
async function resolveSupabaseUser(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || ''
  if (!header.toLowerCase().startsWith('bearer ')) return null

  const token = header.slice(7).trim()
  if (!token) return null

  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return null
    return data.user
  } catch {
    return null
  }
}

/**
 * Unguessable, human-shareable order reference. It is an identifier for
 * support/reconciliation, never a credential: the order-status endpoint
 * returns status only, and downloads always require proof of ownership.
 */
function makeOrderRef() {
  return generateOrderRef(crypto)
}

/**
 * True only when the database rejected a write because a column does not exist
 * yet — i.e. the table is older than a migration. Used to keep selling while an
 * additive column is still pending, never to swallow any other failure.
 */
function isMissingColumnError(error, column) {
  if (!error) return false
  if (error.code === 'PGRST204') return true // PostgREST: column not in schema cache

  const message = String(error.message || '').toLowerCase()
  return message.includes(column.toLowerCase()) && /column|schema cache/.test(message)
}

/** A table from an additive migration that is not deployed yet. */
function isMissingRelationError(error, table) {
  if (!error) return false
  const message = String(error.message || '')
  return (
    message.includes(`relation "public.${table}" does not exist`) ||
    (message.includes(table) && /schema cache|does not exist/i.test(message))
  )
}

const COUPON_COLUMNS =
  'id, code, description, discount_type, value, min_subtotal_paise, max_discount_paise, ' +
  'product_slugs, starts_at, expires_at, usage_limit, uses_count, per_customer_limit, ' +
  'first_order_only, active'

/** Server-only coupon lookup. A missing table is a deployment issue, never a sale. */
async function loadCoupon(supabase, code) {
  const { data, error } = await supabase
    .from('coupons')
    .select(COUPON_COLUMNS)
    .eq('code', code)
    .maybeSingle()
  return { coupon: data || null, error }
}

/**
 * An unknown or paused referral code is ignored, never fatal: a bad affiliate
 * link must not stop someone from buying. Rates and product scope always come
 * from this server-loaded row.
 */
async function loadAffiliate(supabase, code, slugs) {
  if (!isAffiliateCode(code)) return { affiliate: null }
  const { data, error } = await supabase
    .from('affiliates')
    .select('id, code, display_name, commission_bps, status, product_slugs')
    .eq('code', code)
    .maybeSingle()
  if (error) return { error }

  const affiliate = data || null
  if (!affiliate || affiliate.status !== 'active') return { affiliate: null }

  const scoped = Array.isArray(affiliate.product_slugs)
    ? new Set(affiliate.product_slugs.map((slug) => String(slug).trim().toLowerCase()).filter(Boolean))
    : null
  if (scoped && scoped.size) {
    const eligible = (slugs || []).some((slug) => scoped.has(String(slug).trim().toLowerCase()))
    if (!eligible) return { affiliate: null }
  }
  return { affiliate }
}

/** Usage counters are read from the database, never from the browser. */
async function loadCouponUsage(supabase, coupon, email) {
  const { count: customerUses, error: redemptionError } = await supabase
    .from('coupon_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('coupon_id', coupon.id)
    .eq('customer_email', email)

  if (redemptionError) return { error: redemptionError }

  let customerOrders = null
  if (coupon.first_order_only === true) {
    const { count, error: orderError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .eq('payment_status', 'paid')
    if (orderError) return { error: orderError }
    customerOrders = count || 0
  }

  return { customerUses: customerUses || 0, customerOrders }
}

/**
 * Optimistic concurrency: the row is only claimed if its counter is still the
 * value we validated against. Two simultaneous buyers cannot both spend the
 * last slot of a limited coupon.
 */
async function claimCoupon(supabase, coupon) {
  const { data, error } = await supabase
    .from('coupons')
    .update({ uses_count: coupon.uses_count + 1 })
    .eq('id', coupon.id)
    .eq('uses_count', coupon.uses_count)
    .select('id')
    .maybeSingle()
  return { ok: Boolean(data), error }
}

/** Best-effort rollback when a claimed checkout fails before redemption. */
async function releaseCoupon(supabase, coupon) {
  await supabase
    .from('coupons')
    .update({ uses_count: coupon.uses_count })
    .eq('id', coupon.id)
    .eq('uses_count', coupon.uses_count + 1)
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestId = newRequestId()

  const {
    order_type,
    service_id,
    pricing_label,
    package_name,
    amount,
    custom_amount,
    currency: requestedCurrency = 'INR',
    notes = {},
    receipt,
    items,
    email,
    name,
    phone,
    // 'preview' prices a cart without writing an order or contacting Razorpay.
    mode,
    // Coupons and referrals are submitted as CODES only — never an amount.
    coupon_code: couponCodeInput,
    affiliate_code: affiliateCodeInput,
  } = req.body || {}

  // Product orders may carry a Supabase JWT so the entitlement can be bound to
  // a VERIFIED account rather than a client-asserted user id.
  const verifiedUser = await resolveSupabaseUser(req)
  let currency = requestedCurrency

  const supabase = getSupabaseClient()
  let verifiedAmountPaise = 0
  let verifiedNotes = { ...notes }
  // Non-null only for digital-store orders; used to persist the gateway
  // order id and return our own order reference.
  let digitalOrder = null
  // Assigned by the product branch so a gateway failure can release a claimed
  // coupon slot from the outer catch as well.
  let releaseCouponClaim = async () => {}

  try {
    // -------------------------------------------------------------------------
    // 1. Resolve & verify canonical price server-side based on item type
    // -------------------------------------------------------------------------
    const type = order_type ||
      (package_name ? 'package' : (pricing_label ? 'pricing_tier' : (service_id === 'support' ? 'support' : 'service')))

    if (mode === 'preview' && type !== 'product') {
      return res.status(400).json({ error: 'Preview is only available for product orders' })
    }

    if (type === 'product') {
      // -------------------------------------------------------------------------
      // DIGITAL STORE ORDER.
      //
      // The browser submits product SLUGS only — never a price. The canonical
      // price is read from the database, the total is computed here in integer
      // paise, and a pending order plus immutable item snapshots are persisted
      // before the gateway is asked for anything.
      //
      // There is deliberately NO static fallback for this branch: unlike the
      // service-support flow, a digital purchase must fail closed if the
      // database cannot be reached.
      // -------------------------------------------------------------------------
      // The service-role key is required, not merely preferred: writing an
      // order is a privileged operation and the anon key cannot satisfy RLS.
      // Requiring it here turns a confusing RLS failure into an honest 503.
      if (!supabase || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        logError('create-order', requestId, {
          stage: 'store-env-check',
          reason: !process.env.SUPABASE_SERVICE_ROLE_KEY
            ? 'missing SUPABASE_SERVICE_ROLE_KEY'
            : 'supabase client unavailable (SUPABASE_URL / VITE_SUPABASE_URL missing or placeholder)',
          env: envPresence(SUPABASE_ENV_NAMES),
        })
        return res.status(503).json({ error: 'Digital store is unavailable right now. Please try again shortly.' })
      }

      const collected = collectRequestedItems(items)
      if (!collected.ok) {
        return res.status(400).json({ error: collected.error })
      }

      log('create-order', requestId, {
        stage: 'product-initiated',
        distinct_items: collected.wanted.size,
        buyer_authenticated: Boolean(verifiedUser),
      })

      let { data: products, error: productError } = await supabase
        .from('products')
        .select('id, slug, title, price_paise, currency, status, version, document_policy')
        .in('slug', [...collected.wanted.keys()])

      // Safe rollout: code may reach a database that has not applied the
      // document-policy migration yet. Keep selling with the legacy shape.
      if (productError && isMissingColumnError(productError, 'document_policy')) {
        log('create-order', requestId, { stage: 'document-policy-column-missing' })
        ;({ data: products, error: productError } = await supabase
          .from('products')
          .select('id, slug, title, price_paise, currency, status, version')
          .in('slug', [...collected.wanted.keys()]))
      }

      if (productError) {
        logError('create-order', requestId, {
          stage: 'product-lookup-failed',
          db_error: productError.message,
        })
        return res.status(503).json({ error: 'Could not verify the products in this order' })
      }

      // License options are resolved server-side too: a browser may name an
      // option but can never invent one or redefine its terms.
      const productIds = (products || []).map((product) => product.id)
      let { data: licenseOptions, error: licenseOptionsError } = productIds.length
        ? await supabase
            .from('product_license_options')
            .select('id, product_id, code, label, is_default, validity_days')
            .in('product_id', productIds)
        : { data: [], error: null }

      if (licenseOptionsError && isMissingColumnError(licenseOptionsError, 'validity_days')) {
        ;({ data: licenseOptions, error: licenseOptionsError } = productIds.length
          ? await supabase
              .from('product_license_options')
              .select('id, product_id, code, label, is_default')
              .in('product_id', productIds)
          : { data: [], error: null })
      }

      if (licenseOptionsError) {
        logError('create-order', requestId, {
          stage: 'license-options-lookup-failed',
          db_error: licenseOptionsError.message,
        })
        return res.status(503).json({ error: 'Could not verify the license options for this order' })
      }

      // Canonical total, computed server-side from database prices only.
      const priced = priceProductOrder({
        requestedItems: items,
        products,
        licenseOptions: licenseOptions || [],
      })
      if (!priced.ok) {
        return res.status(priced.status || 400).json({ error: priced.error })
      }

      currency = priced.currency

      const customerEmail = String(email || '').trim().toLowerCase()
      if (mode !== 'preview' && (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))) {
        return res.status(400).json({ error: 'A valid email address is required for the receipt and download access' })
      }

      // --- coupons: a code goes in, a bounded paise amount comes out. --------
      // A browser can submit a code, never a discount, percentage or usage
      // count. Every rule below is evaluated against server-loaded rows.
      const couponCode = normaliseCouponCode(couponCodeInput)
      let couponRow = null
      let couponResult = null

      if (couponCode) {
        const lookup = await loadCoupon(supabase, couponCode)
        if (lookup.error) {
          logError('create-order', requestId, {
            stage: 'coupon-lookup-failed',
            db_error: lookup.error.message,
          })
          return res.status(503).json({ error: 'Could not verify that coupon right now. Please try again.' })
        }
        couponRow = lookup.coupon
        if (!couponRow) {
          return res.status(400).json({ error: REASONS.not_found.error, reason: REASONS.not_found.reason })
        }

        const usage = await loadCouponUsage(supabase, couponRow, customerEmail)
        if (usage.error) {
          logError('create-order', requestId, {
            stage: 'coupon-usage-lookup-failed',
            db_error: usage.error.message,
          })
          return res.status(503).json({ error: 'Could not verify that coupon right now. Please try again.' })
        }

        couponResult = applyCoupon({
          coupon: couponRow,
          subtotalPaise: priced.subtotalPaise,
          lines: priced.lines,
          priorUses: couponRow.uses_count || 0,
          customerUses: usage.customerUses,
          customerOrders: usage.customerOrders,
        })
        if (!couponResult.ok) {
          return res.status(couponResult.status || 400).json({
            error: couponResult.error,
            reason: couponResult.reason,
            ...(couponResult.minimumPaise ? { minimum_paise: couponResult.minimumPaise } : {}),
          })
        }
      }

      const discountPaise = couponResult?.discountPaise || 0
      const totalPaise = priced.subtotalPaise - discountPaise

      // Referrals follow the coupon rule: only a code crosses the network
      // boundary. An unknown, paused or non-eligible partner is ignored so a
      // stale link can never block a purchase. Rates and scope stay on the
      // server-loaded row.
      const affiliateCode = normaliseAffiliateCode(affiliateCodeInput)
      const affiliateLookup = await loadAffiliate(
        supabase,
        affiliateCode,
        priced.lines.map((line) => line.product.slug)
      )
      if (affiliateLookup.error) {
        logError('create-order', requestId, {
          stage: 'affiliate-lookup-failed',
          db_error: affiliateLookup.error.message,
        })
      }
      const affiliate = affiliateLookup.affiliate || null

      // Preview prices the cart (with or without a coupon) without writing a
      // row or contacting the gateway. It never reaches the Razorpay section.
      if (mode === 'preview') {
        return res.status(200).json({
          preview: true,
          subtotal_paise: priced.subtotalPaise,
          discount_paise: discountPaise,
          total_paise: totalPaise,
          currency: priced.currency,
          coupon: couponResult
            ? {
                code: couponResult.code,
                discount_paise: discountPaise,
                description: couponRow?.description || '',
              }
            : null,
          affiliate: affiliate
            ? { code: affiliate.code, display_name: affiliate.display_name }
            : null,
        })
      }

      // Claim AFTER validation and before persistence. The equality check on
      // uses_count makes the last slot of a limited coupon single-winner.
      let claimedCoupon = false
      if (couponResult) {
        const claim = await claimCoupon(supabase, couponRow)
        if (!claim.ok) {
          log('create-order', requestId, { stage: 'coupon-claim-lost', coupon: couponCode })
          return res.status(400).json({ error: REASONS.usage_limit.error, reason: REASONS.usage_limit.reason })
        }
        claimedCoupon = true
      }
      releaseCouponClaim = async () => {
        if (!claimedCoupon) return
        claimedCoupon = false
        await releaseCoupon(supabase, couponRow)
      }

      // Optional: only used so the admin can hand this customer their sign-in
      // link over WhatsApp. An unusable number is stored as '' — never a
      // rejected sale.
      const customerPhone = normalisePhone(phone)

      const orderRef = makeOrderRef()

      const orderFields = {
        order_ref: orderRef,
        email: customerEmail,
        customer_name: String(name || '').trim().slice(0, 120),
        // Only trust an account id proven by the server, never one the
        // browser claims.
        user_id: verifiedUser?.id || null,
        provider: 'razorpay',
        payment_status: 'pending',
        currency,
        subtotal_paise: priced.subtotalPaise,
        discount_paise: discountPaise,
        total_paise: totalPaise,
      }

      // Additive migrations are optional at runtime: if a column is not
      // deployed yet, drop just that field and keep selling. Every other
      // failure still surfaces as a real error.
      const optionalOrderFields = {
        ...(customerPhone ? { customer_phone: customerPhone } : {}),
        ...(couponCode ? { coupon_code_snapshot: couponCode } : {}),
        ...(affiliate ? { affiliate_code_snapshot: affiliate.code } : {}),
      }
      const tryInsertOrder = () =>
        supabase
          .from('orders')
          .insert({ ...orderFields, ...optionalOrderFields })
          .select('id')
          .single()

      let attempt = await tryInsertOrder()
      orderRow = attempt.data
      orderInsertError = attempt.error
      for (const column of ['customer_phone', 'coupon_code_snapshot', 'affiliate_code_snapshot']) {
        if (!orderInsertError || !isMissingColumnError(orderInsertError, column)) continue
        log('create-order', requestId, {
          stage: `${column}-missing`,
          order_ref: orderRef,
        })
        delete optionalOrderFields[column]
        attempt = await tryInsertOrder()
        orderRow = attempt.data
        orderInsertError = attempt.error
      }

      if (orderInsertError || !orderRow) {
        await releaseCouponClaim()
        logError('create-order', requestId, {
          stage: 'order-persist-failed',
          db_error: orderInsertError?.message || 'no row returned',
        })
        return res.status(500).json({ error: 'Could not create your order' })
      }

      // The redemption is the audit trail that makes the usage limit real. If
      // it cannot be written the claim is released and the buyer is asked to
      // retry rather than silently losing a coupon slot.
      if (couponResult) {
        const { error: redemptionError } = await supabase.from('coupon_redemptions').insert({
          coupon_id: couponRow.id,
          order_id: orderRow.id,
          order_ref: orderRef,
          customer_email: customerEmail,
          discount_paise: discountPaise,
        })
        if (redemptionError) {
          await releaseCouponClaim()
          logError('create-order', requestId, {
            stage: 'coupon-redemption-failed',
            order_ref: orderRef,
            db_error: redemptionError.message,
          })
          return res.status(500).json({ error: 'Could not apply your coupon. Please try again.' })
        }
      }

      // The attribution is immutable: later edits to a partner's rate must not
      // retroactively change what that partner earned on this order.
      if (affiliate) {
        const { error: attributionError } = await supabase
          .from('affiliate_attributions')
          .insert({
            affiliate_id: affiliate.id,
            order_id: orderRow.id,
            order_ref: orderRef,
            affiliate_code: affiliate.code,
            commission_bps: affiliate.commission_bps,
          })
        if (attributionError && !isMissingRelationError(attributionError, 'affiliate_attributions')) {
          await releaseCouponClaim()
          logError('create-order', requestId, {
            stage: 'affiliate-attribution-failed',
            order_ref: orderRef,
            db_error: attributionError.message,
          })
          return res.status(500).json({ error: 'Could not record your referral. Please try again.' })
        }
        if (attributionError) {
          log('create-order', requestId, { stage: 'affiliate-tables-missing', order_ref: orderRef })
        }
      }

      const baseOrderItems = priced.lines.map((line) => ({
        order_id: orderRow.id,
        product_id: line.product.id,
        quantity: line.quantity,
        unit_price_paise: line.unitPricePaise,
        total_price_paise: line.totalPricePaise,
        // Immutable snapshots: editing the product later must never change
        // what this customer paid.
        product_title_snapshot: line.product.title,
        product_slug_snapshot: line.product.slug,
        product_version_snapshot: line.product.version || '',
      }))

      let orderItems = baseOrderItems.map((item, i) => ({
        ...item,
        license_option_id: priced.lines[i].licenseOption?.id || null,
        license_type_snapshot: priced.lines[i].licenseTypeSnapshot || '',
        // NULL means a perpetual licence. The expiry is captured NOW so later
        // option edits cannot shorten what the customer already paid for.
        license_expires_at: priced.lines[i].licenseExpiresAt || null,
      }))

      let { error: itemsInsertError } = await supabase.from('order_items').insert(orderItems)
      if (itemsInsertError && isMissingColumnError(itemsInsertError, 'license_expires_at')) {
        orderItems = orderItems.map(({ license_expires_at, ...item }) => item)
        ;({ error: itemsInsertError } = await supabase.from('order_items').insert(orderItems))
      }
      if (itemsInsertError && isMissingColumnError(itemsInsertError, 'license_option_id')) {
        // A deployment that has not applied the licensing migration can still
        // sell. The license is not issued in that case; the order remains fully
        // valid and downloadable through the existing entitlement flow.
        log('create-order', requestId, {
          stage: 'license-columns-missing',
          order_ref: orderRef,
        })
        orderItems = baseOrderItems
        ;({ error: itemsInsertError } = await supabase.from('order_items').insert(orderItems))
      }
      if (itemsInsertError) {
        await releaseCouponClaim()
        logError('create-order', requestId, {
          stage: 'order-items-persist-failed',
          order_ref: orderRef,
          db_error: itemsInsertError.message,
        })
        // The pending order is left behind on purpose so it can be reconciled.
        return res.status(500).json({ error: 'Could not create your order items' })
      }

      verifiedAmountPaise = totalPaise
      verifiedNotes = {
        item_type: 'product',
        order_ref: orderRef,
        service_id: 'digital-store',
        service_title: priced.lines[0]?.product.title || 'Digital Products',
        pricing_label: 'Digital Product',
        product_slugs: priced.lines.map((line) => line.product.slug).join(','),
      }
      digitalOrder = {
        orderRef,
        dbOrderId: orderRow.id,
        customerPhone,
        subtotalPaise: priced.subtotalPaise,
        discountPaise,
        totalPaise,
        couponCode: couponCode || null,
        affiliateCode: affiliate?.code || null,
      }

    } else if (type === 'package' || package_name) {
      const targetName = (package_name || notes.pricing_label || '').trim().toLowerCase()
      if (!targetName) {
        return res.status(400).json({ error: 'Package name is required' })
      }

      let matchedPkg = null
      if (supabase) {
        try {
          const { data: page } = await supabase
            .from('service_page')
            .select('packages')
            .eq('id', 1)
            .single()
          if (page && Array.isArray(page.packages)) {
            matchedPkg = page.packages.find(p => p.name?.trim().toLowerCase() === targetName)
          }
        } catch (dbErr) {
          console.warn('[create-order] Failed to query packages from DB, using fallback:', dbErr.message)
        }
      }

      if (!matchedPkg) {
        matchedPkg = fallbackPackages.find(p => p.name.toLowerCase() === targetName)
      }

      if (!matchedPkg) {
        return res.status(404).json({ error: `Package '${package_name}' not found` })
      }

      verifiedAmountPaise = matchedPkg.price_paise || parsePriceStringToPaise(matchedPkg.price)
      if (!verifiedAmountPaise || verifiedAmountPaise <= 0) {
        return res.status(400).json({ error: 'Invalid package price' })
      }

      verifiedNotes.service_id = 'package'
      verifiedNotes.service_title = `${matchedPkg.name} Package`
      verifiedNotes.pricing_label = matchedPkg.name
      verifiedNotes.item_type = 'package'

    } else if (type === 'pricing_tier' || (service_id && pricing_label)) {
      const targetServiceId = (service_id || notes.service_id || '').trim().toLowerCase()
      const targetLabel = (pricing_label || notes.pricing_label || '').trim().toLowerCase()

      if (!targetServiceId || !targetLabel) {
        return res.status(400).json({ error: 'Service ID and pricing tier label are required' })
      }

      let matchedService = null
      if (supabase) {
        try {
          const { data } = await supabase
            .from('services')
            .select('*')
            .eq('service_id', targetServiceId)
            .single()
          matchedService = data
        } catch (dbErr) {
          console.warn('[create-order] Failed to query service from DB, using fallback:', dbErr.message)
        }
      }

      if (!matchedService) {
        matchedService = fallbackServices.find(s => s.service_id.toLowerCase() === targetServiceId)
      }

      if (!matchedService) {
        return res.status(404).json({ error: `Service '${service_id}' not found` })
      }

      const pricingList = Array.isArray(matchedService.pricing) ? matchedService.pricing : []
      const matchedTier = pricingList.find(p => p.label?.trim().toLowerCase() === targetLabel)

      if (!matchedTier) {
        return res.status(404).json({ error: `Pricing tier '${pricing_label}' not found for service '${service_id}'` })
      }

      verifiedAmountPaise = matchedTier.price_paise || parsePriceStringToPaise(matchedTier.price)
      if (!verifiedAmountPaise || verifiedAmountPaise <= 0) {
        return res.status(400).json({ error: 'Invalid pricing tier price' })
      }

      verifiedNotes.service_id = matchedService.service_id
      verifiedNotes.service_title = matchedService.title
      verifiedNotes.pricing_label = matchedTier.label
      verifiedNotes.item_type = 'pricing_tier'

    } else if (type === 'service') {
      const targetServiceId = (service_id || notes.service_id || '').trim().toLowerCase()
      if (!targetServiceId) {
        return res.status(400).json({ error: 'Service ID is required' })
      }

      let matchedService = null
      if (supabase) {
        try {
          const { data } = await supabase
            .from('services')
            .select('*')
            .eq('service_id', targetServiceId)
            .single()
          matchedService = data
        } catch (dbErr) {
          console.warn('[create-order] Failed to query service from DB, using fallback:', dbErr.message)
        }
      }

      if (!matchedService) {
        matchedService = fallbackServices.find(s => s.service_id.toLowerCase() === targetServiceId)
      }

      if (!matchedService) {
        return res.status(404).json({ error: `Service '${service_id}' not found` })
      }

      verifiedAmountPaise = matchedService.price_paise || parsePriceStringToPaise(matchedService.price)
      if (!verifiedAmountPaise || verifiedAmountPaise <= 0) {
        return res.status(400).json({ error: 'Invalid service price' })
      }

      verifiedNotes.service_id = matchedService.service_id
      verifiedNotes.service_title = matchedService.title
      verifiedNotes.pricing_label = 'Direct Payment'
      verifiedNotes.item_type = 'service'

    } else if (type === 'support' || service_id === 'support') {
      // Support / Donation payment validation
      const requestedRupees = custom_amount !== undefined ? Number(custom_amount) : Number(amount)
      if (isNaN(requestedRupees) || requestedRupees <= 0) {
        return res.status(400).json({ error: 'Valid support donation amount is required' })
      }

      // Minimum donation constraint: ₹10 (1000 paise), maximum ₹500,000 (50000000 paise)
      const requestedPaise = Math.round(requestedRupees * 100)
      if (requestedPaise < 1000) {
        return res.status(400).json({ error: 'Donation amount must be at least ₹10' })
      }
      if (requestedPaise > 50000000) {
        return res.status(400).json({ error: 'Donation amount exceeds maximum allowed limit' })
      }

      verifiedAmountPaise = requestedPaise
      verifiedNotes.service_id = 'support'
      verifiedNotes.service_title = 'Support NEURAL AURORA'
      verifiedNotes.pricing_label = notes.pricing_label || 'Support Donation'
      verifiedNotes.item_type = 'support'

    } else {
      return res.status(400).json({ error: 'Invalid or unknown order type' })
    }

    if (!verifiedAmountPaise || verifiedAmountPaise <= 0) {
      return res.status(400).json({ error: 'Unable to determine verified order amount' })
    }

    // -------------------------------------------------------------------------
    // 2. Initialize Razorpay and create order with SERVER-VERIFIED amount
    // -------------------------------------------------------------------------
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      logError('create-order', requestId, {
        stage: 'razorpay-credentials-check',
        env: envPresence(['RAZORPAY_KEY_ID', 'VITE_RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']),
      })
      return res.status(500).json({ error: 'Payment gateway configuration missing on server' })
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    log('create-order', requestId, {
      stage: 'razorpay-order-create',
      amount_paise: verifiedAmountPaise,
      currency: currency || 'INR',
      item_type: verifiedNotes.item_type,
    })

    const order = await razorpay.orders.create({
      amount: verifiedAmountPaise,
      currency: currency || 'INR',
      receipt: digitalOrder ? digitalOrder.orderRef : (receipt || `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`),
      notes: verifiedNotes,
    })

    // Link the gateway order to our pending order row. The webhook uses this
    // mapping to decide which order a payment belongs to.
    if (digitalOrder) {
      const { error: linkError } = await supabase
        .from('orders')
        .update({ provider_order_id: order.id })
        .eq('id', digitalOrder.dbOrderId)

      if (linkError) {
        // The customer can still pay, but the webhook will not be able to match
        // this payment automatically. Fail loudly so it can be reconciled
        // rather than silently issuing nothing.
        await releaseCouponClaim()
        logError('create-order', requestId, {
          stage: 'gateway-order-link-failed',
          order_ref: digitalOrder.orderRef,
          provider_order_id: order.id,
          db_error: linkError.message,
        })
        return res.status(500).json({ error: 'Could not finalise your order. Please contact us with your reference.' })
      }
    }

    log('create-order', requestId, {
      stage: 'order-created',
      provider_order_id: order.id,
      amount_paise: order.amount,
      item_type: verifiedNotes.item_type,
      order_ref: digitalOrder?.orderRef,
      has_customer_phone: Boolean(digitalOrder?.customerPhone),
    })

    return res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes,
      ...(digitalOrder
        ? {
            order_ref: digitalOrder.orderRef,
            subtotal_paise: digitalOrder.subtotalPaise,
            discount_paise: digitalOrder.discountPaise,
            total_paise: digitalOrder.totalPaise,
            coupon_code: digitalOrder.couponCode,
            affiliate_code: digitalOrder.affiliateCode,
          }
        : {}),
    })
  } catch (err) {
    await releaseCouponClaim()
    logError('create-order', requestId, {
      stage: 'razorpay-order-create-failed',
      error: err?.message || String(err),
    })
    return res.status(500).json({ error: 'Failed to create payment order' })
  }
}
