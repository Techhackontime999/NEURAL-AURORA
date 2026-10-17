import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText, Download } from 'lucide-react'
import { formatPrice } from '../../lib/products'

/**
 * Catalogue card. Clicking anywhere on the card opens the product page;
 * the price/CTA never performs a purchase directly — that decision belongs
 * on the detail page where the full terms are visible.
 */
export default function ProductCard({ product, index = 0 }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const isFree = product.price_paise === 0
  const hasCover = Boolean(product.cover_image_url)

  const open = () => navigate(`/offerings/products/${product.slug}`)

  return (
    <motion.article
      custom={index}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        delay: Math.min(index, 6) * 0.07,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="glass-panel rounded-xl overflow-hidden group flex flex-col focus-within:ring-1 focus-within:ring-cyan-500/50"
    >
      <button
        type="button"
        onClick={open}
        aria-label={t('store.openProduct', { title: product.title })}
        className="text-left focus:outline-none"
      >
        <div className="aspect-[16/10] bg-black/5 dark:bg-white/5 overflow-hidden relative">
          {hasCover ? (
            <img
              src={product.cover_image_url}
              alt={product.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText
                className="w-10 h-10 text-black/20 dark:text-white/20"
                aria-hidden="true"
              />
            </div>
          )}

          <div className="absolute top-3 left-3 flex items-center gap-2">
            {isFree ? (
              <span className="rounded-full bg-emerald-500/90 text-white text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1">
                {t('store.free')}
              </span>
            ) : product.featured ? (
              <span className="rounded-full bg-cyan-500/90 text-white text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1">
                {t('store.featured')}
              </span>
            ) : null}
          </div>
        </div>
      </button>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={open}
            className="text-left focus:outline-none focus-visible:underline"
          >
            <h3 className="text-sm font-semibold text-black/80 dark:text-white/80 group-hover:text-cyan-500 transition-colors">
              {product.title}
            </h3>
          </button>

          <div className="shrink-0 text-right">
            {product.compare_at_paise > product.price_paise && !isFree && (
              <span className="block text-[10px] text-black/35 dark:text-white/30 line-through">
                {formatPrice(product.compare_at_paise, product.currency)}
              </span>
            )}
            <span
              className={`text-sm font-semibold ${
                isFree
                  ? 'text-emerald-500'
                  : 'text-black/80 dark:text-white/80'
              }`}
            >
              {isFree
                ? t('store.free')
                : formatPrice(product.price_paise, product.currency)}
            </span>
          </div>
        </div>

        {product.short_description && (
          <p className="text-xs text-black/50 dark:text-white/50 mt-2 leading-relaxed line-clamp-2">
            {product.short_description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {product.format && (
            <span className="rounded-full border border-black/10 dark:border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
              {product.format}
            </span>
          )}
          {product.version && (
            <span className="text-[10px] uppercase tracking-widest text-black/35 dark:text-white/30">
              v{product.version}
            </span>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-3 mt-auto">
          <button
            type="button"
            onClick={open}
            className="flex-1 rounded-lg bg-black/90 dark:bg-white/90 text-white dark:text-black text-[11px] uppercase tracking-widest py-2.5 hover:bg-black hover:dark:bg-white transition-colors active:scale-[0.98]"
          >
            {isFree ? t('store.viewAndDownload') : t('store.viewDetails')}
          </button>

          {isFree && (
            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40"
              aria-hidden="true"
            >
              <Download className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </motion.article>
  )
}
