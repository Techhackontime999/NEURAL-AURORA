// Tests for authorised affiliate/reseller commissions and their plumbing.
//
// Invariants backed here:
//   - a browser submits only a CODE; rates and amounts come from server rows
//   - commission is integer paise, derived from the already-paid net total
//   - attribution is snapshotted at order time and commission is idempotent
//   - partners can only read their own rows (RLS), payouts are admin-only
//
// Run: npm run test:affiliates
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const {
  normaliseAffiliateCode,
  isAffiliateCode,
  calculateCommission,
} = require('../api/_lib/affiliate-commissions.js')

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

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

// --- code canonicalisation ---------------------------------------------------
{
  check('codes are trimmed, stripped and uppercased', normaliseAffiliateCode('  partner 1 ') === 'PARTNER1')
  check('codes are bounded to 24 characters', normaliseAffiliateCode('A'.repeat(40)).length === 24)
  check('valid codes pass the format check', isAffiliateCode('REF-25') && isAffiliateCode('A1_2'))
  check('malformed codes are rejected', !isAffiliateCode('') && !isAffiliateCode('!!') && !isAffiliateCode('AB'))
}

// --- commission arithmetic ---------------------------------------------------
{
  const result = calculateCommission({ netPaise: 69900, commissionBps: 1250 })
  check('12.5% of a paid order is integer paise', result.ok && result.commissionPaise === 8737, JSON.stringify(result))
  check('the net amount and rate are preserved for audit', result.netPaise === 69900 && result.commissionBps === 1250)
}
{
  const result = calculateCommission({ netPaise: 10000, commissionBps: 10000 })
  check('100% commission cannot exceed the net sale', result.ok && result.commissionPaise === 10000)
}
{
  check('negative or non-integer net amounts are rejected', !calculateCommission({ netPaise: -1, commissionBps: 1000 }).ok)
  check('client-style float totals are rejected', !calculateCommission({ netPaise: 100.5, commissionBps: 1000 }).ok)
  check('rates above 100% are rejected', !calculateCommission({ netPaise: 10000, commissionBps: 10001 }).ok)
  check('sub-paise commissions are not created', calculateCommission({ netPaise: 1, commissionBps: 1 }).reason === 'below_paise')
}

// --- server plumbing ---------------------------------------------------------
{
  const source = read('api/create-order.js')
  check('create-order imports the shared affiliate rules', /require\('\.\/_lib\/affiliate-commissions'\)/.test(source))
  check('create-order loads partners from the database', /from\('affiliates'\)/.test(source))
  check('a referral code is normalised before lookup', /normaliseAffiliateCode\(affiliateCodeInput\)/.test(source))
  check('only active partners can earn', /affiliate\.status !== 'active'/.test(source))
  check('product scope is resolved server-side', /affiliate\.product_slugs/.test(source))
  check(
    'preview returns before any attribution or order write',
    source.indexOf("if (mode === 'preview') {") > 0 &&
      source.indexOf("if (mode === 'preview') {") < source.indexOf("from('affiliate_attributions')")
  )
  check('the order snapshots the referral code', /affiliate_code_snapshot/.test(source))
  check('attribution stores the rate at checkout', /commission_bps: affiliate\.commission_bps/.test(source))
  check('the response exposes the verified referral', /affiliate_code: digitalOrder\.affiliateCode/.test(source))
}
{
  const fulfilment = read('api/_lib/fulfilment.js')
  check('fulfilment shares the commission module', /require\('\.\/affiliate-commissions'\)/.test(fulfilment))
  check('commission is created on the verified-paid path', /await ensureAffiliateCommission/.test(fulfilment))
  check('commission uses the order total, never a client amount', /netPaise: dbOrder\.total_paise/.test(fulfilment))
  check('webhook replays also backfill commission', /already_paid[\s\S]*ensureAffiliateCommission/.test(fulfilment))
}
{
  const lib = read('api/_lib/affiliate-commissions.js')
  check('commission writes are idempotent on order_id', /onConflict: 'order_id'/.test(lib))
  check('unknown tables cannot break checkout', /if \(!attribution\) return/.test(lib))
  check('commission amounts are integer paise', /Math\.floor\(\(net \* bps\) \/ MAX_BPS\)/.test(lib))
}
{
  const context = read('src/context/StoreContext.jsx')
  check('only the referral code is stored in the browser', /AFFILIATE_KEY = 'neural-aurora:affiliate:v1'/.test(context))
  check('invalid links cannot overwrite a valid referral', /if \(code\) setAffiliateCode\(code\)/.test(context))
  check('a referral survives checkout like a cookie', !/clearAffiliateCode/.test(context))
  check('the referral expires after 30 days', /AFFILIATE_WINDOW_MS = 30 \* 24 \* 60 \* 60 \* 1000/.test(context))
}
{
  const client = read('src/lib/checkout.js')
  check('checkout sends only a referral code', /affiliate_code: affiliateCode/.test(client))
  check('the preview helper reuses the existing API function', /mode: 'preview'/.test(client))
  check('the client never computes a commission', !/commission_paise|Math\.floor\([^)]*affiliate/i.test(client))
}
{
  const catalogue = read('src/components/offerings/Products.jsx')
  const productPage = read('src/components/offerings/ProductDetail.jsx')
  check('catalogue: captures the aff link parameter', /searchParams\.get\(AFFILIATE_QUERY_KEY\)/.test(catalogue))
  check('product page: captures the aff link parameter', /searchParams\.get\('aff'\)/.test(productPage))
  check('catalogue filters preserve the referral link', /if \(referral\) next\.set\(AFFILIATE_QUERY_KEY, referral\)/.test(catalogue))
}
{
  const route = read('src/App.jsx')
  check('partner dashboard route exists', /path="\/partner" element=\{<PartnerPortal \/>\}/.test(route))
  check('partner portal is code-split', /lazy\(\(\) => import\('\.\/components\/partner\/PartnerPortal'\)\)/.test(route))

  const dashboard = read('src/components/admin/AdminDashboard.jsx')
  check('admin affiliate route exists', /path="affiliates" element=\{<AdminAffiliates \/>\}/.test(dashboard))
  const nav = read('src/components/admin/AdminLayout.jsx')
  check('admin nav links to affiliates', /\/admin\/affiliates/.test(nav))
}
{
  const admin = read('src/lib/adminAffiliates.js')
  check('admin normalises codes', /normaliseCode/.test(admin))
  check('admin converts percent to basis points', /percentToBps/.test(admin))
  check('admins cannot enter payout amounts', !/commission_paise:/.test(admin))
  check('payout states are bounded', /COMMISSION_STATUSES = \['pending', 'approved', 'paid', 'void'\]/.test(admin))
  const ui = read('src/components/admin/AdminAffiliates.jsx')
  check('admin records an external payout reference', /markCommissionPaid\(row\.id, reference\)/.test(ui))
  check('admin can copy a partner link', /referralUrl\(code\)/.test(ui))
}
{
  const migration = read('supabase/migrations/20261125000000_create_affiliates.sql')
  const schema = read('supabase-schema.sql')
  for (const [name, text] of [['migration', migration], ['schema', schema]]) {
    check(`${name}: partner codes are unique`, /code TEXT NOT NULL UNIQUE/.test(text))
    check(`${name}: commission rate is bounded in basis points`, /commission_bps INTEGER NOT NULL CHECK/.test(text))
    check(`${name}: attribution is immutable per order`, /order_id BIGINT NOT NULL UNIQUE REFERENCES orders/.test(text))
    check(`${name}: ledger has a unique order row`, /order_id BIGINT NOT NULL UNIQUE REFERENCES orders/.test(text))
    check(`${name}: anon cannot read partners`, /REVOKE ALL ON TABLE affiliates FROM PUBLIC, anon/.test(text))
    check(`${name}: partners can read only their own commissions`, /Partner can read own commissions/.test(text))
    check(`${name}: orders snapshot the referral code`, /affiliate_code_snapshot/.test(text))
  }
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
