import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { usePersonalInfo, usePublicSiteSettings, useSocialLinks } from '../lib/usePortfolioData'

const staggerItem = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 80, damping: 20 },
  },
}

export default function About() {
  const { t } = useTranslation()
  const { data: personalInfo } = usePersonalInfo()
  const { data: socialLinks } = useSocialLinks()
  const { data: publicSettings = {} } = usePublicSiteSettings()
  const whatsappNumber = String(publicSettings?.whatsapp_number || '').replace(/[^\d]/g, '')
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : ''

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
              {t('about.eyebrow')}
            </motion.span>
            <motion.h2
              variants={staggerItem}
              className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tighter leading-none"
            >
              {t('about.titleArchitect')}
              <br />
              <span className="text-gradient">{t('about.titleDigitalExperience')}</span>
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
              {t('about.knownAsPrefix')} <span className="text-black/70 dark:text-white/60 font-medium">{personalInfo.handle}</span>{t('about.knownAsSuffix')}
            </motion.p>
          </div>

          <motion.div
            variants={staggerItem}
            className="space-y-6"
          >
            <div className="glass-panel rounded-[2rem] p-8 md:p-10 space-y-6">
              <h3 className="text-xs uppercase tracking-[0.15em] text-black/40 dark:text-white/30 font-medium">
                {t('about.digitalFootprint')}
              </h3>
              <div className="space-y-4">
                {socialLinks.slice(0, 4).map((link, index) => (
                  <motion.a
                    key={link.label}
                    href={link.url}
                    target="_self"
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
                {whatsappLink && (
                  <motion.a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-3 group"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500/30 group-hover:bg-emerald-400 transition-colors duration-300 animate-float" style={{ animationDelay: `${Math.min(socialLinks.length, 4) * 0.4}s` }} />
                    <span className="text-sm text-black/50 dark:text-white/40 group-hover:text-black/80 dark:group-hover:text-white/80 transition-colors duration-300">
                      WhatsApp Support
                    </span>
                    <svg className="w-3 h-3 ml-auto text-emerald-500/70 group-hover:text-emerald-400 transition-colors" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M20.52 3.48A11.94 11.94 0 0 0 12.02 0C5.4 0 .02 5.38.02 12c0 2.12.55 4.19 1.6 6.02L0 24l6.15-1.61A11.95 11.95 0 0 0 12.02 24C18.64 24 24 18.62 24 12c0-3.2-1.25-6.21-3.48-8.52ZM12.02 21.8c-1.86 0-3.68-.5-5.27-1.44l-.38-.23-3.65.96.97-3.56-.25-.37A9.77 9.77 0 0 1 2.22 12c0-5.4 4.4-9.8 9.8-9.8 2.62 0 5.08 1.02 6.93 2.87A9.73 9.73 0 0 1 21.82 12c0 5.4-4.4 9.8-9.8 9.8Zm5.37-7.34c-.29-.15-1.72-.85-1.99-.95-.27-.1-.46-.15-.66.15-.2.29-.76.95-.93 1.14-.17.2-.34.22-.63.07-.29-.15-1.23-.45-2.34-1.44-.86-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.52-.07-.15-.66-1.59-.9-2.18-.24-.57-.48-.5-.66-.5h-.56c-.2 0-.52.07-.79.37-.27.29-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.72-.7 1.96-1.38.24-.68.24-1.26.17-1.38-.07-.12-.27-.2-.56-.34Z"/>
                    </svg>
                  </motion.a>
                )}
              </div>
            </div>

            <div className="glass-panel rounded-[2rem] p-8 md:p-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden glass-panel-strong">
                  <img
                    src={personalInfo.avatar}
                    alt={t('about.avatarAlt')}
                    width={48}
                    height={48}
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-black/80 dark:text-white/80">{personalInfo.name}</p>
                  <p className="text-xs text-black/40 dark:text-white/30">{personalInfo.title}</p>
                </div>
              </div>
              <p className="text-xs text-black/40 dark:text-white/30 leading-relaxed">
                {t('about.currentFocus')}
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
