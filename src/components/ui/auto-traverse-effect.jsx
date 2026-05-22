import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, useSpring, useMotionValue, AnimatePresence } from 'framer-motion'
import { useAutoTraverse } from '../../context/AutoTraverseContext'

const TRAVERSAL_PLAN = [
  { path: '/', sections: ['hero', 'about', 'skills', 'projects', 'resume', 'review', 'contact'] },
  { path: '/services', sections: ['services', 'process', 'pricing', 'testimonials', 'faq', 'contact'] },
  { path: '/more', sections: ['timeline', 'blog-posts', 'case-studies'] },
  { path: '/blog', sections: [] },
]

const DWELL_MS = 9000
const ELEMENT_RETRY_MS = 200
const ELEMENT_MAX_RETRIES = 10

const NAV_LINKED = new Set(['about', 'skills', 'projects', 'resume', 'contact'])

function AutoTraverseCursor({ visible, springX, springY }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed pointer-events-none z-[99999]"
          style={{ left: springX, top: springY, x: '-50%', y: '-50%' }}
        >
          <div className="relative w-7 h-7 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#00f0ff]/70"
              style={{ boxShadow: '0 0 10px rgba(0,240,255,0.3)' }}
            />
            <div className="absolute inset-[5px] rounded-full bg-[#00f0ff]/50" />
            <motion.div className="absolute inset-0 rounded-full border border-[#00f0ff]/30"
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function TraverseSuggestion({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99998]"
        >
          <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-black/60 backdrop-blur-xl px-4 py-2"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="w-3 h-3 rounded-full border-2 border-transparent shrink-0"
              style={{ borderTopColor: '#00f0ff', borderRightColor: '#00f0ff' }}
            />
            <span className="text-[11px] text-white/60 font-mono tracking-wide">
              Auto-traversing
            </span>
            <span className="w-px h-3 bg-white/10" />
            <span className="text-[10px] text-white/30 font-mono">
              Refresh to stop
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function waitForElement(id, retries = ELEMENT_MAX_RETRIES) {
  return new Promise((resolve) => {
    const el = document.getElementById(id)
    if (el) { resolve(el); return }
    if (retries <= 0) { resolve(null); return }
    setTimeout(() => resolve(waitForElement(id, retries - 1)), ELEMENT_RETRY_MS)
  })
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

function scrollBetween(fromY, toY, duration, onY) {
  return new Promise((resolve) => {
    const startTime = performance.now()
    function tick(now) {
      const p = Math.min((now - startTime) / duration, 1)
      const e = easeOutCubic(p)
      const y = fromY + (toY - fromY) * e
      window.scrollTo(0, y)
      if (onY) onY(y, p)
      if (p < 1) requestAnimationFrame(tick)
      else { window.scrollTo(0, toY); if (onY) onY(toY, 1); setTimeout(resolve, 200) }
    }
    requestAnimationFrame(tick)
  })
}

function scrollToSection(el, moveCursor, isLinked) {
  const rect = el.getBoundingClientRect()
  const elTop = rect.top + window.scrollY
  const elHeight = rect.height
  const vh = window.innerHeight
  const padding = isLinked ? 140 : 80

  const revealY = Math.max(elTop - padding, 0)
  const panEndY = elTop + elHeight - vh + padding
  const needsPan = elHeight > vh - padding * 2

  return new Promise(async (resolve) => {
    const cursorX = rect.left + rect.width * 0.5
    moveCursor(cursorX, window.scrollY + vh * 0.35)

    const arriveDist = Math.abs(revealY - window.scrollY)
    const arriveTime = Math.min(Math.max(arriveDist * (isLinked ? 1.8 : 1.2), 1500), 4000)

    await scrollBetween(window.scrollY, revealY, arriveTime, (y) => {
      moveCursor(cursorX, y + vh * 0.35)
    })

    if (needsPan) {
      const panDist = panEndY - revealY
      const panTime = Math.min(Math.max(panDist * (isLinked ? 4.0 : 2.5), 3500), 10000)

      await scrollBetween(revealY, panEndY, panTime, (y) => {
        const readingDepth = Math.min((y - revealY) / panDist, 1)
        moveCursor(cursorX, y + vh * (0.25 + readingDepth * 0.25))
      })
    }

    resolve()
  })
}

export default function AutoTraverseEffect() {
  const { enabled } = useAutoTraverse()
  const location = useLocation()
  const navigate = useNavigate()

  const [cursorVisible, setCursorVisible] = useState(false)
  const cursorX = useMotionValue(0)
  const cursorY = useMotionValue(0)
  const springX = useSpring(cursorX, { stiffness: 55, damping: 14, mass: 0.7 })
  const springY = useSpring(cursorY, { stiffness: 55, damping: 14, mass: 0.7 })

  const planIndexRef = useRef(0)
  const timerRef = useRef(null)
  const runningRef = useRef(false)

  const getPlanIndexForPath = useCallback((path) => {
    return TRAVERSAL_PLAN.findIndex(p => p.path === path)
  }, [])

  useEffect(() => {
    if (!enabled) {
      runningRef.current = false
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      planIndexRef.current = 0
      setCursorVisible(false)
      return
    }

    setCursorVisible(true)
    runningRef.current = true

    const idx = getPlanIndexForPath(location.pathname)
    if (idx !== -1) planIndexRef.current = idx

    async function traverse() {
      const plan = TRAVERSAL_PLAN[planIndexRef.current]
      if (!plan || !runningRef.current) return

      for (const id of plan.sections) {
        if (!runningRef.current) return

        const el = await waitForElement(id)
        if (!el || !runningRef.current) continue

        const r = el.getBoundingClientRect()
        cursorX.set(r.left + r.width * 0.5)
        cursorY.set(r.top + window.scrollY + 60)

        const moveCursor = (x, y) => { cursorX.set(x); cursorY.set(y) }

        await scrollToSection(el, moveCursor, NAV_LINKED.has(id))

        if (!runningRef.current) return
        await new Promise(r => { timerRef.current = setTimeout(r, DWELL_MS) })
      }

      if (!runningRef.current) return
      planIndexRef.current = (planIndexRef.current + 1) % TRAVERSAL_PLAN.length
      const next = TRAVERSAL_PLAN[planIndexRef.current]
      if (next) {
        await new Promise(r => { timerRef.current = setTimeout(r, 800) })
        if (!runningRef.current) return
        navigate(next.path)
      }
    }

    timerRef.current = setTimeout(traverse, 800)
    return () => {
      runningRef.current = false
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    }
  }, [enabled, location.pathname, navigate, getPlanIndexForPath, cursorX, cursorY])

  return (
    <>
      <AutoTraverseCursor
        visible={cursorVisible}
        springX={springX}
        springY={springY}
      />
      <TraverseSuggestion visible={cursorVisible} />
    </>
  )
}
