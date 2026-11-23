// ---------------------------------------------------------------------------
// Customer-facing receipt downloads.
//
// Receipts are keyed by the unguessable order reference, the same capability
// used by /api/order-status. The server rebuilds every figure from the stored
// paid order; the browser only chooses WHICH order to download.
// ---------------------------------------------------------------------------

import { supabase } from './supabase'

/** Download the server-generated PDF receipt for one paid order. */
export async function downloadOrderReceipt(orderRef) {
  const ref = String(orderRef || '').trim().toUpperCase()
  if (!/^NA-[A-F0-9]{16}$/.test(ref)) {
    throw new Error('A valid order reference is required.')
  }

  const response = await fetch(`/api/order-receipt?ref=${encodeURIComponent(ref)}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''
    const body = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : {}
    const message =
      typeof body?.error === 'string' && body.error.trim()
        ? body.error
        : `Could not download the receipt. (HTTP ${response.status})`
    throw new Error(message)
  }

  const blob = await response.blob()
  if (!blob.size || !String(blob.type || '').includes('application/pdf')) {
    throw new Error('Could not download the receipt. The server did not return a PDF.')
  }

  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const disposition = response.headers.get('content-disposition') || ''
  const suggested = disposition.match(/filename="([^"]+)"/)?.[1] || `receipt-${ref}.pdf`
  link.href = objectUrl
  link.download = suggested.replace(/[^a-zA-Z0-9_.-]+/g, '-')
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000)
}

/**
 * Paid orders belonging to the signed-in customer, newest first.
 * RLS restricts this to rows whose user_id is the verified session user.
 */
export async function getMyPaidOrders(limit = 50) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_ref, customer_name, total_paise, currency, paid_at, created_at')
    .eq('payment_status', 'paid')
    .order('paid_at', { ascending: false, nullsFirst: false })
    .limit(Math.min(100, Math.max(1, Number(limit) || 50)))

  if (error) throw error
  return data || []
}
