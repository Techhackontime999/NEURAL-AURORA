// ---------------------------------------------------------------------------
// Client-side coupon presentation only.
//
// There is no discount table here on purpose. Codes are normalised for display
// and server failure reasons are translated, but every amount shown to the
// buyer comes back from POST /api/create-order (preview or real order).
// ---------------------------------------------------------------------------

const MAX_CODE_LENGTH = 24

export function normaliseCouponCode(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .slice(0, MAX_CODE_LENGTH)
}

const REASON_KEYS = {
  not_found: 'store.couponInvalid',
  inactive: 'store.couponInactive',
  not_started: 'store.couponNotStarted',
  expired: 'store.couponExpired',
  usage_limit: 'store.couponUsageLimit',
  customer_limit: 'store.couponCustomerLimit',
  first_order: 'store.couponFirstOrder',
  no_items: 'store.couponNoItems',
}

/** Translated reason for a rejected coupon, with a safe generic fallback. */
export function couponErrorText(error, t) {
  const reason = String(error?.reason || '')
  if (reason === 'minimum') return t('store.couponMinimum')
  const key = REASON_KEYS[reason]
  if (key) return t(key)
  return error?.message || t('store.couponCheckFailed')
}
