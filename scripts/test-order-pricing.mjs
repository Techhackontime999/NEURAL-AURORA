// Tests for server-authoritative product pricing.
//
// These are the checks that back the acceptance criteria:
//   - client-side price manipulation is irrelevant (prices come from the DB)
//   - unpublished/archived products cannot be purchased
//   - free products cannot be turned into a payment order
//   - currencies cannot be mixed
//   - totals are integer paise and bounded
//
// Run: npm run test:order-pricing
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { priceProductOrder, collectRequestedItems, generateOrderRef } = require('../api/_lib/order-pricing.js')
const crypto = require('node:crypto')

const published = (overrides = {}) => ({
  id: 1,
  slug: 'starter-kit',
  title: 'Starter Kit',
  price_paise: 49900,
  currency: 'INR',
  status: 'published',
  version: '1.0.0',
  ...overrides,
})

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

// --- happy path -------------------------------------------------------------
{
  const result = priceProductOrder({
    requestedItems: [{ slug: 'starter-kit', quantity: 2 }],
    products: [published()],
  })
  check('prices a published product', result.ok === true, JSON.stringify(result))
  check('multiplies by quantity in paise', result.totalPaise === 99800, `got ${result.totalPaise}`)
  check('reports the currency', result.currency === 'INR')
  check('reports item count', result.itemCount === 2)
}

// --- client-supplied price is ignored ---------------------------------------
{
  // A malicious client sends its own price. It must not appear anywhere.
  const result = priceProductOrder({
    requestedItems: [{ slug: 'starter-kit', quantity: 1, price: 1, price_paise: 1, amount: 1 }],
    products: [published()],
  })
  check('ignores a client-supplied price', result.ok === true && result.totalPaise === 49900,
    `got ${result.totalPaise}`)
}

// --- unpublished / archived -------------------------------------------------
for (const status of ['draft', 'archived']) {
  const result = priceProductOrder({
    requestedItems: [{ slug: 'starter-kit', quantity: 1 }],
    products: [published({ status })],
  })
  check(`rejects a ${status} product`, result.ok === false && result.status === 409,
    JSON.stringify(result))
}

// --- missing product --------------------------------------------------------
{
  const result = priceProductOrder({
    requestedItems: [{ slug: 'does-not-exist', quantity: 1 }],
    products: [published()],
  })
  check('rejects an unknown slug', result.ok === false && result.status === 404)
}

// --- free product cannot become a payment order -----------------------------
{
  const result = priceProductOrder({
    requestedItems: [{ slug: 'free-guide', quantity: 1 }],
    products: [published({ slug: 'free-guide', price_paise: 0, title: 'Free Guide' })],
  })
  check('rejects a free product', result.ok === false && result.status === 400, JSON.stringify(result))
}

// --- non-integer price is refused rather than coerced ----------------------
{
  const result = priceProductOrder({
    requestedItems: [{ slug: 'weird', quantity: 1 }],
    products: [published({ slug: 'weird', price_paise: 499.5 })],
  })
  check('rejects a non-integer price', result.ok === false && result.status === 400)
}

// --- currency mixing --------------------------------------------------------
{
  const result = priceProductOrder({
    requestedItems: [
      { slug: 'starter-kit', quantity: 1 },
      { slug: 'usd-kit', quantity: 1 },
    ],
    products: [
      published(),
      published({ id: 2, slug: 'usd-kit', title: 'USD Kit', price_paise: 1900, currency: 'USD' }),
    ],
  })
  check('rejects mixed currencies', result.ok === false && result.status === 400, JSON.stringify(result))
}

// --- quantity bounds --------------------------------------------------------
{
  const tooMany = priceProductOrder({
    requestedItems: [{ slug: 'starter-kit', quantity: 11 }],
    products: [published()],
  })
  check('rejects quantity above the cap', tooMany.ok === false && tooMany.status === 400)

  const zero = priceProductOrder({
    requestedItems: [{ slug: 'starter-kit', quantity: 0 }],
    products: [published()],
  })
  check('rejects quantity zero', zero.ok === false && zero.status === 400)

  const negative = priceProductOrder({
    requestedItems: [{ slug: 'starter-kit', quantity: -5 }],
    products: [published()],
  })
  check('rejects a negative quantity', negative.ok === false && negative.status === 400)
}

// --- duplicates merge rather than double-charging ---------------------------
{
  const result = priceProductOrder({
    requestedItems: [
      { slug: 'starter-kit', quantity: 1 },
      { slug: 'STARTER-KIT', quantity: 1 },
    ],
    products: [published()],
  })
  check('merges duplicate slugs', result.ok === true && result.itemCount === 2 && result.totalPaise === 99800,
    JSON.stringify(result))
}

// --- empty / malformed input ------------------------------------------------
{
  check('rejects an empty item list',
    priceProductOrder({ requestedItems: [], products: [published()] }).ok === false)
  check('rejects a missing item list',
    priceProductOrder({ requestedItems: undefined, products: [published()] }).ok === false)
  check('rejects an item without a slug',
    priceProductOrder({ requestedItems: [{ quantity: 1 }], products: [published()] }).ok === false)
}

// --- total ceiling ----------------------------------------------------------
{
  const result = priceProductOrder({
    requestedItems: [{ slug: 'expensive', quantity: 10 }],
    products: [published({ slug: 'expensive', price_paise: 6000000 })],
  })
  check('rejects a total above the gateway ceiling',
    result.ok === false && result.status === 400, JSON.stringify(result))
}

// --- collectRequestedItems --------------------------------------------------
{
  const collected = collectRequestedItems([{ slug: '  Starter-Kit ', quantity: '2' }])
  check('normalises slug case and whitespace', collected.ok === true && collected.wanted.has('starter-kit'))
  check('coerces a numeric string quantity', collected.wanted?.get('starter-kit') === 2)
}

// --- order reference -------------------------------------------------------
{
  const ref = generateOrderRef(crypto)
  check('order refs match the expected format', /^NA-[A-F0-9]{16}$/.test(ref), ref)

  const refs = new Set(Array.from({ length: 500 }, () => generateOrderRef(crypto)))
  check('order refs are unique across 500 draws', refs.size === 500)
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
