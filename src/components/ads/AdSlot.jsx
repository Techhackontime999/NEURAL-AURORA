import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { useAdPlacement } from '../../lib/ads'
import { AD_PROVIDERS, AD_SLOTS, isAdTestMode, loadAdSenseScript, pushAdSense } from '../../lib/adsConfig'

function AdSenseUnit({ placement }) {
  const testMode = isAdTestMode()
  const insRef = useRef(null)
  const requestedRef = useRef(false)

  // The AdSense runtime is heavy. Request it only when the slot is near the
  // viewport so it never competes with the page's LCP, and never push twice
  // for the same <ins> when React re-renders or test mode changes.
  useEffect(() => {
    let alive = true
    const request = () => {
      if (requestedRef.current) return
      requestedRef.current = true
      loadAdSenseScript(placement.ad_client).then((ready) => {
        if (alive && ready) pushAdSense()
      })
    }

    if (typeof IntersectionObserver === 'undefined') {
      request()
      return () => { alive = false }
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect()
        request()
      }
    }, { rootMargin: '300px 0px' })
    if (insRef.current) observer.observe(insRef.current)
    return () => {
      alive = false
      observer.disconnect()
    }
  }, [placement.ad_client, placement.ad_slot, testMode])

  return (
    <ins
      ref={insRef}
      className="adsbygoogle block w-full"
      style={{ display: 'block', minHeight: placement.ad_slot ? '90px' : '160px' }}
      data-ad-client={placement.ad_client}
      data-ad-slot={placement.ad_slot || undefined}
      data-ad-format={AD_SLOTS[placement.slot]?.format || 'auto'}
      data-adtest={testMode ? 'on' : undefined}
      data-full-width-responsive="true"
      aria-label="Advertisement"
    />
  )
}

function LinkCard({ placement, variant, onTrackClick }) {
  const compact = variant === 'compact'
  const content = (
    <div className={`flex ${compact ? 'gap-3' : 'flex-col gap-3 sm:flex-row sm:items-center'}`}>
      {placement.image_url && (
        <img
          src={placement.image_url}
          alt=""
          loading="lazy"
          decoding="async"
          className={`${compact ? 'h-16 w-16' : 'h-24 w-full sm:h-20 sm:w-32'} shrink-0 rounded-lg border object-cover`}
          style={{ borderColor: 'var(--border-color)' }}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{placement.title}</p>
        {placement.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{placement.description}</p>
        )}
        {placement.cta_label && placement.target_url && (
          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
            {placement.cta_label} <ArrowUpRight size={12} aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  )

  if (!placement.target_url) return content

  const external = /^https?:\/\//i.test(placement.target_url)
  return (
    <a
      href={placement.target_url}
      target={external ? '_blank' : undefined}
      rel={external ? 'sponsored noopener noreferrer' : undefined}
      onClick={onTrackClick}
      className="block rounded-lg transition-opacity hover:opacity-90"
    >
      {content}
    </a>
  )
}

/**
 * One premium, labelled ad placement. Renders nothing when no placement is
 * configured, when the schedule has ended, or when the session cap is reached.
 */
export default function AdSlot({ slot, variant = 'card', className = '' }) {
  const { placement, trackImpression, trackClick } = useAdPlacement(slot)
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef(null)
  const trackedRef = useRef(false)

  useEffect(() => {
    trackedRef.current = false
  }, [placement?.id])

  useEffect(() => {
    if (!placement || !containerRef.current || trackedRef.current) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      trackedRef.current = true
      trackImpression()
      return undefined
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        trackedRef.current = true
        trackImpression()
        observer.disconnect()
      }
    }, { threshold: 0.35, rootMargin: '60px' })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [placement, trackImpression])

  if (!placement) return null

  const isAdsense = placement.provider === 'adsense'
  const label = isAdsense ? 'Advertisement' : AD_PROVIDERS[placement.provider] || 'Sponsored'

  return (
    <motion.aside
      ref={containerRef}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
      aria-label={label}
      className={`rounded-xl border ${variant === 'compact' ? 'p-3' : 'p-5'} ${className}`}
      style={{
        borderColor: 'var(--border-color)',
        background: 'color-mix(in srgb, var(--card-bg) 72%, transparent)',
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </span>
        <span className="h-1 w-1 rounded-full bg-cyan-400/60" aria-hidden="true" />
      </div>
      {isAdsense ? (
        <AdSenseUnit placement={placement} />
      ) : (
        <LinkCard placement={placement} variant={variant} onTrackClick={trackClick} />
      )}
    </motion.aside>
  )
}
