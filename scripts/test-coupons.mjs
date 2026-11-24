// Tests for server-authoritative coupon arithmetic and plumbing.
//
// Invariants backed here:
//   - a browser can only submit a CODE; every amount comes from the server
//   - discounts are integer paise, capped by eligibility and the subtotal
//   - limits, expiry and product scoping are enforced from server-loaded rows
//   - preview never writes an order
//
// Run: npm run test:coupons
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const { normaliseCouponCode, isCouponCode, applyCoupon } = require('../api/_lib/coupons.js')

const coupon = (overrides = {}) => ({
  id: 1,
  code: 'SAVE20',
  description: '',
  discount_type: 'percent',
  value: 20,
  min_subtotal_paise: 0,
  max_discount_paise: null,
  product_slugs: null,
  starts_at: null,
  expires_at: null,
  usage_limit: null,
  uses_count: 0,
  per_customer_limit: 1,
  first_order_only: false,
  active: true,
  ...overrides,
})

const lines = [
  { product: { slug: 'starter-kit' }, quantity: 1, totalPricePaise: 49900 },
  { product: { slug: 'ui-kit' }, quantity: 1, totalPricePaise: 20000 },
]

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
  check('codes are trimmed, stripped and uppercased', normaliseCouponCode('  save 20 ') === 'SAVE20')
  check('codes are bounded to 24 characters', normaliseCouponCode('A'.repeat(40)).length === 24)
  check('valid codes pass the format check', isCouponCode('LAUNCH-20') && isCouponCode('A1_2'))
  check('malformed codes are rejected', !isCouponCode('') && !isCouponCode('!!') && !isCouponCode('A'))
}

// --- discount arithmetic ----------------------------------------------------
{
  const result = applyCoupon({ coupon: coupon(), subtotalPaise: 69900, lines })
  check(
    'percentage discount uses integer paise',
    result.ok && result.discountPaise === 13980 && result.totalPaise === 55920,
    JSON.stringify(result)
  )
  check('the applied code is normalised in the result', result.code === 'SAVE20')
}
{
  const result = applyCoupon({
    coupon: coupon({ max_discount_paise: 5000 }),
    subtotalPaise: 69900,
    lines,
  })
  check('a maximum discount cap is respected', result.ok && result.discountPaise === 5000)
}
{
  const result = applyCoupon({
    coupon: coupon({ discount_type: 'fixed', value: 10000 }),
    subtotalPaise: 69900,
    lines,
  })
  check('fixed discounts subtract their paise value', result.ok && result.totalPaise === 59900)
}
{
  const result = applyCoupon({
    coupon: coupon({ discount_type: 'fixed', value: 999999 }),
    subtotalPaise: 499,
    lines: [{ product: { slug: 'starter-kit' }, totalPricePaise: 499 }],
  })
  check('an oversized coupon never produces a negative total', result.ok && result.totalPaise === 0)
}
{
  const result = applyCoupon({
    coupon: coupon({ value: 50 }),
    subtotalPaise: 101,
    lines: [{ product: { slug: 'starter-kit' }, totalPricePaise: 101 }],
  })
  check('fractional paise are floored, never rounded up', result.ok && result.discountPaise === 50)
}

// --- conditions -------------------------------------------------------------
{
  const result = applyCoupon({
    coupon: coupon({ min_subtotal_paise: 70000 }),
    subtotalPaise: 69900,
    lines,
  })
  check('minimum spend is enforced before discounting', !result.ok && result.reason === 'minimum')
}
{
  const now = new Date('2026-11-24T10:00:00Z')
  check(
    'expired coupons are rejected',
    applyCoupon({
      coupon: coupon({ expires_at: '2026-11-23T00:00:00Z' }),
      subtotalPaise: 69900,
      lines,
      now,
    }).reason === 'expired'
  )
  check(
    'future coupons are rejected',
    applyCoupon({
      coupon: coupon({ starts_at: '2026-11-25T00:00:00Z' }),
      subtotalPaise: 69900,
      lines,
      now,
    }).reason === 'not_started'
  )
}
{
  check('paused coupons are rejected', applyCoupon({ coupon: coupon({ active: false }), subtotalPaise: 69900, lines }).reason === 'inactive')
  check(
    'a consumed global limit is rejected',
    applyCoupon({ coupon: coupon({ usage_limit: 3 }), subtotalPaise: 69900, lines, priorUses: 3 }).reason === 'usage_limit'
  )
  check(
    'a consumed customer limit is rejected',
    applyCoupon({ coupon: coupon({ per_customer_limit: 2 }), subtotalPaise: 69900, lines, customerUses: 2 }).reason === 'customer_limit'
  )
  check(
    'first-order coupons reject returning buyers',
    applyCoupon({ coupon: coupon({ first_order_only: true }), subtotalPaise: 69900, lines, customerOrders: 1 }).reason === 'first_order'
  )
  check(
    'first-order coupons accept new buyers',
    applyCoupon({ coupon: coupon({ first_order_only: true }), subtotalPaise: 69900, lines, customerOrders: 0 }).ok
  )
}

// --- product scoping ---------------------------------------------------------
{
  const result = applyCoupon({
    coupon: coupon({ product_slugs: ['starter-kit'] }),
    subtotalPaise: 69900,
    lines,
  })
  check(
    'a scoped coupon discounts only its own products',
    result.ok && result.eligibleSubtotalPaise === 49900 && result.discountPaise === 9980,
    JSON.stringify(result)
  )
}
{
  const result = applyCoupon({
    coupon: coupon({ product_slugs: ['other-product'] }),
    subtotalPaise: 69900,
    lines,
  })
  check('a coupon with no eligible products is rejected', !result.ok && result.reason === 'no_items')
}

// --- malformed rows and hostile input --------------------------------------
{
  check('unknown discount types are rejected', applyCoupon({ coupon: coupon({ discount_type: 'shipping' }), subtotalPaise: 69900, lines }).reason === 'invalid')
  check('percentages above 100 are rejected', applyCoupon({ coupon: coupon({ value: 101 }), subtotalPaise: 69900, lines }).reason === 'invalid')
  check('non-integer subtotals are rejected', !applyCoupon({ coupon: coupon(), subtotalPaise: 10.5, lines }).ok)
  check('a missing coupon row is rejected', !applyCoupon({ coupon: null, subtotalPaise: 69900, lines }).ok)
}
{
  // A caller can include any extra keys it likes; none can change the amount.
  const result = applyCoupon({
    coupon: coupon({ value: 20, discount_paise: 69900, amount: 1, total_paise: 0 }),
    subtotalPaise: 69900,
    lines,
    discountPaise: 69900,
    totalPaise: 0,
  })
  check('client-supplied amounts are ignored', result.ok && result.discountPaise === 13980)
}

// --- server plumbing --------------------------------------------------------
{
  const source = read('api/create-order.js')
  check('create-order imports the shared coupon rules', /require\('\.\/_lib\/coupons'\)/.test(source))
  check('create-order loads coupon rows from the database', /from\('coupons'\)/.test(source))
  check('a coupon code is normalised before lookup', /normaliseCouponCode\(couponCodeInput\)/.test(source))
  check(
    'preview mode returns before any coupon claim or order write',
    source.indexOf("if (mode === 'preview') {") > 0 &&
      source.indexOf("if (mode === 'preview') {") < source.indexOf('let claimedCoupon = false')
  )
  check('coupon claims are conditional on the validated count', /\.eq\('uses_count', coupon\.uses_count\)/.test(source))
  check('redemptions are written with the order reference', /from\('coupon_redemptions'\)/.test(source))
  check('the order snapshots the applied code', /coupon_code_snapshot: couponCode/.test(source))
  check('the gateway amount includes the discount', /amount: verifiedAmountPaise/.test(source))
  check('the response exposes the verified discount', /discount_paise: digitalOrder\.discountPaise/.test(source))
}
{
  const client = read('src/lib/checkout.js')
  check('checkout sends only a coupon code', /coupon_code: couponCode/.test(client))
  check('the preview helper uses the existing API function', /mode: 'preview'/.test(client))
  check('the client never computes a discount', !/Math\.(floor|round)\([^)]*coupon/i.test(client))
}
{
  const schema = read('supabase-schema.sql')
  const migration = read('supabase/migrations/20261124000000_create_coupons.sql')
  for (const [name, text] of [['schema', schema], ['migration', migration]]) {
    check(`${name}: coupon codes are unique`, /code TEXT NOT NULL UNIQUE/.test(text))
    check(`${name}: redemptions are audited`, /CREATE TABLE IF NOT EXISTS coupon_redemptions/.test(text))
    check(`${name}: coupons are hidden from anon`, /REVOKE ALL ON TABLE coupons FROM PUBLIC, anon/.test(text))
    check(`${name}: orders snapshot the code`, /coupon_code_snapshot/.test(text))
  }
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
