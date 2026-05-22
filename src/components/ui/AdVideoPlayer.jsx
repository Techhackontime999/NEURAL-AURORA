import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AdVideoPlayer({ video, onComplete, onSkip }) {
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [ended, setEnded] = useState(false)
  const [showSkip, setShowSkip] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const iframeRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), 5000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (ended) return
    const interval = setInterval(() => {
      setElapsed((p) => {
        const next = p + 1
        const pct = Math.min((next / video.duration_seconds) * 100, 100)
        setProgress(pct)
        if (next >= video.duration_seconds) {
          setEnded(true)
          clearInterval(interval)
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [ended, video.duration_seconds])

  useEffect(() => {
    if (!ended) return
    const t = setInterval(() => {
      setCountdown((p) => {
        if (p <= 1) {
          clearInterval(t)
          onComplete()
        }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [ended, onComplete])

  function getYouTubeId(url) {
    const match = url?.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    )
    return match ? match[1] : null
  }

  const videoId = getYouTubeId(video?.video_url)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 w-full max-w-2xl mx-auto px-4"
    >
      <div
        className="rounded-2xl border backdrop-blur-xl overflow-hidden"
        style={{
          borderColor: 'rgba(255,255,255,0.08)',
          background: 'rgba(10,10,18,0.7)',
          boxShadow: '0 0 40px rgba(0,240,255,0.06)',
        }}
      >
        <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20 text-center">
            Sponsored Content
          </p>
        </div>

        <div className="relative bg-black/60">
          {videoId ? (
            <div className="relative aspect-video">
              <iframe
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&controls=1&modestbranding=1`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={video.title}
              />
            </div>
          ) : (
            <div className="aspect-video flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full border-2 border-white/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" className="w-6 h-6">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <p className="text-xs text-white/20 font-mono">Video unavailable</p>
              </div>
            </div>
          )}

          <AnimatePresence>
            {ended && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 80, damping: 16 }}
                  className="text-center"
                >
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" className="w-7 h-7">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <p className="text-white text-sm font-medium">Ad Completed</p>
                  <p className="text-[10px] text-white/30 font-mono mt-1">
                    Entering in {countdown}s
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-4">
              <p className="text-sm text-white/80 font-medium truncate">
                {video?.title || 'Developer Ad'}
              </p>
              <p className="text-[10px] text-white/20 font-mono mt-0.5">
                {video?.duration_seconds || 30}s
              </p>
            </div>
            <AnimatePresence>
              {showSkip && !ended && (
                <motion.button
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onClick={onSkip}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-mono border transition-all"
                  style={{
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                  whileHover={{ borderColor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  Skip
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #00f0ff, #b829dd)',
                width: `${progress}%`,
              }}
              layout
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex justify-between text-[9px] font-mono">
            <span className="text-white/15">{elapsed}s</span>
            <span className="text-white/15">{video?.duration_seconds || 30}s</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
