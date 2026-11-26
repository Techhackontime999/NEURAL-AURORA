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

function toMinutes(hhmm) {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}
function fromMinutes(total) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

async function handleSlots(req, res, requestId, supabase) {
  const source = req.method === 'GET' ? (req.query || {}) : (req.body || {})
  const typeId = String(source.appointment_type_id || source.type_id || '').trim()
  const date = String(source.date || '').trim()
  if (!typeId) return res.status(400).json({ error: 'Appointment type is required.' })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Valid date is required.' })

  const [{ data: settingsRow, error: settingsErr }, { data: typeRow, error: typeErr }] = await Promise.all([
    supabase.from('admin_settings').select('appointment_settings').eq('id', 1).maybeSingle(),
    supabase.from('appointment_types').select('type_id, duration_minutes, is_active').eq('type_id', typeId).eq('is_active', true).maybeSingle(),
  ])
  if (settingsErr) throw settingsErr
  if (typeErr) throw typeErr
  if (settingsRow?.appointment_settings?.enabled === false) return res.status(403).json({ error: 'Appointments are currently unavailable.' })
  if (!typeRow) return res.status(404).json({ error: 'Appointment type not found.' })

  const settings = settingsRow?.appointment_settings || {}
  const avail = settings.availability || {}
  const days = Array.isArray(avail.days) ? avail.days : [1, 2, 3, 4, 5]
  const startMin = toMinutes(avail.start || '09:00') ?? 540
  const endMin = toMinutes(avail.end || '17:00') ?? 1020
  const interval = Math.max(5, Number(avail.slot_interval) || 30)
  const duration = Math.max(5, Number(typeRow.duration_minutes) || 30)
  const buffer = Math.max(0, Number(avail.buffer_minutes) || 0)
  const capacity = Math.max(1, Number(avail.slot_capacity) || 1)
  const step = Math.max(interval, duration + buffer)
  const blackout = new Set((Array.isArray(avail.blackout_dates) ? avail.blackout_dates : []).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(String(d))))
  const blockedSlots = new Set((Array.isArray(avail.blocked_slots) ? avail.blocked_slots : []).map(s => String(s || '').trim()))
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay()

  if (blackout.has(date) || !days.includes(dayOfWeek) || endMin <= startMin) {
    return res.status(200).json({ ok: true, date, slots: [], meta: { capacity, buffer_minutes: buffer } })
  }

  const { data: bookings, error: bookErr } = await supabase
    .from('appointments')
    .select('preferred_time, status, payment_status')
    .eq('preferred_date', date)
  if (bookErr) throw bookErr

  const bookedCount = new Map()
  for (const b of (bookings || [])) {
    if (b.status === 'cancelled' || b.payment_status === 'failed') continue
    const t = String(b.preferred_time || '').slice(0, 5)
    if (t) bookedCount.set(t, (bookedCount.get(t) || 0) + 1)
  }

  const now = Date.now()
  const minNoticeHours = Math.max(0, Number(settings.min_notice_hours) || 0)
  const slots = []
  for (let m = startMin; m + duration <= endMin; m += step) {
    const time = fromMinutes(m)
    const key = `${date}T${time}`
    const slotAt = new Date(`${date}T${time}:00`).getTime()
    const tooSoon = minNoticeHours > 0 && slotAt < now + minNoticeHours * 60 * 60 * 1000
    const isPast = slotAt < now
    const blocked = blockedSlots.has(key) || blockedSlots.has(`${date} ${time}`)
    const booked = bookedCount.get(time) || 0
    const remaining = Math.max(0, capacity - booked)
    const available = !blocked && !tooSoon && !isPast && remaining > 0
    let reason = null
    if (!available) reason = blocked ? 'blocked' : (remaining <= 0 ? 'full' : 'unavailable')
    slots.push({ time, available, reason, capacity, booked, remaining })
  }

  return res.status(200).json({ ok: true, date, slots, meta: { capacity, buffer_minutes: buffer } })
}

async function handleGet(req, res, requestId, supabase) {
  const source = req.method === 'GET' ? (req.query || {}) : (req.body || {})
  const bookingId = String(source.booking_id || '').trim()
  const token = String(source.token || source.access_token || '').trim()
  if (!bookingId || !token) return res.status(400).json({ error: 'Booking ID and access token are required.' })

  const { data, error } = await supabase
    .from('appointments')
    .select('id, type_name_snapshot, duration_minutes_snapshot, price_paise_snapshot, currency, customer_name, customer_email, preferred_date, preferred_time, timezone, status, payment_status, meeting_provider_snapshot, meeting_url_snapshot, location_label_snapshot, access_token, created_at')
    .eq('id', bookingId)
    .eq('access_token', token)
    .maybeSingle()
  if (error) throw error
  if (!data) return res.status(404).json({ error: 'Booking not found.' })

  return res.status(200).json({
    ok: true,
    booking: {
      id: data.id,
      type_name: data.type_name_snapshot,
      duration_minutes: data.duration_minutes_snapshot,
      price_paise: data.price_paise_snapshot,
      currency: data.currency,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      preferred_date: data.preferred_date,
      preferred_time: data.preferred_time,
      timezone: data.timezone,
      status: data.status,
      payment_status: data.payment_status,
      meeting: {
        provider: data.meeting_provider_snapshot,
        url: data.meeting_url_snapshot,
        label: data.location_label_snapshot,
      },
      created_at: data.created_at,
    },
  })
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
  if (req.method !== 'POST' && req.method !== 'GET') {
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
    const queryAction = String(req.query?.action || '').toLowerCase()
    const action = sanitizeText(body.action || queryAction || (body.razorpay_signature ? 'verify' : (req.method === 'GET' ? 'get' : 'create')), 30).toLowerCase()
    if (action === 'slots' || action === 'get_slots') {
      return await handleSlots(req, res, requestId, supabase)
    }
    if (action === 'get') {
      return await handleGet(req, res, requestId, supabase)
    }
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

    if (appointmentSettings.require_phone && !customerPhone) {
      return res.status(400).json({ error: 'Phone number is required.' })
    }
    const minNoticeHours = Math.max(0, Number(appointmentSettings.min_notice_hours) || 0)
    const maxDaysAhead = Math.max(0, Number(appointmentSettings.max_days_ahead) || 0)
    const preferredAt = new Date(`${preferredDate}T${preferredTime.length === 5 ? `${preferredTime}:00` : preferredTime}`)
    if (Number.isNaN(preferredAt.getTime())) {
      return res.status(400).json({ error: 'Valid preferred date and time are required.' })
    }
    if (minNoticeHours > 0 && preferredAt.getTime() < Date.now() + minNoticeHours * 60 * 60 * 1000) {
      return res.status(400).json({ error: `Please choose a time at least ${minNoticeHours} hour(s) from now.` })
    }
    if (maxDaysAhead > 0) {
      const maxDate = new Date(); maxDate.setHours(23, 59, 59, 999); maxDate.setDate(maxDate.getDate() + maxDaysAhead)
      if (preferredAt.getTime() > maxDate.getTime()) {
        return res.status(400).json({ error: `Please choose a date within ${maxDaysAhead} days.` })
      }
    }

    const pricePaise = Math.max(0, Number(typeRow.price_paise) || 0)
    const isPaid = pricePaise > 0
    const currency = sanitizeText(typeRow.currency || 'INR', 10).toUpperCase() || 'INR'

    const avail = appointmentSettings.availability || {}
    const availDays = Array.isArray(avail.days) ? avail.days : [1, 2, 3, 4, 5]
    const blackout = new Set((Array.isArray(avail.blackout_dates) ? avail.blackout_dates : []).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(String(d))))
    const dayOfWeek = new Date(`${preferredDate}T00:00:00`).getDay()
    const startMin = toMinutes(avail.start || '09:00') ?? 540
    const endMin = toMinutes(avail.end || '17:00') ?? 1020
    const prefMin = toMinutes(preferredTime)
    const duration = Math.max(5, Number(typeRow.duration_minutes) || 30)
    const capacity = Math.max(1, Number(avail.slot_capacity) || 1)
    const blockedSlots = new Set((Array.isArray(avail.blocked_slots) ? avail.blocked_slots : []).map(s => String(s || '').trim()))
    const slotKey = `${preferredDate}T${String(preferredTime).slice(0, 5)}`
    if (blackout.has(preferredDate) || !availDays.includes(dayOfWeek)) {
      return res.status(400).json({ error: 'Selected date is not available for booking.' })
    }
    if (blockedSlots.has(slotKey) || blockedSlots.has(`${preferredDate} ${String(preferredTime).slice(0, 5)}`)) {
      return res.status(400).json({ error: 'This slot is currently unavailable. Please choose another time.' })
    }
    if (prefMin == null || prefMin < startMin || prefMin + duration > endMin) {
      return res.status(400).json({ error: 'Selected time is outside available hours.' })
    }
    const { data: conflicts, error: conflictErr } = await supabase
      .from('appointments')
      .select('id, status, payment_status')
      .eq('preferred_date', preferredDate)
      .eq('preferred_time', String(preferredTime).slice(0, 5))
    if (conflictErr) throw conflictErr
    const activeCount = (conflicts || []).filter(b => b.status !== 'cancelled' && b.payment_status !== 'failed').length
    if (activeCount >= capacity) {
      return res.status(409).json({ error: 'This slot is fully booked. Please choose another time.' })
    }

    const accessToken = crypto.randomBytes(24).toString('hex')
    const meetingProvider = sanitizeText(typeRow.meeting_provider || 'custom', 40) || 'custom'
    const meetingUrl = sanitizeText(typeRow.meeting_url || '', 1000)
    const locationLabel = sanitizeText(typeRow.location_label || 'Online meeting', 120) || 'Online meeting'

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
      meeting_provider_snapshot: meetingProvider,
      meeting_url_snapshot: meetingUrl,
      location_label_snapshot: locationLabel,
      access_token: accessToken,
      status: (!isPaid && appointmentSettings.auto_confirm_free) ? 'confirmed' : 'pending',
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
        access_token: accessToken,
        paid: false,
        status: inserted.status,
        payment_status: inserted.payment_status,
        meeting: { provider: meetingProvider, url: meetingUrl, label: locationLabel },
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
      access_token: accessToken,
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
      meeting: { provider: meetingProvider, url: meetingUrl, label: locationLabel },
      customer: { name: customerName, email: customerEmail, phone: customerPhone },
      message: appointmentSettings.confirmation_message || 'Payment received. We will confirm your appointment shortly.',
    })
  } catch (err) {
    logError('book-appointment', requestId, { stage: 'failed', error: err?.message || String(err) })
    return res.status(500).json({ error: err?.message || 'Failed to book appointment.' })
  }
}
