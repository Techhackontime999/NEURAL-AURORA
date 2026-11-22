import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, AlertTriangle, PackageOpen, X, Loader2 } from 'lucide-react'
import {
  getPublishedProducts,
  getCategories,
  getPublishedFormats,
  PRODUCT_SORTS,
  PRODUCT_PAGE_SIZE,
  PRODUCT_MAX_RESULTS,
} from '../../lib/products'
import StoreShell from './StoreShell'
import ProductCard from './ProductCard'

const EMPTY_FILTERS = {
  search: '',
  category: '',
  format: '',
  freeOnly: false,
  featured: false,
  sort: 'featured',
}

// Bounds the catalogue so a misconfigured table cannot pull an unbounded result
// set into the browser. The page size is deliberately smaller than the cap.
const LIST_CAP = PRODUCT_MAX_RESULTS
const PAGE_SIZE = PRODUCT_PAGE_SIZE

// Typing is debounced so a search does not fire a request per keystroke.
const SEARCH_DEBOUNCE_MS = 300

// Filters live in the URL so a filtered catalogue can be linked, bookmarked and
// restored with the browser's back button. Unknown values are dropped rather
// than passed into a query.
const URL_KEYS = {
  search: 'q',
  category: 'category',
  format: 'format',
  freeOnly: 'free',
  featured: 'featured',
  sort: 'sort',
}

function safeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .slice(0, 80)
}

function filtersFromParams(params) {
  const sort = safeToken(params.get(URL_KEYS.sort))
  return {
    search: safeToken(params.get(URL_KEYS.search)),
    category: safeToken(params.get(URL_KEYS.category)),
    format: safeToken(params.get(URL_KEYS.format)),
    freeOnly: ['1', 'true'].includes(safeToken(params.get(URL_KEYS.freeOnly))),
    featured: ['1', 'true'].includes(safeToken(params.get(URL_KEYS.featured))),
    sort: Object.hasOwn(PRODUCT_SORTS, sort) ? sort : EMPTY_FILTERS.sort,
  }
}

function paramsFromFilters(filters) {
  const params = new URLSearchParams()
  if (filters.search) params.set(URL_KEYS.search, filters.search)
  if (filters.category) params.set(URL_KEYS.category, filters.category)
  if (filters.format) params.set(URL_KEYS.format, filters.format)
  if (filters.freeOnly) params.set(URL_KEYS.freeOnly, '1')
  if (filters.featured) params.set(URL_KEYS.featured, '1')
  if (filters.sort !== EMPTY_FILTERS.sort) params.set(URL_KEYS.sort, filters.sort)
  return params
}

function sameFilters(a, b) {
  return (
    a.search === b.search &&
    a.category === b.category &&
    a.format === b.format &&
    a.freeOnly === b.freeOnly &&
    a.featured === b.featured &&
    a.sort === b.sort
  )
}

/**
 * The digital-product storefront.
 *
 * Filtering and sorting are delegated to `getPublishedProducts` rather than
 * reimplemented here, so the meaning of "matches this search" or "sorted by
 * newest" exists in exactly one place server-side. RLS independently guarantees
 * only `status = 'published'` rows can ever come back.
 */
export default function Products() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialFilters = filtersFromParams(searchParams)

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [formats, setFormats] = useState([])
  const [featuredProducts, setFeaturedProducts] = useState([])

  const [filters, setFilters] = useState(initialFilters)
  // The raw input value, which lags behind `filters.search` by the debounce.
  const [searchInput, setSearchInput] = useState(initialFilters.search)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  const firstLoad = useRef(true)
  const productsRef = useRef([])
  const requestIdRef = useRef(0)

  // --- reference data (does not depend on the active filters) ----------------
  useEffect(() => {
    let cancelled = false

    const loadReferenceData = async () => {
      try {
        const [cats, fmts] = await Promise.all([getCategories(), getPublishedFormats()])
        if (cancelled) return
        setCategories(cats)
        setFormats(fmts)
      } catch (err) {
        // Reference data is decorative: the catalogue itself still renders.
        console.error('Failed to load store filters:', err?.message || err)
      }
    }

    loadReferenceData()
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  // --- curated rail ----------------------------------------------------------
  // A small, honest featured shelf. It uses the same published-product query as
  // the catalogue and disappears as soon as the customer applies a filter.
  useEffect(() => {
    let cancelled = false
    getPublishedProducts({ featuredOnly: true, sort: 'featured', limit: 4 })
      .then((items) => {
        if (!cancelled) setFeaturedProducts(items)
      })
      .catch(() => {
        /* the rail is a nicety; the catalogue below still works */
      })
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  // --- debounce the free-text search ----------------------------------------
  useEffect(() => {
    if (searchInput === filters.search) return undefined

    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }))
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchInput, filters.search])

  // --- URL synchronisation ---------------------------------------------------
  // Filters are written with `replace` so typing a search does not stuff the
  // history stack; back/forward still restores any committed filter state.
  useEffect(() => {
    setSearchParams(
      (current) => {
        const next = paramsFromFilters(filters)
        return next.toString() === current.toString() ? current : next
      },
      { replace: true }
    )
  }, [filters, setSearchParams])

  useEffect(() => {
    const fromUrl = filtersFromParams(searchParams)
    setFilters((current) => (sameFilters(current, fromUrl) ? current : fromUrl))
    setSearchInput(fromUrl.search)
  }, [searchParams])

  // --- catalogue -------------------------------------------------------------
  const updateProducts = (next) => {
    productsRef.current = next
    setProducts(next)
  }

  const loadProducts = async (append = false) => {
    const requestId = ++requestIdRef.current
    const offset = append ? productsRef.current.length : 0
    const remaining = LIST_CAP - offset

    if (remaining <= 0) {
      setHasMore(false)
      return undefined
    }

    if (firstLoad.current) setLoading(true)
    else if (append) setLoadingMore(true)
    else setRefreshing(true)
    setError(null)
    if (append) setLoadMoreError(null)

    // Fetch one extra row: if it exists, another page is available. This avoids
    // a separate COUNT query while keeping the visible cap honest.
    const requestLimit = Math.min(PAGE_SIZE + 1, remaining + 1)

    try {
      const items = await getPublishedProducts({
        ...filters,
        featuredOnly: filters.featured,
        limit: requestLimit,
        offset,
      })
      if (requestId !== requestIdRef.current) return undefined

      const pageLimit = Math.min(PAGE_SIZE, remaining)
      const page = items.slice(0, pageLimit)
      const next = append ? [...productsRef.current, ...page] : page
      updateProducts(next)
      setHasMore(items.length > pageLimit && next.length < LIST_CAP)
      return undefined
    } catch (err) {
      if (requestId !== requestIdRef.current) return undefined
      console.error('Failed to load product catalogue:', err?.message || err)
      if (append) setLoadMoreError(err)
      else {
        setError(err)
        updateProducts([])
      }
      setHasMore(false)
      return undefined
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
        setRefreshing(false)
        setLoadingMore(false)
        firstLoad.current = false
      }
    }
  }

  useEffect(() => {
    loadProducts(false)
    return () => {
      // Invalidate any in-flight page when filters change or the view unmounts.
      requestIdRef.current += 1
    }
  }, [filters, reloadToken])

  const set = (patch) => setFilters((prev) => ({ ...prev, ...patch }))

  const clearFilters = () => {
    setSearchInput('')
    setFilters(EMPTY_FILTERS)
  }

  const hasActiveFilters =
    filters.search !== '' ||
    filters.category !== '' ||
    filters.format !== '' ||
    filters.freeOnly === true ||
    filters.featured === true

  const handleLoadMore = () => {
    if (loading || refreshing || loadingMore || !hasMore) return
    loadProducts(true)
  }

  return (
    <StoreShell
      eyebrow={t('store.eyebrow')}
      title={t('store.title')}
      subtitle={t('store.subtitle')}
    >
      {!hasActiveFilters && featuredProducts.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
          aria-label={t('store.featuredRail')}
        >
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
              {t('store.featuredRail')}
            </h2>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {t('store.featuredRailNote')}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </motion.section>
      )}

      {/* --- Filter bar ---------------------------------------------------- */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel rounded-xl p-4 md:p-5 mb-8"
        aria-label={t('store.filters')}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('store.searchPlaceholder')}
              aria-label={t('store.searchPlaceholder')}
              className="w-full rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="sr-only">{t('store.sortLabel')}</span>
              <select
                value={filters.sort}
                onChange={(e) => set({ sort: e.target.value })}
                aria-label={t('store.sortLabel')}
                className="rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              >
                {Object.keys(PRODUCT_SORTS).map((key) => (
                  <option key={key} value={key}>
                    {t(`store.sort.${key}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.freeOnly}
                onChange={(e) => set({ freeOnly: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-black/20 dark:border-white/20 accent-cyan-500"
              />
              {t('store.freeOnly')}
            </label>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mr-1"
              aria-hidden="true"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </span>

            <CategoryChip
              active={filters.category === ''}
              onClick={() => set({ category: '' })}
              label={t('store.allCategories')}
            />

            {categories.map((cat) => (
              <CategoryChip
                key={cat.slug}
                active={filters.category === cat.slug}
                onClick={() => set({ category: filters.category === cat.slug ? '' : cat.slug })}
                label={cat.label}
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <CategoryChip
            active={filters.featured === true}
            onClick={() => set({ featured: !filters.featured })}
            label={t('store.featuredOnly')}
          />

          {formats.length > 1 && (
            <>
              <CategoryChip
                active={filters.format === ''}
                onClick={() => set({ format: '' })}
                label={t('store.allFormats')}
              />

              {formats.map((fmt) => (
                <CategoryChip
                  key={fmt}
                  active={filters.format === fmt}
                  onClick={() => set({ format: filters.format === fmt ? '' : fmt })}
                  label={fmt}
                />
              ))}
            </>
          )}
        </div>

        {hasActiveFilters && !loading && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
              {refreshing && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
              {t('store.resultCount', { count: products.length })}
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors"
            >
              <X className="w-3 h-3" />
              {t('store.clearFilters')}
            </button>
          </div>
        )}
      </motion.section>

      {/* The query is capped; never imply the user saw the whole catalogue. */}
      {products.length === LIST_CAP && !loading && (
        <p className="mb-4 text-[11px] text-[var(--text-secondary)]">
          {t('store.resultCountCapped', { count: LIST_CAP })}
        </p>
      )}

      {/* --- Catalogue ----------------------------------------------------- */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-black/5 dark:bg-white/5" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-2/3 rounded bg-black/5 dark:bg-white/5" />
                <div className="h-2 w-full rounded bg-black/5 dark:bg-white/5" />
                <div className="h-8 w-full rounded-lg bg-black/5 dark:bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <StatePanel
          icon={<AlertTriangle className="w-5 h-5" aria-hidden="true" />}
          tone="warn"
          title={t('store.errorTitle')}
          message={t('store.errorBody')}
          action={
            <button
              type="button"
              onClick={() => setReloadToken((n) => n + 1)}
              className="rounded-lg bg-black/90 dark:bg-white/90 text-white dark:text-black text-[11px] uppercase tracking-widest px-4 py-2.5 hover:bg-black hover:dark:bg-white transition-colors active:scale-[0.98]"
            >
              {t('store.retry')}
            </button>
          }
        />
      ) : products.length === 0 ? (
        hasActiveFilters ? (
          <StatePanel
            icon={<PackageOpen className="w-5 h-5" aria-hidden="true" />}
            title={t('store.noResults')}
            message={t('store.noResultsBody')}
            action={
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg bg-black/90 dark:bg-white/90 text-white dark:text-black text-[11px] uppercase tracking-widest px-4 py-2.5 hover:bg-black hover:dark:bg-white transition-colors active:scale-[0.98]"
              >
                {t('store.clearFilters')}
              </button>
            }
          />
        ) : (
          <StatePanel
            icon={<PackageOpen className="w-5 h-5" aria-hidden="true" />}
            title={t('store.noProducts')}
            message={t('store.noProductsBody')}
          />
        )
      ) : (
        <div
          className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-200 ${
            refreshing ? 'opacity-60' : 'opacity-100'
          }`}
          aria-busy={refreshing}
        >
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="mt-8 flex flex-col items-center gap-3">
          {!hasActiveFilters && (
            <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
              {t('store.loadedCount', { count: products.length })}
            </span>
          )}

          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 px-5 py-2.5 text-[11px] uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:border-cyan-500/60 hover:text-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {loadingMore ? t('store.loadingMore') : t('store.loadMore')}
            </button>
          )}

          {loadMoreError && (
            <p role="alert" className="text-[11px] text-amber-500">
              {t('store.loadMoreFailed')}
            </p>
          )}
        </div>
      )}
    </StoreShell>
  )
}

function CategoryChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-[11px] tracking-wide transition-colors ${
        active
          ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-500'
          : 'border-black/10 dark:border-white/10 text-[var(--text-secondary)] hover:text-black/80 dark:hover:text-white/80'
      }`}
    >
      {label}
    </button>
  )
}

function StatePanel({ icon, tone, title, message, action }) {
  const warn = tone === 'warn'
  return (
    <div className="glass-panel rounded-xl p-10 text-center">
      <div
        className={`mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full ${
          warn
            ? 'bg-amber-500/10 text-amber-500'
            : 'bg-black/5 dark:bg-white/5 text-[var(--text-tertiary)]'
        }`}
      >
        {icon}
      </div>
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
      {message && <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{message}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
