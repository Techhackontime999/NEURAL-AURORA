const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { newRequestId, envPresence, log, logError, SUPABASE_ENV_NAMES } = require('./_lib/diag')

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestId = newRequestId()
  try {
    const supabase = getSupabase()
    if (!supabase) {
      logError('verify-appointment-payment', requestId, { stage: 'env-check', env: envPresence(SUPABASE_ENV_NAMES) })
      return res.status(503).json({ error: 'Verification service unavailable.' })
    }

    const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {}
    if (!booking_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields.' })
    }

    const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim()
    if (!keySecret) {
      logError('verify-appointment-payment', requestId, { stage: 'missing-key-secret' })
      return res.status(503).json({ error: 'Payment verification is not configured.' })
    }

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    const sigBuf = Buffer.from(String(razorpay_signature))
    const expBuf = Buffer.from(expected)
    const valid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)
    if (!valid) {
      logError('verify-appointment-payment', requestId, { stage: 'invalid-signature', booking_id })
      return res.status(400).json({ error: 'Invalid payment signature.' })
    }

    const { data: booking, error: fetchErr } = await supabase
      .from('appointments')
      .select('id, razorpay_order_id, payment_status, status')
      .eq('id', booking_id)
      .maybeSingle()
    if (fetchErr) throw fetchErr
    if (!booking) return res.status(404).json({ error: 'Booking not found.' })
    if (String(booking.razorpay_order_id || '') !== String(razorpay_order_id)) {
      return res.status(400).json({ error: 'Order mismatch.' })
    }

    if (booking.payment_status === 'paid') {
      return res.status(200).json({ ok: true, booking_id: booking.id, payment_status: 'paid', status: booking.status })
    }

    const { data: updated, error: updateErr } = await supabase
      .from('appointments')
      .update({
        payment_status: 'paid',
        status: booking.status === 'cancelled' ? 'cancelled' : 'confirmed',
        razorpay_payment_id: String(razorpay_payment_id),
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .eq('razorpay_order_id', razorpay_order_id)
      .select('id, status, payment_status')
      .single()
    if (updateErr) throw updateErr

    log('verify-appointment-payment', requestId, { stage: 'verified', booking_id, razorpay_payment_id })
    return res.status(200).json({ ok: true, booking_id: updated.id, payment_status: updated.payment_status, status: updated.status })
  } catch (err) {
    logError('verify-appointment-payment', requestId, { stage: 'failed', error: err?.message || String(err) })
    return res.status(500).json({ error: err?.message || 'Failed to verify payment.' })
  }
}
