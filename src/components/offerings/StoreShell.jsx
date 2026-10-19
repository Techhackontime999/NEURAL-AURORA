import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import ServiceNavbar from '../ServiceNavbar'
import AuroraBackground from '../AuroraBackground'
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
    <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/55 dark:from-black/55 dark:via-black/40 dark:to-black/65" />

      {/* Slide indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {slides.map((image, index) => (
            <button
              key={image.url}
              type="button"
              aria-label={`Show slide ${index + 1}`}
              onClick={() => setActive(index)}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === active ? 'w-6 bg-white/90' : 'w-2.5 bg-white/40 hover:bg-white/60'
              }`}
            />
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
export default function StoreShell({ eyebrow, title, subtitle, children }) {
  const settings = useStoreHeroSettings()
  const cfg = useMemo(() => mergeStoreHeroConfig(settings), [settings])
  const slides = useMemo(
    () => (cfg.enabled ? cfg.images.filter((image) => image.enabled && image.url) : []),
    [cfg],
  )
  const hasImageBg = slides.length > 0

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuroraBackground />
      <ServiceNavbar />

      <main className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12 pt-32 pb-20">
        {title && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-[2rem] border border-black/10 dark:border-white/10 mb-10"
          >
            {/* Gradient layers sit under the carousel and act as the visual
                fallback when no images are available. */}
            <div className="absolute inset-0 z-0">
              <div className="absolute -inset-[40%] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent opacity-60 dark:from-cyan-400/25" />
              <div className="absolute -bottom-[60%] -right-[30%] bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent opacity-50 dark:from-purple-400/25" />
              <div className="absolute -bottom-[40%] -left-[20%] bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent opacity-40 dark:from-amber-400/20" />
            </div>

            <HeroCarousel slides={slides} intervalSeconds={cfg.intervalSeconds} />

            <div className="relative z-10 px-6 md:px-12 py-12 md:py-16 text-center">
              {eyebrow && (
                <span className={hasImageBg ? 'eyebrow text-white/80 [&_*]:text-white/80' : 'eyebrow'}>
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
                      ? 'text-sm md:text-base text-white/85 drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)] mt-4 max-w-2xl mx-auto leading-relaxed'
                      : 'text-sm md:text-base text-black/60 dark:text-white/60 mt-4 max-w-2xl mx-auto leading-relaxed'
                  }
                >
                  {subtitle}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {children}
      </main>

      <Footer />
    </div>
  )
}
