import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Check, FileText, Link2, Share2, Smartphone } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { SITE_NAME, toAbsoluteUrl } from '../../lib/documentHead'
import { nativeSharePayload, productShareLinks, productShareUrl } from '../../lib/productShare'

const CHANNEL_STYLES = {
  x: { background: '#0f172a', color: '#ffffff' },
  linkedin: { background: '#0a66c2', color: '#ffffff' },
  facebook: { background: '#1877f2', color: '#ffffff' },
  whatsapp: { background: '#25d366', color: '#052e16' },
  telegram: { background: '#229ed9', color: '#ffffff' },
  email: { background: '#f59e0b', color: '#1c1917' },
}

const PANEL_WIDTH = 320
const PANEL_HEIGHT = 480
const MOBILE_QUERY = '(max-width: 640px)'

export default function ShareMenu({ slug, title, description = '', image = '', className = '' }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const reduceMotion = Boolean(useReducedMotion())
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const copyTimerRef = useRef(null)

  const url = productShareUrl(slug)
  const links = productShareLinks({ slug, title, description })
  const previewImage = toAbsoluteUrl(image)
  const domain = (() => {
    try {
      return new URL(url).host
    } catch {
      return 'neural-aurora.vercel.app'
    }
  })()
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const close = () => setOpen(false)

  useEffect(() => setPreviewFailed(false), [previewImage])

  function toggle() {
    if (open) {
      close()
      return
    }

    const mobile = typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
    setIsMobile(mobile)

    if (!mobile) {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) {
        const maxLeft = Math.max(12, window.innerWidth - PANEL_WIDTH - 12)
        const left = Math.min(Math.max(12, rect.right - PANEL_WIDTH), maxLeft)
        const below = rect.bottom + 10
        const preferredTop =
          below + PANEL_HEIGHT > window.innerHeight
            ? rect.top - PANEL_HEIGHT - 10
            : below
        const maxTop = Math.max(12, window.innerHeight - PANEL_HEIGHT - 12)
        const top = Math.min(Math.max(12, preferredTop), maxTop)
        setPosition({ top, left })
      }
    }

    setCopied(false)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return
      if (panelRef.current?.contains(event.target)) return
      close()
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        close()
        triggerRef.current?.focus()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = [
        ...panelRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled])'
        ),
      ]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    if (!isMobile) window.addEventListener('scroll', close, true)

    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector('[data-share-initial-focus]')?.focus()
      panelRef.current?.querySelector('input')?.select()
    })

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open, isMobile])

  useEffect(() => {
    if (!open || !isMobile) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open, isMobile])

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    },
    []
  )

  async function copyLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        // Older browsers and insecure preview origins still get a working
        // copy action instead of a dead control.
        const field = document.createElement('textarea')
        field.value = url
        field.setAttribute('readonly', '')
        field.style.position = 'fixed'
        field.style.opacity = '0'
        document.body.appendChild(field)
        field.select()
        const ok = document.execCommand('copy')
        field.remove()
        if (!ok) throw new Error('copy blocked')
      }

      setCopied(true)
      toast.success(t('store.shareCopied'))
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 2200)
    } catch {
      toast.error(t('store.shareCopyFailed'))
    }
  }

  async function nativeShare() {
    close()
    try {
      await navigator.share(nativeSharePayload({ slug, title, description }))
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error(t('store.shareFailed'))
    }
  }

  const scrimMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }

  const panelMotion = isMobile
    ? reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
      : {
          initial: { opacity: 0.7, y: '100%' },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: '100%' },
          transition: { type: 'spring', damping: 32, stiffness: 340 },
        }
    : reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
      : {
          initial: { opacity: 0, y: 10, scale: 0.98 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: 6, scale: 0.98 },
          transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
        }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label={t('store.shareProduct')}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={t('store.shareProduct')}
        className={`group inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/60 hover:text-cyan-500 active:translate-y-0 active:scale-95 dark:border-white/10 ${className}`}
      >
        <Share2
          className="h-4 w-4 transition-transform duration-200 group-hover:rotate-[-8deg]"
          aria-hidden="true"
        />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                {isMobile && (
                  <motion.div
                    key="share-scrim"
                    {...scrimMotion}
                    className="fixed inset-0 z-[99989] bg-black/50 backdrop-blur-[2px]"
                    aria-hidden="true"
                    onClick={close}
                  />
                )}

                <motion.div
                  key="share-panel"
                  ref={panelRef}
                  {...panelMotion}
                  role="dialog"
                  aria-modal={isMobile ? 'true' : undefined}
                  aria-label={t('store.shareProduct')}
                  style={
                    isMobile
                      ? undefined
                      : {
                          position: 'fixed',
                          top: position.top,
                          left: position.left,
                          width: PANEL_WIDTH,
                        }
                  }
                  className={
                    isMobile
                      ? 'glass-panel fixed inset-x-0 bottom-0 z-[99990] max-h-[88svh] overflow-y-auto rounded-t-2xl border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl'
                      : 'glass-panel z-[99990] overflow-hidden rounded-2xl border shadow-[0_24px_70px_-20px_rgba(0,0,0,0.45)]'
                  }
                >
                  {isMobile && (
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15 dark:bg-white/20" aria-hidden="true" />
                  )}

                  <div className={`flex items-center gap-3 ${isMobile ? 'pb-4' : 'border-b border-black/5 p-4 pb-3 dark:border-white/5'}`}>
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">
                      {previewImage && !previewFailed ? (
                        <img
                          src={previewImage}
                          alt=""
                          onError={() => setPreviewFailed(true)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-400/15 via-violet-500/10 to-transparent">
                          <FileText className="h-5 w-5 text-[var(--text-tertiary)]" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-500">
                        {domain}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-[var(--text-primary)]">
                        {title || SITE_NAME}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--text-secondary)]">
                        {description || t('store.sharePreviewHint')}
                      </p>
                    </div>
                  </div>

                  <div className={isMobile ? 'pb-4' : 'px-4 pb-3'}>
                    <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-1 pl-3 dark:border-white/10 dark:bg-white/[0.03]">
                      <input
                        readOnly
                        value={url}
                        aria-label={t('store.shareLinkLabel')}
                        onFocus={(event) => event.target.select()}
                        onClick={(event) => event.target.select()}
                        className="min-w-0 flex-1 bg-transparent text-[11px] text-[var(--text-secondary)] outline-none"
                      />
                      <button
                        type="button"
                        data-share-initial-focus
                        onClick={copyLink}
                        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-black/90 px-3 text-[10px] font-semibold uppercase tracking-widest text-white transition-all hover:bg-black active:scale-95 dark:bg-white/90 dark:text-black dark:hover:bg-white"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span aria-live="polite">
                          {copied ? t('store.shareCopiedShort') : t('store.shareCopyLink')}
                        </span>
                      </button>
                    </div>
                  </div>

                  {canNativeShare && (
                    <div className={isMobile ? 'pb-4' : 'px-4 pb-3'}>
                      <button
                        type="button"
                        onClick={nativeShare}
                        className="flex min-h-11 w-full items-center justify-between rounded-xl border border-black/10 px-3 text-xs text-[var(--text-primary)] transition-all hover:border-cyan-400/50 hover:bg-cyan-400/5 active:scale-[0.99] dark:border-white/10"
                      >
                        <span className="flex items-center gap-2.5">
                          <Smartphone className="h-4 w-4 text-cyan-500" aria-hidden="true" />
                          {t('store.shareWithDevice')}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
                      </button>
                    </div>
                  )}

                  <div className={isMobile ? 'pb-4' : 'px-4 pb-4'}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                      {t('store.shareChannels')}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {links.map((link) => (
                        <a
                          key={link.id}
                          href={link.href}
                          {...(link.external
                            ? { target: '_blank', rel: 'noopener noreferrer' }
                            : {})}
                          onClick={close}
                          className="group flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-xl border border-black/5 px-2 py-3 text-center text-[10px] font-medium text-[var(--text-secondary)] transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-cyan-400/5 hover:text-[var(--text-primary)] active:translate-y-0 active:scale-[0.98] dark:border-white/5"
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold uppercase leading-none shadow-sm transition-transform duration-200 group-hover:scale-105"
                            style={CHANNEL_STYLES[link.id]}
                          >
                            {link.mark}
                          </span>
                          <span className="w-full truncate">{t(link.labelKey)}</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  <p className={`text-[10px] leading-relaxed text-[var(--text-tertiary)] ${isMobile ? 'pb-1' : 'px-4 pb-4'}`}>
                    {t('store.shareHint')}
                  </p>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
