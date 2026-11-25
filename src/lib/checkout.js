// ---------------------------------------------------------------------------
// Digital-product checkout client.
//
// The browser never decides a price. Every product purchase starts by asking
// the server to resolve the canonical price from the database and create a
// Razorpay order; if that fails, the purchase fails. There is deliberately no
// client-side price fallback here — unlike the legacy service-support flow,
// which tolerates an offline serverless function in dev mode.
// ---------------------------------------------------------------------------

import { supabase } from './supabase'
import { storeAuthIntent } from './authCallback'
import { openCheckoutModal } from './razorpay'
import { normalisePhone } from './phone'

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(data?.error || `Request failed (${res.status})`)
    // Structured failure details let the coupon UI show a translated reason
    // instead of a raw server string. Ordinary callers still use `message`.
    error.reason = data?.reason
    error.minimumPaise = data?.minimum_paise
    error.status = res.status
    throw error
  }
  return data
}

/**
 * Create a server-priced order for one or more products and open Razorpay.
 *
 * @param {object}   options
 * @param {object}   options.product  The published product being purchased.
 * @param {string}   options.email    Receipt + entitlement email.
 * @param {string}  [options.name]
 * @param {string}  [options.phone]   Optional contact number, any format. Stored
 *                                    digits-only in international form so the
 *                                    admin can WhatsApp the sign-in link.
 * @param {number}  [options.quantity]
 * @param {string}  [options.licenseCode]  Configured option chosen on the PDP.
 * @param {string}  [options.couponCode]   Server-validated discount code.
 * @param {string}  [options.affiliateCode] Referral code; resolved server-side.
 * @returns {Promise<{orderRef: string, response: object, subtotalPaise: number, discountPaise: number, totalPaise: number}>}
 */
export async function startProductCheckout({
  product,
  email,
  name = '',
  phone = '',
  quantity = 1,
  licenseCode = '',
  couponCode = '',
  affiliateCode = '',
}) {
  if (!product?.slug) throw new Error('Missing product.')

  // Normalising here as well as in the form means every caller sends the same
  // digits-only shape the server stores. Idempotent, so double-processing is
  // harmless.
  const buyerPhone = normalisePhone(phone)

  // A signed-in buyer's Supabase token lets the server bind the entitlement to
  // a verified account. Guests simply omit it; they later prove email
  // ownership through a magic link before anything is downloadable.
  let authHeader = {}
  try {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (token) authHeader = { Authorization: `Bearer ${token}` }
  } catch {
    /* guest checkout */
  }

  const order = await postJson(
    '/api/create-order',
    {
      order_type: 'product',
      items: [{ slug: product.slug, quantity, license_code: licenseCode }],
      email,
      name,
      phone: buyerPhone,
      currency: product.currency || 'INR',
      coupon_code: couponCode,
      affiliate_code: affiliateCode,
    },
    authHeader
  )

  if (!order?.id || !order?.amount || !order?.order_ref) {
    throw new Error('The server did not return a verified order.')
  }

  const response = await openCheckoutModal({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency || 'INR',
    description: product.title,
    prefill: { email, name, ...(buyerPhone ? { contact: `+${buyerPhone}` } : {}) },
    notes: { order_ref: order.order_ref, item_type: 'product' },
  })

  // Entitlement is granted by the webhook, never by this return value. The
  // success page polls the server for the real payment status.
  return {
    orderRef: order.order_ref,
    response,
    subtotalPaise: order.subtotal_paise,
    discountPaise: order.discount_paise,
    totalPaise: order.total_paise,
  }
}

/**
 * Create one server-priced order for a whole cart and open Razorpay.
 *
 * `/api/create-order` already resolves multiple product slugs, verifies every
 * price and rejects mixed currencies or free products. This helper only sends
 * slugs, quantities and optional licence codes — never a client-side amount.
 *
 * @param {object}   options
 * @param {Array}    options.items           [{ slug, quantity, license_code }]
 * @param {string}   options.email
 * @param {string}  [options.name]
 * @param {string}  [options.phone]
 * @param {string}  [options.currency]
 * @param {string}  [options.description]
 * @param {string}  [options.couponCode]
 * @param {string}  [options.affiliateCode]
 * @returns {Promise<{orderRef: string, response: object, subtotalPaise: number, discountPaise: number, totalPaise: number}>}
 */
export async function startCartCheckout({
  items,
  email,
  name = '',
  phone = '',
  currency = 'INR',
  description = 'Digital Products',
  couponCode = '',
  affiliateCode = '',
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Your cart is empty.')
  }

  const buyerPhone = normalisePhone(phone)
  let authHeader = {}
  try {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (token) authHeader = { Authorization: `Bearer ${token}` }
  } catch {
    /* guest checkout */
  }

  const order = await postJson(
    '/api/create-order',
    {
      order_type: 'product',
      items: items.map((item) => ({
        slug: item.slug,
        quantity: item.quantity,
        license_code: item.license_code || '',
      })),
      email,
      name,
      phone: buyerPhone,
      currency,
      coupon_code: couponCode,
      affiliate_code: affiliateCode,
    },
    authHeader
  )

  if (!order?.id || !order?.amount || !order?.order_ref) {
    throw new Error('The server did not return a verified order.')
  }

  const response = await openCheckoutModal({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency || 'INR',
    description,
    prefill: { email, name, ...(buyerPhone ? { contact: `+${buyerPhone}` } : {}) },
    notes: { order_ref: order.order_ref, item_type: 'product' },
  })

  return {
    orderRef: order.order_ref,
    response,
    subtotalPaise: order.subtotal_paise,
    discountPaise: order.discount_paise,
    totalPaise: order.total_paise,
  }
}

/**
 * Ask the server to price a cart (optionally with a coupon) WITHOUT creating
 * an order. The returned amounts are display-only; checkout re-verifies them.
 *
 * @param {object} options
 * @param {Array}  options.items    [{ slug, quantity, license_code }]
 * @param {string} [options.email]
 * @param {string} [options.couponCode]
 * @param {string} [options.affiliateCode]
 * @returns {Promise<{subtotalPaise: number, discountPaise: number, totalPaise: number,
 *                    currency: string, coupon: object|null}>}
 */
export async function previewOrderPricing({ items, email = '', couponCode = '', affiliateCode = '' }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Your cart is empty.')
  }

  const data = await postJson('/api/create-order', {
    mode: 'preview',
    order_type: 'product',
    items: items.map((item) => ({
      slug: item.slug,
      quantity: item.quantity,
      license_code: item.license_code || '',
    })),
    email,
    coupon_code: couponCode,
    affiliate_code: affiliateCode,
  })

  const totalPaise = Number(data?.total_paise)
  if (!Number.isInteger(totalPaise) || totalPaise < 0) {
    throw new Error('The server did not return a verified price.')
  }

  return {
    subtotalPaise: Number(data.subtotal_paise) || 0,
    discountPaise: Number(data.discount_paise) || 0,
    totalPaise,
    currency: data.currency || 'INR',
    coupon: data.coupon || null,
    affiliate: data.affiliate || null,
  }
}

/**
 * Acquire a free product.
 *
 * Signed-in users get a short-lived signed URL straight away (the server
 * verifies their entitlement). Guests are sent a Supabase magic link instead:
 * that both proves email ownership and gives them an account through which
 * the purchase library can show their entitlements. No permanent download
 * link is ever issued on the strength of an unverified email address.
 *
 * @returns {Promise<{code: 'downloadReady'|'magicLinkSent', url?: string}>}
 */
export async function requestFreeDownload({ product, email, user }) {
  if (!product?.slug) throw new Error('Missing product.')

  if (!user) {
    storeAuthIntent('library')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/library` },
    })
    if (error) throw error
    return { code: 'magicLinkSent' }
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError

  const token = sessionData?.session?.access_token
  if (!token) throw new Error('Your session has expired. Please sign in again.')

  const result = await postJson(
    '/api/download',
    { product_slug: product.slug },
    { Authorization: `Bearer ${token}` }
  )

  return { code: 'downloadReady', url: result?.url }
}

/**
 * Fetch a secure, short-lived download URL for a product the signed-in
 * customer already owns. Used by the purchase library.
 */
export async function getDownloadUrl(productSlug) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError

  const token = sessionData?.session?.access_token
  if (!token) throw new Error('Please sign in to download your purchases.')

  return postJson(
    '/api/download',
    { product_slug: productSlug },
    { Authorization: `Bearer ${token}` }
  )
}

/** Poll the server for the real status of an order (webhook may lag). */
export async function getOrderStatus(orderRef) {
  const res = await fetch(
    `/api/order-status?ref=${encodeURIComponent(orderRef)}`,
    { headers: { Accept: 'application/json' } }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data
}
