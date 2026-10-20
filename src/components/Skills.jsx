import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSkills } from '../lib/usePortfolioData'

const categories = [
  { key: 'frontend', labelKey: 'skills.categories.frontend', color: '#00f0ff' },
  { key: 'backend', labelKey: 'skills.categories.backend', color: '#b829dd' },
  { key: 'webdev', labelKey: 'skills.categories.webdev', color: '#22d3ee' },
  { key: 'appdev', labelKey: 'skills.categories.appdev', color: '#a78bfa' },
  { key: 'ai', labelKey: 'skills.categories.ai', color: '#34d399' },
  { key: 'ai-automation', labelKey: 'skills.categories.aiAutomation', color: '#10b981' },
  { key: 'vibecoding', labelKey: 'skills.categories.vibecoding', color: '#f59e0b' },
  { key: 'ai-tools', labelKey: 'skills.categories.aiTools', color: '#f97316' },
  { key: 'soft-skills', labelKey: 'skills.categories.softSkills', color: '#ec4899' },
  { key: 'language', labelKey: 'skills.categories.language', color: '#f0c040' },
  { key: 'database', labelKey: 'skills.categories.database', color: '#38bdf8' },
  { key: 'cloud', labelKey: 'skills.categories.cloud', color: '#60a5fa' },
  { key: 'devops', labelKey: 'skills.categories.devops', color: '#ff006e' },
  { key: 'mobile', labelKey: 'skills.categories.mobile', color: '#a3e635' },
  { key: 'testing', labelKey: 'skills.categories.testing', color: '#c084fc' },
  { key: 'security', labelKey: 'skills.categories.security', color: '#ef4444' },
  { key: 'tools', labelKey: 'skills.categories.tools', color: '#94a3b8' },
  { key: 'design', labelKey: 'skills.categories.design', color: '#00ff87' },
  { key: 'other', labelKey: 'skills.categories.other', color: '#9ca3af' },
]

function SkillBar({ name, level, color, index, shouldReduceMotion }) {
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, x: -20 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={shouldReduceMotion ? undefined : { delay: index * 0.05, type: 'spring', stiffness: 80, damping: 18 }}
      className="space-y-2"
    >
      <div className="flex justify-between items-center">
        <span className="text-sm text-black/60 dark:text-white/60">{name}</span>
        <span className="text-xs text-black/40 dark:text-white/30 font-mono">{level}%</span>
      </div>
      <div className="h-[2px] bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={shouldReduceMotion ? { width: `${level}%` } : { width: 0 }}
          whileInView={shouldReduceMotion ? undefined : { width: `${level}%` }}
          viewport={{ once: true }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2 + index * 0.05, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full animate-shimmer"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}88, ${color})` }}
        />
      </div>
    </motion.div>
  )
}

export default function Skills() {
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()
  const { data: skills = [], isLoading, error } = useSkills()

  return (
    <section id="skills" className="relative z-10 py-32 md:py-40">
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 30 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={shouldReduceMotion ? undefined : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <span className="eyebrow">{t('skills.eyebrow')}</span>
          <h2 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tighter leading-none">
            {t('skills.titleTechnical')}{' '}
            <span className="text-gradient">{t('skills.titleStack')}</span>
          </h2>
        </motion.div>

        {error && (
          <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono">
            <span>⚠️</span>
            <span>{t('skills.offlineNotice')}</span>
          </div>
        )}

        {isLoading && (!skills || skills.length === 0) ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {categories.map((cat) => (
              <div key={cat.key} className="glass-panel rounded-[2rem] p-8 md:p-10 animate-pulse space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-black/20 dark:bg-white/20" />
                  <div className="h-4 w-24 bg-black/10 dark:bg-white/10 rounded" />
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="space-y-2">
                      <div className="h-3 w-28 bg-black/10 dark:bg-white/10 rounded" />
                      <div className="h-1 w-full bg-black/5 dark:bg-white/5 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !isLoading && (!skills || skills.length === 0) ? (
          <div className="glass-panel rounded-[2rem] p-12 text-center max-w-lg mx-auto">
            <p className="text-sm text-black/50 dark:text-white/40 font-mono">
              {t('skills.noData')}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {categories.map((cat, catIdx) => {
              const catSkills = skills.filter((s) => s.category === cat.key)
              return (
                <motion.div
                  key={cat.key}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 30 }}
                  whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={shouldReduceMotion ? undefined : { delay: catIdx * 0.1, type: 'spring', stiffness: 80, damping: 20 }}
                  className="glass-panel rounded-[2rem] p-8 md:p-10"
                >
                  <div className="flex items-center gap-3 mb-8">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: cat.color }}
                    />
                    <span className="text-xs uppercase tracking-[0.15em] text-black/50 dark:text-white/40 font-medium">
                      {t(cat.labelKey)}
                    </span>
                  </div>
                  <div className="space-y-5">
                    {catSkills.length > 0 ? (
                      catSkills.map((skill, i) => (
                        <SkillBar
                          key={`${cat.key}-${skill.name}-${i}`}
                          {...skill}
                          color={cat.color}
                          index={i}
                          shouldReduceMotion={shouldReduceMotion}
                        />
                      ))
                    ) : (
                      <p className="text-xs text-black/30 dark:text-white/30 italic font-mono">
                        {t('skills.noSkillsInCategory')}
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
