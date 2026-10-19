// Guards for the serverless store endpoints.
//
// These exercise the failure paths that a misconfigured deployment hits
// FIRST — before any database or gateway call — so a 503 caused by missing
// environment variables can be told apart from a genuine validation error or
// an empty-body platform error. They also assert that neither the responses
// nor the diagnostic logs leak credential VALUES (only presence booleans).
//
// Run: npm run test:api-guards
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(import.meta.url)

const SENTINEL_SECRET = 'SENTINEL_SERVICE_ROLE_SECRET_VALUE'
const SENTINEL_RAZORPAY = 'SENTINEL_RAZORPAY_KEY_SECRET_VALUE'
const SENTINEL_KEY_ID = 'rzp_test_SENTINELKEYID'

// Snapshot of the environment variables these handlers read, so each case can
// start from a known state without mutating the developer's real .env.
const MANAGED = [
  'SUPABASE_URL',
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'RAZORPAY_KEY_ID',
  'VITE_RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
]

function setEnv(values) {
  for (const name of MANAGED) delete process.env[name]
  Object.assign(process.env, values)
}

function fakeRes() {
  return {
    statusCode: 0,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

/** Captures console output while a handler runs. */
async function capture(fn) {
  const lines = []
  const originalLog = console.log
  const originalError = console.error
  console.log = (...args) => lines.push(args.join(' '))
  console.error = (...args) => lines.push(args.join(' '))
  try {
    const res = fakeRes()
    await fn(res)
    return { res, lines: lines.join('\n') }
  } finally {
    console.log = originalLog
    console.error = originalError
  }
}

const createOrder = require('../api/create-order.js')
const orderStatus = require('../api/order-status.js')
const download = require('../api/download.js')
const adminReconcile = require('../api/admin-reconcile-order.js')
const adminAccessLink = require('../api/admin-access-link.js')
const adminAuth = require('../api/_lib/adminAuth.js')
const webhook = require('../api/razorpay-webhook.js')
const { envPresence } = require('../api/_lib/diag.js')
const fulfilment = require('../api/_lib/fulfilment.js')

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

const jsonBody = (res) => JSON.stringify(res.body ?? '')
const noSecrets = (text) =>
  !text.includes(SENTINEL_SECRET) && !text.includes(SENTINEL_RAZORPAY) && !text.includes(SENTINEL_KEY_ID)

const validProductOrder = () => ({
  method: 'POST',
  headers: {},
  body: {
    order_type: 'product',
    items: [{ slug: 'neural-aurora', quantity: 1 }],
    email: 'buyer@example.com',
  },
})

// --- 1. Unconfigured deployment fails closed with JSON, not an empty body ---
setEnv({})
{
  const { res, lines } = await capture((r) => createOrder(validProductOrder(), r))
  check('create-order: missing service-role key -> 503', res.statusCode === 503, `got ${res.statusCode}`)
  check(
    'create-order: 503 carries a JSON error message',
    typeof res.body?.error === 'string' && res.body.error.length > 0,
    jsonBody(res)
  )
  check('create-order: response leaks no secrets', noSecrets(jsonBody(res)))
  check('create-order: logs leak no secrets', noSecrets(lines))
  check(
    'create-order: logs name the missing variable',
    lines.includes('SUPABASE_SERVICE_ROLE_KEY'),
    lines
  )
}

// A configured key but no usable URL must also fail as "unavailable", never
// as an unhandled crash.
setEnv({
  SUPABASE_SERVICE_ROLE_KEY: SENTINEL_SECRET,
  SUPABASE_URL: 'https://placeholder.supabase.co',
})
{
  const { res, lines } = await capture((r) => createOrder(validProductOrder(), r))
  check('create-order: placeholder supabase url -> 503', res.statusCode === 503, `got ${res.statusCode}`)
  check('create-order: placeholder url logs no secrets', noSecrets(lines))
}

// --- 2. A real validation error is distinguishable from a server failure ---
setEnv({
  SUPABASE_SERVICE_ROLE_KEY: SENTINEL_SECRET,
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
})
{
  const { res } = await capture((r) =>
    createOrder(
      { method: 'POST', headers: {}, body: { order_type: 'product', items: [] } },
      r
    )
  )
  check('create-order: empty item list -> 400 (validation, not 503)', res.statusCode === 400, `got ${res.statusCode}`)
  check(
    'create-order: validation error is human readable',
    res.body?.error === 'At least one product is required',
    jsonBody(res)
  )
}

{
  const { res } = await capture((r) => createOrder({ method: 'GET', headers: {} }, r))
  check('create-order: GET -> 405', res.statusCode === 405, `got ${res.statusCode}`)
}

// --- 3. Order status guards ---
setEnv({})
{
  const { res } = await capture((r) =>
    orderStatus({ method: 'GET', query: { ref: 'NA-0000000000000000' } }, r)
  )
  check('order-status: unconfigured -> 503', res.statusCode === 503, `got ${res.statusCode}`)
  check('order-status: 503 is JSON', typeof res.body?.error === 'string', jsonBody(res))
}
{
  const { res } = await capture((r) => orderStatus({ method: 'GET', query: { ref: 'not-a-ref' } }, r))
  check('order-status: malformed ref -> 400', res.statusCode === 400, `got ${res.statusCode}`)
}

// --- 4. Download guards: no link is ever issued without configuration/auth ---
setEnv({})
{
  const { res, lines } = await capture((r) =>
    download({ method: 'POST', headers: {}, body: { product_slug: 'neural-aurora' } }, r)
  )
  check('download: unconfigured -> 503', res.statusCode === 503, `got ${res.statusCode}`)
  check('download: 503 logs leak no secrets', noSecrets(lines))
}
{
  const { res } = await capture((r) => download({ method: 'POST', headers: {}, body: {} }, r))
  check('download: unconfigured + no slug still 503 (fails closed)', res.statusCode === 503, `got ${res.statusCode}`)
}
{
  setEnv({ SUPABASE_SERVICE_ROLE_KEY: SENTINEL_SECRET, SUPABASE_URL: 'https://example.supabase.co' })
  const { res } = await capture((r) => download({ method: 'POST', headers: {}, body: {} }, r))
  check('download: missing product -> 400', res.statusCode === 400, `got ${res.statusCode}`)
  const { res: noAuth } = await capture((r) =>
    download({ method: 'POST', headers: {}, body: { product_slug: 'neural-aurora' } }, r)
  )
  check('download: guest -> 401 (never a link)', noAuth.statusCode === 401, `got ${noAuth.statusCode}`)
}

// --- 5. The diagnostic helper reports presence, never values ---
{
  setEnv({ SUPABASE_SERVICE_ROLE_KEY: SENTINEL_SECRET })
  const flags = envPresence(['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_URL'])
  check(
    'diag: presence flags are booleans only',
    flags.SUPABASE_SERVICE_ROLE_KEY === true &&
      flags.SUPABASE_URL === false &&
      noSecrets(JSON.stringify(flags)),
    JSON.stringify(flags)
  )
}

// --- 6. Admin reconcile: never usable without config, method or admin proof ---
setEnv({})
{
  const { res, lines } = await capture((r) =>
    adminReconcile({ method: 'POST', headers: {}, body: { order_ref: 'NA-0000000000000000' } }, r)
  )
  check('admin-reconcile: unconfigured -> 503', res.statusCode === 503, `got ${res.statusCode}`)
  check('admin-reconcile: 503 logs leak no secrets', noSecrets(lines))
}
{
  setEnv({ SUPABASE_SERVICE_ROLE_KEY: SENTINEL_SECRET, SUPABASE_URL: 'https://example.supabase.co' })
  const { res } = await capture((r) => adminReconcile({ method: 'GET', headers: {} }, r))
  check('admin-reconcile: GET -> 405', res.statusCode === 405, `got ${res.statusCode}`)
}
{
  // Configured, but no gateway credentials: must fail closed, not crash.
  setEnv({ SUPABASE_SERVICE_ROLE_KEY: SENTINEL_SECRET, SUPABASE_URL: 'https://example.supabase.co' })
  const { res } = await capture((r) =>
    adminReconcile({ method: 'POST', headers: {}, body: { order_ref: 'NA-0000000000000000' } }, r)
  )
  check('admin-reconcile: missing gateway creds -> 503', res.statusCode === 503, `got ${res.statusCode}`)
}
{
  // Fully configured, but the caller presents no admin token.
  setEnv({
    SUPABASE_SERVICE_ROLE_KEY: SENTINEL_SECRET,
    SUPABASE_URL: 'https://example.supabase.co',
    RAZORPAY_KEY_ID: SENTINEL_KEY_ID,
    RAZORPAY_KEY_SECRET: SENTINEL_RAZORPAY,
  })
  const { res, lines } = await capture((r) =>
    adminReconcile({ method: 'POST', headers: {}, body: { order_ref: 'NA-0000000000000000' } }, r)
  )
  check('admin-reconcile: anonymous -> 403 (never reaches the gateway)', res.statusCode === 403, `got ${res.statusCode}`)
  check('admin-reconcile: 403 leaks no secrets', noSecrets(jsonBody(res)) && noSecrets(lines))
}

// --- 7. Webhook: a signature is still required before any fulfilment work ---
{
  setEnv({ RAZORPAY_WEBHOOK_SECRET: SENTINEL_RAZORPAY })
  const { res, lines } = await capture((r) =>
    webhook({ method: 'POST', headers: {}, body: { event: 'payment.captured' } }, r)
  )
  check('webhook: no signature header -> 400', res.statusCode === 400, `got ${res.statusCode}`)
  check('webhook: rejects without leaking the secret', noSecrets(lines))

  const { res: badSignature } = await capture((r) =>
    webhook(
      {
        method: 'POST',
        headers: { 'x-razorpay-signature': 'deadbeef' },
        body: '{"event":"payment.captured"}',
      },
      r
    )
  )
  check('webhook: bad signature -> 400', badSignature.statusCode === 400, `got ${badSignature.statusCode}`)
}
{
  setEnv({ RAZORPAY_WEBHOOK_SECRET: SENTINEL_RAZORPAY })
  const { res } = await capture((r) => webhook({ method: 'GET', headers: {} }, r))
  check('webhook: GET -> 405', res.statusCode === 405, `got ${res.statusCode}`)
}

// --- 8. One fulfilment implementation, shared by both entry points -----------
check(
  'fulfilment: the audited grant path is exported for reuse',
  typeof fulfilment.fulfilDigitalOrder === 'function' && typeof fulfilment.getServiceClient === 'function'
)

// --- 9. One admin gate, shared by every admin-only endpoint ------------------
check(
  'admin-auth: the audited admin gate is exported for reuse',
  typeof adminAuth.requireAdmin === 'function' && typeof adminAuth.getServiceClient === 'function'
)
{
  const reconcileSrc = fs.readFileSync('api/admin-reconcile-order.js', 'utf8')
  const accessLinkSrc = fs.readFileSync('api/admin-access-link.js', 'utf8')
  check(
    'admin-auth: no endpoint keeps a divergent copy of the admin check',
    reconcileSrc.includes("require('./_lib/adminAuth')") &&
      accessLinkSrc.includes("require('./_lib/adminAuth')") &&
      !reconcileSrc.includes('async function requireAdmin'),
    'an admin endpoint declares its own requireAdmin()'
  )
}

// --- 10. Sign-in links: the admin proof is required BEFORE anything is minted --
setEnv({})
{
  const { res, lines } = await capture((r) =>
    adminAccessLink({ method: 'POST', headers: {}, body: { email: 'buyer@example.com' } }, r)
  )
  check('admin-access-link: unconfigured -> 503', res.statusCode === 503, `got ${res.statusCode}`)
  check('admin-access-link: 503 leaks no secrets', noSecrets(jsonBody(res)) && noSecrets(lines))
}
{
  setEnv({ SUPABASE_SERVICE_ROLE_KEY: SENTINEL_SECRET, SUPABASE_URL: 'https://example.supabase.co' })
  const { res } = await capture((r) => adminAccessLink({ method: 'GET', headers: {} }, r))
  check('admin-access-link: GET -> 405', res.statusCode === 405, `got ${res.statusCode}`)
}
{
  setEnv({ SUPABASE_SERVICE_ROLE_KEY: SENTINEL_SECRET, SUPABASE_URL: 'https://example.supabase.co' })
  const { res, lines } = await capture((r) =>
    adminAccessLink({ method: 'POST', headers: {}, body: { email: 'buyer@example.com' } }, r)
  )
  check(
    'admin-access-link: anonymous -> 403 (never mints a link)',
    res.statusCode === 403,
    `got ${res.statusCode}`
  )
  check('admin-access-link: 403 leaks no secrets', noSecrets(jsonBody(res)) && noSecrets(lines))
  check(
    'admin-access-link: 403 body contains no link',
    !jsonBody(res).includes('http'),
    jsonBody(res)
  )
}
{
  // An empty bearer token is not proof of anything: no network call, just 403.
  setEnv({ SUPABASE_SERVICE_ROLE_KEY: SENTINEL_SECRET, SUPABASE_URL: 'https://example.supabase.co' })
  const { res } = await capture((r) =>
    adminAccessLink(
      { method: 'POST', headers: { authorization: 'Bearer ' }, body: { order_ref: 'not-a-ref' } },
      r
    )
  )
  check(
    'admin-access-link: empty bearer token -> 403',
    res.statusCode === 403,
    `got ${res.statusCode}`
  )
}

// --- 11. Customer phone: one normaliser, and the browser copy agrees ---------
{
  const serverPhone = require('../api/_lib/phone.js')
  const browserPhone = await import('../src/lib/phone.js')

  // input -> digits-only international form the database stores.
  const cases = [
    ['98765 43210', '919876543210'],
    ['+91 98765-43210', '919876543210'],
    ['09876543210', '919876543210'],
    ['0091 98765 43210', '919876543210'],
    ['+44 7911 123456', '447911123456'],
    ['+1 (415) 555-2671', '14155552671'],
    ['4155552671', '914155552671'],
    ['ask me later', ''],
    ['12 34', ''],
    ['+91', ''],
    ['1234567890123456', ''],
    ['', ''],
  ]

  const mismatches = cases.filter(([input, expected]) => {
    const fromServer = serverPhone.normalisePhone(input)
    const fromBrowser = browserPhone.normalisePhone(input)
    return fromServer !== fromBrowser || fromServer !== expected
  })
  check(
    'phone: server and browser normalisers agree on every case',
    mismatches.length === 0,
    mismatches
      .map(
        ([input]) =>
          `'${input}' -> ${serverPhone.normalisePhone(input)} / ${browserPhone.normalisePhone(input)}`
      )
      .join('; ')
  )

  check(
    'phone: normalising an already-normalised number changes nothing',
    cases.every(
      ([, expected]) =>
        expected === '' || serverPhone.normalisePhone(expected) === expected
    )
  )

  check(
    'phone: unusable input is empty, never an exception',
    serverPhone.normalisePhone(undefined) === '' &&
      serverPhone.normalisePhone(null) === '' &&
      serverPhone.normalisePhone(12345) === '' &&
      serverPhone.normalisePhone({}) === ''
  )

  // A phone number is a convenience, never a reason to lose a sale, so the
  // shared module is the ONLY implementation and nothing rejects an order for
  // want of one.
  const createOrderSrc = fs.readFileSync('api/create-order.js', 'utf8')
  check(
    'phone: create-order uses the shared normaliser, not a private copy',
    createOrderSrc.includes("require('./_lib/phone')") &&
      !createOrderSrc.includes('function normalisePhone')
  )
  check(
    'phone: an unusable number never fails the order',
    !/if \(!customerPhone\)[\s\S]{0,120}status\(4\d\d\)/.test(createOrderSrc),
    'create-order rejects an order because of the phone number'
  )

  const accessLinkSrc = fs.readFileSync('api/admin-access-link.js', 'utf8')
  check(
    'phone: the sign-in link endpoint reports the customer number',
    accessLinkSrc.includes("require('./_lib/phone')") &&
      accessLinkSrc.includes('phone: phone || null')
  )

  const detailSrc = fs.readFileSync('src/components/offerings/ProductDetail.jsx', 'utf8')
  check(
    'phone: the store checkout asks for a number and validates it',
    detailSrc.includes('normalisePhone') &&
      detailSrc.includes('type="tel"') &&
      detailSrc.includes("t('store.phoneRequired')")
  )
}

setEnv({})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
