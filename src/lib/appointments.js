/**
 * Pure appointment helpers shared by the booking experience and its tests.
 * No React, no network, no DOM: deterministic scheduling logic lives here.
 */

export const DEFAULT_TIME_ZONE = 'Asia/Kolkata'

export const PROVIDER_LABELS = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  microsoft_teams: 'Microsoft Teams',
  phone: 'Phone call',
  in_person: 'In person',
  custom: 'Online meeting',
}

export const STEPS = [
  { id: 1, label: 'Service', short: 'Service' },
  { id: 2, label: 'Date & time', short: 'Time' },
  { id: 3, label: 'Your details', short: 'Details' },
  { id: 4, label: 'Confirmed', short: 'Done' },
]

const COMMON_TIME_ZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kathmandu',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'UTC',
]

function pad(value) {
  return String(value).padStart(2, '0')
}

export function isValidTimeZone(timeZone) {
  const value = String(timeZone || '').trim()
  if (!value) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function normalizeTimeZone(timeZone, fallback = DEFAULT_TIME_ZONE) {
  return isValidTimeZone(timeZone) ? String(timeZone).trim() : fallback
}

export function getBrowserTimeZone() {
  try {
    return normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone, 'UTC')
  } catch {
    return 'UTC'
  }
}

export function getTimezoneOptions(detected = getBrowserTimeZone()) {
  const zones = new Set([detected, ...COMMON_TIME_ZONES])
  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      for (const zone of Intl.supportedValuesOf('timeZone')) zones.add(zone)
    } catch {
      // Older runtimes keep the curated list only.
    }
  }
  return [...zones].sort((a, b) => {
    if (a === detected) return -1
    if (b === detected) return 1
    return a.localeCompare(b)
  })
}

function partsInZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: normalizeTimeZone(timeZone),
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value)
  }
  return parts
}

function zoneOffsetMs(date, timeZone) {
  const parts = partsInZone(date, timeZone)
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUTC - Math.floor(date.getTime() / 1000) * 1000
}

function parseDateParts(dateStr) {
  const match = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null
  return { year, month, day }
}

function parseTimeParts(hhmm) {
  const match = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return { hour, minute }
}

/** Organiser-local date + time -> UTC instant. */
export function zonedDateTimeToUtc(dateStr, hhmm, timeZone) {
  const date = parseDateParts(dateStr)
  const time = parseTimeParts(hhmm)
  if (!date || !time) return null
  const zone = normalizeTimeZone(timeZone)
  const wallClockUTC = Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute, 0)
  let instant = wallClockUTC - zoneOffsetMs(new Date(wallClockUTC), zone)
  instant = wallClockUTC - zoneOffsetMs(new Date(instant), zone)
  return new Date(instant)
}

/** UTC instant -> organiser-local YYYY-MM-DD. */
export function zonedDateKey(date, timeZone) {
  const parts = partsInZone(date, timeZone)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

export function formatInZone(date, timeZone, options = {}, locale = undefined) {
  if (!date || Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat(locale, { timeZone: normalizeTimeZone(timeZone), ...options }).format(date)
  } catch {
    return ''
  }
}

/** Show an organiser-local slot in the invitee's chosen zone. */
export function formatSlotTime(dateStr, hhmm, fromZone, toZone) {
  const instant = zonedDateTimeToUtc(dateStr, hhmm, fromZone)
  if (!instant) return String(hhmm || '')
  return formatInZone(instant, toZone, { hour: 'numeric', minute: '2-digit' })
}

export function formatSlotDate(dateStr, fromZone, toZone) {
  const instant = zonedDateTimeToUtc(dateStr, '12:00', fromZone)
  if (!instant) return formatDate(dateStr)
  return formatInZone(instant, toZone, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function timezoneAbbreviation(timeZone) {
  const label = formatInZone(new Date(), timeZone, { timeZoneName: 'short' })
  return label.split(' ').pop() || normalizeTimeZone(timeZone)
}

export function timezoneLabel(timeZone) {
  const zone = normalizeTimeZone(timeZone)
  return `${timezoneAbbreviation(zone)} · ${zone}`
}

export function formatPrice(paise, currency = 'INR') {
  const amount = Number(paise || 0) / 100
  if (!amount) return 'Free'
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount}`
  }
}

export function formatDate(dateStr, locale = undefined) {
  const parts = parseDateParts(dateStr)
  if (!parts) return String(dateStr || '')
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function formatTime(hhmm, locale = undefined) {
  const time = parseTimeParts(hhmm)
  if (!time) return String(hhmm || '')
  const date = new Date(Date.UTC(2000, 0, 1, time.hour, time.minute))
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(date)
}

export function formatDuration(minutes) {
  const value = Number(minutes || 0)
  if (!value) return ''
  if (value < 60) return `${value} min`
  const hours = Math.floor(value / 60)
  const rest = value % 60
  if (!rest) return `${hours} hour${hours > 1 ? 's' : ''}`
  return `${hours} hour${hours > 1 ? 's' : ''} ${rest} min`
}

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function shiftDateKey(dateStr, days) {
  const parts = parseDateParts(dateStr)
  if (!parts) return ''
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
  return date.toISOString().slice(0, 10)
}

export function monthKey(dateStr) {
  return String(dateStr || '').slice(0, 7)
}

/**
 * A Monday-first month grid. `days` is the month availability map returned by
 * /api/book-appointment?action=availability.
 */
export function buildMonthGrid(year, month, options = {}) {
  const {
    minDate = '',
    maxDate = '9999-12-31',
    today = '',
    blackoutDates = [],
    workingDays = [1, 2, 3, 4, 5],
    days = {},
  } = options
  if (month < 1 || month > 12) return []
  const blackout = new Set(blackoutDates)
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const leadingBlanks = (firstWeekday + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells = []

  for (let i = 0; i < leadingBlanks; i += 1) cells.push(null)

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${pad(month)}-${pad(day)}`
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    const info = days[date] || {}
    const availableCount = Number(info.availableCount || 0)
    let status = info.status || 'open'
    if (date < minDate) status = 'too-soon'
    else if (date > maxDate) status = 'out-of-range'
    else if (blackout.has(date)) status = 'blackout'
    else if (!workingDays.includes(dayOfWeek)) status = 'closed'
    else if (status === 'open' && availableCount === 0) status = 'full'

    cells.push({
      date,
      day,
      available: status === 'open' && availableCount > 0,
      status,
      availableCount,
      isToday: date === today,
    })
  }

  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function nextAvailableDate(days = {}) {
  const candidates = Object.entries(days)
    .filter(([, info]) => Number(info?.availableCount || 0) > 0)
    .map(([date]) => date)
    .sort()
  return candidates[0] || ''
}

export function groupSlots(slots = [], date = '', organiserZone = DEFAULT_TIME_ZONE) {
  const groups = [
    { id: 'morning', label: 'Morning', hint: 'Before 12:00', slots: [] },
    { id: 'afternoon', label: 'Afternoon', hint: '12:00 – 17:00', slots: [] },
    { id: 'evening', label: 'Evening', hint: 'After 17:00', slots: [] },
  ]
  for (const slot of slots) {
    const hour = Number(String(slot.time || '').slice(0, 2))
    const index = hour < 12 ? 0 : hour < 17 ? 1 : 2
    groups[index].slots.push({ ...slot, organiserTime: formatTime(slot.time) })
  }
  return groups.filter((group) => group.slots.length > 0)
}

export function validateDetails(form = {}, settings = {}) {
  const errors = {}
  const name = String(form.customer_name || '').trim()
  const email = String(form.customer_email || '').trim()
  const phone = String(form.customer_phone || '').trim()
  const notes = String(form.notes || '').trim()

  if (name.length < 2) errors.customer_name = 'Enter your full name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.customer_email = 'Enter an email address with an @ and a domain.'
  if (settings.require_phone && !phone) errors.customer_phone = 'Enter your phone number so we can reach you.'
  else if (phone && !/^[+\d][\d\s()-]{5,}$/.test(phone)) errors.customer_phone = 'Use digits, spaces, + or brackets only.'
  if (notes.length > 2000) errors.notes = 'Keep your note under 2,000 characters.'
  return errors
}

export function validateSchedule(schedule = {}, settings = {}) {
  const errors = {}
  if (!schedule.date) errors.date = 'Choose a date.'
  if (!schedule.time) errors.time = 'Choose an available time.'
  if (schedule.date && settings.min_notice_hours > 0) {
    const instant = zonedDateTimeToUtc(schedule.date, schedule.time, schedule.organizerTimeZone)
    if (instant && instant.getTime() < Date.now() + Number(settings.min_notice_hours) * 3600000) {
      errors.time = `Choose a time at least ${settings.min_notice_hours} hour(s) from now.`
    }
  }
  return errors
}

export function bookingState(booking = {}) {
  const status = String(booking.status || 'pending')
  const paid = booking.payment_status === 'paid'
  if (status === 'cancelled') {
    return { key: 'cancelled', title: 'Booking cancelled', tone: 'neutral', message: 'This appointment is no longer scheduled.' }
  }
  if (status === 'confirmed' || paid) {
    return { key: 'confirmed', title: 'You’re booked', tone: 'success', message: 'A calendar invite and meeting details are ready below.' }
  }
  return { key: 'pending', title: 'Request received', tone: 'notice', message: 'We’re confirming this appointment. Keep this page for updates.' }
}

function icsDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function escapeIcs(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

export function calendarDetails(booking = {}, organizerTimeZone = DEFAULT_TIME_ZONE) {
  const start = zonedDateTimeToUtc(booking.preferred_date, booking.preferred_time, organizerTimeZone)
  if (!start) return null
  const end = new Date(start.getTime() + (Number(booking.duration_minutes || 30) * 60000))
  const title = `${booking.type_name || 'Appointment'} — NEURAL AURORA`
  const location = booking.meeting?.url || booking.meeting?.label || 'Online'
  const description = `Booking #${booking.id}\n${booking.meeting?.label || ''}\n${booking.meeting?.url || ''}`
  return { start, end, title, location, description }
}

export function buildIcs(booking = {}, organizerTimeZone = DEFAULT_TIME_ZONE) {
  const details = calendarDetails(booking, organizerTimeZone)
  if (!details) return ''
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NEURAL AURORA//Appointments//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:appointment-${booking.id}@neural-aurora.example`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(details.start)}`,
    `DTEND:${icsDate(details.end)}`,
    `SUMMARY:${escapeIcs(details.title)}`,
    `DESCRIPTION:${escapeIcs(details.description)}`,
    `LOCATION:${escapeIcs(details.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function buildCalendarUrls(booking = {}, organizerTimeZone = DEFAULT_TIME_ZONE) {
  const details = calendarDetails(booking, organizerTimeZone)
  if (!details) return { google: '', outlook: '' }
  const dates = `${icsDate(details.start)}/${icsDate(details.end)}`
  const google = new URL('https://calendar.google.com/calendar/render')
  google.searchParams.set('action', 'TEMPLATE')
  google.searchParams.set('text', details.title)
  google.searchParams.set('dates', dates)
  google.searchParams.set('details', details.description)
  google.searchParams.set('location', details.location)

  const outlook = new URL('https://outlook.live.com/calendar/0/deeplink/compose')
  outlook.searchParams.set('path', '/calendar/action/compose')
  outlook.searchParams.set('rru', 'addevent')
  outlook.searchParams.set('subject', details.title)
  outlook.searchParams.set('startdt', details.start.toISOString())
  outlook.searchParams.set('enddt', details.end.toISOString())
  outlook.searchParams.set('body', details.description)
  outlook.searchParams.set('location', details.location)

  return { google: google.toString(), outlook: outlook.toString() }
}
