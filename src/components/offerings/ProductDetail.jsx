import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Tag,
  CalendarClock,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { sanitizeHtml } from '../../lib/utils'
import {
  getProductBySlug,
  getRelatedProducts,
  formatPrice,
} from '../../lib/products'
import { startProductCheckout, requestFreeDownload } from '../../lib/checkout'
import StoreShell from './StoreShell'
import ProductCard from './ProductCard'

export default function ProductDetail() {
  const { t } = useTranslation()
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeImage, setActiveImage] = useState(null)

  // Purchase panel state.
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionNotice, setActionNotice] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setNotFound(false)
      setActionError(null)
      setActionNotice(null)
      try {
        const item = await getProductBySlug(slug)
        if (cancelled) return

        if (!item) {
          setNotFound(true)
          setProduct(null)
          return
        }

        setProduct(item)
        setActiveImage(item.cover_image_url || null)

        const gallery = Array.isArray(item.gallery_urls) ? item.gallery_urls : []
        setActiveImage(item.cover_image_url || gallery[0] || null)

        getRelatedProducts(item, 3)
          .then((items) => {
            if (!cancelled) setRelated(items)
          })
          .catch(() => {
            /* related products are non-critical */
          })
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load product:', err?.message || err)
          setNotFound(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  const isFree = product ? product.price_paise === 0 : false

  const handlePurchase = async () => {
    setActionError(null)
    setActionNotice(null)

    const buyerEmail = (email || '').trim() || user?.email || ''
    if (!buyerEmail) {
      setActionError(t('store.emailRequired'))
      return
    }

    setBusy(true)
    try {
      if (isFree) {
        const result = await requestFreeDownload({ product, email: buyerEmail, user })
        if (result?.code === 'downloadReady' && result.url) {
          window.open(result.url, '_blank', 'noopener,noreferrer')
        } else if (result?.code === 'magicLinkSent') {
          setActionNotice(t('store.magicLinkSent'))
        }
      } else {
        const { orderRef } = await startProductCheckout({
          product,
          email: buyerEmail,
          name: (name || '').trim(),
        })
        navigate(`/purchase/success?ref=${encodeURIComponent(orderRef)}`)
      }
    } catch (err) {
      // Failures here are always real: the product checkout path has no
      // client-side price fallback and refuses to open if order creation
      // could not be verified by the server.
      setActionError(err?.message || t('store.checkoutFailed'))
    } finally {
      setBusy(false)
    }
  }

  // --- Loading skeleton ---------------------------------------------------
  if (loading) {
    return (
      <StoreShell>
        <div className="grid lg:grid-cols-[1fr_360px] gap-8 animate-pulse" aria-busy="true">
          <div className="space-y-4">
            <div className="aspect-[16/10] rounded-xl bg-black/5 dark:bg-white/5" />
            <div className="h-6 w-2/3 rounded bg-black/5 dark:bg-white/5" />
            <div className="h-3 w-full rounded bg-black/5 dark:bg-white/5" />
            <div className="h-3 w-5/6 rounded bg-black/5 dark:bg-white/5" />
          </div>
          <div className="h-72 rounded-xl bg-black/5 dark:bg-white/5" />
        </div>
      </StoreShell>
    )
  }

  // --- Not found ----------------------------------------------------------
  if (notFound || !product) {
    return (
      <StoreShell>
        <div className="glass-panel rounded-xl p-10 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <h1 className="text-sm font-semibold text-black/80 dark:text-white/80">
            {t('store.productNotFound')}
          </h1>
          <p className="mt-1.5 text-xs text-black/50 dark:text-white/50">
            {t('store.productNotFoundBody')}
          </p>
          <Link
            to="/offerings/products"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-black/90 dark:bg-white/90 text-white dark:text-black text-[11px] uppercase tracking-widest px-4 py-2.5 hover:bg-black hover:dark:bg-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('store.backToStore')}
          </Link>
        </div>
      </StoreShell>
    )
  }

  const gallery = (Array.isArray(product.gallery_urls) ? product.gallery_urls : []).filter(
    (url) => url && url !== product.cover_image_url
  )

  return (
    <StoreShell>
      <Link
        to="/offerings/products"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-black/40 dark:text-white/40 hover:text-black/80 dark:hover:text-white/80 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t('store.backToStore')}
      </Link>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        {/* --- Left: media + long-form copy ---------------------------- */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel rounded-xl overflow-hidden"
          >
            <div className="aspect-[16/10] bg-black/5 dark:bg-white/5">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText
                    className="w-12 h-12 text-black/20 dark:text-white/20"
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>

            {gallery.length > 0 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {gallery.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    onClick={() => setActiveImage(url)}
                    aria-label={t('store.previewImage', { index: i + 1 })}
                    className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border transition-colors ${
                      activeImage === url
                        ? 'border-cyan-500/60'
                        : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                    }`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <div className="mt-8 space-y-8">
            <Section title={t('store.description')}>
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-black/60 dark:text-white/60 [&_p]:my-2"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description || '') }}
              />
            </Section>

            {listOf(product.includes).length > 0 && (
              <Section title={t('store.includes')}>
                <ul className="space-y-2">
                  {listOf(product.includes).map((entry, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-black/60 dark:text-white/60"
                    >
                      <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
                      <span>{entry}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {listOf(product.requirements).length > 0 && (
              <Section title={t('store.requirements')}>
                <ul className="space-y-2">
                  {listOf(product.requirements).map((entry, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-black/60 dark:text-white/60"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-black/30 dark:bg-white/30" aria-hidden="true" />
                      <span>{entry}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title={t('store.licenceAndTerms')}>
              <dl className="space-y-3">
                <Term label={t('store.licenceType')} value={product.license_type} />
                <Term label={t('store.licenceSummary')} value={product.license_summary} />
                <Term label={t('store.supportPolicy')} value={product.support_policy} />
                <Term label={t('store.refundPolicy')} value={product.refund_policy} />
              </dl>
            </Section>

            {faqsOf(product.faqs).length > 0 && (
              <Section title={t('store.faqs')}>
                <div className="space-y-2">
                  {faqsOf(product.faqs).map((faq, i) => (
                    <FaqItem key={i} question={faq.question} answer={faq.answer} />
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* --- Right: sticky purchase panel ---------------------------- */}
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel rounded-xl p-5 lg:sticky lg:top-28"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {product.category_slug && (
                <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
                  {product.category_slug.replace(/-/g, ' ')}
                </span>
              )}
              <h1 className="mt-1 text-lg font-display font-bold tracking-tight text-black/85 dark:text-white/90">
                {product.title}
              </h1>
              {product.format && (
                <p className="mt-1 text-[11px] text-black/45 dark:text-white/45">{product.format}</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span
              className={`text-2xl font-semibold ${
                isFree ? 'text-emerald-500' : 'text-black/85 dark:text-white/90'
              }`}
            >
              {isFree ? t('store.free') : formatPrice(product.price_paise, product.currency)}
            </span>
            {product.compare_at_paise > product.price_paise && !isFree && (
              <span className="text-xs text-black/35 dark:text-white/30 line-through">
                {formatPrice(product.compare_at_paise, product.currency)}
              </span>
            )}
          </div>

          {product.short_description && (
            <p className="mt-3 text-xs text-black/55 dark:text-white/55 leading-relaxed">
              {product.short_description}
            </p>
          )}

          <div className="mt-4 space-y-2 text-[11px] text-black/45 dark:text-white/45">
            {product.version && (
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" aria-hidden="true" />
                {t('store.version', { version: product.version })}
              </span>
            )}
            {product.updated_at && (
              <span className="flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                {t('store.lastUpdated', {
                  date: new Date(product.updated_at).toLocaleDateString(),
                })}
              </span>
            )}
          </div>

          <div className="mt-5 space-y-2.5">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
                {t('store.emailLabel')}
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={user?.email || t('store.emailPlaceholder')}
                autoComplete="email"
                className="mt-1 w-full rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-2.5 text-sm text-black/80 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </label>

            {!isFree && (
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
                  {t('store.nameLabel')}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('store.namePlaceholder')}
                  autoComplete="name"
                  className="mt-1 w-full rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-2.5 text-sm text-black/80 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
              </label>
            )}

            <button
              type="button"
              onClick={handlePurchase}
              disabled={busy}
              className="w-full rounded-lg bg-black/90 dark:bg-white/90 text-white dark:text-black text-[11px] uppercase tracking-widest py-3 hover:bg-black hover:dark:bg-white transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy
                ? t('store.working')
                : isFree
                  ? t('store.freeDownload')
                  : t('store.buyNow', {
                      price: formatPrice(product.price_paise, product.currency),
                    })}
            </button>

            <AnimatePresence>
              {actionError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  role="alert"
                  className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-500"
                >
                  {actionError}
                </motion.p>
              )}
              {actionNotice && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  role="status"
                  className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-500"
                >
                  {actionNotice}
                </motion.p>
              )}
            </AnimatePresence>

            <p className="flex items-start gap-2 pt-1 text-[10px] leading-relaxed text-black/40 dark:text-white/35">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {isFree ? t('store.freeNote') : t('store.secureNote')}
            </p>
          </div>
        </motion.aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-black/50 dark:text-white/50 mb-4">
            {t('store.relatedProducts')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((item, i) => (
              <ProductCard key={item.id} product={item} index={i} />
            ))}
          </div>
        </section>
      )}
    </StoreShell>
  )
}

// --- small local helpers --------------------------------------------------

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-black/50 dark:text-white/50 mb-3">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Term({ label, value }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs text-black/60 dark:text-white/60 leading-relaxed">{value}</dd>
    </div>
  )
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-xs text-black/70 dark:text-white/70"
      >
        <span>{question}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-3 pb-3 text-[11px] leading-relaxed text-black/55 dark:text-white/55">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** `includes` / `requirements` are JSONB; accept array-of-strings or objects. */
function listOf(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry
      if (entry && typeof entry === 'object') return entry.text || entry.label || entry.title || ''
      return ''
    })
    .filter(Boolean)
}

/** FAQs are JSONB rows shaped { question, answer }. */
function faqsOf(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((f) => f && typeof f === 'object' && (f.question || f.q) && (f.answer || f.a))
    .map((f) => ({ question: f.question || f.q, answer: f.answer || f.a }))
}
