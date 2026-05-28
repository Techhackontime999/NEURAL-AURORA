import { motion } from 'framer-motion'
import { usePersonalInfo, useSocialLinks } from '../lib/usePortfolioData'

const staggerItem = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 80, damping: 20 },
  },
}

export default function About() {
  const { data: personalInfo } = usePersonalInfo()
  const socialLinks = useSocialLinks()
  return (
    <section id="about" className="relative z-10 py-32 md:py-40">
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
          className="grid md:grid-cols-2 gap-16 md:gap-24"
        >
          <div className="space-y-6">
            <motion.span variants={staggerItem} className="eyebrow">
              About
            </motion.span>
            <motion.h2
              variants={staggerItem}
              className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tighter leading-none"
            >
              Architect of
              <br />
              <span className="text-gradient">Digital Experience</span>
            </motion.h2>
            <motion.div variants={staggerItem} className="w-12 h-px bg-black/10 dark:bg-white/10" />
            <motion.p
              variants={staggerItem}
              className="text-base md:text-lg text-black/50 dark:text-white/40 leading-relaxed max-w-[65ch]"
            >
              {personalInfo.bio}
            </motion.p>
            <motion.p
              variants={staggerItem}
              className="text-sm text-black/40 dark:text-white/30 leading-relaxed max-w-[65ch]"
            >
              Known on the internet as <span className="text-black/70 dark:text-white/60 font-medium">{personalInfo.handle}</span>, I build systems where code meets visual poetry. Every project is an opportunity to push the boundaries of what a browser can do.
            </motion.p>
          </div>

          <motion.div
            variants={staggerItem}
            className="space-y-6"
          >
            <div className="glass-panel rounded-[2rem] p-8 md:p-10 space-y-6">
              <h3 className="text-xs uppercase tracking-[0.15em] text-black/40 dark:text-white/30 font-medium">
                Digital Footprint
              </h3>
              <div className="space-y-4">
                {socialLinks.slice(0, 4).map((link, index) => (
                  <motion.a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-3 group"
                  >
                    <span className="w-2 h-2 rounded-full bg-black/10 dark:bg-white/10 group-hover:bg-[#00f0ff] transition-colors duration-300 animate-float" style={{ animationDelay: `${index * 0.4}s` }} />
                    <span className="text-sm text-black/50 dark:text-white/40 group-hover:text-black/80 dark:group-hover:text-white/80 transition-colors duration-300">
                      {link.label}
                    </span>
                    <svg className="w-3 h-3 ml-auto text-black/30 dark:text-white/20 group-hover:text-black/40 dark:group-hover:text-white/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </motion.a>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-[2rem] p-8 md:p-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden glass-panel-strong">
                  <img
                    src={personalInfo.avatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-black/80 dark:text-white/80">{personalInfo.name}</p>
                  <p className="text-xs text-black/40 dark:text-white/30">Full-Stack Developer</p>
                </div>
              </div>
              <p className="text-xs text-black/40 dark:text-white/30 leading-relaxed">
                Currently building NEURAL AURORA and exploring the intersection of 3D graphics and web technology.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
