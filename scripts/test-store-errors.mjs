// Unit tests for customer-facing store error mapping.
// Run: npm run test:store-errors
import { friendlyStoreError } from '../src/lib/storeErrors.js'

let passed = 0
let failed = 0

function check(name, cond) {
  if (cond) {
    passed++
    console.log(`ok    ${name}`)
  } else {
    failed++
    console.log(`FAIL  ${name}`)
  }
}

const t = (key) => key

check(
  'errors: rate limits use the actionable mailer message',
  friendlyStoreError({ message: 'Email rate limit exceeded' }, t) === 'store.signInRateLimited'
)
check(
  'errors: 429 status uses the same message',
  friendlyStoreError({ status: 429 }, t) === 'store.signInRateLimited'
)
check(
  'errors: network failures are explained',
  friendlyStoreError(new Error('Failed to fetch'), t) === 'store.networkError'
)
check(
  'errors: expired sessions ask the customer to sign in again',
  friendlyStoreError({ message: 'JWT expired' }, t) === 'store.sessionExpired'
)
check(
  'errors: unknown failures keep the caller fallback',
  friendlyStoreError({ message: 'weird provider failure' }, t, 'store.downloadFailed') ===
    'store.downloadFailed'
)
check(
  'errors: empty errors keep the caller fallback',
  friendlyStoreError(null, t, 'store.purchaseError') === 'store.purchaseError'
)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
