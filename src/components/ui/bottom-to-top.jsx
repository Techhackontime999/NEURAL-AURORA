import { useRef } from 'react'
import { motion, useScroll, useMotionValueEvent, useMotionValue, useTransform, useSpring } from 'framer-motion'

function BrainSVG() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-6 h-6">
      <defs>
        <linearGradient id="brain-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#b829dd" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f0c040" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      <motion.g
        animate={{ rotate: [0, 0.5, -0.5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Left hemisphere - outer */}
        <motion.path
          d="M10 20C8 14 12 6 18 4c3-1 7 0 8 3"
          stroke="url(#brain-grad)"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
          className="group-hover:stroke-[#00f0ff] transition-colors duration-500"
        />
        {/* Left hemisphere - inner gyri */}
        <motion.path
          d="M12 18c1-3 3-5 6-6M14 22c0-3 1-5 3-7"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          className="text-black/20 dark:text-white/20"
        />
        <motion.path
          d="M11 24c1-2 3-4 6-5M13 28c1-2 2-4 4-5"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          className="text-black/15 dark:text-white/15"
        />
        {/* Left hemisphere - bottom */}
        <motion.path
          d="M10 28c-1 3 1 8 4 10 2 1 5 1 7-1"
          stroke="url(#brain-grad)"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Right hemisphere - outer */}
        <motion.path
          d="M38 20c2-6-2-14-8-16-3-1-7 0-8 3"
          stroke="url(#brain-grad)"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Right hemisphere - inner gyri */}
        <motion.path
          d="M36 18c-1-3-3-5-6-6M34 22c0-3-1-5-3-7"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          className="text-black/20 dark:text-white/20"
        />
        <motion.path
          d="M37 24c-1-2-3-4-6-5M35 28c-1-2-2-4-4-5"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          className="text-black/15 dark:text-white/15"
        />
        {/* Right hemisphere - bottom */}
        <motion.path
          d="M38 28c1 3-1 8-4 10-2 1-5 1-7-1"
          stroke="url(#brain-grad)"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Brain stem */}
        <motion.path
          d="M24 30v6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-black/30 dark:text-white/30"
        />
        <motion.path
          d="M22 36h4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-black/30 dark:text-white/30"
        />

        {/* Central synaptic node */}
        <motion.circle
          cx="24"
          cy="18"
          r="2.5"
          fill="#050508"
          stroke="#00f0ff"
          strokeWidth="0.8"
          animate={{ strokeOpacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.circle
          cx="24"
          cy="18"
          r="1"
          fill="#00f0ff"
          animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Text inside the brain */}
        <motion.text
          x="24"
          y="20"
          textAnchor="middle"
          fill="currentColor"
          fontSize="7"
          fontWeight="800"
          fontFamily="Cabinet Grotesk, Satoshi, sans-serif"
          letterSpacing="0.3"
          className="text-black/80 dark:text-white/90"
        >
          NA
        </motion.text>
      </motion.g>
    </svg>
  )
}

export default function BottomToTop() {
  const ref = useRef(null)
  const { scrollY } = useScroll()
  const visible = useMotionValue(0)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const translateX = useTransform(x, [-1, 1], [-6, 6])
  const translateY = useTransform(y, [-1, 1], [-6, 6])
  const rotate = useTransform(x, [-1, 1], [-4, 4])
  const scale = useSpring(visible, { stiffness: 200, damping: 20 })

  useMotionValueEvent(scrollY, 'change', (latest) => {
    visible.set(latest > 600 ? 1 : 0)
  })

  function handleMouse(e) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width
    const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height
    x.set(dx)
    y.set(dy)
  }

  function handleLeave() {
    x.set(0)
    y.set(0)
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <motion.button
      ref={ref}
      onClick={scrollToTop}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ scale, translateX, translateY, rotate }}
      initial={false}
      className="fixed bottom-8 right-8 z-[9999] w-14 h-14 rounded-full glass-panel flex items-center justify-center group cursor-pointer"
      whileTap={{ scale: 0.9 }}
    >
      {/* Pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(0,240,255,0)',
            '0 0 0 6px rgba(0,240,255,0.08)',
            '0 0 0 0 rgba(0,240,255,0)',
          ],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Expanding ring */}
      <motion.div
        className="absolute inset-0 rounded-full border border-[#00f0ff]/10"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      <BrainSVG />

      {/* Status dot */}
      <motion.div
        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00f0ff]"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <span className="sr-only">Scroll to top</span>
    </motion.button>
  )
}
