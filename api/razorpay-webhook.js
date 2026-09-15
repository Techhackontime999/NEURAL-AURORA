const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')

async function readRawBody(req) {
  if (req.rawBody) {
    return Buffer.isBuffer(req.rawBody) ? req.rawBody.toString('utf8') : String(req.rawBody)
  }
  if (typeof req.body === 'string') {
    return req.body
  }
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8')
  }
  if (!req.body) {
    return await new Promise((resolve, reject) => {
      const chunks = []
      req.on('data', chunk => chunks.push(Buffer.from(chunk)))
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      req.on('error', reject)
    })
  }
  console.warn('[Razorpay Webhook] Body was pre-parsed by the runtime; verifying against re-serialized body')
  return JSON.stringify(req.body)
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET

  if (!webhookSecret) {
    console.error('[Razorpay Webhook] Webhook secret not configured in environment variables')
    return res.status(500).json({ error: 'Webhook secret not configured' })
  }

  const signature = req.headers['x-razorpay-signature']
  if (!signature) {
    console.warn('[Razorpay Webhook] Missing x-razorpay-signature header')
    return res.status(400).json({ error: 'Missing signature header' })
  }

  let rawBody
  try {
    rawBody = await readRawBody(req)
  } catch (err) {
    console.error('[Razorpay Webhook] Error reading request body:', err)
    return res.status(400).json({ error: 'Failed to read request body' })
  }
  if (!rawBody) {
    console.warn('[Razorpay Webhook] Empty request body')
    return res.status(400).json({ error: 'Empty request body' })
  }

  // Verify signature using HMAC SHA256 over the exact raw body bytes
  try {
    const expectedDigest = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest()
    const receivedDigest = Buffer.from(String(signature), 'hex')

    if (
      expectedDigest.length !== receivedDigest.length ||
      !crypto.timingSafeEqual(expectedDigest, receivedDigest)
    ) {
      console.warn('[Razorpay Webhook] Signature verification failed')
      return res.status(400).json({ error: 'Invalid signature' })
    }
  } catch (err) {
    console.error('[Razorpay Webhook] Signature verification exception:', err)
    return res.status(400).json({ error: 'Signature verification failed' })
  }

  // Parse payload JSON
  let payload
  try {
    const isParsedBody = req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)
    payload = isParsedBody ? req.body : JSON.parse(rawBody)
  } catch (err) {
    console.error('[Razorpay Webhook] Invalid JSON payload:', err)
    return res.status(400).json({ error: 'Invalid JSON payload' })
  }

  const event = payload?.event
  console.log(`[Razorpay Webhook] Verified event received: ${event}`)

  // Process payment events
  if (event === 'payment.captured' || event === 'order.paid') {
    const payment = payload?.payload?.payment?.entity || {}
    const order = payload?.payload?.order?.entity || {}
    const notes = payment.notes || order.notes || {}

    // Razorpay amount is in paise (e.g., 50000 = 500 INR)
    const rawAmount = payment.amount || order.amount || 0
    const amountInUnits = rawAmount > 0 ? Math.round(rawAmount / 100) : 0

    const paymentRecord = {
      service_id: notes.service_id || 'support',
      service_title: notes.service_title || payment.description || 'Payment',
      pricing_label: notes.pricing_label || 'Direct Payment',
      amount: amountInUnits,
      currency: payment.currency || order.currency || 'INR',
      razorpay_payment_id: payment.id || null,
      razorpay_order_id: payment.order_id || order.id || null,
      status: payment.status === 'captured' ? 'completed' : (payment.status || (event === 'order.paid' ? 'paid' : 'completed')),
      customer_email: payment.email || notes.customer_email || null,
      customer_name: notes.customer_name || notes.name || null,
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Razorpay Webhook] Missing Supabase service role credentials in environment')
      return res.status(500).json({ error: 'Server database configuration missing' })
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      })

      const { error: insertError } = await supabase
        .from('payments')
        .insert([paymentRecord])

      if (insertError) {
        // If duplicate record (already recorded), treat as idempotent success
        const msg = insertError.message || ''
        if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
          console.log('[Razorpay Webhook] Payment already recorded (idempotent):', paymentRecord.razorpay_payment_id)
          return res.status(200).json({ status: 'ok', duplicate: true })
        }
        console.error('[Razorpay Webhook] Database insert error:', insertError)
        return res.status(500).json({ error: 'Failed to record payment' })
      }

      console.log('[Razorpay Webhook] Payment successfully stored:', paymentRecord.razorpay_payment_id)
    } catch (dbErr) {
      console.error('[Razorpay Webhook] Database exception:', dbErr)
      return res.status(500).json({ error: 'Internal database error' })
    }
  }

  return res.status(200).json({ status: 'ok', received: true })
}
