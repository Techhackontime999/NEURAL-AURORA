import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Loader2, XCircle, AlertTriangle, Clock, RefreshCw, Download } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getOrderStatus } from '../../lib/checkout'
import { formatPrice } from '../../lib/products'
import { friendlyStoreError } from '../../lib/storeErrors'
import { downloadOrderReceipt } from '../../lib/receipts'
import StoreShell from './StoreShell'

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 20 // ~60s, then stop and show an honest "still processing"

/**
 * Payment confirmation screen.
 *
 * It never treats the browser redirect as proof of payment. It asks the server
 * for the real order status, which only changes once the gateway webhook has
 * been signature-verified and the order fulfilled. Until then the customer
 * sees an honest "confirming" state.
 */
export default function PurchaseSuccess() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const ref = (searchParams.get('ref') || '').trim().toUpperCase()

  const [status, setStatus] = useState('loading')
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [retryToken, setRetryToken] = useState(0)
  const [receiptBusy, setReceiptBusy] = useState(false)
  const [receiptError, setReceiptError] = useState(null)
  const cancelled = useRef(false)
  const polls = useRef(0)

  useEffect(() => {
    cancelled.current = false
    polls.current = 0

    if (!ref) {
      setError(t('store.purchaseMissingRef'))
      setStatus('error')
      return undefined
    }

    let timer

    const poll = async () => {
      try {
        const data = await getOrderStatus(ref)
        if (cancelled.current) return

        setOrder(data)

        if (data.payment_status === 'paid') {
          setStatus('paid')
          return
        }
        if (data.payment_status === 'failed') {
          setStatus('failed')
          return
        }
        if (data.payment_status === 'cancelled') {
          setStatus('cancelled')
          return
        }
        if (data.payment_status === 'refunded') {
          setStatus('refunded')
          return
        }

        // Still pending: the webhook may simply be in flight. Keep the counter
        // in a ref so the timeout is scheduled from the resolved request, not
        // from inside a state updater (which can run twice in Strict Mode).
        setStatus('pending')
        polls.current += 1
        if (polls.current < MAX_POLLS) {
          timer = setTimeout(poll, POLL_INTERVAL_MS)
        } else {
          setStatus('slow')
        }
      } catch (err) {
        if (cancelled.current) return
        setError(friendlyStoreError(err, t, 'store.purchaseError'))
        setStatus('error')
      }
    }

    poll()

    return () => {
      cancelled.current = true
      if (timer) clearTimeout(timer)
    }
  }, [ref, t, retryToken])

  const handleReceiptDownload = async () => {
    setReceiptBusy(true)
    setReceiptError(null)
    try {
      await downloadOrderReceipt(ref)
    } catch (err) {
      setReceiptError(err?.message || t('store.receiptDownloadFailed'))
    } finally {
      setReceiptBusy(false)
    }
  }

  const tone = {
    paid: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    pending: { icon: Loader2, color: 'text-cyan-500', bg: 'bg-cyan-500/10', spin: true },
    slow: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    cancelled: { icon: XCircle, color: 'text-[var(--text-tertiary)]', bg: 'bg-black/5 dark:bg-white/5' },
    refunded: { icon: AlertTriangle, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    error: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    loading: { icon: Loader2, color: 'text-[var(--text-tertiary)]', bg: 'bg-black/5 dark:bg-white/5', spin: true },
  }[status] || { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' }

  const Icon = tone.icon

  return (
    <StoreShell>
      <div className="mx-auto max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel rounded-xl p-8 text-center"
        >
          <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${tone.bg} ${tone.color}`}>
            <Icon className={`h-6 w-6 ${tone.spin ? 'animate-spin' : ''}`} aria-hidden="true" />
          </div>

          <div aria-live="polite" aria-atomic="true">
            <h1 className="text-base font-display font-bold tracking-tight text-[var(--text-primary)]">
              {t(`store.purchase.${status}.title`)}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
              {t(`store.purchase.${status}.body`)}
            </p>
          </div>

          {ref && (
            <p className="mt-4 text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
              {t('store.purchase.orderRef', { ref })}
            </p>
          )}

          {order?.items?.length > 0 && (
            <div className="mt-6 border-t border-black/5 pt-4 text-left dark:border-white/5">
              <ul className="space-y-2">
                {order.items.map((item) => (
                  <li
                    key={item.slug}
                    className="flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)]"
                  >
                    <span className="truncate">
                      {item.title}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                    </span>
                    <span className="shrink-0">
                      {formatPrice(item.total_paise, order.currency)}
                    </span>
                  </li>
                ))}
              </ul>

              {Number(order.subtotal_paise) > 0 && (
                <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3 text-[11px] text-[var(--text-secondary)] dark:border-white/5">
                  <span>{t('store.purchase.subtotal')}</span>
                  <span>{formatPrice(order.subtotal_paise, order.currency)}</span>
                </div>
              )}
              {Number(order.discount_paise) > 0 && (
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-emerald-500">
                  <span>{t('store.purchase.discount')}</span>
                  <span>−{formatPrice(order.discount_paise, order.currency)}</span>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3 text-xs font-semibold text-black/80 dark:border-white/5 dark:text-white/80">
                <span>{t('store.purchase.total')}</span>
                <span>{formatPrice(order.total_paise, order.currency)}</span>
              </div>
            </div>
          )}

          {error && status === 'error' && (
            <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-500">{error}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {status === 'error' && (
              <button
                type="button"
                onClick={() => setRetryToken((token) => token + 1)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 py-2.5 text-[11px] uppercase tracking-widest text-[var(--text-primary)] transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {t('store.statusRetry')}
              </button>
            )}
            {status === 'paid' && (
              <button
                type="button"
                disabled={receiptBusy}
                onClick={handleReceiptDownload}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 py-2.5 text-[11px] uppercase tracking-widest text-[var(--text-primary)] transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                {receiptBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {t('store.downloadReceipt')}
              </button>
            )}

            {(status === 'paid' || status === 'slow' || status === 'pending') && (
              <Link
                to="/library"
                className="rounded-lg bg-black/90 px-4 py-2.5 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-black dark:bg-white/90 dark:text-black dark:hover:bg-white"
              >
                {t('store.purchase.goToLibrary')}
              </Link>
            )}

            {(status === 'failed' || status === 'cancelled' || status === 'error') && (
              <Link
                to="/offerings/products"
                className="rounded-lg bg-black/90 px-4 py-2.5 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-black dark:bg-white/90 dark:text-black dark:hover:bg-white"
              >
                {t('store.browseStore')}
              </Link>
            )}
          </div>

          {receiptError && (
            <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-500">
              {receiptError}
            </p>
          )}

          {status === 'paid' && !user && (
            <p className="mt-4 text-[10px] leading-relaxed text-black/40 dark:text-white/35">
              {t('store.purchase.guestHint')}
            </p>
          )}
        </motion.div>
      </div>
    </StoreShell>
  )
}
