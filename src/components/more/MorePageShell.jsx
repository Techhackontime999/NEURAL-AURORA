import { motion } from 'framer-motion'
import MoreNavbar from '../MoreNavbar'
import AuroraBackground from '../AuroraBackground'
import { Footer } from '../ui/footer-section'

/**
 * Shared layout for the sub-pages of /more (Certificates, Achievements,
 * Gallery). Mirrors the shell used by More.jsx so every page in this section
 * has the same aurora background, navbar, header treatment and footer.
 */
export default function MorePageShell({ eyebrow, title, subtitle, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuroraBackground />
      <MoreNavbar />

      <main className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <span className="eyebrow">{eyebrow}</span>

          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-4">
            {title}
          </h1>

          {subtitle && (
            <p className="text-sm text-black/50 dark:text-white/50 mt-3 max-w-md mx-auto">
              {subtitle}
            </p>
          )}
        </motion.div>

        {children}
      </main>

      <Footer />
    </div>
  )
}

/** Empty-state placeholder reused by every sub-page when there is no data. */
export function EmptyState({ message }) {
  return (
    <div className="glass-panel rounded-xl p-6 text-center">
      <p className="text-xs text-black/40 dark:text-white/40">{message}</p>
    </div>
  )
}
