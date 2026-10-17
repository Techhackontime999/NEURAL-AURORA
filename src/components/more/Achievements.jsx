import { motion, useReducedMotion } from 'framer-motion'
import { Trophy, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAchievements } from '../../lib/usePortfolioData'
import MorePageShell, { EmptyState } from './MorePageShell'

function AchievementCard({ item, index }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0, x: -20 },
        visible: {
          opacity: 1,
          x: 0,
          transition: { delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className="relative pl-8 pb-8 border-l border-black/10 dark:border-white/10"
    >
      <motion.div
        className="absolute left-0 top-0 -translate-x-1/2 w-8 h-8 rounded-full bg-[var(--bg-secondary)] border border-black/10 dark:border-white/10 flex items-center justify-center"
        animate={shouldReduceMotion ? {} : { y: [0, -3, 0] }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }
        }
      >
        <Trophy className="w-3.5 h-3.5 text-black/50 dark:text-white/50" />
      </motion.div>

      <div className="glass-panel rounded-xl p-4">
        {item.achieved_date && (
          <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30 font-medium">
            {item.achieved_date}
          </span>
        )}

        <h3 className="text-sm font-semibold text-black/80 dark:text-white/80 mt-1">
          {item.title}
        </h3>

        {item.organization && (
          <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">
            {item.organization}
          </p>
        )}

        {item.description && (
          <p className="text-xs text-black/40 dark:text-white/40 mt-2 leading-relaxed">
            {item.description}
          </p>
        )}

        {item.link_url && (
          <a
            href={item.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            {item.link_url.replace(/^https?:\/\//, '').slice(0, 40)}
          </a>
        )}
      </div>
    </motion.div>
  )
}

export default function Achievements() {
  const { t } = useTranslation()
  const { data: achievements } = useAchievements()

  return (
    <MorePageShell
      eyebrow={t('more.eyebrow')}
      title={t('more.achievements')}
      subtitle={t('more.achievementsSubtitle')}
    >
      {achievements.length === 0 ? (
        <EmptyState message={t('more.noAchievements')} />
      ) : (
        <div className="grid md:grid-cols-2 gap-x-12">
          {achievements.map((item, i) => (
            <AchievementCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </MorePageShell>
  )
}
