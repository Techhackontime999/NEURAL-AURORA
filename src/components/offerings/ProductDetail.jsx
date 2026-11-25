import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
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
  KeyRound,
  Download,
  Layers,
  RefreshCw,
  Heart,
  ShoppingBag,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useStore } from '../../context/StoreContext'
import { useToast } from '../../context/ToastContext'
import { sanitizeHtml } from '../../lib/utils'
import {
  getProductBySlug,
  getRelatedProducts,
  getProductsBySlugs,
  getProductFileManifest,
  formatPrice,
  formatBytes,
} from '../../lib/products'
import { getProductLicenseOptions } from '../../lib/licenses'
import { getPublicSettings } from '../../lib/supabase'
import { hasVisibleSignature, mergeDocumentSignature } from '../../lib/documentSignatureDefaults'
import { getRecentlyViewed, rememberViewedProduct } from '../../lib/recommendations'
import { startProductCheckout, requestFreeDownload } from '../../lib/checkout'
import { normalisePhone } from '../../lib/phone'
import { friendlyStoreError } from '../../lib/storeErrors'
import StoreShell from './StoreShell'
import CouponField from './CouponField'
import ProductRail from './ProductRail'
import ProductPreview from './ProductPreview'
import ShareMenu from './ShareMenu'
import ImageLightbox from '../ui/ImageLightbox'
import DocumentHead from '../ui/DocumentHead'
import { SITE_NAME, SITE_ORIGIN, toAbsoluteUrl, toPlainText } from '../../lib/documentHead'

// Mirrors api/_lib/order-pricing.js:MAX_QUANTITY. The server remains the
// authority; this only powers the native input and the visible validation.
const PRODUCT_MAX_QUANTITY = 10

export default function ProductDetail() {
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()
  const enterProps = (y, transition = { duration: 0.5, ease: [0.16, 1, 0.3, 1] }) =>
    shouldReduceMotion
      ? { initial: false, animate: {}, transition: { duration: 0 } }
      : { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition }
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    addToCart,
    toggleWishlist,
    isWishlisted,
    couponCode,
    applyCouponCode,
    affiliateCode,
    applyAffiliateCode,
  } = useStore()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  // A partner can link straight to a product. Capture the code before the
  // visitor checks out; invalid codes are rejected by the server, not here.
  useEffect(() => {
    const referral = searchParams.get('aff')
    if (referral) applyAffiliateCode(referral)
  }, [searchParams, applyAffiliateCode])

  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [galleryIndex, setGalleryIndex] = useState(null)
  const [licenseOptions, setLicenseOptions] = useState([])
  const [selectedLicense, setSelectedLicense] = useState('')
  const [fileManifest, setFileManifest] = useState([])
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const [documentSignature, setDocumentSignature] = useState(null)

  // Purchase panel state.
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionNotice, setActionNotice] = useState(null)
  // Server-priced coupon preview for this purchase panel.
  const [couponSummary, setCouponSummary] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setNotFound(false)
      setLoadError(null)
      setActionError(null)
      setActionNotice(null)
      setCouponSummary(null)
      setGalleryIndex(null)
      setQuantity('1')
      setTermsAccepted(false)
      setLicenseOptions([])
      setSelectedLicense('')
      setFileManifest([])
      setRecentlyViewed([])
      setDocumentSignature(null)
      try {
        const item = await getProductBySlug(slug)
        if (cancelled) return

        if (!item) {
          setNotFound(true)
          setProduct(null)
          return
        }

        setProduct(item)
        rememberViewedProduct(slug)

        // Supporting data is non-critical: a missing options or manifest table
        // must never stop the product page from rendering.
        Promise.allSettled([
          getRelatedProducts(item, 3),
          getProductLicenseOptions(item.id),
          getProductFileManifest(item.id),
          getPublicSettings(),
        ]).then(([relatedResult, optionsResult, filesResult, settingsResult]) => {
          if (cancelled) return
          if (relatedResult.status === 'fulfilled') setRelated(relatedResult.value)
          if (filesResult.status === 'fulfilled') setFileManifest(filesResult.value)
          if (settingsResult.status === 'fulfilled') {
            setDocumentSignature(mergeDocumentSignature(settingsResult.value?.document_signature))
          }
          if (optionsResult.status === 'fulfilled') {
            const options = optionsResult.value || []
            setLicenseOptions(options)
            const preferred = options.find((option) => option.is_default) || options[0]
            setSelectedLicense(preferred?.code || '')
          }
        })

        const recentSlugs = getRecentlyViewed().filter((value) => value !== slug).slice(0, 3)
        if (recentSlugs.length) {
          getProductsBySlugs(recentSlugs, 3)
            .then((items) => {
              if (!cancelled) setRecentlyViewed(items)
            })
            .catch(() => {
              /* recently viewed is a nice-to-have */
            })
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load product:', err?.message || err)
          setLoadError(friendlyStoreError(err, t, 'store.errorBody'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [slug, t, reloadToken])

  const isFree = product ? product.price_paise === 0 : false
  const requestedQuantity = Math.trunc(Number(quantity))
  const hasValidQuantity =
    Number.isInteger(requestedQuantity) &&
    requestedQuantity >= 1 &&
    requestedQuantity <= PRODUCT_MAX_QUANTITY
  const displayQuantity = hasValidQuantity ? requestedQuantity : 1
  // Display only: /api/create-order resolves the canonical amount server-side.
  const subtotalPaise = product
    ? product.price_paise * (isFree ? 1 : displayQuantity)
    : 0
  const discountPaise = couponSummary?.discountPaise || 0
  const displayTotalPaise = couponSummary?.totalPaise ?? subtotalPaise
  const couponItems = product && !isFree
    ? [
        {
          slug: product.slug,
          quantity: displayQuantity,
          license_code: product.document_policy === 'receipt' ? '' : selectedLicense,
        },
      ]
    : []

  const saved = product ? isWishlisted(product.slug) : false

  const handleAddToCart = () => {
    if (!product) return
    const licenseCode =
      isFree || product.document_policy === 'receipt' ? '' : selectedLicense
    if (addToCart(product, { licenseCode })) {
      toast.success(t('store.addedToCart'))
    }
  }

  const handleWishlist = () => {
    if (!product) return
    const nowSaved = toggleWishlist(product.slug)
    toast.success(nowSaved ? t('store.savedToWishlist') : t('store.removedFromWishlist'))
  }

  const handlePurchase = async () => {
    if (busy) return
    setActionError(null)
    setActionNotice(null)

    const buyerEmail = (email || '').trim() || user?.email || ''
    if (!buyerEmail) {
      setActionError(t('store.emailRequired'))
      return
    }

    // A paid order also collects a contact number: it is what lets us hand the
    // customer their download link over WhatsApp if the sign-in email cannot be
    // delivered. Checked here so the buyer can fix a typo before paying.
    const buyerPhone = isFree ? '' : normalisePhone(phone)
    if (!isFree && !buyerPhone) {
      setActionError(t('store.phoneRequired'))
      return
    }

    if (!isFree && !hasValidQuantity) {
      setActionError(t('store.quantityInvalid', { max: PRODUCT_MAX_QUANTITY }))
      return
    }

    if (!isFree && !termsAccepted) {
      setActionError(t('store.termsRequired'))
      return
    }

    // Pop-up blockers only allow a window opened inside the click/submit task.
    // Open the placeholder before the await for signed-in free downloads, then
    // navigate it once the signed URL is verified. Guests get a magic link and
    // never see a blank tab.
    let freeDownloadTab = null
    if (isFree && user) {
      freeDownloadTab = window.open('about:blank', '_blank')
      if (freeDownloadTab) freeDownloadTab.opener = null
    }

    setBusy(true)
    try {
      if (isFree) {
        const result = await requestFreeDownload({ product, email: buyerEmail, user })
        if (result?.code === 'downloadReady' && result.url) {
          if (freeDownloadTab) {
            freeDownloadTab.location.replace(result.url)
          } else if (!window.open(result.url, '_blank', 'noopener,noreferrer')) {
            setActionNotice(t('store.popupBlocked'))
          }
        } else if (result?.code === 'magicLinkSent') {
          freeDownloadTab?.close()
          setActionNotice(t('store.magicLinkSent'))
        } else {
          freeDownloadTab?.close()
          setActionNotice(t('store.downloadUnavailable'))
        }
      } else {
        const { orderRef } = await startProductCheckout({
          product,
          email: buyerEmail,
          name: (name || '').trim(),
          phone: buyerPhone,
          quantity: isFree ? 1 : requestedQuantity,
          licenseCode: product.document_policy === 'receipt' ? '' : selectedLicense,
          couponCode,
          affiliateCode,
        })
        setCouponSummary(null)
        navigate(`/purchase/success?ref=${encodeURIComponent(orderRef)}`)
      }
    } catch (err) {
      freeDownloadTab?.close()
      // Failures here are always real: the product checkout path has no
      // client-side price fallback and refuses to open if order creation
      // could not be verified by the server.
      setActionError(friendlyStoreError(err, t, 'store.checkoutFailed'))
    } finally {
      setBusy(false)
    }
  }

  // --- Loading skeleton ---------------------------------------------------
  if (loading) {
    return (
      <StoreShell>
        <DocumentHead
          title={`Product — ${SITE_NAME}`}
          robots="noindex, nofollow"
          path={`/offerings/products/${slug}`}
        />
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

  // --- Not found / retryable load failure ---------------------------------
  if (notFound || loadError || !product) {
    const isLoadError = Boolean(loadError)
    const title = isLoadError ? t('store.productLoadError') : t('store.productNotFound')
    return (
      <StoreShell>
        <DocumentHead
          title={`${title} — ${SITE_NAME}`}
          robots="noindex, nofollow"
          path={`/offerings/products/${slug}`}
        />
        <div className="glass-panel rounded-xl p-10 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <h1 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h1>
          <p className="mt-1.5 text-xs text-[var(--text-secondary)]" role={isLoadError ? 'alert' : undefined}>
            {isLoadError ? loadError : t('store.productNotFoundBody')}
          </p>
          {isLoadError ? (
            <button
              type="button"
              onClick={() => setReloadToken((token) => token + 1)}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-black/90 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-black dark:bg-white/90 dark:text-black dark:hover:bg-white"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('store.retry')}
            </button>
          ) : (
            <Link
              to="/offerings/products"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-black/90 dark:bg-white/90 text-white dark:text-black text-[11px] uppercase tracking-widest px-4 py-2.5 hover:bg-black hover:dark:bg-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('store.backToStore')}
            </Link>
          )}
        </div>
      </StoreShell>
    )
  }

  const extraImages = (Array.isArray(product.gallery_urls) ? product.gallery_urls : []).filter(
    (url) => url && url !== product.cover_image_url
  )
  const galleryImages = Array.from(
    new Set([product.cover_image_url, ...extraImages].filter(Boolean))
  )
  const selectedLicenseOption = licenseOptions.find((option) => option.code === selectedLicense)
  // Ebooks and other non-licensed products get a receipt, not a licence key.
  const isReceiptProduct = product.document_policy === 'receipt'
  const validityLabel = (option) =>
    option?.validity_days ? t('store.validityDays', { count: option.validity_days }) : t('store.perpetualLicense')

  const productUrl = `${SITE_ORIGIN}/offerings/products/${product.slug}`
  const productDescription = toPlainText(product.short_description || product.description)
  const productImage = toAbsoluteUrl(product.cover_image_url)
  const productOgImage = `${SITE_ORIGIN}/api/product-image/${encodeURIComponent(product.slug)}`
  const productPrice = (Number(product.price_paise) || 0) / 100
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: productDescription,
    url: productUrl,
    image: productImage || undefined,
    sku: product.slug,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: product.currency || 'INR',
      price: productPrice,
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <StoreShell>
      <DocumentHead
        title={`${product.title} — Digital Store | ${SITE_NAME}`}
        description={productDescription}
        path={`/offerings/products/${product.slug}`}
        image={productOgImage}
        imageAlt={`${product.title} product preview`}
        type="product"
        jsonLd={productJsonLd}
      />
      <motion.header
        {...enterProps(14, { duration: 0.45, ease: [0.16, 1, 0.3, 1] })}
        className="mb-8"
      >
        <Link
          to="/offerings/products"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] hover:text-black/80 dark:hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('store.backToStore')}
        </Link>

        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-[var(--text-secondary)]">
              {product.category_slug && (
                <span>{product.category_slug.replace(/-/g, ' ')}</span>
              )}
              {product.category_slug && product.format && <span aria-hidden="true">/</span>}
              {product.format && <span>{product.format}</span>}
            </div>
            <h1 className="mt-3 text-3xl font-display font-bold tracking-tight text-[var(--text-primary)] md:text-5xl">
              {product.title}
            </h1>
            {product.short_description && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
                {product.short_description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {product.version && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-[11px] text-black/50 dark:border-white/10 dark:text-white/50">
                  <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('store.version', { version: product.version })}
                </span>
              )}
              {galleryImages.length > 1 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-[11px] text-black/50 dark:border-white/10 dark:text-white/50">
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('store.imageCount', { count: galleryImages.length })}
                </span>
              )}
              {product.featured && (
                <span className="rounded-full bg-cyan-500/10 px-3 py-1.5 text-[11px] font-medium text-cyan-500">
                  {t('store.featured')}
                </span>
              )}
              {product.contributor_access && (
                <Link
                  to="/contributor-apply"
                  className="rounded-full bg-violet-500/10 px-3 py-1.5 text-[11px] font-medium text-violet-400 transition-colors hover:bg-violet-500/20"
                >
                  {t('store.contributorAccess')}
                </Link>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
            <span className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
              {isFree ? t('store.free') : formatPrice(product.price_paise, product.currency)}
            </span>
            <a
              href="#purchase-panel"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-black/90 px-5 py-2.5 text-[11px] uppercase tracking-widest text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 dark:bg-white/90 dark:text-black lg:hidden"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              {isFree ? t('store.freeDownload') : t('store.buyNow', { price: formatPrice(product.price_paise, product.currency) })}
            </a>
          </div>
        </div>
      </motion.header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10 items-start">
        {/* --- Left: media + long-form copy ---------------------------- */}
        <div className="min-w-0">
          <motion.div
            {...enterProps(16)}
          >
            <ProductPreview
              product={product}
              images={galleryImages}
              onOpen={(index) => index !== null && setGalleryIndex(index)}
            />
          </motion.div>

          <div className="mt-8 space-y-8">
            <Section title={t('store.description')}>
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-[var(--text-secondary)] [&_p]:my-2"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description || '') }}
              />
            </Section>

            {listOf(product.includes).length > 0 && (
              <Section title={t('store.includes')}>
                <ul className="space-y-2">
                  {listOf(product.includes).map((entry, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-[var(--text-secondary)]"
                    >
                      <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
                      <span>{entry}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {fileManifest.length > 0 && (
              <Section title={t('store.whatYouReceive')}>
                <ul className="divide-y divide-black/5 rounded-lg border border-black/5 dark:divide-white/5 dark:border-white/5">
                  {fileManifest.map((file) => (
                    <li
                      key={file.id}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-3 py-2.5"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-xs text-[var(--text-primary)]">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-cyan-500" aria-hidden="true" />
                        <span className="truncate">{file.filename}</span>
                        {file.is_preview && (
                          <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[9px] uppercase tracking-widest text-black/45 dark:bg-white/5 dark:text-white/45">
                            {t('store.previewOnly')}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                        {file.version && <span>{file.version}</span>}
                        {file.size_bytes != null && <span>{formatBytes(file.size_bytes)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] leading-relaxed text-black/40 dark:text-white/35">
                  {t('store.downloadNote')}
                </p>
              </Section>
            )}

            {listOf(product.requirements).length > 0 && (
              <Section title={t('store.requirements')}>
                <ul className="space-y-2">
                  {listOf(product.requirements).map((entry, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-[var(--text-secondary)]"
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
                <Term
                  label={t('store.documentType')}
                  value={isReceiptProduct ? t('store.receiptOnly') : t('store.licenceCertificate')}
                />
                {!isReceiptProduct && (
                  <>
                    <Term label={t('store.licenceType')} value={product.license_type} />
                    <Term label={t('store.licenceSummary')} value={product.license_summary} />
                  </>
                )}
                <Term label={t('store.supportPolicy')} value={product.support_policy} />
                <Term label={t('store.refundPolicy')} value={product.refund_policy} />
              </dl>
              {hasVisibleSignature(documentSignature) && (
                <div className="mt-4 flex items-center gap-4 rounded-lg border border-black/5 bg-black/[0.02] px-3 py-3 dark:border-white/5 dark:bg-white/[0.02]">
                  <img
                    src={documentSignature.url}
                    alt=""
                    aria-hidden="true"
                    className="h-12 w-24 shrink-0 object-contain"
                    onError={(event) => { event.currentTarget.style.display = 'none' }}
                  />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest text-black/40 dark:text-white/40">
                      {t('store.signedBy')}
                    </p>
                    {documentSignature.name && (
                      <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                        {documentSignature.name}
                      </p>
                    )}
                    {documentSignature.title && (
                      <p className="truncate text-[10px] text-[var(--text-tertiary)]">
                        {documentSignature.title}
                      </p>
                    )}
                  </div>
                </div>
              )}
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
          {...enterProps(16, { duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] })}
          id="purchase-panel"
          className="glass-panel rounded-xl p-5 lg:sticky lg:top-28"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                {t('store.purchasePanelTitle')}
              </span>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                {product.format || t('store.digitalProduct')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ShareMenu
                slug={product.slug}
                title={product.title}
                description={product.short_description}
                image={productImage}
              />
              <button
                type="button"
                onClick={handleWishlist}
                aria-label={saved ? t('store.removeFromWishlist') : t('store.saveToWishlist')}
                aria-pressed={saved}
                title={saved ? t('store.removeFromWishlist') : t('store.saveToWishlist')}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 transition-colors hover:border-rose-500/60 hover:text-rose-500 dark:border-white/10"
              >
                <Heart
                  className={`h-4 w-4 ${saved ? 'fill-rose-500 text-rose-500' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span
              className={`text-2xl font-semibold ${
                isFree ? 'text-emerald-500' : 'text-[var(--text-primary)]'
              }`}
            >
              {isFree ? t('store.free') : formatPrice(product.price_paise, product.currency)}
            </span>
            {product.compare_at_paise > product.price_paise && !isFree && (
              <span className="text-xs text-[var(--text-tertiary)] line-through">
                {formatPrice(product.compare_at_paise, product.currency)}
              </span>
            )}
          </div>

          {product.contributor_access && (
            <div className="mt-3 rounded-lg border border-violet-400/20 bg-violet-400/5 px-3 py-2.5">
              <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                {t('store.contributorNote')}
              </p>
              <Link
                to="/contributor-apply"
                className="mt-1.5 inline-flex min-h-9 items-center text-[11px] font-medium text-violet-400 hover:underline"
              >
                {t('store.contributorApply')} →
              </Link>
            </div>
          )}

          <div className="mt-3 space-y-2 text-[11px] text-[var(--text-secondary)]">
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

          <button
            type="button"
            onClick={handleAddToCart}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-black/10 text-[11px] uppercase tracking-widest text-[var(--text-primary)] transition-colors hover:border-cyan-500/60 hover:text-cyan-500 dark:border-white/10"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            {t('store.addToCart')}
          </button>

          <form
            className="mt-5 space-y-2.5"
            onSubmit={(event) => {
              event.preventDefault()
              handlePurchase()
            }}
          >
            {isReceiptProduct && (
              <p className="rounded-lg border border-black/5 bg-black/[0.02] px-3 py-2 text-[10px] leading-relaxed text-[var(--text-secondary)] dark:border-white/5 dark:bg-white/[0.02]">
                {t('store.receiptOnlyNotice')}
              </p>
            )}

            {!isFree && !isReceiptProduct && licenseOptions.length > 0 && (
              <fieldset className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-3">
                <legend className="px-1 text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                  {t('store.chooseLicense')}
                </legend>
                <div className="space-y-2">
                  {licenseOptions.map((option) => (
                    <label
                      key={option.id || option.code}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-0.5"
                    >
                      <input
                        type="radio"
                        name="license-option"
                        value={option.code}
                        checked={selectedLicense === option.code}
                        onChange={() => setSelectedLicense(option.code)}
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-cyan-500"
                      />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-[var(--text-primary)]">
                          {option.label || option.code}
                          {option.is_default && (
                            <span className="text-[9px] uppercase tracking-widest text-cyan-500">
                              {t('store.defaultLicense')}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-[var(--text-tertiary)]">
                          {validityLabel(option)}
                        </span>
                        {option.summary && (
                          <span className="mt-0.5 block text-[10px] leading-relaxed text-[var(--text-secondary)]">
                            {option.summary}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
                {selectedLicenseOption?.terms && (
                  <p className="mt-2 border-t border-black/5 pt-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">
                    {selectedLicenseOption.terms}
                  </p>
                )}
              </fieldset>
            )}

            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                {t('store.emailLabel')}
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={user?.email || t('store.emailPlaceholder')}
                autoComplete="email"
                required
                className="mt-1 w-full rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </label>

            {!isFree && (
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                  {t('store.nameLabel')}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('store.namePlaceholder')}
                  autoComplete="name"
                  className="mt-1 w-full rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
              </label>
            )}

            {!isFree && (
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                  {t('store.phoneLabel')}
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('store.phonePlaceholder')}
                  autoComplete="tel"
                  required
                  aria-describedby="store-phone-note"
                  className="mt-1 w-full rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
                <span
                  id="store-phone-note"
                  className="mt-1 block text-[10px] leading-relaxed text-[var(--text-tertiary)]"
                >
                  {t('store.phoneNote')}
                </span>
              </label>
            )}

            {!isFree && (
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                  {t('store.quantityLabel')}
                </span>
                <input
                  type="number"
                  min="1"
                  max={PRODUCT_MAX_QUANTITY}
                  step="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
                <span className="mt-1 block text-[10px] leading-relaxed text-[var(--text-tertiary)]">
                  {t('store.quantityNote', { max: PRODUCT_MAX_QUANTITY })}
                </span>
              </label>
            )}

            {!isFree && (
              <label className="flex items-start gap-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-cyan-500"
                />
                <span>{t('store.termsAccept')}</span>
              </label>
            )}

            {!isFree && (
              <CouponField
                items={couponItems}
                email={(email || '').trim() || user?.email || ''}
                code={couponCode}
                summary={couponSummary}
                onCodeChange={applyCouponCode}
                onSummaryChange={setCouponSummary}
                affiliateCode={affiliateCode}
                currency={product.currency}
                disabled={busy}
              />
            )}

            {!isFree && (
              <div className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-3 text-[11px] text-[var(--text-secondary)]">
                  <span className="truncate">{t('store.summaryTitle')}</span>
                  <span className="shrink-0">
                    {formatPrice(product.price_paise, product.currency)} × {displayQuantity}
                  </span>
                </div>
                {discountPaise > 0 && (
                  <div className="mt-1.5 flex items-baseline justify-between gap-3 text-[11px] text-emerald-500">
                    <span>{t('store.couponDiscount', { code: couponCode })}</span>
                    <span>−{formatPrice(discountPaise, product.currency)}</span>
                  </div>
                )}
                {couponSummary?.affiliate?.display_name && (
                  <p className="mt-1.5 text-[10px] text-[var(--text-tertiary)]">
                    {t('store.referredBy', { name: couponSummary.affiliate.display_name })}
                  </p>
                )}
                <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-black/5 dark:border-white/5 pt-2">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                    {t('store.total')}
                  </span>
                  <span className="text-sm font-semibold text-black/80 dark:text-white/85">
                    {formatPrice(displayTotalPaise, product.currency)}
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-black/90 dark:bg-white/90 text-white dark:text-black text-[11px] uppercase tracking-widest py-3 hover:bg-black hover:dark:bg-white transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy
                ? t('store.working')
                : isFree
                  ? t('store.freeDownload')
                  : t('store.buyNow', {
                      price: formatPrice(displayTotalPaise, product.currency),
                    })}
            </button>

            <AnimatePresence>
              {actionError && (
                <motion.p
                  initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                  role="alert"
                  className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-500"
                >
                  {actionError}
                </motion.p>
              )}
              {actionNotice && (
                <motion.p
                  initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
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
          </form>
        </motion.aside>
      </div>

      <ProductRail
        id="related-products"
        title={t('store.relatedProducts')}
        products={related}
      />

      <ProductRail
        id="recently-viewed-products"
        title={t('store.recentlyViewed')}
        products={recentlyViewed}
      />

      <AnimatePresence>
        {galleryIndex !== null && (
          <ImageLightbox
            images={galleryImages}
            startIndex={galleryIndex}
            title={product.title}
            onClose={() => setGalleryIndex(null)}
          />
        )}
      </AnimatePresence>
    </StoreShell>
  )
}

// --- small local helpers --------------------------------------------------

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-3">
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
      <dt className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs text-[var(--text-secondary)] leading-relaxed">{value}</dd>
    </div>
  )
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  return (
    <div className="rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-xs text-[var(--text-primary)]"
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
            initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-3 pb-3 text-[11px] leading-relaxed text-[var(--text-secondary)]">
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
