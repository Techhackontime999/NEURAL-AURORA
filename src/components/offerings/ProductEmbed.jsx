import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, FileText } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { formatPrice, getProductBySlug } from '../../lib/products'
import { AFFILIATE_QUERY_KEY, normaliseAffiliateCode, productShareUrl } from '../../lib/productShare'

function compact(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * A deliberately small, chrome-free product card for third-party websites.
 * A valid partner code in the iframe URL is captured into the same store cookie
 * the main site uses, and is also carried on the outbound product link. Without
 * a code the embed is purely editorial and earns nobody a commission.
 */
export default function ProductEmbed() {
  const { t } = useTranslation()
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const { applyAffiliateCode } = useStore()
  const referral = normaliseAffiliateCode(searchParams.get(AFFILIATE_QUERY_KEY))

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    if (referral) applyAffiliateCode(referral)
  }, [referral, applyAffiliateCode])

  useEffect(() => {
    let active = true
    setLoading(true)
    setFailed(false)
    getProductBySlug(slug)
      .then((row) => {
        if (active) setProduct(row || null)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [slug])

  const gallery = Array.isArray(product?.gallery_urls) ? product.gallery_urls.filter(Boolean) : []
  const cover = product?.cover_image_url || gallery[0] || ''
  const productUrl = productShareUrl(slug)
  const href = referral
    ? `${productUrl}?${AFFILIATE_QUERY_KEY}=${encodeURIComponent(referral)}`
    : productUrl
  const description = compact(product?.short_description || product?.description)

  return (
    <main
      className="min-h-[100dvh] bg-[#f3f7fb] p-3 text-[#0b1b2b]"
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif' }}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.45)]">
        <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-gradient-to-br from-cyan-50 via-white to-violet-50">
          {cover && !imageFailed ? (
            <img
              src={cover}
              alt=""
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <FileText className="h-9 w-9 text-slate-300" aria-hidden="true" />
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-700 shadow-sm backdrop-blur">
            NEURAL AURORA
          </span>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-600">
            Digital store
          </p>
          <h1 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug">
            {product?.title || (loading ? t('store.embedLoading') : t('store.embedUnavailable'))}
          </h1>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
            {description || t('store.sharePreviewHint')}
          </p>

          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <span className="text-base font-bold text-slate-900">
              {product ? formatPrice(product.price_paise, product.currency) : '—'}
            </span>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-slate-900 px-4 text-[11px] font-semibold uppercase tracking-widest text-white transition-colors hover:bg-cyan-700"
            >
              {t('store.embedViewProduct')}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
            {failed ? t('store.embedLoadFailed') : referral ? t('store.embedReferred') : t('store.embedPowered')}
          </p>
        </div>
      </div>
    </main>
  )
}
