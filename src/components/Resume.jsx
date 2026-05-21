import { motion } from 'framer-motion'
import { usePersonalInfo } from '../lib/usePortfolioData'

export default function Resume() {
  const personalInfo = usePersonalInfo()
  return (
    <section id="resume" className="relative z-10 py-32 md:py-40">
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="relative z-10 max-w-xl mx-auto space-y-8">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="eyebrow"
            >
              Curriculum Vitae
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tighter leading-none"
            >
              Download My <span className="text-gradient">Resume</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-base text-black/50 dark:text-white/40 leading-relaxed"
            >
              A comprehensive overview of my experience, projects, and technical expertise. Updated regularly to reflect my latest work.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <motion.a
                href={personalInfo.resume}
                download
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-black/70 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white active:scale-[0.97] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </motion.a>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="text-xs text-black/30 dark:text-white/20"
            >
              PDF format . 2.4 MB
            </motion.p>
          </div>

          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-[#00f0ff]/5 rounded-full blur-[80px]" />
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-[#b829dd]/5 rounded-full blur-[60px]" />
        </motion.div>
      </div>
    </section>
  )
}
