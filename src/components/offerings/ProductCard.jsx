import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText, Download, Heart, ShoppingBag } from 'lucide-react'
import { formatPrice } from '../../lib/products'
import { useStore } from '../../context/StoreContext'
import { useToast } from '../../context/ToastContext'

/**
 * Catalogue card. Clicking anywhere on the card opens the product page;
 * the price/CTA never performs a purchase directly — that decision belongs
 * on the detail page where the full terms are visible.
 */
export default function ProductCard({ product, index = 0 }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addToCart, toggleWishlist, isWishlisted } = useStore()
  const { toast } = useToast()
  const [imageFailed, setImageFailed] = useState(false)
  const saved = isWishlisted(product.slug)

  const handleWishlist = (event) => {
    event.stopPropagation()
    const nowSaved = toggleWishlist(product.slug)
    toast.success(nowSaved ? t('store.savedToWishlist') : t('store.removedFromWishlist'))
  }

  const handleAddToCart = (event) => {
    event.stopPropagation()
    if (addToCart(product)) toast.success(t('store.addedToCart'))
  }

  const isFree = product.price_paise === 0
  const galleryUrls = Array.isArray(product.gallery_urls)
    ? product.gallery_urls.filter(Boolean)
    : []
  const cover = product.cover_image_url || galleryUrls[0] || null
  const hasCover = Boolean(cover)
  const pictureCount = new Set([product.cover_image_url, ...galleryUrls].filter(Boolean)).size

  const href = `/offerings/products/${product.slug}`
  // The decorative image retains in-app navigation; the real title and CTA are
  // anchors so middle-click, "open in new tab" and screen readers all work.
  const open = () => navigate(href)

  // Grid cell: intentionally inset from the page edges, not a page block.
  return (
    <article data-edge-free className="glass-panel group flex flex-col overflow-hidden rounded-xl focus-within:ring-1 focus-within:ring-cyan-500/50">
      {/* Decorative: the image duplicates the title button and CTA below, so it
          is hidden from assistive tech rather than announced twice. */}
      <div className="relative">
        <div
          onClick={open}
          aria-hidden="true"
          className="aspect-[16/10] bg-black/5 dark:bg-white/5 overflow-hidden relative cursor-pointer"
        >
          {hasCover && !imageFailed ? (
            <img
              src={cover}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText className="w-10 h-10 text-[var(--text-tertiary)]" aria-hidden="true" />
            </div>
          )}

          <div className="absolute top-3 left-3 flex items-center gap-2">
            {isFree && (
              <span className="rounded-full bg-emerald-500/90 text-white text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1">
                {t('store.free')}
              </span>
            )}
            {product.featured && (
              <span className="rounded-full bg-cyan-500/90 text-white text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1">
                {t('store.featured')}
              </span>
            )}
            {product.contributor_access && (
              <span className="rounded-full bg-violet-500/90 text-white text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1">
                {t('store.contributorAccess')}
              </span>
            )}
          </div>

          {pictureCount > 1 && (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
              {t('store.imageCount', { count: pictureCount })}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={saved ? t('store.removeFromWishlist') : t('store.saveToWishlist')}
          aria-pressed={saved}
          title={saved ? t('store.removeFromWishlist') : t('store.saveToWishlist')}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-black/60 shadow-sm backdrop-blur transition-colors hover:text-rose-500 dark:bg-black/70 dark:text-white/70"
        >
          <Heart
            className={`h-4 w-4 ${saved ? 'fill-rose-500 text-rose-500' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3">
          <Link
            to={href}
            className="text-left focus:outline-none focus-visible:underline"
          >
            <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-cyan-500 transition-colors">
              {product.title}
            </h3>
          </Link>

          <div className="shrink-0 text-right">
            {product.compare_at_paise > product.price_paise && !isFree && (
              <span className="block text-[10px] text-[var(--text-tertiary)] line-through">
                {formatPrice(product.compare_at_paise, product.currency)}
              </span>
            )}
            <span
              className={`text-sm font-semibold ${
                isFree
                  ? 'text-emerald-500'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {isFree
                ? t('store.free')
                : formatPrice(product.price_paise, product.currency)}
            </span>
          </div>
        </div>

        {product.short_description && (
          <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed line-clamp-2">
            {product.short_description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {product.format && (
            <span className="rounded-full border border-black/10 dark:border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
              {product.format}
            </span>
          )}
          {product.version && (
            <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
              v{product.version}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-black/5 pt-4 dark:border-white/5">
          <Link
            to={href}
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-black/90 text-center text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-black active:scale-[0.98] dark:bg-white/90 dark:text-black dark:hover:bg-white"
          >
            {isFree ? t('store.viewAndDownload') : t('store.viewDetails')}
          </Link>

          <button
            type="button"
            onClick={handleAddToCart}
            aria-label={t('store.addToCart')}
            title={t('store.addToCart')}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black/10 transition-colors hover:border-cyan-500/60 hover:text-cyan-500 dark:border-white/10"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          </button>

          {isFree && (
            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]"
              aria-hidden="true"
            >
              <Download className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
