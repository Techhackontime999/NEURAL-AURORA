import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Search, ShoppingBag, X } from 'lucide-react'
import Navbar from '../Navbar'
import AuroraBackground from '../AuroraBackground'
import { Footer } from '../ui/footer-section'
import AdSlot from '../ads/AdSlot'
import { getStaticSearchDocuments, loadSearchDocuments } from '../../lib/siteSearchData'
import { resultCountLabel, SEARCH_TYPES, searchSite } from '../../lib/siteSearch'

const POPULAR = ['three.js', 'react', 'web development', 'digital store', 'certificates']
const TYPE_MARKS = {
  page: '◈', project: '⊞', service: '◆', product: '◉', blog: '⊡', caseStudy: '▣',
  skill: '◇', education: '◎', experience: '○', certificate: '❖', achievement: '✦', gallery: '▦',
}

function Highlight({ segments }) {
  return (
    <>
      {(segments || []).map((segment, index) =>
        segment.match ? (
          <mark key={index} className="rounded-sm bg-cyan-400/20 px-0.5 text-inherit">{segment.text}</mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  )
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const queryParam = params.get('q') || ''
  const rawType = params.get('type') || ''
  const typeFilter = SEARCH_TYPES[rawType] ? rawType : ''
  const [input, setInput] = useState(queryParam)
  const [documents, setDocuments] = useState(getStaticSearchDocuments)

  useEffect(() => {
    setInput(queryParam)
  }, [queryParam])

  useEffect(() => {
    let alive = true
    loadSearchDocuments().then((next) => { if (alive) setDocuments(next) }).catch(() => { /* bundled index stays */ })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (input === queryParam) return undefined
    const timer = window.setTimeout(() => {
      setParams((current) => {
        const next = new URLSearchParams(current)
        const value = input.trim()
        if (value) next.set('q', value)
        else next.delete('q')
        return next.toString() === current.toString() ? current : next
      }, { replace: true })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [input, queryParam, setParams])

  const allResults = useMemo(() => searchSite(documents, queryParam, { limit: 500 }), [documents, queryParam])
  const results = useMemo(
    () => searchSite(documents, queryParam, { limit: 100, types: typeFilter ? [typeFilter] : [] }),
    [documents, queryParam, typeFilter],
  )

  const counts = useMemo(() => {
    const map = {}
    for (const result of allResults) map[result.type] = (map[result.type] || 0) + 1
    return map
  }, [allResults])

  const setType = useCallback((nextType) => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (nextType) next.set('type', nextType)
      else next.delete('type')
      return next.toString() === current.toString() ? current : next
    }, { replace: true })
  }, [setParams])

  const openResult = useCallback((result) => {
    const path = String(result.path || '/')
    const hashIndex = path.indexOf('#')
    if (hashIndex !== -1) {
      const pathname = path.slice(0, hashIndex) || '/'
      const id = path.slice(hashIndex + 1)
      navigate(pathname)
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 120)
      return
    }
    navigate(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [navigate])

  const storeHref = queryParam
    ? `/offerings/products?q=${encodeURIComponent(queryParam)}`
    : '/offerings/products'

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuroraBackground />
      <Navbar />

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-20 pt-32 sm:px-8">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="eyebrow">Search</span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-black/80 dark:text-white/90 sm:text-4xl">
            Find anything on NEURAL AURORA
          </h1>
          <p className="mt-2 max-w-xl text-sm text-black/50 dark:text-white/50">
            One index across pages, projects, services, journal posts, case studies and the digital store.
          </p>
        </motion.div>

        <form
          role="search"
          onSubmit={(event) => event.preventDefault()}
          className="glass-panel mt-8 flex items-center gap-3 rounded-xl px-4 py-2"
        >
          <Search size={18} aria-hidden="true" style={{ color: 'var(--accent)' }} />
          <input
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            aria-label="Search this site"
            placeholder="Try “three.js”, “UI kit” or “web development”"
            className="min-h-12 flex-1 bg-transparent text-sm outline-none placeholder:opacity-50"
            style={{ color: 'var(--text-primary)' }}
          />
          {input && (
            <button
              type="button"
              onClick={() => setInput('')}
              aria-label="Clear search"
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X size={16} />
            </button>
          )}
        </form>

        {queryParam && (
          <div className="mt-5 flex flex-wrap items-center gap-2" aria-label="Filter results by type">
            <button
              type="button"
              onClick={() => setType('')}
              aria-pressed={!typeFilter}
              className="min-h-11 rounded-full border px-3 text-[11px] font-medium uppercase tracking-wider transition-colors"
              style={{
                borderColor: typeFilter ? 'var(--border-color)' : 'var(--accent)',
                color: typeFilter ? 'var(--text-secondary)' : 'var(--accent)',
              }}
            >
              All <span className="opacity-50">{allResults.length}</span>
            </button>
            {Object.entries(SEARCH_TYPES)
              .filter(([key]) => counts[key])
              .map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  aria-pressed={typeFilter === key}
                  className="min-h-11 rounded-full border px-3 text-[11px] font-medium uppercase tracking-wider transition-colors"
                  style={{
                    borderColor: typeFilter === key ? 'var(--accent)' : 'var(--border-color)',
                    color: typeFilter === key ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {label} <span className="opacity-50">{counts[key]}</span>
                </button>
              ))}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            {!queryParam && (
              <section aria-labelledby="popular-heading" className="glass-panel rounded-xl p-5">
                <h2 id="popular-heading" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Popular searches</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {POPULAR.map((term) => (
                    <Link
                      key={term}
                      to={`/search?q=${encodeURIComponent(term)}`}
                      className="inline-flex min-h-11 items-center rounded-full border px-4 text-xs transition-colors hover:border-cyan-400/60"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                    >
                      {term}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {queryParam && results.length === 0 && (
              <section className="glass-panel rounded-xl p-8 text-center">
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>No matches for “{queryParam}”</h2>
                <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Try fewer words, remove the type filter, or look through the product catalogue directly.
                </p>
                <Link
                  to={storeHref}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-cyan-400 px-5 text-xs font-semibold uppercase tracking-widest text-black transition-transform hover:-translate-y-0.5"
                >
                  <ShoppingBag size={14} /> Search the store
                </Link>
              </section>
            )}

            {queryParam && results.length > 0 && (
              <>
                <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
                  {resultCountLabel(results.length)}
                </p>
                <ul className="space-y-3">
                  {results.map((result) => (
                    <li key={`${result.type}:${result.path}`}>
                      <button
                        type="button"
                        onClick={() => openResult(result)}
                        className="glass-panel group flex w-full items-start gap-4 rounded-xl p-4 text-left transition-transform duration-300 hover:-translate-y-0.5"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--accent)' }} aria-hidden="true">
                          {TYPE_MARKS[result.type] || '◈'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold group-hover:text-cyan-400" style={{ color: 'var(--text-primary)' }}>
                              <Highlight segments={result.titleSegments} />
                            </span>
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider" style={{ background: 'var(--input-bg)', color: 'var(--text-tertiary)' }}>
                              {SEARCH_TYPES[result.type]}
                            </span>
                          </span>
                          {result.description && (
                            <span className="mt-1 block text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                              <Highlight segments={result.descriptionSegments} />
                            </span>
                          )}
                          <span className="mt-2 block truncate font-mono text-[10px] opacity-40" style={{ color: 'var(--text-tertiary)' }}>{result.path}</span>
                        </span>
                        <ArrowRight size={16} className="mt-3 shrink-0 opacity-30 transition-opacity group-hover:opacity-80" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            <section className="glass-panel rounded-xl p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Search tips</h2>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                <li>Use specific terms like <span className="text-cyan-400">Three.js</span> or <span className="text-cyan-400">UI/UX</span>.</li>
                <li>Filter by section to narrow results.</li>
                <li>Press <kbd className="rounded border px-1 font-mono text-[10px]" style={{ borderColor: 'var(--border-color)' }}>⌘K</kbd> to search from any page.</li>
              </ul>
              <Link to={storeHref} className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-medium text-cyan-400 hover:text-cyan-300">
                Browse digital store <ArrowRight size={13} />
              </Link>
            </section>
            {queryParam && <AdSlot slot="search_results" variant="compact" />}
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  )
}
