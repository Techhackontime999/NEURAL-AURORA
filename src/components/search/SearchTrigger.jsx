import { Search } from 'lucide-react'
import { useGlobalSearch } from './SearchContext'

/** Compact nav button that opens the site-wide command search. */
export default function SearchTrigger({ compact = false, className = '' }) {
  const { openSearch } = useGlobalSearch()

  return (
    <button
      type="button"
      onClick={() => openSearch()}
      aria-label="Search this site (Command or Control plus K)"
      title="Search this site (⌘K / Ctrl+K)"
      className={`hidden min-h-11 items-center justify-center gap-2 rounded-full border px-3 text-xs tracking-wider transition-all duration-300 hover:border-cyan-400/60 active:scale-[0.97] sm:inline-flex ${className}`}
      style={{
        borderColor: 'var(--border-color)',
        color: 'var(--text-secondary)',
        background: 'var(--glass-bg)',
      }}
    >
      <Search size={14} strokeWidth={1.6} aria-hidden="true" />
      {!compact && <span className="hidden lg:inline">Search</span>}
      <kbd className="hidden font-mono text-[9px] uppercase tracking-widest opacity-50 xl:inline">⌘K</kbd>
    </button>
  )
}
