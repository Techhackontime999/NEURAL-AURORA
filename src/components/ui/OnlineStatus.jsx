import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Wifi, WifiOff } from 'lucide-react'

/**
 * A small, always-visible connection indicator. It sits to the LEFT of the
 * Mithi launcher so the floating stack stays a single, tidy cluster:
 *
 *     [ wifi ]   [ parrot ]
 *
 * It is deliberately tiny and non-interactive — purely informational. The
 * offline banner still comes from <PwaStatus />, which this never duplicates.
 */
export default function OnlineStatus() {
  const shouldReduceMotion = useReducedMotion()
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )

  useEffect(() => {
    function goOnline() {
      setOnline(true)
    }
    function goOffline() {
      setOnline(false)
    }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const label = online ? 'You are online' : 'You are offline'

  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className="mb-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border backdrop-blur-xl"
      style={{
        borderColor: 'var(--border-color)',
        background: 'var(--glass-bg)',
        boxShadow: 'var(--shadow-diffusion)',
      }}
    >
      {online ? (
        <motion.span
          className="flex items-center justify-center"
          animate={shouldReduceMotion ? undefined : { scale: [1, 1.12, 1] }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          <Wifi className="h-3.5 w-3.5 text-emerald-400/80" strokeWidth={1.5} />
        </motion.span>
      ) : (
        <WifiOff className="h-3.5 w-3.5 text-rose-400/80" strokeWidth={1.5} />
      )}
    </span>
  )
}
