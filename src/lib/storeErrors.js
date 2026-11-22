// ---------------------------------------------------------------------------
// Customer-facing store error wording.
//
// API/database errors are written for developers. Map the states a customer
// can genuinely hit to actionable copy in one place so checkout, downloads and
// order status never drift apart.
// ---------------------------------------------------------------------------

/** Translate an error into a sentence the customer can act on. */
export function friendlyStoreError(error, t, fallbackKey = 'store.checkoutFailed') {
  const code = String(error?.code ?? error?.status ?? '').toLowerCase()
  const raw = String(error?.message ?? error ?? '').toLowerCase()

  if (
    raw.includes('rate limit') ||
    raw.includes('too many requests') ||
    code === '429'
  ) {
    return t('store.signInRateLimited')
  }

  if (
    raw.includes('failed to fetch') ||
    raw.includes('fetch failed') ||
    raw.includes('network') ||
    code === 'networkerror'
  ) {
    return t('store.networkError')
  }

  if (
    raw.includes('session has expired') ||
    raw.includes('session expired') ||
    raw.includes('jwt expired') ||
    raw.includes('refresh token')
  ) {
    return t('store.sessionExpired')
  }

  return t(fallbackKey)
}
