import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Loader2 } from 'lucide-react'
import MithiCharacter from './MithiCharacter'
import MithiMenu from './MithiMenu'
import OnlineStatus from '../ui/OnlineStatus'
import { getMithiStatus } from '../../lib/mithi/api'
import { getCachedDocs, resolveDocsDestination } from '../../lib/mithi/configService'
import { trackMithiEvent } from '../../lib/mithi/analytics'
import MithiDocsModal from './MithiDocsModal'
import {
  DOCS_HOVER_MESSAGE,
  DOCS_OPENED_MESSAGE,
  DOCS_UNAVAILABLE_MESSAGE,
  FIRST_VISIT_MESSAGE,
  MENU_MESSAGE,
  idleMessageFor,
} from './mithiMessages'

const MithiAssistant = lazy(() => import('./MithiAssistant'))

const GREETED_KEY = 'mithi-greeted-v1'
const NULL_MESSAGE = ''

function readGreeted() {
  try {
    return localStorage.getItem(GREETED_KEY) === '1'
  } catch {
    return true
  }
}

function writeGreeted() {
  try {
    localStorage.setItem(GREETED_KEY, '1')
  } catch {
    /* storage unavailable — the greeting simply shows again later */
  }
}

export default function MithiWidget() {
  const shouldReduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('menu')
  const [hovered, setHovered] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [docsOpened, setDocsOpened] = useState(false)
  const [docsModalOpen, setDocsModalOpen] = useState(false)
  const [messageOverride, setMessageOverride] = useState(null)
  const [greeted] = useState(readGreeted)
  const [idleIndex, setIdleIndex] = useState(0)
  const [idleMessage, setIdleMessage] = useState(() =>
    readGreeted() ? NULL_MESSAGE : FIRST_VISIT_MESSAGE
  )

  const [docs, setDocs] = useState(null)
  const [docsStatus, setDocsStatus] = useState('loading')
  const [aiStatus, setAiStatus] = useState('checking')
  const [aiReason, setAiReason] = useState('')

  const launcherRef = useRef(null)
  const panelRef = useRef(null)
  const celebrateTimeout = useRef(null)

  const loadDocs = useCallback(async (force = false) => {
    const seed = getCachedDocs()
    if (seed) {
      setDocs((current) => current || seed)
      setDocsStatus('ready')
    }
    const result = await resolveDocsDestination({ force })
    setDocs(result)
    setDocsStatus(result.url && result.source !== 'invalid' ? 'ready' : 'error')
  }, [])

  const loadAiStatus = useCallback(async () => {
    setAiStatus('checking')
    const result = await getMithiStatus()
    setAiStatus(result.status)
    setAiReason(result.reason)
  }, [])

  useEffect(() => {
    const seed = getCachedDocs()
    if (seed) {
      setDocs(seed)
      setDocsStatus('ready')
    }
    loadDocs().catch(() => {})
  }, [loadDocs])

  useEffect(() => {
    if (!open || view !== 'assistant') return
    loadAiStatus()
  }, [open, view, loadAiStatus])

  useEffect(() => {
    const interval = setInterval(() => {
      setIdleIndex((index) => index + 1)
    }, 12000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setIdleMessage(idleMessageFor(window.location.pathname, idleIndex))
  }, [idleIndex])

  useEffect(() => {
    return () => clearTimeout(celebrateTimeout.current)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (event) => {
      const target = event.target
      if (panelRef.current?.contains(target) || launcherRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => {
      panelRef.current?.querySelector('[data-mithi-initial]')?.focus()
    })
    return () => cancelAnimationFrame(raf)
  }, [open, view])

  const celebrate = useCallback(() => {
    setCelebrating(true)
    clearTimeout(celebrateTimeout.current)
    celebrateTimeout.current = setTimeout(() => setCelebrating(false), 1200)
  }, [])

  function toggleLauncher() {
    const wasOpen = open
    setOpen((current) => {
      if (!current) {
        setView('menu')
        setDocsOpened(false)
        setDocsModalOpen(false)
        setMessageOverride(null)
        writeGreeted()
      }
      return !current
    })
    trackMithiEvent(wasOpen ? 'mithi_closed' : 'mithi_opened')
  }

  function handleTalk() {
    setView('assistant')
    trackMithiEvent('mithi_ai_selected')
  }

  function handleDocsSelected() {
    setDocsOpened(true)
    setMessageOverride(DOCS_OPENED_MESSAGE)
    celebrate()
    trackMithiEvent('mithi_docs_selected')
    trackMithiEvent('mithi_docs_opened')
    if (docs && docs.source !== 'invalid' && docs.url) {
      setDocsModalOpen(true)
    }
  }

  function handleDocsHover(active) {
    if (docsOpened) return
    setMessageOverride(active ? DOCS_HOVER_MESSAGE : null)
  }

  const isSleeping = !open && !hovered && idleIndex > 0 && idleIndex % 6 === 5
  const characterMood = celebrating ? 'celebrate' : open || hovered ? 'curious' : isSleeping ? 'sleepy' : 'idle'
  const activeMessage = messageOverride || (docsOpened ? DOCS_OPENED_MESSAGE : idleMessage)
  const docsForMenu = docs && docs.source !== 'invalid' ? docs : null
  const docsUnavailable = docsStatus === 'error'

  return createPortal(
    <>
      <div className="pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[9999] flex flex-col items-end gap-3 sm:inset-x-auto sm:right-5">
        <div className="pointer-events-auto flex w-full flex-col items-end gap-3" ref={panelRef}>
          <AnimatePresence mode="wait">
            {open && (
              <motion.section
                key={view}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                role="dialog"
                aria-modal="false"
                aria-label={view === 'assistant' ? 'Talk to Mithi AI' : 'Mithi'}
                className="glass-panel-strong flex max-h-[min(78dvh,640px)] w-full max-w-[368px] flex-col overflow-hidden rounded-3xl sm:w-[368px]"
              >
                {view === 'assistant' ? (
                  <>
                    <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2" style={{ borderColor: 'var(--border-color)' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setView('menu')
                          setMessageOverride(null)
                        }}
                        className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-[var(--hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                        aria-label="Back to Mithi options"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <MithiCharacter size={30} mood={characterMood} decorative />
                      <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Tap the parrot for docs anytime
                      </span>
                    </div>
                    <Suspense
                      fallback={
                        <div className="flex flex-1 items-center justify-center gap-2 p-8 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Waking up Mithi…
                        </div>
                      }
                    >
                      <MithiAssistant
                        status={aiStatus}
                        statusReason={aiReason}
                        onCheckStatus={loadAiStatus}
                        onUnauthorized={() => {
                          setAiStatus('unconfigured')
                          setAiReason('The server reported no configured AI provider.')
                        }}
                      />
                    </Suspense>
                  </>
                ) : (
                  <MithiMenu
                    message={docsUnavailable ? DOCS_UNAVAILABLE_MESSAGE : activeMessage}
                    docs={docsForMenu}
                    docsStatus={docsStatus}
                    docsOpened={docsOpened}
                    onTalk={handleTalk}
                    onDocsSelected={handleDocsSelected}
                    onDocsHover={() => handleDocsHover(true)}
                    onDocsLeave={() => handleDocsHover(false)}
                    onRetryDocs={() => loadDocs(true)}
                    onClose={() => setOpen(false)}
                  />
                )}
              </motion.section>
            )}
          </AnimatePresence>

          <div className="relative flex items-end gap-2">
            <OnlineStatus />
            {!open && (
              <motion.div
                key={activeMessage}
                initial={shouldReduceMotion ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, x: 12 }}
                className="pointer-events-none mb-2 hidden max-w-[240px] rounded-2xl rounded-br-md border px-3 py-2 text-[11px] leading-snug backdrop-blur-xl sm:block"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'var(--glass-bg)',
                  color: 'var(--text-secondary)',
                  boxShadow: 'var(--shadow-diffusion)',
                }}
                aria-hidden="true"
              >
                {activeMessage}
              </motion.div>
            )}

            <motion.button
              ref={launcherRef}
              type="button"
              onClick={toggleLauncher}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onFocus={() => setHovered(true)}
              onBlur={() => setHovered(false)}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label={open ? 'Close Mithi, the site companion' : 'Open Mithi, the site companion'}
              className="relative flex h-16 w-16 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
            >
              <span
                className="absolute inset-0 rounded-full border border-emerald-400/30"
                style={{ background: 'var(--glass-bg)', boxShadow: 'var(--shadow-diffusion)', backdropFilter: 'blur(18px)' }}
              />
              {celebrating && (
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-emerald-400/70"
                  initial={{ opacity: 0.8, scale: 0.9 }}
                  animate={{ opacity: 0, scale: 1.5 }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              )}
              <span className="relative">
                <MithiCharacter size={54} mood={characterMood} />
              </span>
              {!greeted && !open && (
                <span className="absolute right-0 top-0 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_0_3px_var(--bg-primary)]" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {docsModalOpen && docs?.url && docs.source !== 'invalid' && (
        <MithiDocsModal url={docs.url} onClose={() => setDocsModalOpen(false)} />
      )}
    </>,
    document.body
  )
}
