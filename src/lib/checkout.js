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
    throw new Error(data?.error || `Request failed (${res.status})`)
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
 * @returns {Promise<{orderRef: string, response: object}>}
 */
export async function startProductCheckout({ product, email, name = '', phone = '', quantity = 1 }) {
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
      items: [{ slug: product.slug, quantity }],
      email,
      name,
      phone: buyerPhone,
      currency: product.currency || 'INR',
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
  return { orderRef: order.order_ref, response }
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
