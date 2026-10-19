// ---------------------------------------------------------------------------
// Browser mirror of `api/_lib/phone.js`, plus presentation helpers.
//
// `normalisePhone` below is a line-for-line copy of the server implementation so
// a number is stored exactly as the buyer typed it is displayed. The two copies
// are kept honest by scripts/test-api-guards.mjs, which runs the same inputs
// through both and fails if they disagree — change one, change the other.
//
// Store orders keep the digits-only international form ('919876543210') so it
// can be dropped straight into a `tel:` link or a `https://wa.me/` chat.
// ---------------------------------------------------------------------------

export const DEFAULT_COUNTRY_CODE = '91' // India — this store's market
export const MIN_DIGITS = 10 // shortest number we accept
export const MAX_DIGITS = 15 // E.164 maximum

/** Every digit of the input, in order. */
export function digitsOf(value) {
  return String(value ?? '').replace(/\D/g, '')
}

/**
 * Normalise a customer-supplied number to digits-only international form.
 * Idempotent, never throws, and returns '' for anything unusable.
 *
 * @returns {string} digits, or '' when the input cannot be a phone number.
 */
export function normalisePhone(value, defaultCountryCode = DEFAULT_COUNTRY_CODE) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const hasCountryCode = raw.startsWith('+') || raw.startsWith('00')
  const digits = digitsOf(raw).replace(/^0+/, '')

  if (!digits) return ''

  if (!hasCountryCode && digits.length < MIN_DIGITS + 1) {
    if (digits.length < MIN_DIGITS) return ''
    return `${defaultCountryCode}${digits}`
  }

  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return ''
  return digits
}

/** '+91 98765 43210' for an Indian number, '+<digits>' otherwise; '' if unusable. */
export function formatPhone(value) {
  const digits = normalisePhone(value)
  if (!digits) return ''
  if (digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    return `+${DEFAULT_COUNTRY_CODE} ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  return `+${digits}`
}

/** `tel:` href for the number, or null when there is no usable number. */
export function telLink(value) {
  const digits = normalisePhone(value)
  return digits ? `tel:+${digits}` : null
}

/**
 * A WhatsApp chat with the customer, optionally pre-filled with a message.
 * With no usable number this falls back to the WhatsApp contact picker.
 */
export function whatsappLink(value, text = '') {
  const digits = normalisePhone(value)
  const message = String(text || '').trim()
  if (!digits) return `https://wa.me/${message ? `?text=${encodeURIComponent(message)}` : ''}`
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}
