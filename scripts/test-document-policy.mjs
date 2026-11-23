// Document-policy regression tests.
//
// Every product now declares what a purchase produces: a licence certificate
// (software, templates, code) or a receipt only (ebooks, artwork, one-off
// files). Both still unlock downloads. These tests cover the pure decisions,
// the expiry snapshot, the receipt PDF and the wiring of the new endpoint.
//
// Run: npm run test:document-policy
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)
const base = process.cwd()

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

const read = (file) => fs.readFileSync(path.join(base, file), 'utf8')
const has = (file, needle) => read(file).includes(needle)

const {
  normaliseDocumentPolicy,
  isReceiptOnly,
  parseValidityDays,
  licenseExpiryFromDays,
} = require(path.join(base, 'api/_lib/license.js'))
const { priceProductOrder } = require(path.join(base, 'api/_lib/order-pricing.js'))
const { buildReceiptPdf } = require(path.join(base, 'api/_lib/receipt-pdf.js'))

// --- pure policy resolution --------------------------------------------------

check('unknown document policy falls back to licence', normaliseDocumentPolicy(undefined) === 'license')
check('document policy is normalised case-insensitively', normaliseDocumentPolicy(' RECEIPT ') === 'receipt')
check('unknown policy strings never become receipt-only', normaliseDocumentPolicy('ebook') === 'license')
check('receipt-only product detection', isReceiptOnly({ document_policy: 'receipt' }) === true)
check('licence product detection', isReceiptOnly({ document_policy: 'license' }) === false)

// --- validity / expiry snapshots --------------------------------------------

check('blank validity means perpetual', parseValidityDays('').days === null)
check('null validity means perpetual', parseValidityDays(null).days === null)
check('whole-day validity is accepted', parseValidityDays(30).days === 30)
for (const bad of [0, -1, 1.5, 'many', 36501]) {
  check(`invalid validity rejected: ${bad}`, parseValidityDays(bad).ok === false)
}
check('perpetual validity has no expiry', licenseExpiryFromDays(null, new Date('2026-01-01T00:00:00Z')) === null)
check(
  '30-day licence expires 30 days from purchase (UTC, DST-safe)',
  licenseExpiryFromDays(30, new Date('2026-03-10T12:00:00Z')) === '2026-04-09T12:00:00.000Z'
)
check(
  'invalid validity never produces a short licence',
  licenseExpiryFromDays(-5, new Date('2026-01-01T00:00:00Z')) === null
)

// --- pricing integration -----------------------------------------------------

const now = new Date('2026-11-23T10:00:00Z')
const receiptProduct = {
  id: 1,
  slug: 'ebook',
  title: 'Ebook',
  price_paise: 49900,
  currency: 'INR',
  status: 'published',
  version: 1,
  document_policy: 'receipt',
}
const licenceProduct = {
  id: 2,
  slug: 'template',
  title: 'Template',
  price_paise: 99900,
  currency: 'INR',
  status: 'published',
  version: 1,
  document_policy: 'license',
}

const receiptPriced = priceProductOrder({
  requestedItems: [{ slug: 'ebook', quantity: 1, licenseCode: 'personal' }],
  products: [receiptProduct],
  licenseOptions: [],
  now,
})
check('receipt-only checkout succeeds without licence options', receiptPriced.ok === true)
check(
  'a stale licence code is ignored for receipt-only products',
  receiptPriced.lines?.[0]?.licenseOption === null && receiptPriced.lines?.[0]?.documentPolicy === 'receipt'
)
check('receipt-only line never snapshots an expiry', receiptPriced.lines?.[0]?.licenseExpiresAt === null)

const timedPriced = priceProductOrder({
  requestedItems: [{ slug: 'template', quantity: 1 }],
  products: [licenceProduct],
  licenseOptions: [
    {
      id: 7,
      product_id: 2,
      code: 'personal',
      label: 'Personal',
      is_default: true,
      validity_days: 30,
    },
  ],
  now,
})
check('timed licence option prices successfully', timedPriced.ok === true)
check(
  'timed licence snapshots its expiry at checkout',
  timedPriced.lines?.[0]?.licenseExpiresAt === '2026-12-23T10:00:00.000Z',
  timedPriced.lines?.[0]?.licenseExpiresAt
)

const perpetualPriced = priceProductOrder({
  requestedItems: [{ slug: 'template', quantity: 1, licenseCode: 'personal' }],
  products: [licenceProduct],
  licenseOptions: [
    { id: 7, product_id: 2, code: 'personal', label: 'Personal', is_default: true, validity_days: null },
  ],
  now,
})
check('perpetual licence snapshots no expiry', perpetualPriced.lines?.[0]?.licenseExpiresAt === null)

// Legacy databases have no document_policy column; old behaviour must survive.
const legacyPriced = priceProductOrder({
  requestedItems: [{ slug: 'template', quantity: 1 }],
  products: [{ ...licenceProduct, document_policy: undefined }],
  licenseOptions: [],
  now,
})
check('products without a policy keep the licence default', legacyPriced.lines?.[0]?.documentPolicy === 'license')

// --- receipt PDF ------------------------------------------------------------

try {
  const pdf = await buildReceiptPdf({
    order: {
      order_ref: 'NA-0123456789ABCDEF',
      customer_name: 'Ada Lovelace',
      email: 'ada@example.com',
      currency: 'INR',
      total_paise: 49900,
      paid_at: '2026-11-23T10:00:00Z',
      payment_id: 'pay_TEST123',
    },
    items: [{ title: 'The Ebook', quantity: 1, total_paise: 49900 }],
  })
  // PDFKit writes glyphs with a subset font encoding, so the rendered text is
  // not searchable as raw bytes. Assert the document is a complete PDF sized
  // for real content rather than an error page or an empty stream.
  const text = pdf.toString('latin1')
  check(
    'receipt PDF is a complete PDF with rendered content',
    Buffer.isBuffer(pdf) && text.startsWith('%PDF-') && text.includes('%%EOF') && pdf.length > 3000,
    `bytes=${pdf.length}`
  )
} catch (err) {
  check('receipt PDF builds', false, err?.message)
}

// --- endpoint and UI wiring --------------------------------------------------

check('combined function routes the receipt action', has('api/license.js', "case 'receipt'"))
check('Vercel rewrites /api/order-receipt', has('vercel.json', '"/api/order-receipt"'))
check('receipt handler reads only stored order data', has('api/_lib/order-receipt-handler.js', "order.payment_status !== 'paid'"))
check(
  'checkout snapshots the expiry onto the order item',
  has('api/create-order.js', 'license_expires_at: priced.lines[i].licenseExpiresAt')
)
check(
  'fulfilment copies the snapshot onto the licence',
  has('api/_lib/fulfilment.js', 'expires_at: item.license_expires_at')
)
check(
  'product form offers a document type',
  has('src/components/admin/AdminProducts.jsx', "key: 'document_policy'")
)
check(
  'licence option form offers validity',
  has('src/components/admin/AdminLicenses.jsx', 'Perpetual')
)
check(
  'product page hides licence choice for receipt products',
  has('src/components/offerings/ProductDetail.jsx', '!isFree && !isReceiptProduct && licenseOptions.length > 0')
)
check(
  'library lists receipts',
  has('src/components/offerings/Library.jsx', "t('store.yourReceipts')")
)
check(
  'success screen offers a receipt',
  has('src/components/offerings/PurchaseSuccess.jsx', "t('store.downloadReceipt')")
)
check(
  'migration adds all three document-policy columns',
  has('supabase/migrations/20261123000000_add_product_document_policy.sql', 'document_policy') &&
    has('supabase/migrations/20261123000000_add_product_document_policy.sql', 'validity_days') &&
    has('supabase/migrations/20261123000000_add_product_document_policy.sql', 'license_expires_at')
)
check(
  'English translations exist for receipt UI',
  has('src/locales/en.json', '"downloadReceipt"') && has('src/locales/en.json', '"receiptOnlyNotice"')
)

console.log(`${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
