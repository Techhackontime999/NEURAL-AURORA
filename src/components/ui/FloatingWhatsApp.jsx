import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { usePublicSiteSettings } from '../../lib/usePortfolioData'

function normalizeWhatsAppNumber(value) {
  return String(value || '').replace(/[^\d]/g, '')
}

function WhatsAppIcon({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.52 3.48A11.94 11.94 0 0 0 12.02 0C5.4 0 .02 5.38.02 12c0 2.12.55 4.19 1.6 6.02L0 24l6.15-1.61A11.95 11.95 0 0 0 12.02 24C18.64 24 24 18.62 24 12c0-3.2-1.25-6.21-3.48-8.52ZM12.02 21.8c-1.86 0-3.68-.5-5.27-1.44l-.38-.23-3.65.96.97-3.56-.25-.37A9.77 9.77 0 0 1 2.22 12c0-5.4 4.4-9.8 9.8-9.8 2.62 0 5.08 1.02 6.93 2.87A9.73 9.73 0 0 1 21.82 12c0 5.4-4.4 9.8-9.8 9.8Zm5.37-7.34c-.29-.15-1.72-.85-1.99-.95-.27-.1-.46-.15-.66.15-.2.29-.76.95-.93 1.14-.17.2-.34.22-.63.07-.29-.15-1.23-.45-2.34-1.44-.86-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.52-.07-.15-.66-1.59-.9-2.18-.24-.57-.48-.5-.66-.5h-.56c-.2 0-.52.07-.79.37-.27.29-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.72-.7 1.96-1.38.24-.68.24-1.26.17-1.38-.07-.12-.27-.2-.56-.34Z" />
    </svg>
  )
}

export default function FloatingWhatsApp() {
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()
  const { data: publicSettings = {} } = usePublicSiteSettings()
  const [showHint, setShowHint] = useState(false)
  const whatsappNumber = normalizeWhatsAppNumber(publicSettings?.whatsapp_number)
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : ''

  useEffect(() => {
    if (!whatsappLink) return undefined
    setShowHint(true)
    const timer = setTimeout(() => setShowHint(false), 4200)
    return () => clearTimeout(timer)
  }, [whatsappLink])

  return (
    <AnimatePresence>
      {whatsappLink && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed left-4 sm:left-5 bottom-[calc(6rem+env(safe-area-inset-bottom))] md:bottom-6 z-[9990]"
        >
          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="absolute bottom-full left-0 mb-3 w-max max-w-[min(15rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#111827]/90 px-3.5 py-2.5 text-left shadow-[0_18px_40px_-20px_rgba(0,0,0,0.65)] backdrop-blur-xl"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-300/90">
                  {t('contact.whatsappSupport', 'WhatsApp Support')}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/70">
                  {t('contact.whatsappSupportHint', 'Chat directly on WhatsApp for quick support.')}
                </p>
                <span className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 border-b border-r border-white/10 bg-[#111827]/90" aria-hidden="true" />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.01 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-emerald-300/20 bg-[#111827]/80 p-1.5 pr-1.5 sm:pr-4 text-white shadow-[0_16px_40px_-18px_rgba(16,185,129,0.55)] backdrop-blur-xl transition-colors hover:bg-[#111827]/92 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
            aria-label={t('contact.whatsappSupport', 'WhatsApp Support')}
            title={t('contact.whatsappSupport', 'WhatsApp Support')}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-400/5 opacity-80" aria-hidden="true" />
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#25D366] to-[#16a34a] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_20px_-10px_rgba(37,211,102,0.9)]">
              <WhatsAppIcon className="w-5 h-5" />
            </span>
            <span className="relative hidden sm:flex flex-col items-start leading-none pr-1">
              <span className="text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">WhatsApp</span>
              <span className="mt-1 text-sm font-medium text-white/92">{t('contact.whatsappSupport', 'Support')}</span>
            </span>
            <span className="absolute right-1 top-1 flex h-2.5 w-2.5 sm:right-2 sm:top-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/70 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_0_2px_rgba(17,24,39,0.9)]" />
            </span>
          </motion.a>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
