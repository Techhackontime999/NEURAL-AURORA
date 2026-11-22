import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import ServiceNavbar from '../ServiceNavbar'
import { Footer } from '../ui/footer-section'
import { useStoreHeroSettings } from '../../lib/usePortfolioData'
import { mergeStoreHeroConfig } from '../../lib/storeHeroDefaults'

/**
 * One still photograph behind the hero card. Images come from
 * admin_settings.store_hero (editable at /admin/store-hero) and fall back to
 * the curated default when nothing is saved. No timer and no focusable dots:
 * the hero is the work, not a slideshow.
 */
function HeroBackdrop({ image }) {
  const shouldReduceMotion = useReducedMotion()
  if (!image?.url) return null

  return (
    <div className="absolute inset-x-0 bottom-8 top-20 z-0 overflow-hidden" aria-hidden="true">
      <motion.img
        src={image.url}
        alt=""
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 1.03 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 h-full w-full object-cover"
        onError={(event) => {
          // A dead URL should never break the hero — the gradient scrim and
          // page colour underneath remain legible.
          event.currentTarget.style.display = 'none'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/75" />
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
  const shouldReduceMotion = useReducedMotion()
  const settings = useStoreHeroSettings()
  const cfg = useMemo(() => mergeStoreHeroConfig(settings), [settings])
  const heroImage = useMemo(
    () => (cfg.enabled ? cfg.images.find((image) => image.enabled && image.url) : null),
    [cfg],
  )
  const hasImageBg = Boolean(heroImage)

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ServiceNavbar />

      <main className="wrap relative z-10 pb-0 pt-0">
        {title && (
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden rounded-[2rem] border border-black/10 pb-20 pt-24 dark:border-white/10 md:pb-24 md:pt-28"
          >
            <HeroBackdrop image={heroImage} />

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
