import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Search, SlidersHorizontal, AlertTriangle, PackageOpen, X } from 'lucide-react'
import { getPublishedProducts, getCategories, getPublishedFormats, PRODUCT_SORTS } from '../../lib/products'
import StoreShell from './StoreShell'
import ProductCard from './ProductCard'

const EMPTY_FILTERS = { search: '', category: '', format: '', freeOnly: false, sort: 'featured' }

// Bounds the catalogue fetch so a misconfigured table cannot pull an
// unbounded result set into the browser.
const LIST_CAP = 200

/**
 * The digital-product storefront.
 *
 * The published catalogue is fetched once and filtered in the browser. That
 * is deliberate: RLS already guarantees only `status = 'published'` rows are
 * returned, search-as-you-type stays instant with no request per keystroke,
 * and a single-creator catalogue is small. `LIST_CAP` bounds the fetch so a
 * misconfigured table cannot pull an unbounded result set.
 */
export default function Products() {
  const { t } = useTranslation()

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [formats, setFormats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [items, cats, fmts] = await Promise.all([
        getPublishedProducts({ limit: LIST_CAP }),
        getCategories(),
        getPublishedFormats(),
      ])
      setProducts(items)
      setCategories(cats)
      setFormats(fmts)
    } catch (err) {
      console.error('Failed to load product catalogue:', err?.message || err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (patch) => setFilters((prev) => ({ ...prev, ...patch }))

  const visible = useMemo(() => {
    const term = filters.search.trim().toLowerCase()

    let list = products.filter((p) => {
      if (filters.category && p.category_slug !== filters.category) return false
      if (filters.format && p.format !== filters.format) return false
      if (filters.freeOnly && p.price_paise !== 0) return false
      if (!term) return true

      const haystack = [
        p.title,
        p.short_description,
        p.description,
        Array.isArray(p.tags) ? p.tags.join(' ') : '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(term)
    })

    const dir = {
      featured: (a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1
        return (b.published_at || '').localeCompare(a.published_at || '')
      },
      newest: (a, b) => (b.published_at || '').localeCompare(a.published_at || ''),
      'price-asc': (a, b) => a.price_paise - b.price_paise,
      'price-desc': (a, b) => b.price_paise - a.price_paise,
      title: (a, b) => a.title.localeCompare(b.title),
    }

    const comparator = dir[filters.sort] || dir.featured
    return [...list].sort(comparator)
  }, [products, filters])

  const hasActiveFilters =
    filters.search !== '' ||
    filters.category !== '' ||
    filters.format !== '' ||
    filters.freeOnly === true

  return (
    <StoreShell
      eyebrow={t('store.eyebrow')}
      title={t('store.title')}
      subtitle={t('store.subtitle')}
    >
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
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30"
              aria-hidden="true"
            />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => set({ search: e.target.value })}
              placeholder={t('store.searchPlaceholder')}
              aria-label={t('store.searchPlaceholder')}
              className="w-full rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 pl-9 pr-3 py-2.5 text-sm text-black/80 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="sr-only">{t('store.sortLabel')}</span>
              <select
                value={filters.sort}
                onChange={(e) => set({ sort: e.target.value })}
                aria-label={t('store.sortLabel')}
                className="rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-2.5 text-xs text-black/70 dark:text-white/70 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              >
                {Object.keys(PRODUCT_SORTS).map((key) => (
                  <option key={key} value={key}>
                    {t(`store.sort.${key}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60 cursor-pointer select-none">
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
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40 mr-1"
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
                onClick={() =>
                  set({ category: filters.category === cat.slug ? '' : cat.slug })
                }
                label={cat.label}
              />
            ))}
          </div>
        )}

        {formats.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <CategoryChip
              active={filters.format === ''}
              onClick={() => set({ format: '' })}
              label={t('store.allFormats')}
            />

            {formats.map((fmt) => (
              <CategoryChip
                key={fmt}
                active={filters.format === fmt}
                onClick={() =>
                  set({ format: filters.format === fmt ? '' : fmt })
                }
                label={fmt}
              />
            ))}
          </div>
        )}

        {hasActiveFilters && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
              {t('store.resultCount', { count: visible.length })}
            </span>
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors"
            >
              <X className="w-3 h-3" />
              {t('store.clearFilters')}
            </button>
          </div>
        )}
      </motion.section>

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
              onClick={load}
              className="rounded-lg bg-black/90 dark:bg-white/90 text-white dark:text-black text-[11px] uppercase tracking-widest px-4 py-2.5 hover:bg-black hover:dark:bg-white transition-colors active:scale-[0.98]"
            >
              {t('store.retry')}
            </button>
          }
        />
      ) : visible.length === 0 ? (
        hasActiveFilters ? (
          <StatePanel
            icon={<PackageOpen className="w-5 h-5" aria-hidden="true" />}
            title={t('store.noResults')}
            message={t('store.noResultsBody')}
            action={
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
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
          : 'border-black/10 dark:border-white/10 text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80'
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
            : 'bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40'
        }`}
      >
        {icon}
      </div>
      <h2 className="text-sm font-semibold text-black/80 dark:text-white/80">{title}</h2>
      {message && (
        <p className="mt-1.5 text-xs text-black/50 dark:text-white/50">{message}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
