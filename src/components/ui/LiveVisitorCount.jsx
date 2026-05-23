import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1]
const COUNTER_KEY = 'neural-aurora-visitors'

function useVisitorCount() {
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const hitRef = useRef(false)

  useEffect(() => {
    if (hitRef.current) return
    hitRef.current = true

    async function fetchCount() {
      try {
        const res = await fetch(`https://api.countapi.xyz/hit/neural-aurora-dev/${COUNTER_KEY}`)
        const data = await res.json()
        setCount(data.value)
      } catch {
        try {
          const res = await fetch(`https://api.countapi.xyz/get/neural-aurora-dev/${COUNTER_KEY}`)
          const data = await res.json()
          setCount(data.value)
        } catch {
          setCount(null)
        }
      }
      setLoading(false)
    }
    fetchCount()
  }, [])

  return { count, loading }
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

export default function LiveVisitorCount() {
  const { count, loading } = useVisitorCount()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative group"
    >
      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[radial-gradient(35%_80px_at_50%_0%,rgba(0,240,255,0.06),transparent)] px-5 py-3">
        <ShimmerOverlay />
        <OrbitRing />
        <FloatingOrbs />

        <div className="relative z-10 flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400/20 to-purple-500/20 flex items-center justify-center border border-white/[0.06]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-cyan-300" style={{ filter: 'drop-shadow(0 0 4px rgba(0,240,255,0.3))' }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <motion.div
              className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
              style={{
                background: 'radial-gradient(circle, rgba(0,240,255,0.15) 0%, transparent 70%)',
                filter: 'blur(4px)',
              }}
            />
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-mono tracking-widest uppercase text-white/25">
              Live Visitors
            </span>
            <div className="flex items-baseline gap-1">
              {loading ? (
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.span
                      key={i}
                      className="w-2 h-4 rounded-sm bg-white/10"
                      animate={{ opacity: [0.1, 0.3, 0.1] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              ) : count !== null ? (
                <span className="text-sm font-mono font-bold tabular-nums text-white/80">
                  {formatNumber(count)}
                </span>
              ) : (
                <span className="text-xs text-white/20 font-mono">--</span>
              )}
              <span className="text-[9px] font-mono text-white/15">total</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ShimmerOverlay() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl"
      style={{ mixBlendMode: 'overlay' }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.03) 40%, rgba(0,240,255,0.02) 50%, transparent 65%)',
        }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 5, repeat: Infinity, ease: EASE, delay: 0.5 }}
      />
    </motion.div>
  )
}

function OrbitRing() {
  return (
    <div className="absolute -top-4 -right-4 w-16 h-16 pointer-events-none opacity-30">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="visitor-orbit" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#b829dd" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.circle
          cx="50" cy="50" r="45"
          fill="none" stroke="url(#visitor-orbit)" strokeWidth="0.5"
          animate={{ opacity: [0.2, 0.5, 0.2], rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: 'center' }}
        />
      </svg>
    </div>
  )
}

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[
        { top: '15%', left: '10%', delay: 0, size: 3 },
        { top: '60%', right: '15%', delay: 1.5, size: 2 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            right: orb.right,
            background: '#00f0ff',
            boxShadow: '0 0 6px rgba(0,240,255,0.4)',
          }}
          animate={{ opacity: [0, 0.6, 0], y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: orb.delay }}
        />
      ))}
    </div>
  )
}
