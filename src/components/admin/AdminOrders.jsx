import { useState, useEffect, useMemo } from 'react'
import {
  getAllOrders,
  getOrderItems,
  getAllEntitlements,
  revokeEntitlement,
  reconcileOrder,
  reconcilePayment,
  createAccessLink,
  summariseOrders,
} from '../../lib/adminProducts'
import { formatPrice } from '../../lib/products'
import { formatPhone, telLink, whatsappLink } from '../../lib/phone'
import { useToast } from '../../context/ToastContext'
import SearchBar from '../ui/SearchBar'

const STATUS_COLORS = {
  pending: '#f59e0b',
  paid: '#10b981',
  failed: '#ef4444',
  cancelled: '#94a3b8',
  refunded: '#8b5cf6',
}

export default function AdminOrders() {
  const { toast, confirm } = useToast()

  const [orders, setOrders] = useState([])
  const [itemsByOrder, setItemsByOrder] = useState({})
  const [entitlements, setEntitlements] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tab, setTab] = useState('orders')
  const [loading, setLoading] = useState(true)
  const [reconciling, setReconciling] = useState(null)
  const [paymentId, setPaymentId] = useState('')
  const [verifyingPaymentId, setVerifyingPaymentId] = useState(false)
  const [linkBusy, setLinkBusy] = useState(null)
  const [accessLink, setAccessLink] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [orderRows, entitlementRows] = await Promise.all([
        getAllOrders(),
        getAllEntitlements(),
      ])
      setOrders(orderRows)
      setEntitlements(entitlementRows)

      const items = await getOrderItems(orderRows.map((o) => o.id))
      const grouped = {}
      for (const item of items) {
        if (!grouped[item.order_id]) grouped[item.order_id] = []
        grouped[item.order_id].push(item)
      }
      setItemsByOrder(grouped)
    } catch (err) {
      toast.error('Failed to load orders: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(() => summariseOrders(orders), [orders])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return orders.filter((o) => {
      if (statusFilter && o.payment_status !== statusFilter) return false
      if (!term) return true
      return [
        o.order_ref,
        o.email,
        o.customer_name,
        o.customer_phone,
        o.provider_order_id,
      ].some((f) => f && String(f).toLowerCase().includes(term))
    })
  }, [orders, search, statusFilter])

  /**
   * Ask the server to re-verify a pending order straight from Razorpay. This
   * is the recovery path for a capture whose webhook never reached us.
   */
  async function handleReconcile(order) {
    const ok = await confirm({
      title: 'Verify Payment',
      message: `Check Razorpay for a captured payment on ${order.order_ref}? If a matching payment is found, the order is marked paid and the customer's download access is granted.`,
      confirmText: 'Verify',
    })
    if (!ok) return

    setReconciling(order.id)
    try {
      const result = await reconcileOrder(order.order_ref)
      toast.success(
        result.status === 'already_paid'
          ? 'This order was already marked paid'
          : 'Payment verified — access granted'
      )
      await load()
    } catch (err) {
      toast.error('Verification failed: ' + err.message)
    } finally {
      setReconciling(null)
    }
  }

  /**
   * Verify a specific Razorpay payment id. Used when the capture exists in the
   * dashboard but was not attached to the gateway order our row recorded.
   */
  async function handleVerifyByPaymentId(event) {
    event.preventDefault()
    const id = paymentId.trim()
    if (!id) return

    setVerifyingPaymentId(true)
    try {
      const result = await reconcilePayment(id)
      toast.success(
        result.status === 'already_paid'
          ? 'That payment was already applied'
          : 'Payment verified — access granted'
      )
      setPaymentId('')
      await load()
    } catch (err) {
      toast.error('Verification failed: ' + err.message)
    } finally {
      setVerifyingPaymentId(false)
    }
  }

  async function handleRevoke(entitlement) {
    const ok = await confirm({
      title: 'Revoke Access',
      message: 'Revoke this customer’s access to the product? They will no longer be able to download it.',
      confirmText: 'Revoke',
      danger: true,
    })
    if (!ok) return

    try {
      await revokeEntitlement(entitlement.id)
      toast.success('Access revoked')
      load()
    } catch (err) {
      toast.error('Failed to revoke: ' + err.message)
    }
  }

  /**
   * Mint a one-off sign-in link for this order's customer.
   *
   * Used when the buyer cannot sign in: Supabase's built-in mailer is rate
   * limited until custom SMTP is configured, and a customer who cannot sign in
   * cannot download what they paid for. The server generates the link without
   * sending any email, so the admin can deliver it directly.
   */
  async function handleAccessLink(order) {
    setLinkBusy(order.id)
    try {
      const result = await createAccessLink({ orderRef: order.order_ref })
      setAccessLink(result)
    } catch (err) {
      toast.error('Could not create a sign-in link: ' + err.message)
    } finally {
      setLinkBusy(null)
    }
  }

  async function handleCopyLink() {
    if (!accessLink?.link) return
    try {
      await navigator.clipboard.writeText(accessLink.link)
      toast.success('Sign-in link copied')
    } catch {
      toast.error('Could not copy — select the link and copy it manually')
    }
  }

  // Ready-made messages so the admin can deliver the link with one click, from
  // their own mail client or WhatsApp, with no SMTP configured anywhere. Both
  // messages also tell the customer to set a password, so a single delivery is
  // enough — after that they sign in without any email at all.
  const mailtoHref = useMemo(() => {
    if (!accessLink?.link) return '#'
    const subject = 'Your NEURAL AURORA download link'
    const body = [
      'Hi,',
      '',
      'Your purchase is unlocked. Use this secure link to sign in and download it:',
      '',
      accessLink.link,
      '',
      'Once you are inside, open your library and set a password. After that you can sign in any time with your email and password — no waiting for another link.',
      '',
      'If this link has expired, just reply and I will send a new one.',
      '',
      '— NEURAL AURORA',
    ].join('\n')
    return `mailto:${accessLink.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }, [accessLink])

  // WhatsApp delivery. When the order recorded a phone number this opens the
  // chat with that customer directly; otherwise it falls back to WhatsApp's own
  // contact picker, so the admin is never blocked.
  const whatsappHref = useMemo(() => {
    if (!accessLink?.link) return '#'
    return whatsappLink(
      accessLink.phone,
      [
        'Your NEURAL AURORA download is ready. Use this link to sign in:',
        '',
        accessLink.link,
        '',
        'Tip: open your library and set a password so you can sign in any time without waiting for another link.',
      ].join('\n')
    )
  }, [accessLink])

  return (
    <div>
      <div className="mb-6">
        <h1
          className="font-display text-2xl font-bold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          Orders
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Store payments, customers and download entitlements
        </p>
      </div>

      {/* --- summary ------------------------------------------------------- */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Orders" value={summary.total} />
        <Stat label="Paid" value={summary.paid} color="#10b981" />
        <Stat label="Pending" value={summary.pending} color="#f59e0b" />
        <Stat label="Failed" value={summary.failed} color="#ef4444" />
        <Stat label="Refunded" value={summary.refunded} color="#8b5cf6" />
        <Stat label="Revenue" value={formatPrice(summary.revenuePaise, 'INR')} color="#06b6d4" />
      </div>

      {/* --- tabs ---------------------------------------------------------- */}
      <div className="mb-4 flex gap-2">
        {[
          { key: 'orders', label: `Orders (${orders.length})` },
          { key: 'entitlements', label: `Entitlements (${entitlements.length})` },
        ].map((entry) => (
          <button
            key={entry.key}
            onClick={() => setTab(entry.key)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{
              background: tab === entry.key ? 'var(--accent)' : 'var(--input-bg)',
              color: tab === entry.key ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'orders' ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Search orders..." />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">All statuses</option>
              {Object.keys(STATUS_COLORS).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Recovery for a capture the gateway did not attach to our order */}
          <form
            onSubmit={handleVerifyByPaymentId}
            className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border p-3"
            style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
          >
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Paid in Razorpay but still pending here? Paste the payment ID:
            </span>
            <input
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              placeholder="pay_XXXXXXXXXXXXXX"
              className="min-w-[180px] flex-1 rounded-lg border px-3 py-1.5 text-xs outline-none"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="submit"
              disabled={verifyingPaymentId || !paymentId.trim()}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-opacity disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {verifyingPaymentId ? 'Verifying…' : 'Verify by payment ID'}
            </button>
          </form>

          {loading ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Loading…
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              No orders yet.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border p-4"
                  style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {order.order_ref}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider text-white"
                          style={{ background: STATUS_COLORS[order.payment_status] || '#64748b' }}
                        >
                          {order.payment_status}
                        </span>
                      </div>
                      <p className="mt-1 break-all text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {order.email}
                        {order.customer_name ? ` · ${order.customer_name}` : ''}
                      </p>
                      {order.customer_phone && <PhoneLinks phone={order.customer_phone} />}
                      <p className="mt-0.5 break-all text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {order.provider} {order.provider_order_id || ''}
                        {order.paid_at ? ` · paid ${new Date(order.paid_at).toLocaleString()}` : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {formatPrice(order.total_paise, order.currency)}
                      </p>
                      {order.discount_paise > 0 && (
                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                          −{formatPrice(order.discount_paise, order.currency)} discount
                        </p>
                      )}
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {(itemsByOrder[order.id] || []).length > 0 && (
                    <ul
                      className="mt-3 space-y-1 border-t pt-3 text-xs"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      {itemsByOrder[order.id].map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <span className="truncate">
                            {item.product_title_snapshot}
                            {item.product_version_snapshot ? ` · v${item.product_version_snapshot}` : ''}
                            {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                          </span>
                          <span className="shrink-0">
                            {formatPrice(item.total_price_paise, order.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {order.failure_reason && (
                    <p className="mt-2 text-[11px] text-red-400">{order.failure_reason}</p>
                  )}

                  <div
                    className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    {order.payment_status === 'pending' && order.provider_order_id && (
                      <button
                        onClick={() => handleReconcile(order)}
                        disabled={reconciling === order.id}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-opacity disabled:opacity-50"
                        style={{ background: 'var(--accent)' }}
                      >
                        {reconciling === order.id ? 'Verifying…' : 'Verify payment'}
                      </button>
                    )}

                    <button
                      onClick={() => handleAccessLink(order)}
                      disabled={linkBusy === order.id}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
                      style={{
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {linkBusy === order.id ? 'Preparing…' : 'Sign-in link'}
                    </button>

                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      “Verify payment” re-checks Razorpay for a capture. “Sign-in link” mints a
                      one-off login link you can send the customer if they cannot sign in.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {entitlements.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              No entitlements granted yet.
            </p>
          ) : (
            entitlements.map((ent) => (
              <div
                key={ent.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
              >
                <div className="min-w-0">
                  <p className="break-all text-sm" style={{ color: 'var(--text-primary)' }}>
                    {ent.customer_email || ent.user_id || '—'}
                  </p>
                  <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    product #{ent.product_id} · {ent.source} ·{' '}
                    {new Date(ent.granted_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider text-white"
                    style={{ background: ent.status === 'active' ? '#10b981' : '#64748b' }}
                  >
                    {ent.status}
                  </span>
                  {ent.status === 'active' && (
                    <button
                      onClick={() => handleRevoke(ent)}
                      className="text-xs text-red-400"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Sign-in link delivery. Kept out of the list so the admin can copy it
          without the surrounding rows scroll-locking behind a modal. */}
      {accessLink && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(2,6,23,0.72)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Customer sign-in link"
        >
          <div
            className="w-full max-w-lg rounded-2xl border p-5"
            style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Sign-in link ready
            </h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Send this to <span className="font-medium">{accessLink.email}</span>. It signs them
              straight into their library and needs no email from us, so the mail rate limit
              cannot block it. Ask them to set a password from inside the library — after that they
              never need a link again.
            </p>

            <textarea
              readOnly
              rows={3}
              value={accessLink.link}
              onFocus={(e) => e.target.select()}
              className="mt-3 w-full resize-none break-all rounded-lg border px-3 py-2 text-[11px] outline-none"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-secondary)',
              }}
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                style={{ background: 'var(--accent)' }}
              >
                Copy link
              </button>
              <a
                href={mailtoHref}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                Open in my mail app
              </a>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                Share on WhatsApp
              </a>
              <button
                type="button"
                onClick={() => setAccessLink(null)}
                className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Close
              </button>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              {accessLink.phone
                ? `WhatsApp will open a chat with ${formatPhone(accessLink.phone)}.`
                : 'No phone number was recorded on this customer’s orders — WhatsApp will ask you to pick a contact.'}
            </p>

            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              {accessLink.orders} order(s) ·{' '}
              {accessLink.active_entitlements ?? 0} active download entitlement(s)
              {accessLink.account_created ? ' · account created' : ' · account already existed'}.
              Treat this link like a password — anyone who opens it is signed in as this customer.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/** Phone contact links for an order, or nothing when there is no usable number. */
function PhoneLinks({ phone }) {
  const number = formatPhone(phone)
  if (!number) return null

  return (
    <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
      <a href={telLink(phone)} className="underline decoration-dotted">
        {number}
      </a>
      {' · '}
      <a
        href={whatsappLink(phone)}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-dotted"
      >
        WhatsApp
      </a>
    </p>
  )
}

function Stat({ label, value, color }) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
    >
      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold" style={{ color: color || 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  )
}
