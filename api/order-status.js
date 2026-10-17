const { createClient } = require('@supabase/supabase-js')

/**
 * Read-only order status for the post-payment screen.
 *
 * This exists so the success page can show the REAL payment state instead of
 * trusting the browser redirect. It is never a source of authorization: it
 * returns no email, no account id, no storage path and no download link, so a
 * leaked reference exposes only that an order exists and how it was paid.
 *
 * `order_ref` is 64 bits of CSPRNG output, so it is not enumerable.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ref = String(req.query?.ref || '').trim().toUpperCase()
  if (!/^NA-[A-F0-9]{16}$/.test(ref)) {
    return res.status(400).json({ error: 'Invalid order reference.' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey || supabaseUrl === 'https://placeholder.supabase.co') {
    console.error('[order-status] Supabase service credentials are not configured')
    return res.status(503).json({ error: 'Order status is unavailable right now.' })
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, order_ref, payment_status, currency, subtotal_paise, discount_paise, total_paise, paid_at, created_at')
      .eq('order_ref', ref)
      .maybeSingle()

    if (error) throw error
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('product_title_snapshot, product_slug_snapshot, quantity, total_price_paise')
      .eq('order_id', order.id)

    if (itemsError) throw itemsError

    return res.status(200).json({
      order_ref: order.order_ref,
      payment_status: order.payment_status,
      currency: order.currency,
      subtotal_paise: order.subtotal_paise,
      discount_paise: order.discount_paise,
      total_paise: order.total_paise,
      paid_at: order.paid_at,
      created_at: order.created_at,
      items: (items || []).map((item) => ({
        title: item.product_title_snapshot,
        slug: item.product_slug_snapshot,
        quantity: item.quantity,
        total_paise: item.total_price_paise,
      })),
    })
  } catch (err) {
    console.error('[order-status] Unexpected error:', err?.message || err)
    return res.status(500).json({ error: 'Could not load the order status.' })
  }
}
