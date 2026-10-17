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
            className="text-center mb-10"
          >
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}

            <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-4">
              {title}
            </h1>

            {subtitle && (
              <p className="text-sm text-black/50 dark:text-white/50 mt-3 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </motion.div>
        )}

        {children}
      </main>

      <Footer />
    </div>
  )
}
