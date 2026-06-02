import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, RefreshCw, X } from 'lucide-react'

export default function PwaStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  const [showOffline, setShowOffline] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    function goOnline() {
      setOnline(true)
      setShowOffline(false)
    }
    function goOffline() {
      setOnline(false)
      setShowOffline(true)
    }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    const handleSWUpdate = () => setUpdateAvailable(true)
    window.addEventListener('sw-update', handleSWUpdate)
    return () => window.removeEventListener('sw-update', handleSWUpdate)
  }, [])

  function handleRefresh() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    }
    window.location.reload()
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
      <AnimatePresence>
        {showOffline && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-3 rounded-2xl border border-rose-500/20 px-4 py-3 shadow-lg backdrop-blur-xl"
            style={{ background: 'rgba(15, 5, 10, 0.9)' }}
          >
            <WifiOff className="w-4 h-4 text-rose-400 shrink-0" strokeWidth={1.5} />
            <span className="text-xs text-rose-200/80">You're offline — some features may be limited</span>
            <button
              onClick={() => setShowOffline(false)}
              className="ml-1 p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-3 h-3 text-rose-300/50" strokeWidth={1.5} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {updateAvailable && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-3 rounded-2xl border border-cyan-500/20 px-4 py-3 shadow-lg backdrop-blur-xl"
            style={{ background: 'rgba(5, 15, 20, 0.9)' }}
          >
            <RefreshCw className="w-4 h-4 text-cyan-400 shrink-0" strokeWidth={1.5} />
            <span className="text-xs text-cyan-200/80">New version available</span>
            <button
              onClick={handleRefresh}
              className="ml-1 rounded-lg px-3 py-1 text-[11px] font-medium text-white transition-all hover:opacity-80"
              style={{ background: 'rgba(6, 182, 212, 0.2)' }}
            >
              Update
            </button>
            <button
              onClick={() => setUpdateAvailable(false)}
              className="p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-3 h-3 text-cyan-300/50" strokeWidth={1.5} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {online && !showOffline && !updateAvailable && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/5"
            style={{ background: 'rgba(5, 15, 10, 0.6)' }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-400/60" strokeWidth={1.5} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
