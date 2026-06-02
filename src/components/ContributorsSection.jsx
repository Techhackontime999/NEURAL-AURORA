import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, Github, ExternalLink, Star, Users } from 'lucide-react'
import { getAdminSettings } from '../lib/supabase'
import { cn } from '../lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 20 } },
}

export default function ContributorsSection({ className }) {
  const [contributors, setContributors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminSettings()
      .then(admin => {
        const list = admin?.payment_settings?.contributors || []
        const sorted = [...list].sort((a, b) => {
          const aIsDonor = /donor/i.test(a.role)
          const bIsDonor = /donor/i.test(b.role)
          if (aIsDonor && !bIsDonor) return -1
          if (!aIsDonor && bIsDonor) return 1
          if (aIsDonor && bIsDonor) {
            if ((b.amount || 0) !== (a.amount || 0)) return (b.amount || 0) - (a.amount || 0)
            return a.name.localeCompare(b.name)
          }
          return a.name.localeCompare(b.name)
        })
        setContributors(sorted)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className={cn('relative z-10 py-32 md:py-40', className)}>
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <span className="eyebrow">Contributors</span>
          <h2 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tighter leading-none">
            People Behind <span className="text-gradient">NEURAL AURORA</span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-black/50 dark:text-white/40 max-w-2xl leading-relaxed">
            Every contributor — developer or donor — helps keep this project free and open-source.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="glass-panel rounded-2xl p-6 animate-pulse"
              >
                <div className="h-4 w-24 bg-black/10 dark:bg-white/10 rounded mb-3" />
                <div className="h-3 w-16 bg-black/5 dark:bg-white/5 rounded mb-3" />
                <div className="h-3 w-20 bg-black/5 dark:bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : contributors.length === 0 ? null : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {contributors.map((contributor) => (
              <motion.div
                key={`${contributor.name}-${contributor.role}`}
                variants={cardVariants}
                className="glass-panel rounded-2xl p-6 flex flex-col items-center text-center group hover:shadow-lg transition-shadow duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>

                <h3 className="font-display font-semibold text-sm text-black/80 dark:text-white/90 mb-1.5">
                  {contributor.name}
                </h3>

                <span className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-medium mb-3',
                  /donor/i.test(contributor.role)
                    ? 'bg-rose-500/10 text-rose-400'
                    : 'bg-cyan-500/10 text-cyan-400',
                )}>
                  {/donor/i.test(contributor.role) ? (
                    <Heart className="w-2.5 h-2.5" />
                  ) : (
                    <Star className="w-2.5 h-2.5" />
                  )}
                  {contributor.role}
                </span>

                {contributor.amount != null && (
                  <p className="text-[11px] text-black/40 dark:text-white/30 font-mono">
                    ₹{contributor.amount.toLocaleString('en-IN')}
                  </p>
                )}

                {contributor.github && (
                  <a
                    href={contributor.github}
                    target="_self"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex items-center gap-1.5 text-[10px] text-black/40 dark:text-white/30 hover:text-cyan-400 transition-colors duration-300 pt-3"
                  >
                    <Github className="w-3 h-3" />
                    GitHub
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </motion.div>
            ))}

            {/* Become a Contributor CTA */}
            <motion.a
              variants={cardVariants}
              href="/support"
              className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center text-center group border border-dashed border-cyan-500/30 hover:border-cyan-500/60 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Heart className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="font-display font-semibold text-sm text-black/80 dark:text-white/90 mb-1">
                Become a Contributor
              </h3>
              <p className="text-[10px] text-black/40 dark:text-white/30 leading-relaxed">
                Support the project & get listed here
              </p>
            </motion.a>
          </motion.div>
        )}
      </div>
    </section>
  )
}
