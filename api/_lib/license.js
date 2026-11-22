// ---------------------------------------------------------------------------
// Product licensing helpers.
//
// Pure, dependency-light option/key helpers shared by order creation,
// fulfilment and tests. A license is NOT a receipt: it is a separate,
// server-issued record with its own key, status and terms. Nothing here trusts
// browser input for price or entitlement; the selected option must exist on
// the product. PDF rendering lives in license-pdf.js so checkout never loads
// PDFKit.
// ---------------------------------------------------------------------------

const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** Normalise a client-supplied license option code without inventing one. */
function normaliseLicenseCode(value) {
  const code = String(value || '').trim().toLowerCase()
  return CODE_PATTERN.test(code) ? code : ''
}

/**
 * Resolve the license option for one requested item.
 *
 * The browser MAY name an option, but it may not define one. An unknown code is
 * rejected rather than silently downgraded to the default, so a buyer never
 * pays for a license they did not select.
 *
 * @returns {{ok: true, option: object|null} | {ok: false, error: string, status: number}}
 */
function resolveLicenseOption({ requestedCode, options = [], title = 'product' }) {
  const code = normaliseLicenseCode(requestedCode)
  const available = (Array.isArray(options) ? options : []).filter(
    (option) => option && normaliseLicenseCode(option.code)
  )

  if (!available.length) return { ok: true, option: null }

  if (!code) {
    // An omitted code is a legitimate "use the default" request; a non-empty
    // but malformed one is not. Never silently reinterpret garbage as default.
    if (String(requestedCode ?? '').trim()) {
      return {
        ok: false,
        status: 400,
        error: 'Invalid license option code',
      }
    }
    const fallback = available.find((option) => option.is_default) || available[0]
    return { ok: true, option: fallback }
  }

  const option = available.find((item) => normaliseLicenseCode(item.code) === code)
  if (!option) {
    return {
      ok: false,
      status: 400,
      error: `Unknown license option '${code}' for ${title}`,
    }
  }
  return { ok: true, option }
}

/** Encode random bytes with a case-insensitive, ambiguity-free alphabet. */
function encodeKey(bytes) {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += CROCKFORD[(value << (5 - bits)) & 31]
  return out
}

/**
 * A human-shareable license key. It contains no customer data and no signing
 * secret; the database also stores a SHA-256 hash for constant-time lookup.
 */
function generateLicenseKey(crypto, slug = 'product') {
  const bytes = crypto.randomBytes(20)
  const encoded = encodeKey(bytes)
  const grouped = encoded.match(/.{1,5}/g)?.slice(0, 4).join('-') || encoded
  const prefix = String(slug || 'product')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase() || 'NA'
  return `NA-${prefix}-${grouped}`
}

/** Deterministic reference, safe to show in support conversations. */
function generateLicenseRef(crypto) {
  return `LIC-${new Date().toISOString().slice(0, 4)}-${crypto
    .randomBytes(7)
    .toString('hex')
    .toUpperCase()}`
}

function hashLicenseKey(crypto, key) {
  return crypto.createHash('sha256').update(String(key || '').trim().toUpperCase()).digest('hex')
}

module.exports = {
  CODE_PATTERN,
  normaliseLicenseCode,
  resolveLicenseOption,
  generateLicenseKey,
  generateLicenseRef,
  hashLicenseKey,
}
