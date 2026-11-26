/**
 * Timezone helpers for appointment scheduling.
 *
 * Availability is stored as organiser-local wall-clock time (YYYY-MM-DD +
 * HH:mm). These helpers convert that wall-clock time to a real UTC instant for
 * comparisons, and back again for display. Using Intl avoids a dependency on
 * the server's own timezone, which is a common source of double-booking and
 * "my 9am became 4pm" bugs.
 */

const DEFAULT_TIME_ZONE = 'Asia/Kolkata'

function isValidTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

function normalizeTimeZone(timeZone, fallback = DEFAULT_TIME_ZONE) {
  const value = String(timeZone || '').trim()
  return isValidTimeZone(value) ? value : fallback
}

function pad(value) {
  return String(value).padStart(2, '0')
}

/** Convert a Date into the given zone's wall-clock parts. */
function zonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
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

/** Offset of a zone at a given instant, in milliseconds. */
function zoneOffsetMs(date, timeZone) {
  const parts = zonedParts(date, timeZone)
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
function zonedDateTimeToUtc(dateStr, hhmm, timeZone) {
  const date = parseDateParts(dateStr)
  const time = parseTimeParts(hhmm)
  if (!date || !time) return null
  const zone = normalizeTimeZone(timeZone)
  const wallClockUTC = Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute, 0)

  // Guess, then refine once: the offset can change across a DST boundary.
  let instant = wallClockUTC - zoneOffsetMs(new Date(wallClockUTC), zone)
  instant = wallClockUTC - zoneOffsetMs(new Date(instant), zone)
  return new Date(instant)
}

/** UTC instant -> organiser-local YYYY-MM-DD. */
function zonedDateKey(date, timeZone) {
  const parts = zonedParts(date, normalizeTimeZone(timeZone))
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

/** Day of week (0=Sun) for an organiser-local date string. */
function dayOfWeekForDateKey(dateStr) {
  const parts = parseDateParts(dateStr)
  if (!parts) return null
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
}

function toMinutes(hhmm) {
  const time = parseTimeParts(hhmm)
  if (!time) return null
  return time.hour * 60 + time.minute
}

function fromMinutes(total) {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

function shortTimeZoneLabel(timeZone, date = new Date()) {
  const zone = normalizeTimeZone(timeZone)
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' })
      .formatToParts(date)
      .find((p) => p.type === 'timeZoneName')
    return part?.value || zone
  } catch {
    return zone
  }
}

module.exports = {
  DEFAULT_TIME_ZONE,
  normalizeTimeZone,
  isValidTimeZone,
  zonedDateTimeToUtc,
  zonedDateKey,
  zonedParts,
  dayOfWeekForDateKey,
  shortTimeZoneLabel,
  toMinutes,
  fromMinutes,
}
