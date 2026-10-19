import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useTheme from '../lib/useTheme'
import { useVideoHeroSettings } from '../lib/usePortfolioData'
import { PRESET_LINK_KEYS, activeLinks, mergeVideoHeroConfig } from '../lib/videoHeroDefaults'

// Stroke icons for each quick-jump destination.
const iconPaths = {
  store: (
    <>
      <path d="M6.5 7.5h11l1.1 11.5a1 1 0 0 1-1 1.1H6.4a1 1 0 0 1-1-1.1L6.5 7.5Z" />
      <path d="M9 7.5a3 3 0 0 1 6 0" />
    </>
  ),
  offerings: (
    <>
      <path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5Z" />
      <path d="M3.5 12.5 12 17l8.5-4.5" />
      <path d="M3.5 16.5 12 21l8.5-4.5" />
    </>
  ),
  blog: (
    <>
      <path d="M4.5 19.5h15" />
      <path d="M14.8 4.7l4.5 4.5-8.8 8.8H6v-4.5l8.8-8.8Z" />
    </>
  ),
  projects: (
    <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h4l2 2.5h7A1.5 1.5 0 0 1 20 10v7.5A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-10Z" />
  ),
  library: (
    <>
      <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v16H6.5A1.5 1.5 0 0 1 5 18.5v-13Z" />
      <path d="M5 17.5A1.5 1.5 0 0 1 6.5 16H19" />
      <path d="M9 8.5h6" />
    </>
  ),
  more: (
    <>
      <circle cx="8.5" cy="8.5" r="1.6" />
      <circle cx="15.5" cy="8.5" r="1.6" />
      <circle cx="8.5" cy="15.5" r="1.6" />
      <circle cx="15.5" cy="15.5" r="1.6" />
    </>
  ),
  support: (
    <>
      <path d="M5 13.5v-1.5a7 7 0 0 1 14 0v1.5" />
      <rect x="3.5" y="13" width="4" height="6" rx="1.6" />
      <rect x="16.5" y="13" width="4" height="6" rx="1.6" />
      <path d="M19 19v.4a2.6 2.6 0 0 1-2.6 2.6H13" />
    </>
  ),
  contact: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
    </>
  ),
}

const EASE = [0.16, 1, 0.3, 1]

// Direction-aware slide used while the arrows swap the visible buttons.
const slideVariants = {
  enter: (d) => ({ opacity: 0, x: d > 0 ? 48 : -48 }),
  center: { opacity: 1, x: 0 },
  exit: (d) => ({ opacity: 0, x: d > 0 ? -48 : 48 }),
}

// Per-theme palette: the footage differs between themes, so the legibility
// overlay, glass cards and copy colors all flip with it.
const TONES = {
  dark: {
    shell: 'bg-black shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)]',
    overlay: 'bg-gradient-to-b from-black/75 via-black/45 to-black/80',
    vignette: 'bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)]',
    eyebrow: 'border-[#00f0ff]/25 bg-[#00f0ff]/10 text-[#8beeff]',
    pulse: 'bg-[#00f0ff]',
    title: 'text-white',
    subtitle: 'text-white/60',
    arrow: 'border-white/25 bg-white/10 text-white/75 hover:bg-white/20 hover:text-white',
    card: 'border-white/20 bg-white/10 hover:bg-white/20 hover:border-white/35 text-white',
    cardLabel: 'text-white',
    cardHint: 'text-white/45',
    iconWrap: 'bg-white/15 border-white/20 group-hover:bg-[#00f0ff]/25 group-hover:border-[#00f0ff]/50',
    icon: 'text-white/85 group-hover:text-[#8beeff]',
    chevron: 'text-white/40',
    dotIdle: 'bg-white/30 hover:bg-white/60',
    dotActive: 'bg-[#00f0ff]',
    ring: 'focus-visible:ring-[#00f0ff]/60',
  },
  light: {
    shell: 'bg-[var(--bg-secondary)] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.25)]',
    overlay: 'bg-gradient-to-b from-white/75 via-white/45 to-white/85',
    vignette: 'bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(255,255,255,0.5)_100%)]',
    eyebrow: 'border-[#007a87]/30 bg-[#007a87]/10 text-[#00656f]',
    pulse: 'bg-[#007a87]',
    title: 'text-[var(--text-primary)]',
    subtitle: 'text-[var(--text-secondary)]',
    arrow: 'border-black/15 bg-white/60 text-black/60 hover:bg-white hover:text-black',
    card: 'border-black/10 bg-white/55 hover:bg-white/90 hover:border-black/25 text-[var(--text-primary)]',
    cardLabel: 'text-[var(--text-primary)]',
    cardHint: 'text-[var(--text-tertiary)]',
    iconWrap: 'bg-white/70 border-black/10 group-hover:bg-[#00f0ff]/20 group-hover:border-[#007a87]/40',
    icon: 'text-black/70 group-hover:text-[#00656f]',
    chevron: 'text-black/35',
    dotIdle: 'bg-black/25 hover:bg-black/50',
    dotActive: 'bg-[#007a87]',
    ring: 'focus-visible:ring-[#007a87]/60',
  },
}

export default function VideoHero() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const videoRef = useRef(null)

  const theme = useTheme()
  const tone = TONES[theme] || TONES.dark

  // Admin-managed settings (empty object until Supabase responds).
  const { data: rawSettings } = useVideoHeroSettings()
  const config = useMemo(() => mergeVideoHeroConfig(rawSettings), [rawSettings])
  const links = useMemo(() => activeLinks(config), [config])

  const isDark = theme === 'dark'
  const videoSrc = isDark ? config.darkVideo : config.lightVideo

  const [videoFailed, setVideoFailed] = useState(false)
  const [perPage, setPerPage] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= 768 ? 3 : 1,
  )
  const [page, setPage] = useState(0)
  const [dir, setDir] = useState(1)

  // Keep the visible slice in sync with the viewport so the grid and the
  // pager can never disagree about how many buttons fit on screen.
  useEffect(() => {
    const onResize = () => {
      const next = window.innerWidth >= 768 ? 3 : 1
      setPerPage((current) => (current === next ? current : next))
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const pageCount = Math.max(1, Math.ceil(links.length / perPage))

  // The admin can add/remove links at any time — keep the page in range.
  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1))
  }, [pageCount])

  // A theme switch (or an admin edit) swaps the source: reset failure state
  // and kick playback on the freshly mounted <video>.
  useEffect(() => {
    setVideoFailed(false)
  }, [videoSrc])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (shouldReduceMotion) {
      video.pause()
    } else {
      video.play().catch(() => {})
    }
  }, [videoSrc, shouldReduceMotion])

  if (!config.enabled) return null

  const visible = links.slice(page * perPage, page * perPage + perPage)

  const step = (delta) => {
    setDir(delta)
    setPage((current) => (current + delta + pageCount) % pageCount)
  }

  const goTo = (to) => {
    if (to.startsWith('#')) {
      if (location.pathname !== '/') {
        navigate('/')
        window.setTimeout(
          () => document.querySelector(to)?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' }),
          120,
        )
      } else {
        document.querySelector(to)?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' })
      }
      return
    }
    navigate(to)
  }

  const resolveLabel = (link) =>
    link.label || (PRESET_LINK_KEYS.includes(link.key) ? t(`videoHero.links.${link.key}`) : link.key)

  const resolveHint = (link) =>
    link.hint || (PRESET_LINK_KEYS.includes(link.key) ? t(`videoHero.hints.${link.key}`) : '')

  const arrowClass = `shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border backdrop-blur-xl active:scale-95 transition-all duration-300 focus:outline-none focus-visible:ring-2 ${tone.arrow} ${tone.ring}`

  return (
    <section id="showcase" className="relative z-10 w-full max-w-[1400px] mx-auto px-5 sm:px-6 md:px-12 py-8 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.7, ease: EASE }}
        className={`relative isolate overflow-hidden rounded-[2rem] border border-black/10 dark:border-white/[0.06] min-h-[520px] sm:min-h-[560px] md:min-h-[620px] flex flex-col ${tone.shell}`}
      >
        {/* Background video — swaps with the theme. Keyed so a theme or admin
            edit remounts the element and restarts autoplay cleanly. */}
        {!videoFailed && (
          <video
            key={videoSrc}
            ref={videoRef}
            className="absolute inset-0 -z-10 w-full h-full object-cover"
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onError={() => setVideoFailed(true)}
            aria-hidden="true"
          />
        )}
        {/* Legibility gradient over the footage. */}
        <div className={`absolute inset-0 -z-10 ${tone.overlay}`} />
        <div className={`absolute inset-0 -z-10 ${tone.vignette}`} />

        <div className="relative z-10 flex flex-1 flex-col">
          {/* Heading block */}
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 px-6 sm:px-12 pt-12 sm:pt-14 pb-6">
            <motion.span
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] ${tone.eyebrow}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${tone.pulse}`} />
              {config.eyebrow || t('videoHero.eyebrow')}
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.18 }}
              className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.08] ${tone.title}`}
            >
              {(config.titleA || t('videoHero.titleA'))}{' '}
              <span className="bg-gradient-to-r from-[#00f0ff] via-[#b829dd] to-[#f0c040] bg-clip-text text-transparent">
                {config.titleB || t('videoHero.titleB')}
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.26 }}
              className={`max-w-[60ch] text-sm sm:text-base md:text-lg leading-relaxed ${tone.subtitle}`}
            >
              {config.subtitle || t('videoHero.subtitle')}
            </motion.p>
          </div>

          {/* Quick-jump carousel: arrows on both sides swap the floating buttons. */}
          <div className="px-4 sm:px-8 pb-8 sm:pb-10">
            <div className="flex items-center gap-3 sm:gap-5">
              <button type="button" onClick={() => step(-1)} className={arrowClass} aria-label={t('videoHero.prev')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                  <path d="m14.5 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="flex-1 min-w-0 py-3 overflow-hidden">
                <AnimatePresence mode="wait" initial={false} custom={dir}>
                  <motion.ul
                    key={`${page}-${perPage}-${links.length}`}
                    custom={dir}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: EASE }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4"
                  >
                    {visible.map((link, index) => (
                      <motion.li
                        key={link.key}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: EASE, delay: index * 0.06 }}
                        className="h-full"
                      >
                        <motion.button
                          type="button"
                          onClick={() => goTo(link.to)}
                          animate={shouldReduceMotion ? {} : { y: [0, -6, 0] }}
                          transition={
                            shouldReduceMotion
                              ? { duration: 0 }
                              : { duration: 3.2 + index * 0.5, repeat: Infinity, ease: 'easeInOut' }
                          }
                          whileHover={{ y: 0, scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className={`group w-full h-full flex items-center gap-3 px-4 sm:px-5 py-3.5 rounded-2xl sm:rounded-full border backdrop-blur-xl transition-colors duration-300 text-left focus:outline-none focus-visible:ring-2 ${tone.card} ${tone.ring}`}
                        >
                          <span
                            className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition-colors duration-300 ${tone.iconWrap}`}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={`transition-colors duration-300 ${tone.icon}`}
                              style={{ width: '1.1rem', height: '1.1rem' }}
                              aria-hidden="true"
                            >
                              {iconPaths[link.icon] || iconPaths.more}
                            </svg>
                          </span>
                          <span className="min-w-0">
                            <span className={`block text-sm font-medium truncate ${tone.cardLabel}`}>
                              {resolveLabel(link)}
                            </span>
                            {resolveHint(link) ? (
                              <span className={`block text-[10px] uppercase tracking-[0.12em] truncate ${tone.cardHint}`}>
                                {resolveHint(link)}
                              </span>
                            ) : null}
                          </span>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className={`ml-auto w-4 h-4 shrink-0 translate-x-[-4px] opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 ${tone.chevron}`}
                            aria-hidden="true"
                          >
                            <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </motion.button>
                      </motion.li>
                    ))}
                  </motion.ul>
                </AnimatePresence>

                {/* Page dots */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  {Array.from({ length: pageCount }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setDir(i > page ? 1 : -1)
                        setPage(i)
                      }}
                      aria-label={`${t('videoHero.page')} ${i + 1}`}
                      aria-current={i === page}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === page ? `w-6 ${tone.dotActive}` : `w-1.5 ${tone.dotIdle}`
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button type="button" onClick={() => step(1)} className={arrowClass} aria-label={t('videoHero.next')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                  <path d="m9.5 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
