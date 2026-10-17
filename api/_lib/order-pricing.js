// ---------------------------------------------------------------------------
// Server-authoritative pricing for digital-product orders.
//
// Deliberately pure: it takes the products loaded from the database and the
// items the browser asked for, and returns the canonical total. No database,
// no network, no environment. That makes the security-critical arithmetic
// directly testable (see scripts/test-order-pricing.mjs).
//
// The browser NEVER supplies a price. It supplies slugs; this module decides
// what those slugs cost.
// ---------------------------------------------------------------------------

const MAX_ITEMS = 20
const MAX_QUANTITY = 10
const MAX_TOTAL_PAISE = 50000000 // Razorpay ceiling: ₹5,00,000

/**
 * Normalise requested items into a slug -> quantity map.
 * Rejects anything that is not a usable slug/quantity pair.
 *
 * @returns {{ ok: true, wanted: Map<string, number> } | { ok: false, error: string }}
 */
function collectRequestedItems(requestedItems) {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return { ok: false, error: 'At least one product is required' }
  }
  if (requestedItems.length > MAX_ITEMS) {
    return { ok: false, error: 'Too many products in one order' }
  }

  const wanted = new Map()
  for (const entry of requestedItems) {
    const slug = String(entry?.slug || '').trim().toLowerCase()
    if (!slug) {
      return { ok: false, error: 'Every item needs a product slug' }
    }

    const rawQuantity = Math.trunc(Number(entry?.quantity))
    if (Number.isFinite(rawQuantity) && (rawQuantity < 1 || rawQuantity > MAX_QUANTITY)) {
      return { ok: false, error: `Quantity must be between 1 and ${MAX_QUANTITY}` }
    }
    const quantity = Number.isFinite(rawQuantity) ? rawQuantity : 1

    // Duplicate slugs are merged rather than double-charged or rejected.
    wanted.set(slug, (wanted.get(slug) || 0) + quantity)
  }

  return { ok: true, wanted }
}

/**
 * Resolve the canonical order total from database products.
 *
 * @param {object}   input
 * @param {Array}    input.requestedItems  Raw `items` from the request body.
 * @param {Array}    input.products        Rows from `products` (id, slug, title,
 *                                         price_paise, currency, status, version).
 * @returns {{ ok: true, totalPaise, currency, itemCount, lines } |
 *           { ok: false, error, status }}
 *          `status` is the HTTP status the caller should return.
 */
function priceProductOrder({ requestedItems, products }) {
  const collected = collectRequestedItems(requestedItems)
  if (!collected.ok) {
    return { ok: false, error: collected.error, status: 400 }
  }
  const { wanted } = collected

  const bySlug = new Map((products || []).map((p) => [String(p.slug).toLowerCase(), p]))

  // Every requested product must exist, be published, and be paid.
  for (const slug of wanted.keys()) {
    const product = bySlug.get(slug)
    if (!product) {
      return { ok: false, error: `Product '${slug}' not found`, status: 404 }
    }
    if (product.status !== 'published') {
      return {
        ok: false,
        error: `Product '${product.title}' is not available for purchase`,
        status: 409,
      }
    }
    if (!Number.isInteger(product.price_paise) || product.price_paise <= 0) {
      return {
        ok: false,
        error: `'${product.title}' is a free product and needs no payment order`,
        status: 400,
      }
    }
  }

  let totalPaise = 0
  let currency = null
  const lines = []

  for (const [slug, quantity] of wanted) {
    const product = bySlug.get(slug)

    if (currency !== null && product.currency !== currency) {
      return {
        ok: false,
        error: 'Cannot combine products with different currencies in one order',
        status: 400,
      }
    }
    currency = product.currency

    const lineTotal = product.price_paise * quantity
    totalPaise += lineTotal

    lines.push({
      product,
      quantity,
      unitPricePaise: product.price_paise,
      totalPricePaise: lineTotal,
    })
  }

  if (!Number.isInteger(totalPaise) || totalPaise <= 0) {
    return { ok: false, error: 'Unable to determine a valid order total', status: 400 }
  }
  if (totalPaise > MAX_TOTAL_PAISE) {
    return {
      ok: false,
      error: 'Order total exceeds the maximum supported amount',
      status: 400,
    }
  }

  return {
    ok: true,
    totalPaise,
    currency: currency || 'INR',
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    lines,
  }
}

/** Unguessable, human-shareable order reference (not a credential). */
function generateOrderRef(crypto) {
  return `NA-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
}

module.exports = {
  priceProductOrder,
  collectRequestedItems,
  generateOrderRef,
  MAX_ITEMS,
  MAX_QUANTITY,
  MAX_TOTAL_PAISE,
}
