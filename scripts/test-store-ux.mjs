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
  productsLib.includes("import { buildProductSearchExpression } from './productQuery'") &&
    productsLib.includes('query.or(searchExpression)')
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

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
