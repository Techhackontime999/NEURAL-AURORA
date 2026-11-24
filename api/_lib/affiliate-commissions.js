// ---------------------------------------------------------------------------
// Affiliate codes and commission arithmetic.
//
// Like coupons, the browser may only submit a CODE. Commission rates are read
// from the server-side affiliate row and snapshotted onto the order, and the
// payout amount is integer paise calculated after a verified payment.
// ---------------------------------------------------------------------------

const MAX_CODE_LENGTH = 24
const AFFILIATE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,23}$/
const MAX_BPS = 10000

function normaliseAffiliateCode(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .slice(0, MAX_CODE_LENGTH)
}

function isAffiliateCode(value) {
  return AFFILIATE_CODE_PATTERN.test(normaliseAffiliateCode(value))
}

/** Basis points avoid floating-point drift: 1250 bps = 12.5%. */
function calculateCommission({ netPaise, commissionBps }) {
  const net = Number(netPaise)
  const bps = Number(commissionBps)
  if (!Number.isInteger(net) || net <= 0) {
    return { ok: false, reason: 'invalid_amount' }
  }
  if (!Number.isInteger(bps) || bps < 0 || bps > MAX_BPS) {
    return { ok: false, reason: 'invalid_rate' }
  }

  const commissionPaise = Math.floor((net * bps) / MAX_BPS)
  if (commissionPaise <= 0) return { ok: false, reason: 'below_paise' }

  return { ok: true, netPaise: net, commissionBps: bps, commissionPaise }
}

/**
 * Create a commission from an attributed, PAID order. Safe to call on webhook
 * replays: the unique (order_id) constraint makes a second insert a no-op.
 */
async function ensureAffiliateCommission(supabase, { orderId, orderRef, netPaise, currency }) {
  if (!supabase) return { status: 'unconfigured' }

  const { data: attribution, error: lookupError } = await supabase
    .from('affiliate_attributions')
    .select('affiliate_id, affiliate_code, commission_bps')
    .eq('order_id', orderId)
    .maybeSingle()

  if (lookupError) {
    console.error('[Affiliates] Attribution lookup failed:', lookupError.message)
    return { status: 'error' }
  }
  if (!attribution) return { status: 'none' }

  const calculated = calculateCommission({
    netPaise,
    commissionBps: attribution.commission_bps,
  })
  if (!calculated.ok) return { status: 'skipped', reason: calculated.reason }

  const { error } = await supabase.from('affiliate_commissions').upsert(
    {
      affiliate_id: attribution.affiliate_id,
      order_id: orderId,
      order_ref: orderRef,
      net_paise: calculated.netPaise,
      commission_bps: calculated.commissionBps,
      commission_paise: calculated.commissionPaise,
      currency: currency || 'INR',
      status: 'pending',
    },
    { onConflict: 'order_id', ignoreDuplicates: true }
  )

  if (error) {
    console.error('[Affiliates] Commission insert failed:', error.message)
    return { status: 'error' }
  }
  return { status: 'created', commissionPaise: calculated.commissionPaise }
}

module.exports = {
  normaliseAffiliateCode,
  isAffiliateCode,
  calculateCommission,
  ensureAffiliateCommission,
  MAX_BPS,
}
