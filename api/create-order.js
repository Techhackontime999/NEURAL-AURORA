const crypto = require('crypto')
const Razorpay = require('razorpay')
const { createClient } = require('@supabase/supabase-js')
const {
  collectRequestedItems,
  priceProductOrder,
  generateOrderRef,
} = require('./_lib/order-pricing')

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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

  try {
    // -------------------------------------------------------------------------
    // 1. Resolve & verify canonical price server-side based on item type
    // -------------------------------------------------------------------------
    const type = order_type ||
      (package_name ? 'package' : (pricing_label ? 'pricing_tier' : (service_id === 'support' ? 'support' : 'service')))

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
        console.error('[create-order] Digital store requires SUPABASE_SERVICE_ROLE_KEY')
        return res.status(503).json({ error: 'Digital store is unavailable right now. Please try again shortly.' })
      }

      const collected = collectRequestedItems(items)
      if (!collected.ok) {
        return res.status(400).json({ error: collected.error })
      }

      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, slug, title, price_paise, currency, status, version')
        .in('slug', [...collected.wanted.keys()])

      if (productError) {
        console.error('[create-order] Failed to load products:', productError.message)
        return res.status(503).json({ error: 'Could not verify the products in this order' })
      }

      // Canonical total, computed server-side from database prices only.
      const priced = priceProductOrder({ requestedItems: items, products })
      if (!priced.ok) {
        return res.status(priced.status || 400).json({ error: priced.error })
      }

      const totalPaise = priced.totalPaise
      currency = priced.currency

      const customerEmail = String(email || '').trim().toLowerCase()
      if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        return res.status(400).json({ error: 'A valid email address is required for the receipt and download access' })
      }

      const orderRef = makeOrderRef()

      const { data: orderRow, error: orderInsertError } = await supabase
        .from('orders')
        .insert({
          order_ref: orderRef,
          email: customerEmail,
          customer_name: String(name || '').trim().slice(0, 120),
          // Only trust an account id proven by the server, never one the
          // browser claims.
          user_id: verifiedUser?.id || null,
          provider: 'razorpay',
          payment_status: 'pending',
          currency,
          subtotal_paise: totalPaise,
          discount_paise: 0,
          total_paise: totalPaise,
        })
        .select('id')
        .single()

      if (orderInsertError || !orderRow) {
        console.error('[create-order] Failed to persist order:', orderInsertError?.message)
        return res.status(500).json({ error: 'Could not create your order' })
      }

      const orderItems = priced.lines.map((line) => ({
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

      const { error: itemsInsertError } = await supabase.from('order_items').insert(orderItems)
      if (itemsInsertError) {
        console.error('[create-order] Failed to persist order items:', itemsInsertError.message)
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
      digitalOrder = { orderRef, dbOrderId: orderRow.id }

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
      console.error('[create-order] Razorpay credentials missing in server environment')
      return res.status(500).json({ error: 'Payment gateway configuration missing on server' })
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
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
        console.error(
          '[create-order] Failed to link gateway order to pending order:',
          { order_ref: digitalOrder.orderRef, provider_order_id: order.id, error: linkError.message }
        )
        return res.status(500).json({ error: 'Could not finalise your order. Please contact support with your reference.' })
      }
    }

    console.log('[create-order] Order successfully created with verified amount:', {
      order_id: order.id,
      amount: order.amount,
      item_type: verifiedNotes.item_type,
      order_ref: digitalOrder?.orderRef,
    })

    return res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes,
      ...(digitalOrder ? { order_ref: digitalOrder.orderRef } : {}),
    })
  } catch (err) {
    console.error('[create-order] Razorpay order creation failed:', err)
    return res.status(500).json({ error: 'Failed to create payment order' })
  }
}
