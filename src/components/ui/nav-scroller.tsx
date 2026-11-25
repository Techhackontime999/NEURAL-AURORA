'use client'

import { useEffect, useRef } from 'react'

export type NavScrollerLink = {
  key: string
  label: string
  active?: boolean
}

type NavScrollerProps = {
  links: NavScrollerLink[]
  onSelect: (link: NavScrollerLink) => void
  label: string
}

/**
 * Mobile-only horizontal link rail. The full-screen menu stays available for
 * account actions, but primary destinations remain visible and swipeable like
 * the category bars on large commerce sites.
 */
export default function NavScroller({ links, onSelect, label }: NavScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  const activeKey = links.find((link) => link.active)?.key

  useEffect(() => {
    if (!activeKey || !activeRef.current || !scrollerRef.current) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    activeRef.current.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [activeKey])

  return (
    <div
      ref={scrollerRef}
      role="navigation"
      aria-label={label}
      className="nav-scroller no-scrollbar mx-auto mt-2 w-[calc(100vw-1.5rem)] overflow-x-auto overscroll-x-contain rounded-full border border-[var(--border-color)] bg-[var(--glass-bg)] px-1.5 py-1 backdrop-blur-xl md:hidden"
    >
      <div className="flex w-max items-center gap-1">
        {links.map((link) => (
          <button
            key={link.key}
            ref={link.active ? activeRef : undefined}
            type="button"
            aria-current={link.active ? 'page' : undefined}
            onClick={() => onSelect(link)}
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
              link.active
                ? 'bg-[var(--accent-glow)]/12 text-[var(--accent-glow)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {link.label}
          </button>
        ))}
      </div>
    </div>
  )
}
