const crypto = require('crypto')
const Razorpay = require('razorpay')
const { createClient } = require('@supabase/supabase-js')
const { newRequestId, envPresence, log, logError, SUPABASE_ENV_NAMES } = require('./_lib/diag')

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function sanitizeText(value, max = 500) {
  return String(value || '').trim().slice(0, max)
}

async function handleVerify(req, res, requestId, supabase) {
  const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {}
  if (!booking_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification fields.' })
  }

  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim()
  if (!keySecret) {
    logError('book-appointment', requestId, { stage: 'missing-key-secret' })
    return res.status(503).json({ error: 'Payment verification is not configured.' })
  }

  const expected = crypto.createHmac('sha256', keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex')
  const sigBuf = Buffer.from(String(razorpay_signature))
  const expBuf = Buffer.from(expected)
  const valid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)
  if (!valid) {
    logError('book-appointment', requestId, { stage: 'invalid-signature', booking_id })
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

  log('book-appointment', requestId, { stage: 'verified', booking_id, razorpay_payment_id })
  return res.status(200).json({ ok: true, booking_id: updated.id, payment_status: updated.payment_status, status: updated.status })
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestId = newRequestId()
  try {
    const supabase = getSupabase()
    if (!supabase) {
      logError('book-appointment', requestId, { stage: 'env-check', env: envPresence(SUPABASE_ENV_NAMES) })
      return res.status(503).json({ error: 'Booking service is unavailable right now.' })
    }

    const body = req.body || {}
    const action = sanitizeText(body.action || (body.razorpay_signature ? 'verify' : 'create'), 30).toLowerCase()
    if (action === 'verify') {
      return await handleVerify(req, res, requestId, supabase)
    }

    const appointmentTypeId = sanitizeText(body.appointment_type_id, 120)
    const customerName = sanitizeText(body.customer_name, 120)
    const customerEmail = sanitizeText(body.customer_email, 200).toLowerCase()
    const customerPhone = sanitizeText(body.customer_phone, 40)
    const preferredDate = sanitizeText(body.preferred_date, 20)
    const preferredTime = sanitizeText(body.preferred_time, 40)
    const timezone = sanitizeText(body.timezone, 80)
    const notes = sanitizeText(body.notes, 2000)

    if (!appointmentTypeId) return res.status(400).json({ error: 'Appointment type is required.' })
    if (!customerName) return res.status(400).json({ error: 'Name is required.' })
    if (!isValidEmail(customerEmail)) return res.status(400).json({ error: 'Valid email is required.' })
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) return res.status(400).json({ error: 'Valid preferred date is required.' })
    if (!preferredTime) return res.status(400).json({ error: 'Preferred time is required.' })

    const [{ data: settingsRow, error: settingsErr }, { data: typeRow, error: typeErr }] = await Promise.all([
      supabase.from('admin_settings').select('appointment_settings').eq('id', 1).maybeSingle(),
      supabase.from('appointment_types').select('*').eq('type_id', appointmentTypeId).eq('is_active', true).maybeSingle(),
    ])

    if (settingsErr) throw settingsErr
    if (typeErr) throw typeErr

    const appointmentSettings = settingsRow?.appointment_settings || {}
    if (appointmentSettings.enabled === false) {
      return res.status(403).json({ error: 'Appointments are currently unavailable.' })
    }
    if (!typeRow) {
      return res.status(404).json({ error: 'Appointment type not found.' })
    }

    const pricePaise = Math.max(0, Number(typeRow.price_paise) || 0)
    const isPaid = pricePaise > 0
    const currency = sanitizeText(typeRow.currency || 'INR', 10).toUpperCase() || 'INR'

    const appointmentRecord = {
      appointment_type_id: typeRow.id,
      type_name_snapshot: typeRow.name || '',
      duration_minutes_snapshot: Number(typeRow.duration_minutes) || 30,
      price_paise_snapshot: pricePaise,
      currency,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      timezone,
      notes,
      status: 'pending',
      payment_status: isPaid ? 'pending' : 'not_required',
      admin_note: '',
    }

    if (!isPaid) {
      const { data: inserted, error: insertErr } = await supabase
        .from('appointments')
        .insert([appointmentRecord])
        .select('id, status, payment_status')
        .single()
      if (insertErr) throw insertErr

      log('book-appointment', requestId, { stage: 'free-booking-created', appointment_id: inserted.id, type_id: appointmentTypeId })
      return res.status(200).json({
        ok: true,
        booking_id: inserted.id,
        paid: false,
        status: inserted.status,
        payment_status: inserted.payment_status,
        message: appointmentSettings.confirmation_message || 'Your appointment request has been received.',
      })
    }

    const keyId = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '').trim()
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim()
    if (!keyId || !keySecret) {
      logError('book-appointment', requestId, { stage: 'razorpay-env-missing', env: envPresence(['RAZORPAY_KEY_ID', 'VITE_RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']) })
      return res.status(503).json({ error: 'Payment gateway is not configured.' })
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('appointments')
      .insert([appointmentRecord])
      .select('id')
      .single()
    if (insertErr) throw insertErr

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret })
    const receipt = `apt_${inserted.id}_${Date.now().toString(36)}`
    const order = await razorpay.orders.create({
      amount: pricePaise,
      currency,
      receipt: receipt.slice(0, 40),
      notes: {
        item_type: 'appointment',
        appointment_id: String(inserted.id),
        appointment_type_id: appointmentTypeId,
        service_id: `appointment:${appointmentTypeId}`,
        service_title: `Appointment: ${typeRow.name}`,
        pricing_label: typeRow.name,
        customer_name: customerName,
        customer_email: customerEmail,
      },
    })

    const { error: updateErr } = await supabase
      .from('appointments')
      .update({ razorpay_order_id: order.id, updated_at: new Date().toISOString() })
      .eq('id', inserted.id)
    if (updateErr) throw updateErr

    log('book-appointment', requestId, { stage: 'paid-booking-created', appointment_id: inserted.id, order_id: order.id })
    return res.status(200).json({
      ok: true,
      booking_id: inserted.id,
      paid: true,
      key: keyId,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      appointment: {
        name: typeRow.name,
        duration_minutes: Number(typeRow.duration_minutes) || 30,
        price_paise: pricePaise,
        currency,
      },
      customer: { name: customerName, email: customerEmail, phone: customerPhone },
      message: appointmentSettings.confirmation_message || 'Payment received. We will confirm your appointment shortly.',
    })
  } catch (err) {
    logError('book-appointment', requestId, { stage: 'failed', error: err?.message || String(err) })
    return res.status(500).json({ error: err?.message || 'Failed to book appointment.' })
  }
}
