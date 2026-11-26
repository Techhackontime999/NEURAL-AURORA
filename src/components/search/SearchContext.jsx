import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import GlobalSearchDialog from './GlobalSearchDialog'

const SearchContext = createContext(null)

/** Access the site-wide search overlay from any nav or page. */
export function useGlobalSearch() {
  const value = useContext(SearchContext)
  if (!value) throw new Error('useGlobalSearch must be used inside <SearchProvider>')
  return value
}

function isEditableTarget(target) {
  if (!target || target.nodeType !== 1) return false
  const tag = target.tagName?.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable === true
}

export default function SearchProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const openRef = useRef(open)
  openRef.current = open

  const openSearch = useCallback((initialQuery = '') => {
    setQuery(String(initialQuery || '').slice(0, 120))
    setOpen(true)
  }, [])

  const closeSearch = useCallback(() => setOpen(false), [])

  const searchStore = useCallback((term) => {
    setOpen(false)
    const value = String(term || '').trim()
    const suffix = value ? `?q=${encodeURIComponent(value)}` : ''
    navigate(`/offerings/products${suffix}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [navigate])

  // Any real navigation dismisses the overlay. This also covers browser
  // back/forward, so a stale dialog never sits over a different page.
  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.search, location.hash])

  useEffect(() => {
    function onKeyDown(event) {
      const key = String(event.key || '').toLowerCase()

      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault()
        setOpen((current) => {
          if (!current) setQuery('')
          return !current
        })
        return
      }

      if (key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !openRef.current && !isEditableTarget(event.target)) {
        event.preventDefault()
        setQuery('')
        setOpen(true)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = useMemo(
    () => ({ open, query, setQuery, openSearch, closeSearch, searchStore }),
    [open, query, openSearch, closeSearch, searchStore],
  )

  return (
    <SearchContext.Provider value={value}>
      {children}
      <GlobalSearchDialog />
    </SearchContext.Provider>
  )
}
