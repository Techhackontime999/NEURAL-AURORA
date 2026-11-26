import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Clock, CornerDownLeft, Search, ShoppingBag, X } from 'lucide-react'
import { useGlobalSearch } from './SearchContext'
import { getStaticSearchDocuments, loadSearchDocuments } from '../../lib/siteSearchData'
import { groupResults, resultCountLabel, SEARCH_TYPES, searchSite } from '../../lib/siteSearch'

const RECENT_KEY = 'neural-aurora:recent-searches:v1'
const MAX_RECENT = 5
const POPULAR = ['three.js', 'ui/ux', 'digital store', 'affiliate', 'blog']

const TYPE_MARKS = {
  page: '◈', project: '⊞', service: '◆', product: '◉', blog: '⊡', caseStudy: '▣',
  skill: '◇', education: '◎', experience: '○', certificate: '❖', achievement: '✦', gallery: '▦',
}

function readRecent() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string').slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

function remember(query) {
  const term = String(query || '').trim()
  if (!term) return
  try {
    const next = [term, ...readRecent().filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* storage is optional */
  }
}

function Highlight({ segments }) {
  return (
    <>
      {(segments || [{ text: '', match: false }]).map((segment, index) =>
        segment.match ? (
          <mark key={index} className="rounded-sm bg-cyan-400/20 text-inherit px-0.5">{segment.text}</mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  )
}

export default function GlobalSearchDialog() {
  const { open, query, setQuery, closeSearch, searchStore } = useGlobalSearch()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const inputRef = useRef(null)
  const panelRef = useRef(null)
  const restoreFocusRef = useRef(null)
  const [documents, setDocuments] = useState(getStaticSearchDocuments)
  const [activeIndex, setActiveIndex] = useState(0)
  const [recent, setRecent] = useState(readRecent)

  const trimmed = String(query || '').trim()
  const results = useMemo(
    () => searchSite(documents, trimmed, { limit: 24 }),
    [documents, trimmed],
  )
  const visible = useMemo(() => results.slice(0, 12).map((result, index) => ({ ...result, flatIndex: index })), [results])
  const groups = useMemo(() => groupResults(visible), [visible])

  useEffect(() => {
    setActiveIndex(0)
  }, [trimmed])

  useEffect(() => {
    if (!open) return undefined
    restoreFocusRef.current = document.activeElement
    loadSearchDocuments()
      .then((next) => setDocuments(next))
      .catch(() => { /* bundled copy already rendered */ })

    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      if (restoreFocusRef.current?.focus) restoreFocusRef.current.focus()
    }
  }, [open])

  const openResult = useCallback((result) => {
    if (!result) return
    remember(trimmed)
    setRecent(readRecent())
    closeSearch()
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
  }, [closeSearch, navigate, trimmed])

  const runStoreSearch = useCallback(() => {
    remember(trimmed)
    setRecent(readRecent())
    searchStore(trimmed)
  }, [searchStore, trimmed])

  const showAll = useCallback(() => {
    remember(trimmed)
    setRecent(readRecent())
    closeSearch()
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }, [closeSearch, navigate, trimmed])

  function handleInputKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeSearch()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (visible.length ? (current + 1) % visible.length : 0))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (visible.length ? (current - 1 + visible.length) % visible.length : 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (visible[activeIndex]) openResult(visible[activeIndex])
      else if (trimmed) showAll()
    }
  }

  function handlePanelKeyDown(event) {
    if (event.key !== 'Tab' || !panelRef.current) return
    const focusable = Array.from(panelRef.current.querySelectorAll('button:not([disabled]), input, a[href]'))
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const activeId = visible[activeIndex] ? `global-search-option-${visible[activeIndex].flatIndex}` : undefined

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-start justify-center px-4 pt-[8vh] sm:pt-[12vh]"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
        >
          <button
            type="button"
            aria-label="Close search"
            onClick={closeSearch}
            className="absolute inset-0 h-full w-full cursor-default bg-black/55 backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Search NEURAL AURORA"
            onKeyDown={handlePanelKeyDown}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -12, scale: 0.985 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex max-h-[78vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl border shadow-2xl"
            style={{
              borderColor: 'var(--border-color)',
              background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
              backdropFilter: 'blur(28px)',
              boxShadow: '0 32px 80px -24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center gap-3 border-b px-4 py-3.5" style={{ borderColor: 'var(--border-color)' }}>
              <Search size={18} aria-hidden="true" style={{ color: 'var(--accent)' }} />
              <input
                ref={inputRef}
                type="search"
                value={query}
                role="combobox"
                aria-expanded="true"
                aria-controls="global-search-results"
                aria-activedescendant={activeId}
                aria-label="Search pages, projects, services and products"
                placeholder="Search pages, projects, products…"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                className="min-h-11 flex-1 bg-transparent text-[15px] outline-none placeholder:opacity-50"
                style={{ color: 'var(--text-primary)' }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); inputRef.current?.focus() }}
                  aria-label="Clear search"
                  className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close search"
                className="hidden rounded-lg border px-2 py-1 text-[10px] font-mono uppercase tracking-widest sm:block"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}
              >
                Esc
              </button>
            </div>

            <div id="global-search-results" role="listbox" aria-label="Search results" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
              {!trimmed && (
                <div className="space-y-5 px-3 py-4">
                  {recent.length > 0 && (
                    <section aria-label="Recent searches">
                      <h2 className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
                        <Clock size={12} /> Recent
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {recent.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => { setQuery(item); inputRef.current?.focus() }}
                            className="min-h-11 rounded-full border px-3 text-xs transition-colors hover:border-cyan-400/60"
                            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                  <section aria-label="Popular searches">
                    <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>Popular</h2>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => { setQuery(item); inputRef.current?.focus() }}
                          className="min-h-11 rounded-full border px-3 text-xs transition-colors hover:border-cyan-400/60"
                          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </section>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                    Tip: press <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]" style={{ borderColor: 'var(--border-color)' }}>/</kbd> anywhere to open search, or <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]" style={{ borderColor: 'var(--border-color)' }}>⌘ K</kbd> to toggle it.
                  </p>
                </div>
              )}

              {trimmed && visible.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>No matches for “{trimmed}”</p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>Try a shorter phrase, or search the store instead.</p>
                  <button
                    type="button"
                    onClick={runStoreSearch}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-cyan-400 px-5 text-xs font-semibold uppercase tracking-widest text-black transition-transform hover:-translate-y-0.5"
                  >
                    <ShoppingBag size={14} /> Search store
                  </button>
                </div>
              )}

              {trimmed && groups.map((group) => (
                <section key={group.type} aria-label={group.label} className="mb-1">
                  <h2 className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
                    {SEARCH_TYPES[group.type] || group.label}
                  </h2>
                  {group.results.map((result) => (
                    <button
                      key={`${result.type}:${result.path}`}
                      id={`global-search-option-${result.flatIndex}`}
                      type="button"
                      role="option"
                      aria-selected={activeIndex === result.flatIndex}
                      onMouseEnter={() => setActiveIndex(result.flatIndex)}
                      onClick={() => openResult(result)}
                      className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
                      style={{
                        background: activeIndex === result.flatIndex ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                      }}
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs" style={{ borderColor: 'var(--border-color)', color: 'var(--accent)' }} aria-hidden="true">
                        {TYPE_MARKS[result.type] || '◈'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            <Highlight segments={result.titleSegments} />
                          </span>
                          {result.badge && (
                            <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider" style={{ background: 'var(--input-bg)', color: 'var(--text-tertiary)' }}>
                              {result.badge}
                            </span>
                          )}
                        </span>
                        {result.description && (
                          <span className="mt-0.5 block truncate text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <Highlight segments={result.descriptionSegments} />
                          </span>
                        )}
                      </span>
                      <ArrowRight size={14} className="mt-2 shrink-0 opacity-30" aria-hidden="true" />
                    </button>
                  ))}
                </section>
              ))}
            </div>

            {trimmed && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5" style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}>
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                  {resultCountLabel(results.length)}
                </span>
                <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  <span className="hidden items-center gap-1 sm:flex"><CornerDownLeft size={11} /> to open</span>
                  <button type="button" onClick={showAll} className="inline-flex min-h-9 items-center gap-1 font-medium hover:text-cyan-400" style={{ color: 'var(--text-secondary)' }}>
                    All results <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
