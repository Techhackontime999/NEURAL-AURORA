// Source guards for the low-risk storefront UX contracts.
//
// These are deliberately source assertions, not renders: they lock in the
// honest badge/count/filter behaviour so a later edit cannot quietly regress
// it. Run: npm run test:store-ux
import fs from 'node:fs'

const read = (file) => fs.readFileSync(file, 'utf8')
const card = read('src/components/offerings/ProductCard.jsx')
const products = read('src/components/offerings/Products.jsx')
const detail = read('src/components/offerings/ProductDetail.jsx')
const library = read('src/components/offerings/Library.jsx')
const productsLib = read('src/lib/products.js')
const pricing = read('api/_lib/order-pricing.js')
const purchaseSuccess = read('src/components/offerings/PurchaseSuccess.jsx')
const shell = read('src/components/offerings/StoreShell.jsx')
const cardFallback = read('src/components/ui/ImageLightbox.jsx')
const razorpay = read('src/lib/razorpay.js')
const rail = read('src/components/offerings/ProductRail.jsx')
const en = JSON.parse(read('src/locales/en.json'))

let passed = 0
let failed = 0

function check(name, cond) {
  if (cond) {
    passed++
    console.log(`ok    ${name}`)
  } else {
    failed++
    console.log(`FAIL  ${name}`)
  }
}

// --- ST-U03: badges must describe a product, not exclude each other ---------
check(
  'card: free badge is independent of featured',
  card.includes('{isFree && (') && !card.includes('{isFree ? (')
)
check(
  'card: featured badge is independent of free',
  card.includes('{product.featured && (') &&
    !card.includes(') : product.featured ? (')
)

// --- ST-U15: image counts are translated -----------------------------------
check(
  'card: image count uses i18n',
  card.includes("t('store.imageCount', { count: pictureCount })")
)
check(
  'detail: image count uses i18n',
  detail.includes("t('store.imageCount', { count: galleryImages.length })")
)
check(
  'no literal view-count text remains in storefront components',
  !/\bviews\b/.test(card) && !/\bviews\b/.test(detail)
)

// --- New English keys (other locales fall back to en) ----------------------
check(
  'new store i18n keys exist',
  [
    'imageCount',
    'featuredOnly',
    'resultCountCapped',
    'loadedCount',
    'loadMore',
    'loadingMore',
    'loadMoreFailed',
    'librarySearchPlaceholder',
    'libraryResultCount',
    'libraryNoResults',
  ].every((key) => typeof en.store?.[key] === 'string')
)

// --- Featured filter reaches the one data layer -----------------------------
check('catalogue: featured is a default filter', /featured:\s*false/.test(products))
check(
  'catalogue: featured filter reaches getPublishedProducts',
  products.includes('featuredOnly: filters.featured')
)
check(
  'catalogue: featured counts as an active filter',
  products.includes('filters.featured === true')
)

// --- ST-U01: the 200-item cap must be visible -------------------------------
check(
  'catalogue: cap is disclosed to the customer',
  products.includes("t('store.resultCountCapped'") &&
    products.includes('products.length === LIST_CAP')
)
check(
  'catalogue: cap and page size come from the data layer',
  productsLib.includes('export const PRODUCT_PAGE_SIZE = 24') &&
    productsLib.includes('export const PRODUCT_MAX_RESULTS = 200') &&
    products.includes('const LIST_CAP = PRODUCT_MAX_RESULTS') &&
    products.includes('const PAGE_SIZE = PRODUCT_PAGE_SIZE')
)
check(
  'catalogue: load-more pages are requested with an offset',
  products.includes('offset,') &&
    products.includes('limit: requestLimit') &&
    productsLib.includes('query.range(offset, offset + limit - 1)')
)
check(
  'catalogue: load-more is user-controlled and gated',
  products.includes('onClick={handleLoadMore}') &&
    products.includes('if (loading || refreshing || loadingMore || !hasMore) return') &&
    products.includes("t('store.loadMore')")
)
check(
  'catalogue: search uses the shared indexed-tag expression',
  productsLib.includes(
    "import { buildProductSearchExpression, normaliseFormatFilter } from './productQuery'"
  ) && productsLib.includes('query.or(searchExpression)')
)

// --- ST-U06: paid checkout is a validated native form ----------------------
check(
  'checkout: purchase panel is a native form',
  detail.includes('<form') &&
    detail.includes('onSubmit={(event) =>') &&
    detail.includes('type="submit"') &&
    detail.includes('required')
)
check(
  'checkout: quantity mirrors the server cap',
  detail.includes('const PRODUCT_MAX_QUANTITY = 10') &&
    pricing.includes('const MAX_QUANTITY = 10') &&
    detail.includes('max={PRODUCT_MAX_QUANTITY}') &&
    detail.includes('t(\'store.quantityInvalid\', { max: PRODUCT_MAX_QUANTITY })')
)
check(
  'checkout: terms checkbox gates paid orders',
  detail.includes('type="checkbox"') &&
    detail.includes('checked={termsAccepted}') &&
    detail.includes('t(\'store.termsRequired\')')
)
check(
  'checkout: quantity reaches the checkout client',
  detail.includes('quantity: isFree ? 1 : requestedQuantity') &&
    detail.includes("licenseCode: product.document_policy === 'receipt' ? '' : selectedLicense") &&
    read('src/lib/checkout.js').includes('quantity = 1') &&
    read('src/lib/checkout.js').includes(
      "items: [{ slug: product.slug, quantity, license_code: licenseCode }]"
    )
)
check(
  'checkout: itemised total is display-only',
  detail.includes('const displayTotalPaise') &&
    detail.includes('t(\'store.summaryTitle\')') &&
    detail.includes('t(\'store.total\')') &&
    detail.includes('formatPrice(displayTotalPaise, product.currency)') &&
    /server-side/.test(detail)
)
check(
  'checkout: free products skip quantity and terms',
  detail.includes('{!isFree && (') &&
    detail.includes('quantity: isFree ? 1 : requestedQuantity') &&
    en.store.freeDownload.length > 0
)

// --- P1: filters are shareable and restorable ------------------------------
check(
  'catalogue: filters are initialised from the URL',
  products.includes('useSearchParams') &&
    products.includes('const initialFilters = filtersFromParams(searchParams)') &&
    products.includes('useState(initialFilters)')
)
check(
  'catalogue: filter changes are written back to the URL',
  products.includes('paramsFromFilters(filters)') &&
    products.includes('{ replace: true }') &&
    products.includes('setFilters((current) => (sameFilters(current, fromUrl) ? current : fromUrl))')
)
check(
  'catalogue: unknown URL values are discarded',
  products.includes("Object.hasOwn(PRODUCT_SORTS, sort) ? sort : EMPTY_FILTERS.sort") &&
    products.includes('.slice(0, 80)')
)
check(
  'catalogue: featured shelf uses published data and hides under filters',
  products.includes("getPublishedProducts({ featuredOnly: true, sort: 'featured', limit: 4 })") &&
    products.includes('!hasActiveFilters && featuredProducts.length > 0')
)
check(
  'catalogue: section grows with listed products',
  products.includes('className="flex min-h-[100svh] flex-col pt-10"') &&
    !products.includes('className="flex h-[100svh] flex-col pt-10"') &&
    products.includes('data-testid="store-catalogue-footer"')
)
check(
  'catalogue: data source is disclosed without credentials',
  products.includes('data-testid="store-data-status"') &&
    products.includes('isSupabaseConfigured') &&
    !/DATABASE_URL|SUPABASE_SERVICE|SERVICE_ROLE/i.test(products)
)
check(
  'catalogue: format tiles are wired quick filters',
  products.includes("const QUICK_FORMATS = ['zip', 'pdf', 'code']") &&
    products.includes('QUICK_FORMATS.map((value)') &&
    products.includes("onClick={() => set({ format: active ? '' : value })}") &&
    products.includes('aria-pressed={active}')
)
check(
  'catalogue: live-data badge refreshes the catalogue',
  products.includes('data-testid="store-data-status"') &&
    products.includes('onClick={() => setReloadToken((n) => n + 1)}') &&
    products.includes('RefreshCw')
)

// --- ST-U08: library search/sort is client-side over entitled entries -------
check(
  'library: visible entries are derived in the browser',
  library.includes('const visibleEntries = useMemo(') &&
    library.includes('visibleEntries.map(') &&
    !library.includes('entries.map(')
)
check(
  'library: search input is bound',
  library.includes('value={libraryQuery}') && library.includes('setLibraryQuery')
)
check(
  'library: sort control is bound',
  library.includes('setLibrarySort') && library.includes('<option value="title">')
)
check(
  'library: no-results state can be cleared',
  library.includes("t('store.libraryNoResults')") &&
    library.includes("onClick={() => setLibraryQuery('')}")
)

// --- Licensing and preview UX ----------------------------------------------
check(
  'library: licences are loaded without blocking downloads',
  library.includes('Promise.allSettled([') &&
    library.includes('getMyLicenses()') &&
    library.includes('downloadLicenseDocument(license.id)')
)
check(
  'library: keys stay masked until the owner reveals them',
  library.includes('revealedLicenses.includes(license.id)') &&
    library.includes('maskedKey(license.license_key)') &&
    library.includes('navigator.clipboard.writeText(license.license_key)')
)
check(
  'previews: keyboard navigation is scoped to the preview region',
  read('src/components/offerings/ProductPreview.jsx').includes(
    'regionRef.current?.contains(document.activeElement)'
  ) &&
    read('src/components/offerings/ProductPreview.jsx').includes("['input', 'textarea', 'select'].includes(tag)")
)
check(
  'detail: purchase panel, licence selector and file manifest are present',
  detail.includes('id="purchase-panel"') &&
    detail.includes('type="radio"') &&
    detail.includes("t('store.whatYouReceive')") &&
    detail.includes("t('store.recentlyViewed')")
)

// --- ST-U07/U13/U14: reliability guards ------------------------------------
check(
  'free download: placeholder tab opens before the async request',
  detail.includes("window.open('about:blank', '_blank')") &&
    detail.indexOf("window.open('about:blank', '_blank')") < detail.indexOf('await requestFreeDownload(') &&
    detail.includes('freeDownloadTab.opener = null')
)
check(
  'free download: placeholder tab is navigated, closed or reported',
  detail.includes('freeDownloadTab.location.replace(result.url)') &&
    detail.includes('freeDownloadTab?.close()') &&
    detail.includes("t('store.popupBlocked')") &&
    en.store.popupBlocked.length > 0
)
check(
  'purchase success: poll count is a ref outside a state updater',
  purchaseSuccess.includes('const polls = useRef(0)') &&
    purchaseSuccess.includes('polls.current = 0') &&
    purchaseSuccess.includes('polls.current += 1') &&
    !purchaseSuccess.includes('setPolls(')
)
check(
  'purchase success: next poll is scheduled after the request resolves',
  purchaseSuccess.includes('timer = setTimeout(poll, POLL_INTERVAL_MS)') &&
    purchaseSuccess.indexOf('polls.current += 1') <
      purchaseSuccess.indexOf('timer = setTimeout(poll, POLL_INTERVAL_MS)')
)
check(
  'razorpay retry: stale script is removed and failure resets shared load',
  razorpay.includes('const stale = document.getElementById(RAZORPAY_SCRIPT_ID)') &&
    razorpay.includes('removeCheckoutScript(stale)') &&
    razorpay.includes('if (!loaded) loadPromise = null') &&
    razorpay.includes('if (loadPromise) return loadPromise')
)

// --- Best-version pass: correctness, a11y and honest counts -----------------
check(
  'format filter: shared URLs and mixed-case DB values use one normalised value',
  productsLib.includes("query.ilike('format', formatFilter)") &&
    productsLib.includes('normaliseFormatFilter(format)') &&
    products.includes('normaliseFormatFilter(params.get(URL_KEYS.format))') &&
    products.includes('const formatOptions = useMemo(')
)
check(
  'catalogue: loaded count is honest while more pages exist',
  products.includes("t(hasMore ? 'store.loadedCount' : 'store.resultCount', { count: products.length })") &&
    products.includes('products.length === LIST_CAP && !hasMore && !loading')
)
check(
  'detail: load failures get their own state and retry',
  detail.includes('const [loadError, setLoadError] = useState(null)') &&
    detail.includes('setLoadError(friendlyStoreError(err, t, \'store.errorBody\'))') &&
    detail.includes('setReloadToken((token) => token + 1)') &&
    detail.includes("t('store.productLoadError')")
)
check(
  'checkout: customer-facing errors and silent download failures are explained',
  detail.includes("setActionNotice(t('store.downloadUnavailable'))") &&
    detail.includes("friendlyStoreError(err, t, 'store.checkoutFailed')") &&
    purchaseSuccess.includes("friendlyStoreError(err, t, 'store.purchaseError')")
)
check(
  'purchase success: status changes are announced and errors can be retried',
  purchaseSuccess.includes('aria-live="polite"') &&
    purchaseSuccess.includes('setRetryToken((token) => token + 1)') &&
    purchaseSuccess.includes("t('store.statusRetry')")
)
check(
  'hero: one still image, no timed carousel or focusable hidden dots',
  shell.includes('function HeroBackdrop(') &&
    !shell.includes('setInterval') &&
    !shell.includes('aria-label={`Show slide') &&
    !shell.includes('AnimatePresence')
)
check(
  'card: a dead cover falls back to the local icon',
  card.includes('const [imageFailed, setImageFailed] = useState(false)') &&
    card.includes('hasCover && !imageFailed') &&
    card.includes('onError={() => setImageFailed(true)}')
)
check(
  'rail: horizontal snap scroller with working edge controls',
  rail.includes('snap-x snap-mandatory gap-4 overflow-x-auto') &&
    rail.includes('track.scrollBy({ left: direction * step') &&
    rail.includes('disabled={!edges.start}') &&
    rail.includes('disabled={!edges.end}') &&
    rail.includes('new ResizeObserver(measure)')
)
check(
  'store: recommended rail sits below the catalogue',
  products.includes('getProductsBySlugs(recent, 8)') &&
    products.includes('getRecentlyViewed()') &&
    products.includes('<ProductRail') &&
    products.includes('id="recommended-products"')
)
check(
  'detail: related and recently viewed are horizontal rails',
  detail.includes('id="related-products"') &&
    detail.includes('id="recently-viewed-products"') &&
    (detail.match(/<ProductRail/g) || []).length === 2 &&
    !detail.includes('grid sm:grid-cols-2 lg:grid-cols-3')
)
check(
  'lightbox: focus is trapped, restored and translated',
  cardFallback.includes('dialogRef.current?.querySelectorAll(') &&
    cardFallback.includes('previouslyFocused instanceof HTMLElement') &&
    cardFallback.includes("t('media.lightbox.close')") &&
    cardFallback.includes("t('media.lightbox.previous')")
)
check(
  'store motion: reduced motion never leaves content hidden',
  ['Products.jsx', 'ProductDetail.jsx', 'StoreShell.jsx'].every((file) => {
    const source = read(`src/components/offerings/${file}`)
    return (
      source.includes('useReducedMotion()') &&
      (source.includes('shouldReduceMotion ? false') || source.includes('initial: false'))
    )
  })
)
check(
  'best-version i18n copy is present',
  [
    'statusRetry',
    'networkError',
    'sessionExpired',
    'downloadUnavailable',
    'productLoadError',
    'pdfPreview',
  ].every((key) => Boolean(en.store?.[key])) &&
    en.store.imageCount === '{{count}} images' &&
    ['previous', 'next', 'close', 'view', 'thumb'].every((key) =>
      Boolean(en.media?.lightbox?.[key])
    )
)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
