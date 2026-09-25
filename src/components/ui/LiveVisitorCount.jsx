import { useState, useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { supabase } from '../../lib/supabase'

const EASE = [0.16, 1, 0.3, 1]

// Cache the visitor-count request at module level.
// This prevents duplicate increments when React remounts
// the component during development.
let visitorCountRequest = null

function getVisitorCount() {
  if (!visitorCountRequest) {
    visitorCountRequest = (async () => {
      try {
        const { data, error } = await supabase.rpc('increment_visitor_count')

        if (error) throw error

        return data
      } catch {
        try {
          const { data, error } = await supabase
            .from('visitor_stats')
            .select('count')
            .eq('id', 1)
            .single()

          if (!error && data) {
            return data.count
          }
        } catch {}

        return null
      }
    })()
  }

  return visitorCountRequest
}

function useVisitorCount() {
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    getVisitorCount().then((visitorCount) => {
      if (!isMounted) return

      setCount(visitorCount)
      setLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  return { count, loading }
}

function AnimatedCounter({ value }) {
  const shouldReduceMotion = useReducedMotion()
  const motionValue = useMotionValue(shouldReduceMotion ? value : 0)
  const springValue = useSpring(motionValue, { stiffness: 60, damping: 20 })
  const rounded = useTransform(springValue, (v) => Math.round(v))

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  return shouldReduceMotion ? <span>{value}</span> : <motion.span>{rounded}</motion.span>
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

export default function LiveVisitorCount() {
  const { count, loading } = useVisitorCount()
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative"
    >
      <div
        className="relative overflow-hidden rounded-xl border px-4 py-2.5 backdrop-blur-sm"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--glass-bg)',
        }}
      >
        <ShimmerOverlay />

        <div className="relative z-10 flex items-center gap-3">
          <LiveDot />

          <div className="flex flex-col">
            <span
              className="text-[10px] font-mono tracking-[0.15em] uppercase"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Visitors
            </span>

            <div className="flex items-baseline gap-1.5">
              {loading ? (
                <div className="flex gap-0.5 py-1">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.span
                      key={i}
                      className="block w-2 h-3.5 rounded-[2px]"
                      style={{ background: 'var(--text-tertiary)' }}
                      animate={shouldReduceMotion ? undefined : { opacity: [0.08, 0.25, 0.08] }}
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { duration: 1.2, repeat: Infinity, delay: i * 0.15 }
                      }
                    />
                  ))}
                </div>
              ) : count !== null ? (
                <span
                  className="text-sm font-mono font-semibold tabular-nums tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {count >= 100000 ? formatNumber(count) : <AnimatedCounter value={count} />}
                </span>
              ) : (
                <span
                  className="text-xs font-mono"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  --
                </span>
              )}

              <span
                className="text-[9px] font-mono"
                style={{ color: 'var(--text-tertiary)' }}
              >
                total
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function LiveDot() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="relative flex-shrink-0">
      <div
        className="w-2 h-2 rounded-full"
        style={{
          background: 'var(--accent-glow)',
          boxShadow: '0 0 6px var(--accent-glow)',
        }}
      />

      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'var(--accent-glow)',
        }}
        animate={shouldReduceMotion ? undefined : { opacity: [0.4, 0, 0.4], scale: [1, 2.5, 1] }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 2, repeat: Infinity, ease: 'easeOut' }
        }
      />
    </div>
  )
}

function ShimmerOverlay() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl"
      style={{ mixBlendMode: 'overlay' }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.04) 45%, rgba(0,240,255,0.02) 50%, transparent 65%)',
        }}
        animate={shouldReduceMotion ? undefined : { x: ['-100%', '200%'] }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 5, repeat: Infinity, ease: EASE, delay: 0.5 }
        }
      />
    </motion.div>
  )
}