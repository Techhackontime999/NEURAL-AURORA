import { motion } from 'framer-motion'
import { useSkills } from '../lib/usePortfolioData'

const categories = [
  { key: 'frontend', label: 'Frontend', color: '#00f0ff' },
  { key: 'backend', label: 'Backend', color: '#b829dd' },
  { key: 'language', label: 'Languages', color: '#f0c040' },
  { key: 'devops', label: 'DevOps', color: '#ff006e' },
  { key: 'design', label: 'Design', color: '#00ff87' },
]

function SkillBar({ name, level, color, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 80, damping: 18 }}
      className="space-y-2"
    >
      <div className="flex justify-between items-center">
        <span className="text-sm text-black/60 dark:text-white/60">{name}</span>
        <span className="text-xs text-black/40 dark:text-white/30 font-mono">{level}%</span>
      </div>
      <div className="h-[2px] bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${level}%` }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + index * 0.05, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full animate-shimmer"
            style={{ background: `linear-gradient(90deg, ${color}, ${color}88, ${color})` }}
          />
      </div>
    </motion.div>
  )
}

export default function Skills() {
  const skills = useSkills()
  return (
    <section id="skills" className="relative z-10 py-32 md:py-40">
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <span className="eyebrow">Expertise</span>
          <h2 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tighter leading-none">
            Technical <span className="text-gradient">Stack</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {categories.map((cat, catIdx) => {
            const catSkills = skills.filter((s) => s.category === cat.key)
            return (
              <motion.div
                key={cat.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: catIdx * 0.1, type: 'spring', stiffness: 80, damping: 20 }}
                className="glass-panel rounded-[2rem] p-8 md:p-10"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: cat.color }}
                  />
                  <span className="text-xs uppercase tracking-[0.15em] text-black/50 dark:text-white/40 font-medium">
                    {cat.label}
                  </span>
                </div>
                <div className="space-y-5">
                  {catSkills.map((skill, i) => (
                    <SkillBar
                      key={skill.name}
                      {...skill}
                      color={cat.color}
                      index={i}
                    />
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
