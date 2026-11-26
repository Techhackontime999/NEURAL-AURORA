import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { usePublicSiteSettings, useSocialLinks } from '../lib/usePortfolioData'
import { submitContactMessage } from '../lib/supabase'

function normalizeWhatsAppNumber(value) {
  return String(value || '').replace(/[^\d]/g, '')
}

function WhatsAppIcon({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.52 3.48A11.94 11.94 0 0 0 12.02 0C5.4 0 .02 5.38.02 12c0 2.12.55 4.19 1.6 6.02L0 24l6.15-1.61A11.95 11.95 0 0 0 12.02 24C18.64 24 24 18.62 24 12c0-3.2-1.25-6.21-3.48-8.52ZM12.02 21.8c-1.86 0-3.68-.5-5.27-1.44l-.38-.23-3.65.96.97-3.56-.25-.37A9.77 9.77 0 0 1 2.22 12c0-5.4 4.4-9.8 9.8-9.8 2.62 0 5.08 1.02 6.93 2.87A9.73 9.73 0 0 1 21.82 12c0 5.4-4.4 9.8-9.8 9.8Zm5.37-7.34c-.29-.15-1.72-.85-1.99-.95-.27-.1-.46-.15-.66.15-.2.29-.76.95-.93 1.14-.17.2-.34.22-.63.07-.29-.15-1.23-.45-2.34-1.44-.86-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.52-.07-.15-.66-1.59-.9-2.18-.24-.57-.48-.5-.66-.5h-.56c-.2 0-.52.07-.79.37-.27.29-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.72-.7 1.96-1.38.24-.68.24-1.26.17-1.38-.07-.12-.27-.2-.56-.34Z" />
    </svg>
  )
}

export default function Contact() {
  const { t } = useTranslation()
  const { data: socialLinks } = useSocialLinks()
  const { data: publicSettings = {} } = usePublicSiteSettings()
  const whatsappNumber = normalizeWhatsAppNumber(publicSettings?.whatsapp_number)
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : ''
  const [form, setForm] = useState({ name: '', email: '', message: '', hp_field: '' })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    // Bot honeypot trap
    if (form.hp_field) {
      setStatus('sent')
      return
    }
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return
    setStatus('sending')
    setError('')
    try {
      await submitContactMessage({
        name: form.name,
        email: form.email,
        message: form.message,
      })
      setStatus('sent')
      setForm({ name: '', email: '', message: '', hp_field: '' })
      setTimeout(() => setStatus('idle'), 5000)
    } catch (err) {
      setError(err.message || 'Failed to send message')
      setStatus('idle')
    }
  }

  return (
    <section id="contact" className="relative z-10 py-32 md:py-40">
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={{
            visible: { transition: { staggerChildren: 0.12 } },
          }}
          className="grid md:grid-cols-2 gap-16 md:gap-24"
        >
          <div className="space-y-8">
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 20 } },
              }}
            >
              <span className="eyebrow">{t('contact.eyebrow')}</span>
              <h2 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tighter leading-none">
                {t('contact.titleLetsBuild')}{' '}
                <span className="text-gradient">{t('contact.titleTogether')}</span>
              </h2>
              <p className="mt-4 text-base text-black/50 dark:text-white/40 max-w-[65ch] leading-relaxed">
                {t('contact.subtitle')}
              </p>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 20 } },
              }}
              className="glass-panel rounded-[2rem] p-8 md:p-10 space-y-4"
            >
              <h3 className="text-xs uppercase tracking-[0.15em] text-black/40 dark:text-white/30 font-medium">
                {t('contact.findMeOn')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {socialLinks.map((link) => (
                  <motion.a
                    key={link.label}
                    href={link.url}
                    target="_self"
                    rel="noopener noreferrer"
                    whileHover={{ x: 4 }}
                    className="group flex items-center gap-2 text-sm text-black/50 dark:text-white/40 hover:text-black/80 dark:hover:text-white/80 transition-colors duration-300"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-black/10 dark:bg-white/10 group-hover:bg-[#00f0ff]" />
                    {link.label}
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {whatsappLink && (
              <motion.a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 20 } },
                }}
                whileHover={{ y: -2 }}
                className="group flex items-center gap-4 rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/[0.06] p-5 transition-colors hover:bg-emerald-500/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
                  <WhatsAppIcon className="w-6 h-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-black/80 dark:text-white/85">{t('contact.whatsappSupport', 'WhatsApp Support')}</p>
                  <p className="text-xs text-black/45 dark:text-white/40">{t('contact.whatsappSupportHint', 'Chat directly on WhatsApp for quick support.')}</p>
                </div>
                <span className="shrink-0 text-emerald-500 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </span>
              </motion.a>
            )}
          </div>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 60, damping: 20 } },
            }}
          >
            <form onSubmit={handleSubmit} className="glass-panel rounded-[2rem] p-8 md:p-10 space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-xs text-black/50 dark:text-white/40 uppercase tracking-[0.1em]">
                  {t('contact.nameLabel')}
                </label>
                <input
                  type="text"
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('contact.namePlaceholder')}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-sm text-black/70 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/20 outline-none focus:border-black/20 dark:focus:border-white/10 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs text-black/50 dark:text-white/40 uppercase tracking-[0.1em]">
                  {t('contact.emailLabel')}
                </label>
                <input
                  type="email"
                  id="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={t('contact.emailPlaceholder')}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-sm text-black/70 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/20 outline-none focus:border-black/20 dark:focus:border-white/10 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="block text-xs text-black/50 dark:text-white/40 uppercase tracking-[0.1em]">
                  {t('contact.messageLabel')}
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={t('contact.messagePlaceholder')}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-sm text-black/70 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/20 outline-none focus:border-black/20 dark:focus:border-white/10 transition-all duration-300 resize-none"
                />
              </div>

              {/* Spam Honeypot Field */}
              <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
                <input
                  type="text"
                  name="website"
                  tabIndex="-1"
                  value={form.hp_field}
                  onChange={(e) => setForm({ ...form, hp_field: e.target.value })}
                  autoComplete="off"
                />
              </div>

              {status === 'sent' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full py-3.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-500 text-center"
                >
                  {t('contact.sentSuccess')}
                </motion.div>
              ) : (
                <motion.button
                  type="submit"
                  disabled={status === 'sending'}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === 'sending' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {t('contact.sending')}
                    </span>
                  ) : t('contact.sendMessage')}
                </motion.button>
              )}

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400 text-center">
                  {error}
                </motion.p>
              )}
            </form>
          </motion.div>
        </motion.div>
      </div>

      <div className="mt-24">
        <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="glow-line" />
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-8">
            <p className="text-xs text-black/30 dark:text-white/20">
              {t('contact.tagline')}
            </p>
            <p className="text-xs text-black/30 dark:text-white/20">
              {t('contact.builtWith')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
