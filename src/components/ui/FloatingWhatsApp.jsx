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
  const whatsappNumber = normalizeWhatsAppNumber(publicSettings?.whatsapp_number)
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : ''

  return (
    <AnimatePresence>
      {whatsappLink && (
        <motion.a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="group fixed left-4 sm:left-5 bottom-[calc(6rem+env(safe-area-inset-bottom))] md:bottom-6 z-[9990] inline-flex items-center gap-0 sm:gap-3 rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_-10px_rgba(37,211,102,0.75)] hover:bg-[#20bd5a] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          aria-label={t('contact.whatsappSupport', 'WhatsApp Support')}
          title={t('contact.whatsappSupport', 'WhatsApp Support')}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full">
            <WhatsAppIcon className="w-7 h-7" />
          </span>
          <span className="hidden sm:block max-w-0 overflow-hidden whitespace-nowrap pr-0 text-sm font-medium opacity-0 transition-all duration-300 group-hover:max-w-[10rem] group-hover:pr-5 group-hover:opacity-100">
            {t('contact.whatsappSupport', 'WhatsApp Support')}
          </span>
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 opacity-60" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-white/90" />
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  )
}
