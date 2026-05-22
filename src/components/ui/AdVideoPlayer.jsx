import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const GOOGLE_AD_CLIENT = 'ca-pub-2699270619596438'
const EASE = [0.16, 1, 0.3, 1]
const SPRING_STIFF = { type: 'spring', stiffness: 70, damping: 16, mass: 0.6 }

function ShimmerOverlay() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ mixBlendMode: 'overlay' }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.04) 45%, rgba(0,240,255,0.03) 50%, transparent 65%)',
        }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: EASE, delay: 1 }}
      />
    </motion.div>
  )
}

function GradientOrbit() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="orbit" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#b829dd" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.rect
          x="0.5" y="0.5" width="99" height="99" rx="12"
          fill="none" stroke="url(#orbit)" strokeWidth="0.5"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
      {[0, 120, 240].map((deg) => (
        <motion.div
          key={deg}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: '#00f0ff',
            boxShadow: '0 0 6px rgba(0,240,255,0.6)',
            left: '50%', top: '50%',
            marginLeft: -2, marginTop: -2,
          }}
          animate={{ x: [0, 0, 0], y: [0, 0, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear', delay: -(deg / 360) * 8 }}
        >
          <motion.div
            className="absolute w-12 h-12 rounded-full"
            style={{
              marginLeft: -22, marginTop: -22,
              background: 'radial-gradient(circle, rgba(0,240,255,0.08) 0%, transparent 70%)',
            }}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      ))}
    </div>
  )
}

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[
        { size: 60, x: '15%', y: '75%', color: 'rgba(0,240,255,0.05)', delay: 0 },
        { size: 40, x: '80%', y: '20%', color: 'rgba(184,41,221,0.04)', delay: 1.5 },
        { size: 50, x: '70%', y: '80%', color: 'rgba(251,191,36,0.03)', delay: 3 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size, height: orb.size,
            background: `radial-gradient(circle at center, ${orb.color} 0%, transparent 70%)`,
            left: orb.x, top: orb.y,
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: orb.delay }}
        />
      ))}
    </div>
  )
}

function GoogleAdUnit() {
  const containerRef = useRef(null)
  const adMounted = useRef(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (adMounted.current) return
    adMounted.current = true
    const existing = document.querySelector('script[src*="pagead2.googlesyndication.com"]')
    if (existing) {
      try { (adsbygoogle = window.adsbygoogle || []).push({}) } catch {}
      setLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${GOOGLE_AD_CLIENT}`
    script.crossOrigin = 'anonymous'
    script.async = true
    document.head.appendChild(script)
    script.onload = () => { try { (adsbygoogle = window.adsbygoogle || []).push({}) } catch {}; setLoaded(true) }
    script.onerror = () => setLoaded(true)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full min-h-[260px] flex items-center justify-center">
      <FloatingOrbs />
      <ShimmerOverlay />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative z-10 w-full"
      >
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', minHeight: '260px' }}
          data-ad-client={GOOGLE_AD_CLIENT}
          data-ad-slot="1234567890"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </motion.div>
      <AnimatePresence>
        {!loaded && (
          <motion.div
            initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center">
              <motion.div className="relative mx-auto mb-4 w-16 h-16" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                <div className="absolute inset-0 rounded-full border-2 border-transparent" style={{ borderTopColor: '#00f0ff', borderRightColor: '#b829dd' }} />
                <div className="absolute inset-2 rounded-full border border-white/5 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" className="w-6 h-6">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </motion.div>
              <motion.p className="text-[11px] font-mono tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.2)' }}
                animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 2, repeat: Infinity }}
              >Loading Ad</motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-[0.15em] flex items-center gap-1.5"
        style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)', color: 'rgba(251,191,36,0.6)' }}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: EASE }}
      >
        <span className="inline-block w-1 h-1 rounded-full bg-amber-400/60" />
        Ad
      </motion.div>
    </div>
  )
}

function YouTubeVideoPlayer({ videoUrl, title }) {
  const videoId = videoUrl?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
  return (
    <div className="relative w-full bg-black/60">
      <FloatingOrbs />
      <ShimmerOverlay />
      {videoId ? (
        <div className="relative aspect-video w-full">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&controls=1&modestbranding=1`}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={title}
          />
        </div>
      ) : (
        <div className="aspect-video w-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full border-2 border-white/5 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" className="w-6 h-6">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>Video unavailable</p>
          </div>
        </div>
      )}
      <motion.div
        className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-[0.15em] flex items-center gap-1.5"
        style={{ background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.2)', color: 'rgba(0,240,255,0.6)' }}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: EASE }}
      >
        <span className="inline-block w-1 h-1 rounded-full bg-neural-blue/60" />
        Video
      </motion.div>
    </div>
  )
}

function YouTubeShortPlayer({ videoUrl, title }) {
  const videoId = videoUrl?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
  return (
    <div className="relative w-full bg-black/70 flex items-center justify-center" style={{ minHeight: '420px' }}>
      <FloatingOrbs />
      <ShimmerOverlay />

      <motion.div
        className="relative w-full max-w-[360px] mx-auto overflow-hidden"
        style={{ aspectRatio: '9/16', borderRadius: '16px' }}
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
      >
        <div
          className="absolute inset-0"
          style={{
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 0 40px rgba(0,240,255,0.06), inset 0 0 60px rgba(0,0,0,0.3)',
          }}
        >
          {videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&controls=0&modestbranding=1`}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              title={title}
              style={{ pointerEvents: 'none' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full border-2 border-white/5 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" className="w-5 h-5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>Unavailable</p>
              </div>
            </div>
          )}
        </div>

        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6, ease: EASE }}
        >
          <motion.div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.06)' }}
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" className="w-3 h-3">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Short
            </span>
          </motion.div>
        </motion.div>

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2.5">
          <motion.div
            className="w-1 rounded-full overflow-hidden"
            style={{ height: '120px', background: 'rgba(255,255,255,0.06)' }}
          >
            <motion.div
              className="w-full rounded-full"
              style={{ background: 'linear-gradient(180deg, #00f0ff, #b829dd)' }}
              animate={{ height: ['20%', '80%', '20%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-[0.15em] flex items-center gap-1.5"
        style={{ background: 'rgba(184,41,221,0.1)', border: '1px solid rgba(184,41,221,0.2)', color: 'rgba(184,41,221,0.6)' }}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: EASE }}
      >
        <span className="inline-block w-1 h-1 rounded-full bg-purple-400/60" />
        Short
      </motion.div>
    </div>
  )
}

function CompletionOverlay({ countdown }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center"
      style={{ background: 'rgba(5,5,12,0.75)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRING_STIFF}
        className="text-center"
      >
        <motion.div
          className="relative mx-auto mb-4 w-16 h-16"
          initial={{ rotate: -30 }}
          animate={{ rotate: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 12 }}
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-400/40 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" className="w-8 h-8">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <motion.div
            className="absolute -inset-2 rounded-full border border-emerald-400/10"
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
        <motion.p className="text-sm font-medium text-white/80" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          Ad Complete
        </motion.p>
        <motion.p className="text-[10px] font-mono mt-1.5" style={{ color: 'rgba(255,255,255,0.25)' }} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
          Entering in {countdown}s
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

export default function AdVideoPlayer({ video, onComplete, onSkip }) {
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [ended, setEnded] = useState(false)
  const [showSkip, setShowSkip] = useState(false)
  const [countdown, setCountdown] = useState(3)

  const duration = video?.duration_seconds || 30
  const isGoogle = video?.ad_type !== 'youtube'
  const isShort = video?.format === 'short'

  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), 5000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (ended) return
    const interval = setInterval(() => {
      setElapsed((p) => {
        const next = p + 1
        setProgress(Math.min((next / duration) * 100, 100))
        if (next >= duration) { setEnded(true); clearInterval(interval) }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [ended, duration])

  useEffect(() => {
    if (!ended) return
    const t = setInterval(() => {
      setCountdown((p) => {
        if (p <= 1) { clearInterval(t); onComplete() }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [ended, onComplete])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={`relative z-10 mx-auto px-4 ${isShort ? 'max-w-md' : 'max-w-xl'}`}
    >
      <motion.div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(8,8,16,0.8)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 0 60px rgba(0,240,255,0.04), 0 0 120px rgba(184,41,221,0.02)',
        }}
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
      >
        <div className="relative px-5 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease: EASE }}
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#00f0ff', boxShadow: '0 0 6px rgba(0,240,255,0.5)' }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-[9px] font-mono uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Sponsored
            </span>
          </motion.div>
          <motion.span
            className="text-[8px] font-mono"
            style={{ color: 'rgba(255,255,255,0.1)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {isGoogle ? 'Auto Ad' : isShort ? 'Short' : 'Video'}
          </motion.span>
        </div>

        <div className="relative">
          <GradientOrbit />
          {isGoogle ? (
            <GoogleAdUnit />
          ) : isShort ? (
            <YouTubeShortPlayer videoUrl={video.video_url} title={video.title} />
          ) : (
            <YouTubeVideoPlayer videoUrl={video.video_url} title={video.title} />
          )}
          <AnimatePresence>{ended && <CompletionOverlay countdown={countdown} />}</AnimatePresence>
        </div>

        <motion.div
          className="px-5 py-4 space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-3">
              <motion.p
                className="text-sm font-medium truncate"
                style={{ color: 'rgba(255,255,255,0.75)' }}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                {video?.title || (isGoogle ? 'Google Ad' : isShort ? 'Short Ad' : 'Video Ad')}
              </motion.p>
            </div>
            <AnimatePresence>
              {showSkip && !ended && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={onSkip}
                  className="relative px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider overflow-hidden group"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}
                  whileHover={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.span className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.03)' }} initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} />
                  Skip
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <motion.div
                className="h-full rounded-full relative"
                style={{
                  background: 'linear-gradient(90deg, #00f0ff, #b829dd)',
                  width: `${progress}%`,
                  boxShadow: '0 0 10px rgba(0,240,255,0.2)',
                }}
                layout
                transition={{ duration: 0.3, ease: EASE }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <motion.span
                className="text-[9px] font-mono"
                style={{ color: 'rgba(255,255,255,0.12)' }}
                key={elapsed}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 0.12 }}
                transition={{ duration: 0.3 }}
              >
                {elapsed}s
              </motion.span>
              <motion.span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.12)' }}>
                {duration}s
              </motion.span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
