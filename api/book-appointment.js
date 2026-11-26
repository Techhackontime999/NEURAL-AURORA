const crypto = require('crypto')
const Razorpay = require('razorpay')
const { createClient } = require('@supabase/supabase-js')
const { newRequestId, envPresence, log, logError, SUPABASE_ENV_NAMES } = require('./_lib/diag')
const {
  DEFAULT_TIME_ZONE,
  normalizeTimeZone,
  zonedDateTimeToUtc,
  zonedDateKey,
  dayOfWeekForDateKey,
  shortTimeZoneLabel,
  toMinutes,
  fromMinutes,
} = require('./_lib/appointment-time')

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

function appendNote(existing, line) {
  const note = sanitizeText(existing, 1800)
  const entry = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} — ${line}`
  return sanitizeText(note ? `${note}\n${entry}` : entry, 2000)
}

function organizerTimeZone(settings) {
  return normalizeTimeZone(
    settings?.timezone || settings?.availability?.timezone || process.env.APPOINTMENT_TIME_ZONE,
    DEFAULT_TIME_ZONE,
  )
}

function slotContext(settings, typeRow, timeZone) {
  const avail = settings.availability || {}
  const days = Array.isArray(avail.days) ? avail.days : [1, 2, 3, 4, 5]
  const startMin = toMinutes(avail.start || '09:00') ?? 540
  const endMin = toMinutes(avail.end || '17:00') ?? 1020
  const interval = Math.max(5, Number(avail.slot_interval) || 30)
  const duration = Math.max(5, Number(typeRow.duration_minutes) || 30)
  const buffer = Math.max(0, Number(avail.buffer_minutes) || 0)
  const capacity = Math.max(1, Number(avail.slot_capacity) || 1)
  const blackout = new Set(
    (Array.isArray(avail.blackout_dates) ? avail.blackout_dates : [])
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d))),
  )
  const blockedSlots = new Set(
    (Array.isArray(avail.blocked_slots) ? avail.blocked_slots : []).map((s) => String(s || '').trim()),
  )
  return {
    days,
    startMin,
    endMin,
    step: Math.max(interval, duration + buffer),
    duration,
    buffer,
    capacity,
    blackout,
    blockedSlots,
    timeZone,
    now: Date.now(),
    minNoticeHours: Math.max(0, Number(settings.min_notice_hours) || 0),
  }
}

function computeSlotsForDate(date, ctx, bookedCount = new Map()) {
  const dayOfWeek = dayOfWeekForDateKey(date)
  if (dayOfWeek == null || ctx.blackout.has(date) || !ctx.days.includes(dayOfWeek) || ctx.endMin <= ctx.startMin) {
    return []
  }

  const slots = []
  for (let m = ctx.startMin; m + ctx.duration <= ctx.endMin; m += ctx.step) {
    const time = fromMinutes(m)
    const slotAt = zonedDateTimeToUtc(date, time, ctx.timeZone)
    if (!slotAt) continue
    const tooSoon = ctx.minNoticeHours > 0 && slotAt.getTime() < ctx.now + ctx.minNoticeHours * 60 * 60 * 1000
    const isPast = slotAt.getTime() < ctx.now
    const key = `${date}T${time}`
    const blocked = ctx.blockedSlots.has(key) || ctx.blockedSlots.has(`${date} ${time}`)
    const booked = bookedCount.get(time) || 0
    const remaining = Math.max(0, ctx.capacity - booked)
    const available = !blocked && !tooSoon && !isPast && remaining > 0
    let reason = null
    if (!available) reason = blocked ? 'blocked' : remaining <= 0 ? 'full' : 'unavailable'
    slots.push({ time, available, reason, capacity: ctx.capacity, booked, remaining })
  }
  return slots
}

function bookedCountFromRows(rows) {
  const bookedCount = new Map()
  for (const booking of rows || []) {
    if (booking.status === 'cancelled' || booking.payment_status === 'failed') continue
    const time = String(booking.preferred_time || '').slice(0, 5)
    if (time) bookedCount.set(time, (bookedCount.get(time) || 0) + 1)
  }
  return bookedCount
}

async function loadBookingsForDate(supabase, date) {
  const { data, error } = await supabase
    .from('appointments')
    .select('preferred_time, status, payment_status')
    .eq('preferred_date', date)
  if (error) throw error
  return bookedCountFromRows(data)
}

async function loadBookingsForMonth(supabase, startDate, endDate) {
  const { data, error } = await supabase
    .from('appointments')
    .select('preferred_date, preferred_time, status, payment_status')
    .gte('preferred_date', startDate)
    .lte('preferred_date', endDate)
  if (error) throw error
  const byDate = new Map()
  for (const booking of data || []) {
    const date = String(booking.preferred_date || '').slice(0, 10)
    if (!date) continue
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push(booking)
  }
  const result = new Map()
  for (const [date, rows] of byDate) result.set(date, bookedCountFromRows(rows))
  return result
}

function dateBounds(settings, timeZone) {
  const minNoticeHours = Math.max(0, Number(settings.min_notice_hours) || 0)
  const maxDaysAhead = Math.max(0, Number(settings.max_days_ahead) || 0)
  const minDate = zonedDateKey(new Date(Date.now() + minNoticeHours * 60 * 60 * 1000), timeZone)
  const maxDate = maxDaysAhead > 0
    ? zonedDateKey(new Date(Date.now() + maxDaysAhead * 24 * 60 * 60 * 1000), timeZone)
    : '9999-12-31'
  return { minDate, maxDate }
}

async function handleSlots(req, res, supabase) {
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
  const timeZone = organizerTimeZone(settings)
  const ctx = slotContext(settings, typeRow, timeZone)
  const bookedCount = await loadBookingsForDate(supabase, date)
  const slots = computeSlotsForDate(date, ctx, bookedCount)

  return res.status(200).json({
    ok: true,
    date,
    slots,
    meta: {
      capacity: ctx.capacity,
      buffer_minutes: ctx.buffer,
      working_days: ctx.days,
      timezone: timeZone,
      timezone_label: shortTimeZoneLabel(timeZone),
    },
  })
}

/** One request powers a whole month so the calendar never waterfalls. */
async function handleAvailability(req, res, supabase) {
  const source = req.method === 'GET' ? (req.query || {}) : (req.body || {})
  const typeId = String(source.appointment_type_id || source.type_id || '').trim()
  const month = String(source.month || '').trim()
  if (!typeId) return res.status(400).json({ error: 'Appointment type is required.' })
  const monthMatch = month.match(/^(\d{4})-(\d{2})$/)
  if (!monthMatch) return res.status(400).json({ error: 'Valid month is required.' })
  const year = Number(monthMatch[1])
  const monthNumber = Number(monthMatch[2])
  if (monthNumber < 1 || monthNumber > 12) return res.status(400).json({ error: 'Valid month is required.' })

  const [{ data: settingsRow, error: settingsErr }, { data: typeRow, error: typeErr }] = await Promise.all([
    supabase.from('admin_settings').select('appointment_settings').eq('id', 1).maybeSingle(),
    supabase.from('appointment_types').select('type_id, duration_minutes, is_active').eq('type_id', typeId).eq('is_active', true).maybeSingle(),
  ])
  if (settingsErr) throw settingsErr
  if (typeErr) throw typeErr
  if (settingsRow?.appointment_settings?.enabled === false) return res.status(403).json({ error: 'Appointments are currently unavailable.' })
  if (!typeRow) return res.status(404).json({ error: 'Appointment type not found.' })

  const settings = settingsRow?.appointment_settings || {}
  const timeZone = organizerTimeZone(settings)
  const ctx = slotContext(settings, typeRow, timeZone)
  const { minDate, maxDate } = dateBounds(settings, timeZone)
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const startDate = `${month}-01`
  const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`
  const bookedByDate = await loadBookingsForMonth(supabase, startDate, endDate)

  const days = {}
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${month}-${String(day).padStart(2, '0')}`
    let status = 'open'
    if (date < minDate) status = 'too-soon'
    else if (date > maxDate) status = 'out-of-range'
    else if (ctx.blackout.has(date)) status = 'blackout'
    else if (!ctx.days.includes(dayOfWeekForDateKey(date))) status = 'closed'

    const slots = status === 'open' ? computeSlotsForDate(date, ctx, bookedByDate.get(date) || new Map()) : []
    const availableCount = slots.filter((slot) => slot.available).length
    if (status === 'open' && availableCount === 0) status = 'full'
    days[date] = { slots, availableCount, status }
  }

  return res.status(200).json({
    ok: true,
    month,
    timezone: timeZone,
    timezone_label: shortTimeZoneLabel(timeZone),
    days,
    meta: {
      min_date: minDate,
      max_date: maxDate,
      capacity: ctx.capacity,
      buffer_minutes: ctx.buffer,
      working_days: ctx.days,
    },
  })
}

async function handleGet(req, res, requestId, supabase) {
  const source = req.method === 'GET' ? (req.query || {}) : (req.body || {})
  const bookingId = String(source.booking_id || '').trim()
  const token = String(source.token || source.access_token || '').trim()
  if (!bookingId || !token) return res.status(400).json({ error: 'Booking ID and access token are required.' })

  const [{ data, error }, { data: settingsRow }] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, type_name_snapshot, duration_minutes_snapshot, price_paise_snapshot, currency, customer_name, customer_email, preferred_date, preferred_time, timezone, status, payment_status, meeting_provider_snapshot, meeting_url_snapshot, location_label_snapshot, access_token, created_at')
      .eq('id', bookingId)
      .eq('access_token', token)
      .maybeSingle(),
    supabase.from('admin_settings').select('appointment_settings').eq('id', 1).maybeSingle(),
  ])
  if (error) throw error
  if (!data) return res.status(404).json({ error: 'Booking not found.' })

  const settings = settingsRow?.appointment_settings || {}
  const timeZone = organizerTimeZone(settings)
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
      organizer_timezone: timeZone,
      status: data.status,
      payment_status: data.payment_status,
      meeting: {
        provider: data.meeting_provider_snapshot,
        url: data.meeting_url_snapshot,
        label: data.location_label_snapshot,
      },
      manage: {
        allow_reschedule: settings.allow_reschedule !== false,
        allow_cancel: settings.allow_cancel !== false,
        cutoff_hours: Math.max(0, Number(settings.manage_cutoff_hours) || 0),
      },
      created_at: data.created_at,
    },
  })
}

async function loadManageableBooking(supabase, bookingId, token) {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, appointment_type_id, type_name_snapshot, duration_minutes_snapshot, price_paise_snapshot, currency, customer_name, customer_email, preferred_date, preferred_time, timezone, status, payment_status, meeting_provider_snapshot, meeting_url_snapshot, location_label_snapshot, access_token, admin_note')
    .eq('id', bookingId)
    .eq('access_token', token)
    .maybeSingle()
  if (error) throw error
  return data || null
}

async function managementWindow(supabase, booking, settings) {
  const timeZone = organizerTimeZone(settings)
  const slotAt = zonedDateTimeToUtc(booking.preferred_date, booking.preferred_time, timeZone)
  const cutoffHours = Math.max(0, Number(settings.manage_cutoff_hours) || 0)
  if (!slotAt || (cutoffHours > 0 && slotAt.getTime() < Date.now() + cutoffHours * 60 * 60 * 1000)) {
    return { error: `Changes must be made at least ${cutoffHours} hour(s) before the appointment.`, timeZone }
  }
  return { timeZone }
}

async function handleCancel(req, res, supabase) {
  const source = req.method === 'GET' ? (req.query || {}) : (req.body || {})
  const bookingId = String(source.booking_id || '').trim()
  const token = String(source.token || source.access_token || '').trim()
  if (!bookingId || !token) return res.status(400).json({ error: 'Booking ID and access token are required.' })

  const [{ data: booking, error }, { data: settingsRow }] = await Promise.all([
    loadManageableBooking(supabase, bookingId, token),
    supabase.from('admin_settings').select('appointment_settings').eq('id', 1).maybeSingle(),
  ])
  if (error) throw error
  if (!booking) return res.status(404).json({ error: 'Booking not found.' })
  const settings = settingsRow?.appointment_settings || {}
  if (settings.allow_cancel === false) return res.status(403).json({ error: 'Cancellation is not available for this booking.' })
  if (booking.status === 'cancelled') {
    return res.status(200).json({ ok: true, booking_id: booking.id, status: 'cancelled', already_cancelled: true })
  }

  const windowCheck = await managementWindow(supabase, booking, settings)
  if (windowCheck.error) return res.status(400).json({ error: windowCheck.error })

  const reason = sanitizeText(source.reason, 300)
  const { data: updated, error: updateErr } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      admin_note: appendNote(booking.admin_note, `Cancelled by invitee${reason ? `: ${reason}` : ''}.`),
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id)
    .eq('access_token', token)
    .select('id, status, payment_status')
    .single()
  if (updateErr) throw updateErr

  return res.status(200).json({
    ok: true,
    booking_id: updated.id,
    status: updated.status,
    payment_status: updated.payment_status,
    message: settings.cancellation_message || 'Your appointment has been cancelled. Any paid booking is handled according to the refund policy.',
  })
}

async function validateSlotSelection({ settings, typeRow, date, time, supabase, excludeBookingId = null }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return { error: 'Valid date is required.' }
  const normalizedTime = String(time || '').trim().slice(0, 5)
  if (!/^\d{1,2}:\d{2}$/.test(normalizedTime)) return { error: 'Valid time is required.' }

  const timeZone = organizerTimeZone(settings)
  const slotAt = zonedDateTimeToUtc(date, normalizedTime, timeZone)
  if (!slotAt) return { error: 'Valid date and time are required.' }

  if (slotAt.getTime() < Date.now()) return { error: 'That time has already passed. Please choose a later slot.' }
  const minNoticeHours = Math.max(0, Number(settings.min_notice_hours) || 0)
  if (minNoticeHours > 0 && slotAt.getTime() < Date.now() + minNoticeHours * 60 * 60 * 1000) {
    return { error: `Please choose a time at least ${minNoticeHours} hour(s) from now.` }
  }
  const maxDaysAhead = Math.max(0, Number(settings.max_days_ahead) || 0)
  const { maxDate } = dateBounds(settings, timeZone)
  if (maxDaysAhead > 0 && date > maxDate) return { error: `Please choose a date within ${maxDaysAhead} days.` }

  const avail = settings.availability || {}
  const availDays = Array.isArray(avail.days) ? avail.days : [1, 2, 3, 4, 5]
  const blackout = new Set(
    (Array.isArray(avail.blackout_dates) ? avail.blackout_dates : []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d))),
  )
  const blockedSlots = new Set(
    (Array.isArray(avail.blocked_slots) ? avail.blocked_slots : []).map((s) => String(s || '').trim()),
  )
  const dayOfWeek = dayOfWeekForDateKey(date)
  if (blackout.has(date) || !availDays.includes(dayOfWeek)) return { error: 'Selected date is not available for booking.' }
  if (blockedSlots.has(`${date}T${normalizedTime}`) || blockedSlots.has(`${date} ${normalizedTime}`)) {
    return { error: 'This slot is currently unavailable. Please choose another time.' }
  }

  const startMin = toMinutes(avail.start || '09:00') ?? 540
  const endMin = toMinutes(avail.end || '17:00') ?? 1020
  const prefMin = toMinutes(normalizedTime)
  const duration = Math.max(5, Number(typeRow.duration_minutes) || 30)
  if (prefMin == null || prefMin < startMin || prefMin + duration > endMin) {
    return { error: 'Selected time is outside available hours.' }
  }

  const { data: conflicts, error: conflictErr } = await supabase
    .from('appointments')
    .select('id, status, payment_status')
    .eq('preferred_date', date)
    .eq('preferred_time', normalizedTime)
  if (conflictErr) throw conflictErr
  const capacity = Math.max(1, Number(avail.slot_capacity) || 1)
  const activeCount = (conflicts || []).filter(
    (row) => row.id !== excludeBookingId && row.status !== 'cancelled' && row.payment_status !== 'failed',
  ).length
  if (activeCount >= capacity) return { error: 'This slot is fully booked. Please choose another time.', status: 409 }

  return { ok: true, time: normalizedTime, slotAt, timeZone }
}

async function handleReschedule(req, res, supabase) {
  const source = req.body || {}
  const bookingId = String(source.booking_id || '').trim()
  const token = String(source.token || source.access_token || '').trim()
  if (!bookingId || !token) return res.status(400).json({ error: 'Booking ID and access token are required.' })

  const [{ data: booking, error }, { data: settingsRow }] = await Promise.all([
    loadManageableBooking(supabase, bookingId, token),
    supabase.from('admin_settings').select('appointment_settings').eq('id', 1).maybeSingle(),
  ])
  if (error) throw error
  if (!booking) return res.status(404).json({ error: 'Booking not found.' })
  const settings = settingsRow?.appointment_settings || {}
  if (settings.allow_reschedule === false) return res.status(403).json({ error: 'Rescheduling is not available for this booking.' })
  if (booking.status === 'cancelled') return res.status(400).json({ error: 'Cancelled bookings cannot be rescheduled.' })

  const windowCheck = await managementWindow(supabase, booking, settings)
  if (windowCheck.error) return res.status(400).json({ error: windowCheck.error })

  let typeRow = null
  if (booking.appointment_type_id) {
    const { data, error: typeErr } = await supabase
      .from('appointment_types')
      .select('id, name, duration_minutes, is_active')
      .eq('id', booking.appointment_type_id)
      .maybeSingle()
    if (typeErr) throw typeErr
    typeRow = data
  }
  const effectiveType = typeRow || { duration_minutes: booking.duration_minutes_snapshot }
  const selection = await validateSlotSelection({
    settings,
    typeRow: effectiveType,
    date: source.preferred_date,
    time: source.preferred_time,
    supabase,
    excludeBookingId: booking.id,
  })
  if (!selection.ok) return res.status(selection.status || 400).json({ error: selection.error })

  const previous = `${booking.preferred_date} ${String(booking.preferred_time).slice(0, 5)}`
  const visitorTimeZone = normalizeTimeZone(source.timezone, booking.timezone || selection.timeZone)
  const { data: updated, error: updateErr } = await supabase
    .from('appointments')
    .update({
      preferred_date: source.preferred_date,
      preferred_time: selection.time,
      timezone: visitorTimeZone,
      admin_note: appendNote(booking.admin_note, `Rescheduled by invitee: ${previous} → ${source.preferred_date} ${selection.time}.`),
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id)
    .eq('access_token', token)
    .select('id, status, payment_status, preferred_date, preferred_time, timezone')
    .single()
  if (updateErr) throw updateErr

  return res.status(200).json({
    ok: true,
    booking: {
      id: updated.id,
      status: updated.status,
      payment_status: updated.payment_status,
      preferred_date: updated.preferred_date,
      preferred_time: updated.preferred_time,
      timezone: updated.timezone,
      organizer_timezone: selection.timeZone,
      duration_minutes: Number(effectiveType.duration_minutes) || booking.duration_minutes_snapshot,
      type_name: booking.type_name_snapshot,
      meeting: {
        provider: booking.meeting_provider_snapshot,
        url: booking.meeting_url_snapshot,
        label: booking.location_label_snapshot,
      },
    },
    message: settings.reschedule_message || 'Your appointment has been rescheduled. Your access link still works.',
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
    if (action === 'slots' || action === 'get_slots') return await handleSlots(req, res, supabase)
    if (action === 'availability') return await handleAvailability(req, res, supabase)
    if (action === 'get') return await handleGet(req, res, requestId, supabase)
    if (action === 'verify') return await handleVerify(req, res, requestId, supabase)
    if (action === 'cancel' || action === 'reschedule') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST for booking changes.' })
      return action === 'cancel' ? await handleCancel(req, res, supabase) : await handleReschedule(req, res, supabase)
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
    if (!preferredDate) return res.status(400).json({ error: 'Preferred date is required.' })
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

    const selection = await validateSlotSelection({
      settings: appointmentSettings,
      typeRow,
      date: preferredDate,
      time: preferredTime,
      supabase,
    })
    if (!selection.ok) return res.status(selection.status || 400).json({ error: selection.error })

    const pricePaise = Math.max(0, Number(typeRow.price_paise) || 0)
    const isPaid = pricePaise > 0
    const currency = sanitizeText(typeRow.currency || 'INR', 10).toUpperCase() || 'INR'
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
      preferred_time: selection.time,
      timezone: normalizeTimeZone(timezone, selection.timeZone),
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
        organizer_timezone: selection.timeZone,
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
      organizer_timezone: selection.timeZone,
      meeting: { provider: meetingProvider, url: meetingUrl, label: locationLabel },
      customer: { name: customerName, email: customerEmail, phone: customerPhone },
      message: appointmentSettings.confirmation_message || 'Payment received. We will confirm your appointment shortly.',
    })
  } catch (err) {
    logError('book-appointment', requestId, { stage: 'failed', error: err?.message || String(err) })
    return res.status(500).json({ error: err?.message || 'Failed to book appointment.' })
  }
}
