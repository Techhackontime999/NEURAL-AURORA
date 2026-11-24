// ---------------------------------------------------------------------------
// Coupon rules, deliberately pure.
//
// The browser may only submit a CODE. It never submits a discount amount, a
// percentage, eligibility or a usage count. This module turns a coupon row
// loaded by the server into a bounded paise discount using integer arithmetic,
// so the security-critical maths is directly testable.
// ---------------------------------------------------------------------------

const MAX_CODE_LENGTH = 24
const COUPON_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,23}$/

/** Canonical coupon code: uppercase, no surrounding whitespace, bounded. */
function normaliseCouponCode(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .slice(0, MAX_CODE_LENGTH)
}

function isCouponCode(value) {
  return COUPON_CODE_PATTERN.test(normaliseCouponCode(value))
}

/**
 * Human-facing failure reasons. The HTTP status stays 400 for every rejected
 * coupon: a coupon is a normal checkout input, never a server error.
 */
const REASONS = {
  not_found: { reason: 'not_found', error: 'That coupon code does not exist.' },
  inactive: { reason: 'inactive', error: 'This coupon is no longer active.' },
  not_started: { reason: 'not_started', error: 'This coupon is not live yet.' },
  expired: { reason: 'expired', error: 'This coupon has expired.' },
  usage_limit: { reason: 'usage_limit', error: 'This coupon has reached its usage limit.' },
  customer_limit: {
    reason: 'customer_limit',
    error: 'You have already used this coupon the maximum number of times.',
  },
  first_order: {
    reason: 'first_order',
    error: 'This coupon is only valid on your first order.',
  },
  minimum: { reason: 'minimum', error: 'Your order does not meet the minimum spend for this coupon.' },
  no_items: {
    reason: 'no_items',
    error: 'This coupon does not apply to any product in your order.',
  },
  invalid: { reason: 'invalid', error: 'This coupon cannot be applied to this order.' },
}

function rejection(key, extra = {}) {
  return { ok: false, status: 400, ...REASONS[key], ...extra }
}

function parseDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Apply a coupon to an already-priced order.
 *
 * @param {object} input
 * @param {object} input.coupon            Row from `coupons` (server-loaded).
 * @param {number} input.subtotalPaise     Canonical pre-discount order total.
 * @param {Array}  input.lines             Priced lines from priceProductOrder.
 * @param {Date}  [input.now]
 * @param {number} [input.priorUses]       Global redemption count for the coupon.
 * @param {number} [input.customerUses]    Redemptions by this email for the coupon.
 * @param {number} [input.customerOrders]  Prior paid/pending orders by this email.
 * @returns {{ok: true, code, discountPaise, totalPaise, eligibleSubtotalPaise} |
 *           {ok: false, error, reason, status}}
 */
function applyCoupon({
  coupon,
  subtotalPaise,
  lines = [],
  now = new Date(),
  priorUses = 0,
  customerUses = 0,
  customerOrders = null,
}) {
  if (!coupon || typeof coupon !== 'object') return rejection('not_found')
  if (!Number.isInteger(subtotalPaise) || subtotalPaise <= 0) return rejection('invalid')

  const code = normaliseCouponCode(coupon.code)
  if (!isCouponCode(code)) return rejection('not_found')
  if (coupon.active === false) return rejection('inactive')

  const startsAt = parseDate(coupon.starts_at)
  const expiresAt = parseDate(coupon.expires_at)
  if (startsAt && now < startsAt) return rejection('not_started')
  if (expiresAt && now > expiresAt) return rejection('expired')

  const usageLimit = Number(coupon.usage_limit)
  if (
    coupon.usage_limit != null &&
    Number.isFinite(usageLimit) &&
    usageLimit > 0 &&
    priorUses >= usageLimit
  ) {
    return rejection('usage_limit')
  }

  const customerLimit = Number(coupon.per_customer_limit)
  if (Number.isFinite(customerLimit) && customerLimit > 0 && customerUses >= customerLimit) {
    return rejection('customer_limit')
  }

  if (coupon.first_order_only === true && customerOrders !== null && customerOrders > 0) {
    return rejection('first_order')
  }

  const minSubtotal = Math.max(0, Math.trunc(Number(coupon.min_subtotal_paise) || 0))
  if (subtotalPaise < minSubtotal) {
    return rejection('minimum', { minimumPaise: minSubtotal })
  }

  // A product-scoped coupon discounts only its own lines. An empty/null list
  // means "all products" — the common case, and the safe default for old rows.
  const scopedSlugs = Array.isArray(coupon.product_slugs)
    ? new Set(coupon.product_slugs.map((slug) => String(slug).trim().toLowerCase()).filter(Boolean))
    : null
  const eligibleSubtotalPaise = (lines || []).reduce((sum, line) => {
    const slug = String(line?.product?.slug || '').trim().toLowerCase()
    if (scopedSlugs && scopedSlugs.size && !scopedSlugs.has(slug)) return sum
    return sum + (Number.isInteger(line?.totalPricePaise) ? line.totalPricePaise : 0)
  }, 0)

  if (eligibleSubtotalPaise <= 0) return rejection('no_items')

  const value = Math.trunc(Number(coupon.value) || 0)
  let discountPaise = 0
  if (coupon.discount_type === 'percent') {
    if (value < 1 || value > 100) return rejection('invalid')
    discountPaise = Math.floor((eligibleSubtotalPaise * value) / 100)
    const cap = Number(coupon.max_discount_paise)
    if (coupon.max_discount_paise != null && Number.isFinite(cap) && cap >= 0) {
      discountPaise = Math.min(discountPaise, Math.trunc(cap))
    }
  } else if (coupon.discount_type === 'fixed') {
    if (value <= 0) return rejection('invalid')
    discountPaise = value
  } else {
    return rejection('invalid')
  }

  // Never discount below zero, even if a legacy row has an oversized value.
  discountPaise = Math.min(Math.max(0, discountPaise), eligibleSubtotalPaise, subtotalPaise)
  if (discountPaise <= 0) return rejection('invalid')

  return {
    ok: true,
    code,
    discountPaise,
    totalPaise: subtotalPaise - discountPaise,
    eligibleSubtotalPaise,
  }
}

module.exports = {
  normaliseCouponCode,
  isCouponCode,
  applyCoupon,
  REASONS,
  MAX_CODE_LENGTH,
}
