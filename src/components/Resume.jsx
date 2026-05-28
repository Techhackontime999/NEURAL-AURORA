import { motion, useScroll, useTransform } from 'framer-motion'
import { usePersonalInfo } from '../lib/usePortfolioData'
import MagneticButton from './ui/magnetic-button'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

const childVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 20 },
  },
}

function ParallaxBlur({ className, color, scrollOffset }) {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 1000], [0, scrollOffset])

  return (
    <motion.div style={{ y }} className={className}>
      <div className={`w-full h-full rounded-full blur-[80px] ${color}`} />
    </motion.div>
  )
}

export default function Resume() {
  const { data: personalInfo } = usePersonalInfo()
  return (
    <section id="resume" className="relative z-10 py-32 md:py-40">
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
          className="glass-panel rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="relative z-10 max-w-xl mx-auto space-y-8">
            <motion.span variants={childVariants} className="eyebrow">
              Curriculum Vitae
            </motion.span>

            <motion.h2 variants={childVariants} className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tighter leading-none">
              Download My <span className="text-gradient">Resume</span>
            </motion.h2>

            <motion.p variants={childVariants} className="text-base text-black/50 dark:text-white/40 leading-relaxed">
              A comprehensive overview of my experience, projects, and technical expertise. Updated regularly to reflect my latest work.
            </motion.p>

            <motion.div variants={childVariants}>
              <MagneticButton
                as="a"
                href={personalInfo.resume}
                download
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-black/70 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </MagneticButton>
            </motion.div>

            <motion.p variants={childVariants} className="text-xs text-black/30 dark:text-white/20">
              PDF format . 2.4 MB
            </motion.p>
          </div>

          <ParallaxBlur className="absolute -bottom-20 -right-20 w-60 h-60" color="bg-[#00f0ff]/5" scrollOffset={-40} />
          <ParallaxBlur className="absolute -top-20 -left-20 w-40 h-40" color="bg-[#b829dd]/5" scrollOffset={30} />
        </motion.div>
      </div>
    </section>
  )
}
