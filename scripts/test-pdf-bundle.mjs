// Bundle test for the licence PDF endpoint.
//
// PDFKit 0.20.x loads its built-in fonts through dynamic package `imports`
// self-references that Vercel's file tracer cannot see. Locally everything
// resolves from node_modules, so unit tests pass while the deployed function
// 500s on the first .font() call. This test reproduces the deployment:
//
//   1. Trace api/license.js exactly like the Vercel build does.
//   2. Copy ONLY the traced files into an isolated directory.
//   3. Build a certificate from that isolated copy — no fallback to the
//      project's node_modules is possible.
//
// It also guards the lazy-load invariant: the checkout function must not
// pull PDFKit into its bundle.
//
// Run: npm run test:pdf-bundle
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { nodeFileTrace } from '@vercel/nft'

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

const { fileList } = await nodeFileTrace(['api/license.js'], { base })
const files = [...fileList].map((f) => f.split(path.sep).join('/'))

const has = (needle) => files.some((f) => f.includes(needle))

// The static requires are what make the fonts traceable by EVERY bundler
// version. Newer tracers also understand PDFKit's dynamic `imports`
// self-references, which would mask a regression here — so guard the source
// directly, the same way test-licensing guards the lazy-load invariant.
const pdfBuilderSource = fs.readFileSync(path.join(base, 'api/_lib/license-pdf.js'), 'utf8')
const staticFontRequires = [
  'Helvetica',
  'HelveticaBold',
  'CourierBold',
].every((font) => pdfBuilderSource.includes(`require('pdfkit/standard-fonts/${font}')`))
check('PDF builder statically requires the fonts it draws with', staticFontRequires)

const receiptBuilderSource = fs.readFileSync(path.join(base, 'api/_lib/receipt-pdf.js'), 'utf8')
const receiptFontRequires = ['Helvetica', 'HelveticaBold', 'CourierBold'].every((font) =>
  receiptBuilderSource.includes(`require('pdfkit/standard-fonts/${font}')`)
)
check('receipt builder statically requires the fonts it draws with', receiptFontRequires)

check('licence function bundles PDFKit', has('pdfkit/js/pdfkit.js'))
check(
  'licence function bundles the standard fonts PDFKit loads dynamically',
  has('pdfkit/js/standard-fonts/Helvetica.cjs') &&
    has('pdfkit/js/standard-fonts/HelveticaBold.cjs') &&
    has('pdfkit/js/standard-fonts/CourierBold.cjs') &&
    has('pdfkit/js/standard-fonts/chunks/')
)

// Checkout must stay independent of the PDF runtime.
const checkout = await nodeFileTrace(['api/create-order.js'], { base })
const checkoutFiles = [...checkout.fileList].map((f) => f.split(path.sep).join('/'))
check('checkout bundle never includes PDFKit', !checkoutFiles.some((f) => f.includes('pdfkit')))

// Simulate the deployed function: only traced files exist.
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'na-pdf-bundle-'))
try {
  for (const rel of files) {
    const target = path.join(sandbox, rel)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(path.join(base, rel), target)
  }

  const { buildLicensePdf } = require(path.join(sandbox, 'api/_lib/license-pdf.js'))
  const pdf = await buildLicensePdf({
    license_ref: 'LIC-TEST-0001',
    license_key: 'NA-4TEST-TESTT-TESTT-TESTT',
    license_type: 'developer license',
    product_title: 'Test Product',
    customer_email: 'owner@example.com',
    seats: 1,
    status: 'active',
    issued_at: '2026-11-23T00:00:00Z',
    terms: 'Test terms.',
    issuer: 'NEURAL AURORA',
  })
  check('certificate builds from the traced bundle alone', Buffer.isBuffer(pdf) && pdf.subarray(0, 5).toString() === '%PDF-')

  const { buildReceiptPdf } = require(path.join(sandbox, 'api/_lib/receipt-pdf.js'))
  const receipt = await buildReceiptPdf({
    order: {
      order_ref: 'NA-BUNDLE00000001',
      email: 'buyer@example.com',
      currency: 'INR',
      total_paise: 49900,
      paid_at: '2026-11-23T10:00:00Z',
    },
    items: [{ title: 'Bundle Ebook', quantity: 1, total_paise: 49900 }],
  })
  check(
    'receipt builds from the traced bundle alone',
    Buffer.isBuffer(receipt) && receipt.subarray(0, 5).toString() === '%PDF-'
  )
} catch (err) {
  check('certificate builds from the traced bundle alone', false, err?.message)
  check('receipt builds from the traced bundle alone', false, err?.message)
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true })
}

console.log(`${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
