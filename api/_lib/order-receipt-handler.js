// ---------------------------------------------------------------------------
// Downloadable purchase receipt.
//
// Shared implementation for /api/order-receipt. The public endpoint is a
// rewrite to /api/license?action=receipt, so Vercel still builds one function.
//
// The receipt is built ONLY from the stored paid order and its item snapshots.
// Access is keyed by the unguessable order reference (64 bits of CSPRNG output),
// the same capability the existing /api/order-status endpoint uses to show
// items and totals on the success screen. No browser-supplied amount, product
// name or payment status is ever trusted.
// ---------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js')
const { newRequestId, envPresence, logError, SUPABASE_ENV_NAMES } = require('./diag')
const { buildReceiptPdf } = require('./receipt-pdf')
const { safeFilename } = require('./license-pdf')
const { fetchSignatureImage } = require('./document-signature')

const REF_PATTERN = /^NA-[A-F0-9]{16}$/

module.exports = async function orderReceipt(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestId = newRequestId()
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey || supabaseUrl === 'https://placeholder.supabase.co') {
    logError('order-receipt', requestId, {
      stage: 'env-check',
      env: envPresence(SUPABASE_ENV_NAMES),
    })
    return res.status(503).json({ error: 'Receipts are unavailable right now.' })
  }

  const ref = String(req.query?.ref || '').trim().toUpperCase()
  if (!REF_PATTERN.test(ref)) {
    return res.status(400).json({ error: 'A valid order reference is required.' })
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        `id, order_ref, email, customer_name, payment_status, currency,
         subtotal_paise, discount_paise, total_paise, paid_at, created_at`
      )
      .eq('order_ref', ref)
      .maybeSingle()

    if (orderError) throw orderError
    if (!order) return res.status(404).json({ error: 'Order not found.' })
    if (order.payment_status !== 'paid') {
      return res.status(409).json({ error: 'A receipt is available once this order is paid.' })
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('product_title_snapshot, product_slug_snapshot, quantity, total_price_paise')
      .eq('order_id', order.id)
      .order('id', { ascending: true })
    if (itemsError) throw itemsError

    // order_items uses snapshot column names; the PDF builder works in
    // customer-facing names. Map them here rather than letting every row fall
    // back to "Digital product" and Rs. 0.
    const receiptItems = (items || []).map((item) => ({
      title: item.product_title_snapshot || item.product_slug_snapshot,
      quantity: item.quantity,
      total_paise: item.total_price_paise,
    }))

    // Payment transactions are audit rows; an older deployment may not have
    // them yet, and a missing gateway id must never block the receipt.
    let paymentId = null
    try {
      const { data: payment } = await supabase
        .from('payment_transactions')
        .select('payment_id')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      paymentId = payment?.payment_id || null
    } catch {
      /* optional audit table */
    }

    // Signature is decorative: never let an image problem block a receipt.
    let signature = null
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('admin_settings')
        .select('document_signature')
        .eq('id', 1)
        .maybeSingle()
      if (settingsError) throw settingsError
      signature = await fetchSignatureImage(settings?.document_signature, requestId)
    } catch (err) {
      logError('order-receipt', requestId, { stage: 'signature-skipped', message: err?.message })
    }

    const pdf = await buildReceiptPdf({
      order: { ...order, payment_id: paymentId },
      items: receiptItems,
      signature,
    })

    const filename = safeFilename(`receipt-${order.order_ref || ref}`)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`)
    res.setHeader('Content-Length', String(pdf.length))
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    return res.status(200).send(pdf)
  } catch (err) {
    logError('order-receipt', requestId, { stage: 'exception', message: err?.message })
    return res.status(500).json({ error: 'Could not prepare your receipt.' })
  }
}
