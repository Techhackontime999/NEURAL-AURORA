import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, Heart, Loader2, RefreshCw, ShoppingBag } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { useToast } from '../../context/ToastContext'
import { getProductsBySlugs } from '../../lib/products'
import { friendlyStoreError } from '../../lib/storeErrors'
import StoreShell from './StoreShell'
import ProductCard from './ProductCard'

export default function Wishlist() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { wishlist, moveToCart, removeFromWishlist } = useStore()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  const slugsKey = wishlist.join(',')

  useEffect(() => {
    let cancelled = false
    if (!slugsKey) {
      setProducts([])
      setLoading(false)
      setError(null)
      return undefined
    }

    setLoading(true)
    setError(null)
    getProductsBySlugs(slugsKey.split(','), 200)
      .then((items) => {
        if (!cancelled) setProducts(items)
      })
      .catch((err) => {
        if (!cancelled) setError(friendlyStoreError(err, t, 'store.wishlistLoadError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slugsKey, reloadToken, t])

  const handleAddAll = () => {
    products.forEach((product) => moveToCart(product.slug))
    toast.success(t('store.addedToCart'))
  }

  return (
    <StoreShell
      eyebrow={t('store.eyebrow')}
      title={t('store.wishlistTitle')}
      subtitle={t('store.wishlistSubtitle')}
    >
      <div data-testid="wishlist-page" className="pb-16">
        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-500">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {error}
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

        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" aria-hidden="true" />
          </div>
        ) : wishlist.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 px-6 text-center dark:border-white/15">
            <Heart className="h-10 w-10 text-[var(--text-tertiary)]" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
              {t('store.wishlistEmpty')}
            </h2>
            <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
              {t('store.wishlistEmptyBody')}
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
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
                {t('store.wishlistCount', { count: products.length })}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddAll}
                  disabled={products.length === 0}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan-300 px-5 text-[11px] font-semibold uppercase tracking-widest text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  {t('store.addAllToCart')}
                </button>
                <Link
                  to="/cart"
                  className="inline-flex min-h-11 items-center gap-2 text-[11px] uppercase tracking-widest text-[var(--text-secondary)] hover:text-cyan-500"
                >
                  {t('store.viewCart')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, index) => (
                <div key={product.id} className="flex flex-col gap-2">
                  <ProductCard product={product} index={index} />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        moveToCart(product.slug)
                        toast.success(t('store.addedToCart'))
                      }}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-black/10 text-[10px] uppercase tracking-widest hover:border-cyan-500/60 hover:text-cyan-500 dark:border-white/10"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('store.moveToCart')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeFromWishlist(product.slug)
                        toast.success(t('store.removedFromWishlist'))
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 hover:text-red-500 dark:border-white/10"
                      aria-label={t('store.removeFromWishlist')}
                      title={t('store.removeFromWishlist')}
                    >
                      <Heart className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {wishlist.length > products.length && (
              <p className="mt-6 text-xs text-amber-500">
                {t('store.wishlistUnavailable', { count: wishlist.length - products.length })}
              </p>
            )}
          </>
        )}
      </div>
    </StoreShell>
  )
}
