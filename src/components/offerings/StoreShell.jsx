import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import ServiceNavbar from '../ServiceNavbar'
import { Footer } from '../ui/footer-section'
import { useStoreHeroSettings } from '../../lib/usePortfolioData'
import { mergeStoreHeroConfig } from '../../lib/storeHeroDefaults'

/**
 * Crossfading background-image carousel for the store hero card. Images come
 * from admin_settings.store_hero (editable at /admin/store-hero) and fall
 * back to three curated defaults when nothing is saved.
 */
function HeroCarousel({ slides, intervalSeconds }) {
  const shouldReduceMotion = useReducedMotion()
  const [active, setActive] = useState(0)

  // Keep the active index inside the list whenever the admin changes slots.
  useEffect(() => {
    if (active >= slides.length) setActive(0)
  }, [slides.length, active])

  // Auto-advance; paused for reduced motion or a single slide.
  useEffect(() => {
    if (slides.length < 2 || shouldReduceMotion) return undefined
    const timer = setInterval(
      () => setActive((index) => (index + 1) % slides.length),
      intervalSeconds * 1000,
    )
    return () => clearInterval(timer)
  }, [slides.length, intervalSeconds, shouldReduceMotion])

  if (!slides.length) return null

  return (
    <div className="absolute inset-x-0 bottom-8 top-20 z-0 overflow-hidden" aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.img
          key={slides[active].url}
          src={slides[active].url}
          alt=""
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 1.1, ease: 'easeInOut' }}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            // A dead URL should never break the hero — hide the slide so the
            // gradient fallback underneath shows through.
            e.currentTarget.style.display = 'none'
          }}
        />
      </AnimatePresence>

      {/* Legibility scrim so the card copy stays readable over any image,
          in both light and dark mode. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/75" />

      {/* Slide indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {slides.map((image, index) => (
            <button
              key={image.url}
              type="button"
              aria-label={`Show slide ${index + 1}`}
              onClick={() => setActive(index)}
              className="group flex h-11 w-7 items-center justify-center"
            >
              <span
                className={`block h-1 rounded-full transition-all duration-300 ${
                  index === active ? 'w-6 bg-white/90' : 'w-2.5 bg-white/40 group-hover:bg-white/60'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Shared shell for the digital-product store (/offerings/products and
 * /offerings/products/:slug). Deliberately reuses ServiceNavbar so the whole
 * /offerings section keeps one navigation, one theme toggle and one language
 * switcher — ServiceNavbar falls back to /offerings when an anchor like
 * "#pricing" does not exist on a store page.
 */
export default function StoreShell({ eyebrow, title, subtitle, action, children }) {
  const settings = useStoreHeroSettings()
  const cfg = useMemo(() => mergeStoreHeroConfig(settings), [settings])
  const slides = useMemo(
    () => (cfg.enabled ? cfg.images.filter((image) => image.enabled && image.url) : []),
    [cfg],
  )
  const hasImageBg = slides.length > 0

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ServiceNavbar />

      <main className="wrap relative z-10 pb-0 pt-0">
        {title && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden rounded-[2rem] border border-black/10 pb-20 pt-24 dark:border-white/10 md:pb-24 md:pt-28"
          >
            <HeroCarousel slides={slides} intervalSeconds={cfg.intervalSeconds} />

            <div className="wrap relative z-10 py-12 text-center md:py-16">
              {eyebrow && (
                <span className={hasImageBg ? 'eyebrow text-white [&_*]:text-white' : 'eyebrow'}>
                  {eyebrow}
                </span>
              )}

              <h1
                className={
                  hasImageBg
                    ? 'text-3xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] mt-4'
                    : 'text-3xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-4'
                }
              >
                {title}
              </h1>

              {subtitle && (
                <p
                  className={
                    hasImageBg
                      ? 'text-sm md:text-base text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)] mt-4 max-w-2xl mx-auto leading-relaxed'
                      : 'text-sm md:text-base text-[var(--text-secondary)] mt-4 max-w-2xl mx-auto leading-relaxed'
                  }
                >
                  {subtitle}
                </p>
              )}

              {action && (
                <div className="mt-7 flex justify-center">
                  {action.to ? (
                    <Link
                      to={action.to}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-6 text-xs font-semibold uppercase tracking-widest text-black transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0 dark:bg-cyan-400"
                    >
                      {action.label}
                    </Link>
                  ) : (
                    <a
                      href={action.href}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-6 text-xs font-semibold uppercase tracking-widest text-black transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0 dark:bg-cyan-400"
                    >
                      {action.label}
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.section>
        )}

        {children}
      </main>

      <Footer />
    </div>
  )
}
