// Tests for APPROVED_CONTRIBUTOR_PERSONAL grant policy helpers.
// Run: npm run test:contributor-grants
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  CONTRIBUTOR_PERSONAL_GRANT_TYPE,
  CONTRIBUTOR_PERSONAL_SOURCE,
  isExpired,
  scopeAllowsPersonalUse,
  authorizeEntitlementDownload,
} = require('../api/_lib/entitlement-auth.js')

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

function fakeSupabase(license, error = null) {
  return {
    from(table) {
      return {
        select() { return this },
        eq() { return this },
        order() { return this },
        limit() { return this },
        async maybeSingle() {
          if (table !== 'licenses') return { data: null, error: null }
          return { data: license, error }
        },
      }
    },
  }
}

const now = new Date('2026-11-26T12:00:00Z')

// --- pure helpers -----------------------------------------------------------
check('isExpired false when null', isExpired(null, now) === false)
check('isExpired false when future', isExpired('2026-11-27T12:00:00Z', now) === false)
check('isExpired true when past', isExpired('2026-11-25T12:00:00Z', now) === true)
check('scopeAllowsPersonalUse default', scopeAllowsPersonalUse({}) === true)
check('scopeAllowsPersonalUse rejects commercial', scopeAllowsPersonalUse({ commercial_use: true }) === false)
check('scopeAllowsPersonalUse rejects org', scopeAllowsPersonalUse({ organization_use: true }) === false)
check('scopeAllowsPersonalUse rejects redistribution', scopeAllowsPersonalUse({ redistribution: true }) === false)

// --- purchase/free entitlements ---------------------------------------------
{
  const result = await authorizeEntitlementDownload(fakeSupabase(null), {
    id: 1,
    status: 'active',
    source: 'purchase',
  }, { now })
  check('purchase entitlement allowed', result.ok === true)
}
{
  const result = await authorizeEntitlementDownload(fakeSupabase(null), {
    id: 2,
    status: 'revoked',
    source: 'purchase',
  }, { now })
  check('revoked entitlement denied', result.ok === false && result.status === 403)
}

// --- contributor personal grants --------------------------------------------
{
  const result = await authorizeEntitlementDownload(fakeSupabase({
    id: 10,
    status: 'active',
    expires_at: '2026-12-01T00:00:00Z',
    grant_type: CONTRIBUTOR_PERSONAL_GRANT_TYPE,
    scope: { personal_use_only: true, commercial_use: false },
  }), { id: 3, status: 'active', source: CONTRIBUTOR_PERSONAL_SOURCE }, { now })
  check('valid contributor grant allowed', result.ok === true && result.license?.id === 10)
}
{
  const result = await authorizeEntitlementDownload(fakeSupabase(null), {
    id: 4, status: 'active', source: CONTRIBUTOR_PERSONAL_SOURCE,
  }, { now })
  check('missing contributor license denied', result.ok === false && result.status === 403)
}
{
  const result = await authorizeEntitlementDownload(fakeSupabase({
    id: 11, status: 'suspended', expires_at: null, grant_type: CONTRIBUTOR_PERSONAL_GRANT_TYPE, scope: {},
  }), { id: 5, status: 'active', source: CONTRIBUTOR_PERSONAL_SOURCE }, { now })
  check('suspended contributor license denied', result.ok === false)
}
{
  const result = await authorizeEntitlementDownload(fakeSupabase({
    id: 12, status: 'active', expires_at: '2026-11-01T00:00:00Z', grant_type: CONTRIBUTOR_PERSONAL_GRANT_TYPE, scope: {},
  }), { id: 6, status: 'active', source: CONTRIBUTOR_PERSONAL_SOURCE }, { now })
  check('expired contributor license denied', result.ok === false)
}
{
  const result = await authorizeEntitlementDownload(fakeSupabase({
    id: 13, status: 'active', expires_at: null, grant_type: CONTRIBUTOR_PERSONAL_GRANT_TYPE, scope: { commercial_use: true },
  }), { id: 7, status: 'active', source: CONTRIBUTOR_PERSONAL_SOURCE }, { now })
  check('out-of-scope contributor license denied', result.ok === false)
}
{
  const result = await authorizeEntitlementDownload(fakeSupabase({
    id: 14, status: 'active', expires_at: null, grant_type: 'purchase', scope: {},
  }), { id: 8, status: 'active', source: CONTRIBUTOR_PERSONAL_SOURCE }, { now })
  check('wrong grant type denied', result.ok === false)
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
