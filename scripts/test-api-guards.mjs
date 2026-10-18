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
const { envPresence } = require('../api/_lib/diag.js')

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

setEnv({})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
