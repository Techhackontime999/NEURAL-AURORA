// ---------------------------------------------------------------------------
// Product licensing helpers.
//
// Pure, dependency-light functions shared by order creation, fulfilment and
// tests. A license is NOT a receipt: it is a separate, server-issued record
// with its own key, status and terms. Nothing here trusts browser input for
// price or entitlement; the selected option must exist on the product.
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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(value) {
  if (!value) return 'Not applicable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10)
}

/**
 * Build the downloadable license document from an ACTUAL license record.
 * HTML was chosen deliberately: it is a stable, printable format that needs no
 * binary generator, and every field comes from the stored row.
 */
function buildLicenseDocument(record = {}) {
  const product = escapeHtml(record.product_title || record.product_slug || 'Product')
  const holder = escapeHtml(record.customer_name || record.customer_email || 'License holder')
  const reference = escapeHtml(record.license_ref || record.id || 'Pending')
  const type = escapeHtml(record.license_type || 'Standard license')
  const issued = escapeHtml(formatDate(record.issued_at || record.created_at))
  const expires = escapeHtml(formatDate(record.expires_at))
  const status = escapeHtml(record.status || 'active')
  const seats = escapeHtml(record.seats || 1)
  const issuer = escapeHtml(record.issuer || 'NEURAL AURORA')
  const terms = escapeHtml(record.terms || record.license_summary || 'See the product page for license terms.')
  const key = escapeHtml(record.license_key || '')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>License ${reference} — ${product}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 48px 24px; background: #f7f8fb; color: #141822;
         font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  main { max-width: 720px; margin: 0 auto; background: #fff; padding: 48px;
         border: 1px solid #e2e5ee; border-radius: 12px; }
  .eyebrow { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: #64708a; }
  h1 { font-size: 28px; margin: 8px 0 24px; letter-spacing: -.02em; }
  dl { display: grid; grid-template-columns: 180px 1fr; gap: 12px 24px; margin: 0 0 28px; }
  dt { color: #64708a; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
  dd { margin: 0; font-weight: 500; overflow-wrap: anywhere; }
  .key { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .04em; }
  .terms { border-top: 1px solid #e2e5ee; padding-top: 20px; white-space: pre-wrap; }
  footer { margin-top: 32px; color: #64708a; font-size: 12px; }
  @media (max-width: 600px) { main { padding: 24px; } dl { grid-template-columns: 1fr; gap: 2px; } dd { margin-bottom: 12px; } }
  @media print { body { background: #fff; padding: 0; } main { border: 0; padding: 0; } }
</style>
</head>
<body>
<main>
  <div class="eyebrow">Software &amp; digital product license</div>
  <h1>${product}</h1>
  <dl>
    <dt>License holder</dt><dd>${holder}</dd>
    <dt>License reference</dt><dd>${reference}</dd>
    <dt>License type</dt><dd>${type}</dd>
    <dt>License key</dt><dd class="key">${key}</dd>
    <dt>Status</dt><dd>${status}</dd>
    <dt>Issued</dt><dd>${issued}</dd>
    <dt>Expires</dt><dd>${expires}</dd>
    <dt>Covered seats / copies</dt><dd>${seats}</dd>
    <dt>Issuer</dt><dd>${issuer}</dd>
  </dl>
  <section class="terms"><div class="eyebrow">Applicable terms</div><p>${terms}</p></section>
  <footer>This document records the license issued for the order above. It is not a payment receipt.</footer>
</main>
</body>
</html>\n`
}

module.exports = {
  CODE_PATTERN,
  normaliseLicenseCode,
  resolveLicenseOption,
  generateLicenseKey,
  generateLicenseRef,
  hashLicenseKey,
  buildLicenseDocument,
  escapeHtml,
}
