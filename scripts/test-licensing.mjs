// Pure tests for licensing, recommendations and preview-media validation.
//
// These functions are deliberately dependency-light so the most important
// safety properties can be checked without a database, network or browser:
//   - the browser may name a configured option, but may not invent one
//   - keys are random, opaque and verifiable by hash
//   - the PDF license document renders stored row data as inert vector text
//   - recommendations are deterministic, explainable and privacy-free
//   - only http(s) image/PDF URLs reach a preview renderer
//
// Run: npm run test:licensing
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const crypto = require('node:crypto')
const fs = require('node:fs')
const {
  resolveLicenseOption,
  generateLicenseKey,
  generateLicenseRef,
  hashLicenseKey,
} = require('../api/_lib/license.js')
const { buildLicensePdf, safeFilename, PDF_COLORS } = require('../api/_lib/license-pdf.js')
const {
  normaliseDocumentSignature,
  isAllowedSignatureUrl,
  hasAllowedImageMagic,
  fetchSignatureImage,
} = require('../api/_lib/document-signature.js')
const { priceProductOrder } = require('../api/_lib/order-pricing.js')

const { rankRelatedProducts } = await import('../src/lib/recommendations.js')
const { isSafePreviewUrl, splitPreviewMedia } = await import('../src/lib/previewMedia.js')

let passed = 0
let failed = 0

function check(name, condition, detail) {
  if (condition) {
    passed++
    console.log(`ok    ${name}`)
  } else {
    failed++
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// Checkout must stay independent of the PDF runtime. A missing PDFKit install
// used to fail every create-order request before the handler even started.
{
  const shared = fs.readFileSync('api/_lib/license.js', 'utf8')
  const pricing = fs.readFileSync('api/_lib/order-pricing.js', 'utf8')
  const createOrder = fs.readFileSync('api/create-order.js', 'utf8')
  const licenseRouter = fs.readFileSync('api/license.js', 'utf8')
  const documentEndpoint = fs.readFileSync('api/_lib/license-document-handler.js', 'utf8')
  const requiresPdf = (source) =>
    /require\(\s*['"](?:pdfkit|\.\.?\/_lib\/license-pdf(?:\.js)?|\.\/license-pdf(?:\.js)?)['"]\s*\)/.test(source)
  check(
    'checkout never loads PDFKit',
    !requiresPdf(shared) &&
      !requiresPdf(pricing) &&
      !requiresPdf(createOrder) &&
      !requiresPdf(licenseRouter)
  )
  check('PDF builder is loaded only by the document endpoint', documentEndpoint.includes("require('./license-pdf')"))
}

const options = [
  { product_id: 1, code: 'personal', label: 'Personal', is_default: true, terms: 'One person.' },
  { product_id: 1, code: 'team', label: 'Team', is_default: false, terms: 'Up to 10 seats.' },
]

// --- option resolution ------------------------------------------------------
{
  const result = resolveLicenseOption({ requestedCode: 'team', options, title: 'Starter Kit' })
  check('resolves a configured option', result.ok && result.option.code === 'team')
}
{
  const result = resolveLicenseOption({ requestedCode: '', options })
  check('falls back to the configured default', result.ok && result.option.code === 'personal')
}
{
  const result = resolveLicenseOption({ requestedCode: 'enterprise', options, title: 'Starter Kit' })
  check(
    'rejects an unknown option instead of downgrading',
    result.ok === false && result.status === 400 && /enterprise/.test(result.error),
    JSON.stringify(result)
  )
}
{
  const result = resolveLicenseOption({ requestedCode: 'team', options: [], title: 'Starter Kit' })
  check('allows a product with no configured options', result.ok && result.option === null)
}
{
  const result = resolveLicenseOption({
    requestedCode: 'TEAM',
    options: [{ code: 'team', label: 'Team' }],
  })
  check('option codes are case-insensitive', result.ok && result.option.code === 'team')
}
{
  const result = resolveLicenseOption({
    requestedCode: '<script>',
    options: [{ code: 'team', label: 'Team' }],
  })
  check('rejects malformed option codes', result.ok === false && result.status === 400)
}

// --- server-side pricing snapshot -------------------------------------------
{
  const result = priceProductOrder({
    requestedItems: [{ slug: 'starter-kit', quantity: 1, license_code: 'enterprise' }],
    products: [
      {
        id: 1,
        slug: 'starter-kit',
        title: 'Starter Kit',
        price_paise: 49900,
        currency: 'INR',
        status: 'published',
      },
    ],
    licenseOptions: options,
  })
  check(
    'unknown option code fails checkout server-side',
    result.ok === false && result.status === 400,
    JSON.stringify(result)
  )
}
{
  const result = priceProductOrder({
    requestedItems: [{ slug: 'starter-kit', quantity: 2, license_code: 'team' }],
    products: [
      {
        id: 1,
        slug: 'starter-kit',
        title: 'Starter Kit',
        price_paise: 49900,
        currency: 'INR',
        status: 'published',
      },
    ],
    licenseOptions: options,
  })
  check(
    'server snapshots the chosen option and quantity',
    result.ok === true &&
      result.lines?.[0]?.licenseOption?.code === 'team' &&
      result.lines?.[0]?.licenseTypeSnapshot === 'Team' &&
      result.lines?.[0]?.quantity === 2,
    JSON.stringify(result)
  )
}

// --- keys and hashes --------------------------------------------------------
{
  const keys = new Set(Array.from({ length: 200 }, () => generateLicenseKey(crypto, 'starter-kit')))
  check('generates unique keys', keys.size === 200)
  check(
    'keys use the expected opaque shape',
    [...keys].every((key) => /^NA-[A-Z0-9]{4}(?:-[A-Z0-9]{5}){4}$/.test(key)),
    [...keys][0]
  )
  check(
    'keys carry no customer data',
    [...keys].every((key) => !/test|example|admin|@/i.test(key))
  )
  check(
    'hashing is deterministic and case-insensitive',
    hashLicenseKey(crypto, 'na-starter-abcde') === hashLicenseKey(crypto, ' NA-STARTER-ABCDE ')
  )
  check('hashes are SHA-256 hex', /^[a-f0-9]{64}$/.test(hashLicenseKey(crypto, 'key')))
  check(
    'references are unique and printable',
    new Set(Array.from({ length: 50 }, () => generateLicenseRef(crypto))).size === 50 &&
      /^LIC-\d{4}-[0-9A-F]{14}$/.test(generateLicenseRef(crypto))
  )
}

// --- license document -------------------------------------------------------
/** PDFKit writes glyph runs as hex strings; decode them for content checks. */
function pdfText(pdf) {
  return Array.from(pdf.toString('latin1').matchAll(/<([0-9A-Fa-f]+)>/g))
    .map((match) => Buffer.from(match[1], 'hex').toString('latin1'))
    .join('')
}

{
  const pdf = await buildLicensePdf({
    product_title: 'Starter Kit',
    customer_email: 'buyer@example.com',
    license_ref: 'LIC-2026-ABCDEF',
    license_type: 'Team license',
    license_key: 'NA-STAR-AAAAA-BBBBB-CCCCC-DDDDD',
    status: 'active',
    issued_at: '2026-11-22T10:00:00Z',
    seats: 5,
    terms: 'Use for one team.',
  })
  const raw = pdf.toString('latin1')
  const text = pdfText(pdf)
  check('document is a valid PDF file', pdf.subarray(0, 5).toString() === '%PDF-' && raw.trimEnd().endsWith('%%EOF'))
  check('document includes real record fields', text.includes('LIC-2026-ABCDEF') && text.includes('Team license'))
  check(
    'document is a license certificate, not a receipt',
    /not a payment receipt/i.test(text) && /LICENSE CERTIFICATE/i.test(text)
  )
  check(
    'document uses the professional palette',
    PDF_COLORS.navy === '#0B1220' && PDF_COLORS.cyan === '#22D3EE' && PDF_COLORS.violet === '#7C3AED'
  )
  check('document filename is attachment-safe', safeFilename('LIC-2026/../abc?d') === 'LIC-2026-abc-d')
}
{
  const payload = '<img src=x onerror="window.__pwned=1">'
  const pdf = await buildLicensePdf({
    product_title: payload,
    customer_name: payload,
    license_key: payload,
    terms: payload,
  })
  const raw = pdf.toString('latin1')
  check(
    'hostile row values cannot inject markup or scripts',
    !raw.includes('<img') && !raw.includes('onerror=') && pdf.subarray(0, 5).toString() === '%PDF-'
  )
}

// --- admin-managed signature ------------------------------------------------
{
  const previousUrl = process.env.SUPABASE_URL
  const previousViteUrl = process.env.VITE_SUPABASE_URL
  process.env.SUPABASE_URL = 'https://demo.supabase.co'
  delete process.env.VITE_SUPABASE_URL

  try {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==',
      'base64'
    )
    const allowed = 'https://demo.supabase.co/storage/v1/object/public/portfolio-images/signature.png'
    const normalised = normaliseDocumentSignature({
      enabled: 'yes',
      url: `  ${allowed}  `,
      name: '  Aarav   Mehta  ',
      title: 'Founder, Neural Aurora',
      admin_email: 'should-be-dropped@example.com',
    })
    check(
      'signature normaliser keeps only display fields',
      normalised.enabled === false &&
        normalised.url === allowed &&
        normalised.name === 'Aarav Mehta' &&
        normalised.title === 'Founder, Neural Aurora' &&
        !('admin_email' in normalised)
    )
    check('signature URL accepts the configured public bucket', isAllowedSignatureUrl(allowed))
    check(
      'signature URL rejects foreign, private and query-bearing URLs',
      !isAllowedSignatureUrl('https://evil.test/storage/v1/object/public/portfolio-images/s.png') &&
        !isAllowedSignatureUrl('https://demo.supabase.co/storage/v1/object/private/digital-products/s.png') &&
        !isAllowedSignatureUrl(`${allowed}?download=1`)
    )
    check('signature magic bytes are validated', hasAllowedImageMagic(png, 'image/png') && !hasAllowedImageMagic(png, 'image/jpeg'))

    const bytes = new Uint8Array(png)
    const loaded = await fetchSignatureImage(
      { enabled: true, url: allowed, name: normalised.name, title: normalised.title },
      'test-request',
      async () => ({
        ok: true,
        headers: {
          get: (name) =>
            ({ 'content-type': 'image/png', 'content-length': String(png.length) })[name.toLowerCase()] || null,
        },
        arrayBuffer: async () => bytes.buffer,
      })
    )
    check('valid signature image is loaded', Boolean(loaded?.buffer) && loaded.name === 'Aarav Mehta')

    const pdf = await buildLicensePdf({
      product_title: 'Starter Kit',
      license_ref: 'LIC-2026-ABCDEF',
      license_key: 'NA-STAR-AAAAA-BBBBB-CCCCC-DDDDD',
      signature: loaded,
    })
    const text = pdfText(pdf)
    check(
      'PDF renders the admin signature block',
      pdf.subarray(0, 5).toString() === '%PDF-' &&
        text.includes('Aarav Mehta') &&
        text.includes('Founder, Neural Aurora')
    )
  } finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL
    else process.env.SUPABASE_URL = previousUrl
    if (previousViteUrl === undefined) delete process.env.VITE_SUPABASE_URL
    else process.env.VITE_SUPABASE_URL = previousViteUrl
  }
}

// --- recommendations --------------------------------------------------------
{
  const current = {
    id: 1,
    title: 'Aurora UI Kit',
    category_slug: 'ui-kits',
    format: 'Figma',
    tags: ['design', 'react'],
    status: 'published',
  }
  const candidates = [
    { id: 2, title: 'Other UI Kit', category_slug: 'ui-kits', format: 'Figma', tags: ['design'], status: 'published', featured: false },
    { id: 3, title: 'Random Template', category_slug: 'templates', format: 'PDF', tags: [], status: 'published', featured: true },
    { id: 4, title: 'Draft Kit', category_slug: 'ui-kits', format: 'Figma', tags: ['design'], status: 'draft' },
    { id: 1, title: 'Aurora UI Kit', category_slug: 'ui-kits', format: 'Figma', tags: ['design'], status: 'published' },
  ]
  const ranked = rankRelatedProducts(current, candidates, 3)
  check('excludes self, drafts and unrelated products', ranked.length === 1 && ranked[0].product.id === 2)
  check('explains the score', ranked[0].reasons.includes('sameCategory') && ranked[0].reasons.includes('sharedTags'))
  check(
    'ranking is deterministic',
    JSON.stringify(rankRelatedProducts(current, candidates, 3)) === JSON.stringify(ranked)
  )
}

// --- preview media ----------------------------------------------------------
{
  check('accepts https images', isSafePreviewUrl('https://cdn.example.com/a.png?v=2', 'image'))
  check('accepts http PDFs', isSafePreviewUrl('http://example.com/guide.pdf', 'pdf'))
  check('rejects javascript URLs', !isSafePreviewUrl('javascript:alert(1)', 'image'))
  check('rejects data URLs', !isSafePreviewUrl('data:image/png;base64,AAAA', 'image'))
  check('rejects an image URL in the PDF slot', !isSafePreviewUrl('https://example.com/a.png', 'pdf'))
  check('rejects lookalike paths', !isSafePreviewUrl('https://example.com/a.png/evil.html', 'image'))
  const split = splitPreviewMedia([
    'https://example.com/a.webp',
    'https://example.com/guide.pdf',
    'javascript:alert(1)',
    null,
  ])
  check(
    'buckets known and unsupported media',
    split.images.length === 1 && split.pdfs.length === 1 && split.unsupported.length === 1,
    JSON.stringify(split)
  )
}

console.log(`${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
