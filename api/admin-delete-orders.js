const { newRequestId, envPresence, log, logError, SUPABASE_ENV_NAMES } = require('./_lib/diag')
const { getServiceClient, requireAdmin } = require('./_lib/adminAuth')

// ---------------------------------------------------------------------------
// POST /api/admin-delete-orders
//
// Lets an administrator permanently remove unwanted orders from the panel.
// Order rows are written and removed exclusively by the server: the client
// only holds SELECT/UPDATE grants (see supabase-schema.sql), so the browser
// cannot delete them directly. This endpoint keeps that boundary intact.
//
// Security model:
//   * POST only, and the caller must present a Supabase access token whose
//     profile role is exactly 'admin' (see _lib/adminAuth).
//   * Only ids are accepted — never SQL, emails or order refs.
//   * Cascades are the database's own: order_items and entitlements go with
//     the order, which revokes download access for that purchase.
//     `payment_transactions.order_id` is ON DELETE SET NULL, so the gateway
//     audit trail survives even after the order row is gone.
//
// Body: { "ids": [12, 34, 56] }  (1–200 ids per request)
// ---------------------------------------------------------------------------

const MAX_IDS = 200

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestId = newRequestId()

  const supabase = getServiceClient()
  if (!supabase) {
    logError('admin-delete-orders', requestId, {
      stage: 'env-check',
      env: envPresence(SUPABASE_ENV_NAMES),
    })
    return res.status(503).json({ error: 'Order deletion is unavailable right now.' })
  }

  const admin = await requireAdmin(req, supabase)
  if (!admin) {
    logError('admin-delete-orders', requestId, { stage: 'auth-rejected' })
    return res.status(403).json({ error: 'Administrator access required.' })
  }

  const rawIds = req.body?.ids
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return res.status(400).json({ error: 'Provide one or more order ids.' })
  }

  const ids = [...new Set(
    rawIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  )]
  if (ids.length === 0) {
    return res.status(400).json({ error: 'No valid order ids were provided.' })
  }
  if (ids.length > MAX_IDS) {
    return res.status(400).json({ error: `Delete at most ${MAX_IDS} orders at a time.` })
  }

  try {
    // Read first, so the response can name what was removed and the log keeps
    // an audit entry even though the rows themselves are gone.
    const { data: orders, error: readError } = await supabase
      .from('orders')
      .select('id, order_ref, payment_status')
      .in('id', ids)

    if (readError) {
      logError('admin-delete-orders', requestId, {
        stage: 'order-lookup-failed',
        db_error: readError.message,
      })
      return res.status(500).json({ error: 'Could not read those orders.' })
    }

    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: 'Those orders no longer exist.' })
    }

    const orderRefs = orders.map((o) => o.order_ref)
    const paidCount = orders.filter((o) => o.payment_status === 'paid').length

    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .in('id', orders.map((o) => o.id))

    if (deleteError) {
      logError('admin-delete-orders', requestId, {
        stage: 'delete-failed',
        db_error: deleteError.message,
      })
      return res.status(500).json({ error: 'Could not delete those orders.' })
    }

    log('admin-delete-orders', requestId, {
      stage: 'deleted',
      actor: admin.id,
      requested: ids.length,
      deleted: orders.length,
      paid_deleted: paidCount,
      order_refs: orderRefs,
    })

    return res.json({
      ok: true,
      deleted: orders.length,
      paid_deleted: paidCount,
      order_refs: orderRefs,
    })
  } catch (err) {
    logError('admin-delete-orders', requestId, {
      stage: 'exception',
      error: err?.message || String(err),
    })
    return res.status(500).json({ error: 'Could not delete those orders.' })
  }
}
