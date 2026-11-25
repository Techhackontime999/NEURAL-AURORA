import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Check, Link2, Share2, Smartphone } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { SITE_NAME } from '../../lib/documentHead'
import { nativeSharePayload, productShareLinks, productShareUrl } from '../../lib/productShare'

const CHANNEL_STYLES = {
  x: { background: '#0f172a', color: '#ffffff' },
  linkedin: { background: '#0a66c2', color: '#ffffff' },
  facebook: { background: '#1877f2', color: '#ffffff' },
  whatsapp: { background: '#25d366', color: '#052e16' },
  telegram: { background: '#229ed9', color: '#ffffff' },
  email: { background: '#f59e0b', color: '#1c1917' },
}

const MENU_WIDTH = 264
const MENU_HEIGHT = 330

export default function ShareMenu({ slug, title, description = '', className = '' }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const copyTimerRef = useRef(null)

  const url = productShareUrl(slug)
  const links = productShareLinks({ slug, title, description })
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const close = () => setOpen(false)

  function toggle() {
    if (open) {
      close()
      return
    }

    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return

    const maxLeft = Math.max(12, window.innerWidth - MENU_WIDTH - 12)
    const left = Math.min(Math.max(12, rect.right - MENU_WIDTH), maxLeft)
    const below = rect.bottom + 8
    const top =
      below + MENU_HEIGHT > window.innerHeight
        ? Math.max(12, rect.top - MENU_HEIGHT - 8)
        : below

    setPosition({ top, left })
    setCopied(false)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return
      if (menuRef.current?.contains(event.target)) return
      close()
    }
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      close()
      triggerRef.current?.focus()
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)

    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector('[role="menuitem"]')?.focus()
    })

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

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
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label={t('store.shareProduct')}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t('store.shareProduct')}
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 transition-colors hover:border-cyan-500/60 hover:text-cyan-500 dark:border-white/10 ${className}`}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={t('store.shareProduct')}
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                width: MENU_WIDTH,
              }}
              className="glass-panel z-[99990] overflow-hidden rounded-xl border shadow-2xl"
            >
              <div className="border-b border-black/5 px-4 py-3 dark:border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
                  {t('store.shareProduct')}
                </p>
                <p className="mt-1 truncate text-xs font-medium text-[var(--text-primary)]">
                  {title || SITE_NAME}
                </p>
              </div>

              <div className="p-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={copyLink}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 text-left text-xs text-[var(--text-primary)] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-500">
                    {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Link2 className="h-3.5 w-3.5" aria-hidden="true" />}
                  </span>
                  <span>{copied ? t('store.shareCopied') : t('store.shareCopyLink')}</span>
                </button>

                {canNativeShare && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={nativeShare}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 text-left text-xs text-[var(--text-primary)] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/5 text-[var(--text-secondary)] dark:bg-white/5">
                      <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span>{t('store.shareWithDevice')}</span>
                  </button>
                )}

                <div className="my-1 border-t border-black/5 dark:border-white/5" />

                <div className="grid grid-cols-2 gap-1">
                  {links.map((link) => (
                    <a
                      key={link.id}
                      role="menuitem"
                      href={link.href}
                      {...(link.external
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                      onClick={close}
                      className="flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 text-[11px] text-[var(--text-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--text-primary)] dark:hover:bg-white/5"
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[9px] font-bold uppercase leading-none"
                        style={CHANNEL_STYLES[link.id]}
                      >
                        {link.mark}
                      </span>
                      <span className="truncate">{t(link.labelKey)}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
