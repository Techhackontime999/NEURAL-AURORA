import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowRight,
  Heart,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useStore, CART_MAX_ITEMS, CART_MAX_QUANTITY } from '../../context/StoreContext'
import { useToast } from '../../context/ToastContext'
import { formatPrice, getProductsBySlugs } from '../../lib/products'
import { requestFreeDownload, startCartCheckout } from '../../lib/checkout'
import { normalisePhone } from '../../lib/phone'
import { friendlyStoreError } from '../../lib/storeErrors'
import StoreShell from './StoreShell'

export default function Cart() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const { cartItems, updateCartQuantity, removeFromCart, clearCart, saveForLater } = useStore()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState(null)
  const [freeBusy, setFreeBusy] = useState('')

  const slugsKey = cartItems.map((item) => item.slug).join(',')

  useEffect(() => {
    let cancelled = false
    if (!slugsKey) {
      setProducts([])
      setLoading(false)
      setLoadError(null)
      return undefined
    }

    setLoading(true)
    setLoadError(null)
    getProductsBySlugs(slugsKey.split(','), CART_MAX_ITEMS)
      .then((items) => {
        if (!cancelled) setProducts(items)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(friendlyStoreError(err, t, 'store.cartLoadError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slugsKey, reloadToken, t])

  const lines = useMemo(
    () =>
      cartItems
        .map((item) => {
          const product = products.find((entry) => entry.slug === item.slug)
          return product ? { ...item, product } : null
        })
        .filter(Boolean),
    [cartItems, products]
  )
  const missing = useMemo(
    () => (loading ? [] : cartItems.filter((item) => !products.some((p) => p.slug === item.slug))),
    [cartItems, products, loading]
  )

  const paidLines = lines.filter((line) => line.product.price_paise > 0)
  const freeLines = lines.filter((line) => line.product.price_paise === 0)
  const currency = paidLines[0]?.product.currency || 'INR'
  const mixedCurrency = paidLines.some((line) => line.product.currency !== currency)
  const displayTotalPaise = paidLines.reduce(
    (sum, line) => sum + line.product.price_paise * line.quantity,
    0
  )

  const handleCheckout = async (event) => {
    event.preventDefault()
    if (busy || !paidLines.length) return
    setCheckoutError(null)

    const buyerEmail = (email || '').trim() || user?.email || ''
    if (!buyerEmail) {
      setCheckoutError(t('store.emailRequired'))
      return
    }
    const buyerPhone = normalisePhone(phone)
    if (!buyerPhone) {
      setCheckoutError(t('store.phoneRequired'))
      return
    }
    if (!termsAccepted) {
      setCheckoutError(t('store.termsRequired'))
      return
    }
    if (mixedCurrency) {
      setCheckoutError(t('store.mixedCurrency'))
      return
    }

    setBusy(true)
    try {
      const { orderRef } = await startCartCheckout({
        items: paidLines.map((line) => ({
          slug: line.slug,
          quantity: line.quantity,
          license_code: line.license_code,
        })),
        email: buyerEmail,
        name: (name || '').trim(),
        phone: buyerPhone,
        currency,
        description: paidLines.length === 1 ? paidLines[0].product.title : t('store.cartTitle'),
      })
      clearCart()
      navigate(`/purchase/success?ref=${encodeURIComponent(orderRef)}`)
    } catch (err) {
      setCheckoutError(friendlyStoreError(err, t, 'store.checkoutFailed'))
    } finally {
      setBusy(false)
    }
  }

  const handleFreeDownload = async (product) => {
    const buyerEmail = (email || '').trim() || user?.email || ''
    if (!buyerEmail) {
      toast.error(t('store.emailRequired'))
      return
    }

    let downloadTab = null
    if (user) {
      downloadTab = window.open('about:blank', '_blank')
      if (downloadTab) downloadTab.opener = null
    }

    setFreeBusy(product.slug)
    try {
      const result = await requestFreeDownload({ product, email: buyerEmail, user })
      if (result?.code === 'downloadReady' && result.url) {
        if (downloadTab) {
          downloadTab.location.replace(result.url)
        } else if (!window.open(result.url, '_blank', 'noopener,noreferrer')) {
          toast.info(t('store.popupBlocked'))
        }
      } else if (result?.code === 'magicLinkSent') {
        downloadTab?.close()
        toast.success(t('store.magicLinkSent'))
      } else {
        downloadTab?.close()
        toast.error(t('store.downloadUnavailable'))
      }
    } catch (err) {
      downloadTab?.close()
      toast.error(friendlyStoreError(err, t, 'store.downloadUnavailable'))
    } finally {
      setFreeBusy('')
    }
  }

  const handleSaveForLater = (slug) => {
    saveForLater(slug)
    toast.success(t('store.savedToWishlist'))
  }

  const renderLine = (line, { free = false } = {}) => {
    const { product, quantity } = line
    return (
      <li
        key={line.slug}
        className="flex flex-col gap-4 rounded-xl border border-black/10 p-4 dark:border-white/10 sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/5 dark:bg-white/5">
            {product.cover_image_url ? (
              <img src={product.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <ShoppingBag className="h-6 w-6 text-[var(--text-tertiary)]" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <Link
              to={`/offerings/products/${product.slug}`}
              className="text-sm font-semibold text-[var(--text-primary)] hover:text-cyan-500"
            >
              {product.title}
            </Link>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
              {product.format || t('store.digitalProduct')}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {free ? t('store.free') : formatPrice(product.price_paise, product.currency)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {!free && (
            <div className="inline-flex items-center rounded-lg border border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => updateCartQuantity(line.slug, quantity - 1)}
                aria-label={t('store.quantityDecrease')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-l-lg hover:text-cyan-500"
              >
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <span className="w-9 text-center text-xs tabular-nums" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => updateCartQuantity(line.slug, quantity + 1)}
                disabled={quantity >= CART_MAX_QUANTITY}
                aria-label={t('store.quantityIncrease')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-r-lg hover:text-cyan-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {free ? (
            <button
              type="button"
              onClick={() => handleFreeDownload(product)}
              disabled={freeBusy === product.slug}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-500/15 px-4 text-[11px] uppercase tracking-widest text-emerald-500 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {freeBusy === product.slug ? t('store.working') : t('store.freeDownload')}
            </button>
          ) : (
            <span className="w-24 text-right text-sm font-semibold text-[var(--text-primary)]">
              {formatPrice(product.price_paise * quantity, product.currency)}
            </span>
          )}

          <button
            type="button"
            onClick={() => handleSaveForLater(line.slug)}
            aria-label={t('store.saveForLater')}
            title={t('store.saveForLater')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 hover:text-rose-500 dark:border-white/10"
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => removeFromCart(line.slug)}
            aria-label={t('store.remove')}
            title={t('store.remove')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 hover:text-red-500 dark:border-white/10"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </li>
    )
  }

  if (loading) {
    return (
      <StoreShell eyebrow={t('store.eyebrow')} title={t('store.cartTitle')}>
        <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-500" aria-hidden="true" />
        </div>
      </StoreShell>
    )
  }

  return (
    <StoreShell
      eyebrow={t('store.eyebrow')}
      title={t('store.cartTitle')}
      subtitle={t('store.cartSubtitle')}
    >
      <div data-testid="cart-page" className="pb-16">
        {loadError && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-500">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {loadError}
            </span>
            <button
              type="button"
              onClick={() => setReloadToken((token) => token + 1)}
              className="inline-flex items-center gap-1.5 underline"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {t('store.retry')}
            </button>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 px-6 text-center dark:border-white/15">
            <ShoppingBag className="h-10 w-10 text-[var(--text-tertiary)]" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
              {t('store.cartEmpty')}
            </h2>
            <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
              {t('store.cartEmptyBody')}
            </p>
            <Link
              to="/offerings/products"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-cyan-300 px-6 text-xs font-semibold uppercase tracking-widest text-black dark:bg-cyan-400"
            >
              {t('store.browseStore')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-8">
              {paidLines.length > 0 && (
                <section aria-labelledby="cart-paid-heading">
                  <h2
                    id="cart-paid-heading"
                    className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)]"
                  >
                    {t('store.paidItems')}
                  </h2>
                  <ul className="space-y-3">{paidLines.map((line) => renderLine(line))}</ul>
                </section>
              )}

              {freeLines.length > 0 && (
                <section aria-labelledby="cart-free-heading">
                  <h2
                    id="cart-free-heading"
                    className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)]"
                  >
                    {t('store.freeItems')}
                  </h2>
                  {paidLines.length === 0 && (
                    <label className="mb-4 block rounded-lg border border-black/10 p-3 dark:border-white/10">
                      <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                        {t('store.emailLabel')}
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder={user?.email || t('store.emailPlaceholder')}
                        autoComplete="email"
                        className="mt-1 w-full rounded-lg border border-black/10 bg-black/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 dark:border-white/10 dark:bg-white/5"
                      />
                    </label>
                  )}
                  <ul className="space-y-3">
                    {freeLines.map((line) => renderLine(line, { free: true }))}
                  </ul>
                </section>
              )}

              {missing.length > 0 && (
                <section aria-labelledby="cart-missing-heading">
                  <h2
                    id="cart-missing-heading"
                    className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)]"
                  >
                    {t('store.unavailable')}
                  </h2>
                  <ul className="space-y-2">
                    {missing.map((item) => (
                      <li
                        key={item.slug}
                        className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs"
                      >
                        <span className="truncate font-mono text-[var(--text-secondary)]">
                          {item.slug}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.slug)}
                          className="shrink-0 underline hover:text-amber-500"
                        >
                          {t('store.remove')}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to="/offerings/products"
                  className="inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-widest text-[var(--text-secondary)] hover:text-cyan-500"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
                  {t('store.continueShopping')}
                </Link>
                <Link
                  to="/wishlist"
                  className="inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-widest text-[var(--text-secondary)] hover:text-rose-500"
                >
                  <Heart className="h-4 w-4" aria-hidden="true" />
                  {t('store.viewWishlist')}
                </Link>
              </div>
            </div>

            {paidLines.length > 0 && (
              <aside className="glass-panel sticky top-28 rounded-xl p-5">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                  {t('store.checkoutTitle')}
                </h2>

                <form className="mt-4 space-y-2.5" onSubmit={handleCheckout}>
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                      {t('store.emailLabel')}
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={user?.email || t('store.emailPlaceholder')}
                      autoComplete="email"
                      required
                      className="mt-1 w-full rounded-lg border border-black/10 bg-black/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 dark:border-white/10 dark:bg-white/5"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                      {t('store.nameLabel')}
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder={t('store.namePlaceholder')}
                      autoComplete="name"
                      className="mt-1 w-full rounded-lg border border-black/10 bg-black/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 dark:border-white/10 dark:bg-white/5"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                      {t('store.phoneLabel')}
                    </span>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder={t('store.phonePlaceholder')}
                      autoComplete="tel"
                      required
                      className="mt-1 w-full rounded-lg border border-black/10 bg-black/5 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 dark:border-white/10 dark:bg-white/5"
                    />
                  </label>

                  <label className="flex items-start gap-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      required
                      checked={termsAccepted}
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-cyan-500"
                    />
                    <span>{t('store.termsAccept')}</span>
                  </label>

                  <div className="rounded-lg border border-black/10 px-3 py-2.5 dark:border-white/10">
                    <div className="flex items-baseline justify-between gap-3 text-[11px] text-[var(--text-secondary)]">
                      <span>{t('store.cartCount', { count: paidLines.length })}</span>
                      <span>{t('store.total')}</span>
                    </div>
                    <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                      {formatPrice(displayTotalPaise, currency)}
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-tertiary)]">
                      {t('store.cartTotalNote')}
                    </p>
                  </div>

                  {checkoutError && (
                    <p
                      role="alert"
                      className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-500"
                    >
                      {checkoutError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-lg bg-black/90 py-3 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/90 dark:text-black dark:hover:bg-white"
                  >
                    {busy
                      ? t('store.working')
                      : t('store.placeOrder', {
                          price: formatPrice(displayTotalPaise, currency),
                        })}
                  </button>

                  <p className="flex items-start gap-2 pt-1 text-[10px] leading-relaxed text-black/40 dark:text-white/35">
                    <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {t('store.secureNote')}
                  </p>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    clearCart()
                    toast.success(t('store.cartCleared'))
                  }}
                  className="mt-4 w-full text-center text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] underline hover:text-red-500"
                >
                  {t('store.cartClear')}
                </button>
              </aside>
            )}
          </div>
        )}
      </div>
    </StoreShell>
  )
}
