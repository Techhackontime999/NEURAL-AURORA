const Razorpay = require('razorpay')
const { createClient } = require('@supabase/supabase-js')

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
    currency = 'INR',
    notes = {},
    receipt,
  } = req.body || {}

  const supabase = getSupabaseClient()
  let verifiedAmountPaise = 0
  let verifiedNotes = { ...notes }

  try {
    // -------------------------------------------------------------------------
    // 1. Resolve & verify canonical price server-side based on item type
    // -------------------------------------------------------------------------
    const type = order_type ||
      (package_name ? 'package' : (pricing_label ? 'pricing_tier' : (service_id === 'support' ? 'support' : 'service')))

    if (type === 'package' || package_name) {
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
      receipt: receipt || `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      notes: verifiedNotes,
    })

    console.log('[create-order] Order successfully created with verified amount:', {
      order_id: order.id,
      amount: order.amount,
      item_type: verifiedNotes.item_type,
    })

    return res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes,
    })
  } catch (err) {
    console.error('[create-order] Razorpay order creation failed:', err)
    return res.status(500).json({ error: 'Failed to create payment order' })
  }
}
