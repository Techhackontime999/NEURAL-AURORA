// ---------------------------------------------------------------------------
// Customer phone numbers for store orders.
//
// Stored as DIGITS ONLY in international form (country code first, no '+' and
// no separators) so the value can be handed straight to a `tel:` link, a
// `https://wa.me/<digits>` chat, or the Razorpay `prefill.contact` field.
//
// A phone number is an OPTIONAL convenience for the administrator: if it is
// missing or unparseable the order still goes through. Failing a checkout
// closed over a contact detail would lose a paying customer, so this module
// never throws and never demands a value.
//
// `src/lib/phone.js` is a deliberate mirror for the browser. The two copies are
// kept honest by scripts/test-api-guards.mjs, which normalises the same inputs
// through BOTH implementations and fails if they ever disagree.
// ---------------------------------------------------------------------------

const DEFAULT_COUNTRY_CODE = '91' // India — this store's market
const MIN_DIGITS = 10 // shortest number we accept
const MAX_DIGITS = 15 // E.164 maximum

/** Every digit of the input, in order. */
function digitsOf(value) {
  return String(value ?? '').replace(/\D/g, '')
}

/**
 * Normalise a customer-supplied number to digits-only international form.
 *
 *   '98765 43210'      -> '919876543210'  (national number, default country)
 *   '+91 98765-43210'  -> '919876543210'  (country code supplied)
 *   '09876543210'      -> '919876543210'  (trunk '0' dropped)
 *   '+44 7911 123456'  -> '447911123456'  (already international)
 *   'ask me later'     -> ''              (unusable, never an error)
 *
 * Idempotent: normalising an already-normalised value returns it unchanged.
 *
 * @returns {string} digits, or '' when the input cannot be a phone number.
 */
function normalisePhone(value, defaultCountryCode = DEFAULT_COUNTRY_CODE) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  // '+' (or the international '00' dialling prefix) means the caller already
  // supplied a country code, so it must never be prefixed again.
  const hasCountryCode = raw.startsWith('+') || raw.startsWith('00')
  const digits = digitsOf(raw).replace(/^0+/, '')

  if (!digits) return ''

  // No country code, and too short to contain one: a national number.
  if (!hasCountryCode && digits.length < MIN_DIGITS + 1) {
    if (digits.length < MIN_DIGITS) return ''
    return `${defaultCountryCode}${digits}`
  }

  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return ''
  return digits
}

module.exports = {
  normalisePhone,
  digitsOf,
  DEFAULT_COUNTRY_CODE,
  MIN_DIGITS,
  MAX_DIGITS,
}
