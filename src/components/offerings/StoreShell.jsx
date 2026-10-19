import { motion } from 'framer-motion'
import ServiceNavbar from '../ServiceNavbar'
import AuroraBackground from '../AuroraBackground'
import { Footer } from '../ui/footer-section'

/**
 * Shared shell for the digital-product store (/offerings/products and
 * /offerings/products/:slug). Deliberately reuses ServiceNavbar so the whole
 * /offerings section keeps one navigation, one theme toggle and one language
 * switcher — ServiceNavbar falls back to /offerings when an anchor like
 * "#pricing" does not exist on a store page.
 */
export default function StoreShell({ eyebrow, title, subtitle, children }) {
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
            <div className="absolute inset-0 z-0">
              <div className="absolute -inset-[40%] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent opacity-60 dark:from-cyan-400/25" />
              <div className="absolute -bottom-[60%] -right-[30%] bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent opacity-50 dark:from-purple-400/25" />
              <div className="absolute -bottom-[40%] -left-[20%] bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent opacity-40 dark:from-amber-400/20" />
            </div>
            <div className="relative z-10 px-6 md:px-12 py-12 md:py-16 text-center">
              {eyebrow && <span className="eyebrow">{eyebrow}</span>}

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-4">
                {title}
              </h1>

              {subtitle && (
                <p className="text-sm md:text-base text-black/60 dark:text-white/60 mt-4 max-w-2xl mx-auto leading-relaxed">
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
