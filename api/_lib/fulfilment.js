// ---------------------------------------------------------------------------
// Verified payment fulfilment for the digital store.
//
// This module exists so that the SAME audited code serves both entry points:
//
//   1. /api/razorpay-webhook      — the payment was proven by an HMAC signature
//                                   over the raw request body (signature_valid).
//   2. /api/admin-reconcile-order — the payment was proven by asking the
//                                   Razorpay API directly with server keys, so
//                                   a lost webhook can never strand a paying
//                                   customer without access.
//
// Neither entry point trusts the browser, and both grant access only when the
// gateway-confirmed amount and currency match the order our own database
// priced. There is exactly one place in the codebase that grants a digital
// entitlement, and this is it.
// ---------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js')

/** Smallest database client for service-role work, or null if unconfigured. */
function getServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
}

function isDuplicateError(error) {
  const msg = error?.message || ''
  return msg.includes('duplicate key') || msg.includes('unique constraint')
}

/**
 * Fulfil a DIGITAL STORE order after a VERIFIED payment.
 *
 * Strictly additive: it looks for a row in `orders` matching the gateway order
 * id, so a service/support payment (which has no such row) is a no-op and the
 * legacy payment behaviour is untouched.
 *
 * Idempotent by construction:
 *  - `payment_transactions.payment_id` is unique
 *  - `entitlements (product_id, order_item_id)` is unique
 *  - the order update is guarded by `.neq('payment_status', 'paid')`
 * so replayed webhooks or repeated admin reconciles cannot double-grant.
 *
 * `signatureVerified` records HOW this call proved the payment: `true` when an
 * HMAC signature was checked, `false` when the payment was fetched from the
 * Razorpay API instead. It is an audit flag, not a trust flag — a row is only
 * ever written after one of those two proofs succeeded.
 *
 * Throws only on transient database failures, so the webhook caller can return
 * a non-2xx and let the gateway retry. A returned status is terminal:
 *   fulfilled | already_paid | mismatch | not_found
 */
async function fulfilDigitalOrder(supabase, { payment, order, event, signatureVerified = true } = {}) {
  const providerOrderId = payment?.order_id || order?.id
  if (!providerOrderId) return { status: 'not_found' }

  const { data: dbOrder, error: lookupError } = await supabase
    .from('orders')
    .select('id, order_ref, payment_status, total_paise, currency, email, user_id')
    .eq('provider_order_id', providerOrderId)
    .maybeSingle()

  if (lookupError) {
    throw new Error(`Order lookup failed: ${lookupError.message}`)
  }
  // Not a digital-store order.
  if (!dbOrder) return { status: 'not_found' }

  // Record the transaction. Replays hit the unique index and are ignored.
  if (payment?.id) {
    const { error: txError } = await supabase.from('payment_transactions').insert({
      payment_id: payment.id,
      provider: 'razorpay',
      provider_order_id: providerOrderId,
      order_id: dbOrder.id,
      amount_paise: Number(payment.amount) || 0,
      currency: payment.currency || dbOrder.currency,
      status: payment.status || 'captured',
      // Honest audit trail: only true when THIS request checked a signature.
      signature_valid: Boolean(signatureVerified),
      event_type: event || '',
    })

    if (txError && !isDuplicateError(txError)) {
      throw new Error(`Transaction insert failed: ${txError.message}`)
    }
  }

  if (dbOrder.payment_status === 'paid') {
    console.log('[Fulfilment] Digital order already fulfilled (idempotent):', dbOrder.order_ref)
    return { status: 'already_paid', order_ref: dbOrder.order_ref }
  }

  // The amount and currency must match exactly what we priced server-side.
  // A mismatch is never auto-fulfilled; the order is left pending and logged
  // loudly for manual investigation.
  const paidAmount = Number(payment?.amount ?? order?.amount ?? 0)
  const paidCurrency = payment?.currency || order?.currency || dbOrder.currency

  if (paidAmount !== Number(dbOrder.total_paise) || paidCurrency !== dbOrder.currency) {
    console.error('[Fulfilment] PAYMENT MISMATCH — order left pending for reconciliation:', {
      order_ref: dbOrder.order_ref,
      expected_paise: dbOrder.total_paise,
      expected_currency: dbOrder.currency,
      paid_paise: paidAmount,
      paid_currency: paidCurrency,
      payment_id: payment?.id,
    })
    return {
      status: 'mismatch',
      order_ref: dbOrder.order_ref,
      expected_paise: Number(dbOrder.total_paise),
      expected_currency: dbOrder.currency,
      paid_paise: paidAmount,
      paid_currency: paidCurrency,
    }
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ payment_status: 'paid', paid_at: new Date().toISOString(), failure_reason: '' })
    .eq('id', dbOrder.id)
    .neq('payment_status', 'paid')

  if (updateError) {
    throw new Error(`Order update failed: ${updateError.message}`)
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('id, product_id')
    .eq('order_id', dbOrder.id)

  if (itemsError) {
    throw new Error(`Order items lookup failed: ${itemsError.message}`)
  }

  for (const item of items || []) {
    if (!item.product_id) continue

    const { error: entitlementError } = await supabase.from('entitlements').insert({
      product_id: item.product_id,
      order_id: dbOrder.id,
      order_item_id: item.id,
      user_id: dbOrder.user_id,
      customer_email: dbOrder.email,
      source: 'purchase',
      status: 'active',
    })

    if (entitlementError && !isDuplicateError(entitlementError)) {
      throw new Error(`Entitlement insert failed: ${entitlementError.message}`)
    }
  }

  console.log('[Fulfilment] Digital order fulfilled:', dbOrder.order_ref)
  return { status: 'fulfilled', order_ref: dbOrder.order_ref }
}

/**
 * Record a failed/cancelled payment against a digital order. Never grants
 * anything: it only moves the order out of 'pending' so the customer sees an
 * honest state, and leaves no entitlement behind.
 */
async function recordDigitalFailure({ payment, order, event }) {
  const providerOrderId = payment?.order_id || order?.id
  if (!providerOrderId) return

  const supabase = getServiceClient()
  if (!supabase) {
    console.error('[Fulfilment] Missing Supabase service role credentials for failure recording')
    return
  }

  try {
    const { data: dbOrder } = await supabase
      .from('orders')
      .select('id, order_ref, payment_status')
      .eq('provider_order_id', providerOrderId)
      .maybeSingle()

    if (!dbOrder || dbOrder.payment_status === 'paid') return

    const reason =
      payment?.error_description ||
      payment?.error?.description ||
      order?.error_description ||
      event

    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: event === 'order.cancelled' ? 'cancelled' : 'failed',
        failure_reason: String(reason || '').slice(0, 500),
      })
      .eq('id', dbOrder.id)
      .neq('payment_status', 'paid')

    if (error) {
      console.error('[Fulfilment] Failed to record payment failure:', error.message)
    } else {
      console.log('[Fulfilment] Digital order marked', event, ':', dbOrder.order_ref)
    }
  } catch (err) {
    console.error('[Fulfilment] Failure recording exception:', err)
  }
}

module.exports = {
  getServiceClient,
  isDuplicateError,
  fulfilDigitalOrder,
  recordDigitalFailure,
}
