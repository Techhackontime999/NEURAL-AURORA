import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ProductCard from './ProductCard'

const GAP_PX = 16 // matches Tailwind's gap-4

/**
 * Horizontal product shelf with scroll snap and real previous/next controls.
 * Used at the bottom of the store and on product detail pages. It renders
 * nothing without products, and it never fetches anything itself.
 */
export default function ProductRail({ id, title, subtitle, products = [], seeAll = null }) {
  const trackRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const [edges, setEdges] = useState({ start: false, end: false })

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    setEdges({
      start: track.scrollLeft > 4,
      end: track.scrollLeft + track.clientWidth < track.scrollWidth - 4,
    })
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    measure()
    track.addEventListener('scroll', measure, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(track)
    return () => {
      track.removeEventListener('scroll', measure)
      observer?.disconnect()
    }
  }, [measure, products.length])

  const slide = (direction) => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector('[data-rail-card]')
    const step = card ? card.getBoundingClientRect().width + GAP_PX : track.clientWidth * 0.8
    track.scrollBy({ left: direction * step, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  if (!products.length) return null

  const headingId = id ? `${id}-heading` : undefined

  return (
    <section id={id} className="mt-16" aria-labelledby={headingId}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2
            id={headingId}
            className="text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)]"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {seeAll}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => slide(-1)}
              disabled={!edges.start}
              aria-label="Scroll products left"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 transition-colors hover:border-cyan-500/60 hover:text-cyan-500 disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/10"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => slide(1)}
              disabled={!edges.end}
              aria-label="Scroll products right"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 transition-colors hover:border-cyan-500/60 hover:text-cyan-500 disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/10"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        data-testid={id ? `${id}-rail` : undefined}
        className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3"
      >
        {products.map((product, index) => (
          <div
            key={product.id}
            data-rail-card
            className="w-[260px] shrink-0 snap-start sm:w-[290px] lg:w-[320px]"
          >
            <ProductCard product={product} index={index} />
          </div>
        ))}
      </div>
    </section>
  )
}
