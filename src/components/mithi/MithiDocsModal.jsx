import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, RefreshCw, X } from 'lucide-react'
import MithiCharacter from './MithiCharacter'
import { ONLINE_OFFLINE_MESSAGE } from './mithiMessages'

function hostnameFor(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Full-screen documentation viewer.
 *
 * The docs site is embedded in an iframe so the visitor never leaves the site.
 * Some documentation hosts send `X-Frame-Options`/CSP headers that forbid
 * framing; when that happens the iframe stays blank, so we surface a clear
 * "open in a new tab" escape hatch instead of pretending it loaded.
 */
export default function MithiDocsModal({ url, onClose }) {
  const [status, setStatus] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  const host = hostnameFor(url)

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    const raf = requestAnimationFrame(() => closeRef.current?.focus())
    return () => cancelAnimationFrame(raf)
  }, [])

  // If the iframe never fires `load`, framing is very likely blocked.
  useEffect(() => {
    if (status !== 'loading') return undefined
    const timer = setTimeout(() => {
      setStatus((current) => (current === 'loading' ? 'blocked' : current))
    }, 6000)
    return () => clearTimeout(timer)
  }, [status, reloadKey])

  const openExternal = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Documentation"
    >
      <button
        type="button"
        aria-label="Close documentation"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
        tabIndex={-1}
      />

      <div
        ref={dialogRef}
        className="glass-panel-strong relative flex h-full w-full flex-col overflow-hidden rounded-none sm:h-[min(90dvh,820px)] sm:max-w-5xl sm:rounded-3xl"
      >
        <header
          className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/10 ring-1 ring-inset ring-amber-500/20">
            <MithiCharacter size={26} mood="curious" decorative />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Documentation
            </p>
            <p className="truncate text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {host || 'docs'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setStatus('loading')
              setReloadKey((key) => key + 1)
            }}
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-[var(--hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
            aria-label="Reload documentation"
            title="Reload"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={openExternal}
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-[var(--hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
            aria-label="Open documentation in a new tab"
            title="Open in new tab"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <ExternalLink className="h-4 w-4" />
          </button>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-[var(--hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
            aria-label="Close documentation"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="relative min-h-0 flex-1" style={{ background: 'var(--bg-primary)' }}>
          <iframe
            key={reloadKey}
            src={url}
            title="Documentation"
            onLoad={() => setStatus('ready')}
            className="h-full w-full border-0"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />

          {status !== 'ready' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
              style={{ background: 'var(--bg-primary)' }}
            >
              {status === 'loading' ? (
                <>
                  <span className="flex gap-1" aria-hidden="true">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="h-2 w-2 animate-bounce rounded-full bg-amber-400/70"
                        style={{ animationDelay: `${dot * 120}ms` }}
                      />
                    ))}
                  </span>
                  <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                    Loading the documentation…
                  </p>
                </>
              ) : (
                <>
                  <MithiCharacter size={64} mood="sleepy" decorative />
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {ONLINE_OFFLINE_MESSAGE}
                  </p>
                  <p className="max-w-sm text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                    This documentation site does not allow being embedded. Open it in a new tab —
                    same knowledge, slightly more tabs.
                  </p>
                  <button
                    type="button"
                    onClick={openExternal}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in a new tab
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
