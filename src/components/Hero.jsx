import { motion } from 'framer-motion'
import { usePersonalInfo, useSocialLinks } from '../lib/usePortfolioData'
import { SplineScene } from './ui/splite'
import { Spotlight } from './ui/spotlight'
import MagneticButton from './ui/magnetic-button'

const iconMap = {
  github: 'M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z',
  linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  code: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
  terminal: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
  x: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  youtube: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
}

function SocialIcon({ name, url }) {
  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className="w-10 h-10 rounded-full glass-panel flex items-center justify-center group hover:scale-110 active:scale-95"
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-4 h-4 text-black/40 dark:text-white/40 group-hover:text-black/80 dark:group-hover:text-white/80 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
      >
        <path d={iconMap[name] || iconMap.github} />
      </svg>
    </motion.a>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 150, damping: 20 },
  },
}

export default function Hero() {
  const { data: personalInfo } = usePersonalInfo()
  const socialLinks = useSocialLinks()
  return (
    <section
      id="hero"
      className="relative min-h-[100dvh] flex items-center z-10"
    >
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12 py-24">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 gap-12 md:gap-20 items-center"
        >
          <div className="space-y-8">
            <motion.div variants={itemVariants}>
              <span className="eyebrow">{personalInfo.title}</span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tighter leading-none"
            >
              <span className="text-black/80 dark:text-white">{personalInfo.name.split(' ').slice(0, -1).join(' ')}</span>{' '}
              <span className="text-gradient">{personalInfo.name.split(' ').pop()}</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-black/50 dark:text-white/40 leading-relaxed max-w-[65ch]"
            >
              {personalInfo.tagline}
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
              {socialLinks.map((link) => (
                <SocialIcon key={link.label} name={link.icon} url={link.url} />
              ))}
            </motion.div>

            <motion.div variants={itemVariants} className="flex gap-4 pt-2">
              <MagneticButton
                as="a"
                href="#projects"
                onClick={(e) => {
                  e.preventDefault()
                  document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-black/60 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              >
                View Projects
                <span className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </MagneticButton>
              <MagneticButton
                as="a"
                href={personalInfo.resume}
                download
                className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/80 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              >
                Resume
                <span className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
              </MagneticButton>
            </motion.div>
          </div>

          <motion.div
            variants={itemVariants}
            className="relative hidden md:block"
          >
            <div className="relative w-full h-[480px] mx-auto rounded-[2rem] overflow-hidden bg-[var(--bg-secondary)] border border-black/10 dark:border-white/[0.06]">
              <Spotlight
                className="-top-40 left-0 md:left-60 md:-top-20"
                fill="white"
              />
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="absolute top-4 left-4 glass-panel-strong rounded-xl px-4 py-2">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.1em]">Available for</p>
                  <p className="text-xs font-medium text-[var(--text-primary)]">Collaboration</p>
                </div>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="px-5 py-2.5 rounded-2xl backdrop-blur-sm border border-[#00f0ff]/20"
                    style={{ background: 'var(--glass-bg)' }}
                  >
                    <span className="text-xs md:text-sm font-display font-bold tracking-[0.15em] dark:text-[#00f0ff] text-[#00a0ff] ">
                      {personalInfo.handle}
                    </span>
                  </motion.div>
                </div>
              </div>
              <SplineScene
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-full"
              />
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-5 h-8 rounded-full border border-black/10 dark:border-white/10 flex items-start justify-center pt-2"
          >
            <div className="w-1 h-2 rounded-full bg-black/30 dark:bg-white/30" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
