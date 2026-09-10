import { useState, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MOODS } from '../lib/moodMusic'
import { hasApiKey } from '../lib/musicApi'

function MoodParticles({ moodColors, shouldReduceMotion }) {
  const ref = useRef(null)
  const animRef = useRef(null)
  const skipRef = useRef(0)

  useEffect(() => {
    const c = ref.current
    if (!c || !moodColors) return
    const ctx = c.getContext('2d')
    let w, h
    const pts = Array.from({ length: 20 }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      r: Math.random() * 1.5 + 0.5,
    }))
    function resize() { w = c.width = innerWidth; h = c.height = innerHeight }
    resize()
    const onResize = () => resize()
    addEventListener('resize', onResize)

    function draw() {
      if (shouldReduceMotion) return
      skipRef.current++
      if (skipRef.current % 2 !== 0) {
        animRef.current = requestAnimationFrame(draw)
        return
      }
      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
      }
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = moodColors
        ctx.fill()
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j]
          const dx = a.x - b.x, dy = a.y - b.y
          if (dx > 120 || dy > 120) continue
          const d = dx * dx + dy * dy
          if (d < 14400) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = moodColors.replace('0.15', `${(1 - Math.sqrt(d) / 120) * 0.06}`)
            ctx.stroke()
          }
        }
      }
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      removeEventListener('resize', onResize)
    }
  }, [moodColors, shouldReduceMotion])

  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />
}

export default function MoodSwing({ onSelect }) {
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()
  const [selected, setSelected] = useState(null)
  const [exiting, setExiting] = useState(false)
  const [hoveredMood, setHoveredMood] = useState(null)
  const moodColors = hoveredMood
    ? MOODS.find(m => m.id === hoveredMood)?.glowColor || 'rgba(0,240,255,0.15)'
    : 'rgba(0,240,255,0.08)'

  function handleSelect(id) {
    setSelected(id)
    setExiting(true)
    onSelect(id)
  }

  return (
    <div className="relative z-10 w-full max-w-4xl mx-auto px-4">
      <MoodParticles moodColors={moodColors}
      shouldReduceMotion={shouldReduceMotion} />
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1 }}
        transition={shouldReduceMotion ? undefined : { duration: 0.5 }}
        className="relative z-[1] flex flex-col items-center gap-8"
      >
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: -10 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? undefined : { delay: 0.15, duration: 0.5 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neural-blue/20 to-neural-purple/20 flex items-center justify-center">
            <motion.span
              className="text-2xl"
              animate={shouldReduceMotion ? undefined :{ rotate: [0, 15, -15, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {'\uD83C\uDFB5'}
            </motion.span>
          </div>
          <h2 className="text-xl font-display font-bold text-white text-center tracking-tight">
            {t('mood.title')}
          </h2>
          <p className="text-xs text-white/30 font-mono text-center max-w-xs">
            {t('mood.subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full">
          {MOODS.map((mood, i) => {
            const isSelected = selected === mood.id
            const isDisabled = exiting && !isSelected

            return (
              <motion.button
                key={mood.id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 30, rotate: i % 2 === 0 ? -8 : 8 }}
                animate={shouldReduceMotion ? {
                  opacity: isDisabled ? 0 : 1,
                  y: 0,
                  rotate: 0,
                  scale: 1,
                } : {
                  opacity : isDisabled ? 0 : 1,
                  y: isDisabled ? 20 : 0,
                  rotate: isSelected ? 0 : (i%2 === 0 ? -8 : 8),
                  scale: isSelected ? 1.08 : 1,
                }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={shouldReduceMotion ? undefined : {
                  type: 'spring',
                  stiffness: 120,
                  damping: 16,
                  delay: exiting && !isSelected ? 0 : 0.1 + i * 0.06,
                }}
                onClick={() => !exiting && handleSelect(mood.id)}
                onHoverStart={() => !exiting && setHoveredMood(mood.id)}
                onHoverEnd={() => !exiting && setHoveredMood(null)}
                whileHover={!exiting && !shouldReduceMotion ? { scale: 1.05, rotate: 0, y: -6 } : {}}
                whileTap={!exiting && !shouldReduceMotion ? { scale: 0.95 } : {}}
                className={`
                  relative flex flex-col items-center gap-2.5 p-4 sm:p-5 rounded-2xl
                  border backdrop-blur-sm transition-all duration-300
                  ${isSelected
                    ? `${mood.borderColor} bg-white/[0.06]`
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  }
                  ${isDisabled ? 'pointer-events-none' : 'cursor-pointer'}
                `}
                style={isSelected ? {
                  boxShadow: `0 0 40px ${mood.glowColor}`,
                } : undefined}
              >
                {isSelected && (
                  <motion.div
                    layoutId="mood-glow"
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: `radial-gradient(ellipse at center, ${mood.glowColor}, transparent 70%)`,
                    }}
                    initial={shouldReduceMotion ? false :{ opacity: 0 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 0.4 }}
                    transition={shouldReduceMotion ? undefined : { duration: 0.3 }}
                  />
                )}

                <motion.div
                  className="text-3xl sm:text-4xl leading-none relative z-[1]"
                  animate={shouldReduceMotion ? undefined : (isSelected ? {
                    scale: [1, 1.2, 1],
                    rotate: [0, -12, 12, -6, 0],
                  } : {
                    rotate: [0, 0],
                  })}
                  transition={shouldReduceMotion ? undefined : { duration: 0.5, ease: 'easeInOut' }}
                >
                  {mood.emoji}
                </motion.div>

                <div className="flex flex-col items-center gap-0.5 relative z-[1]">
                  <motion.span
                    className={`text-xs sm:text-sm font-bold tracking-wide ${
                      isSelected ? mood.textColor : 'text-white/80'
                    }`}
                    animate={shouldReduceMotion ? undefined : (isSelected ? { scale: [1, 1.05, 1] } : {})}
                    transition={shouldReduceMotion ? undefined : { duration: 0.3 }}
                  >
                    {t('mood.moods.' + mood.id + '.label', mood.label)}
                  </motion.span>
                  <span className="text-[9px] sm:text-[10px] text-white/30 font-mono text-center leading-tight">
                    {t('mood.moods.' + mood.id + '.description', mood.description)}
                  </span>
                </div>

                <motion.div
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
                  initial={shouldReduceMotion ? false : { width: 0, opacity: 0 }}
                  animate={{
                    width: isSelected ? '60%' : (hoveredMood === mood.id ? '40%' : 0),
                    opacity: isSelected || hoveredMood === mood.id ? 1 : 0,
                  }}
                  transition={shouldReduceMotion ? undefined : { duration: 0.3, delay: isSelected ? 0.15 : 0 }}
                  style={{
                    background: `linear-gradient(90deg, transparent, ${mood.glowColor.replace('0.15', '0.6')}, transparent)`,
                  }}
                />
              </motion.button>
            )
          })}
        </div>

        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1 }}
          transition={shouldReduceMotion ? undefined : { delay: 0.8 }}
          className="text-[10px] font-mono text-white/15 text-center"
        >
          {t('mood.footnote')}
        </motion.p>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1 }}
          transition={shouldReduceMotion ? undefined : { delay: 1 }}
          className="flex items-center gap-2"
        >
          <span className={`text-[8px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full border ${
            hasApiKey()
              ? 'text-emerald-400/50 border-emerald-500/20 bg-emerald-500/5'
              : 'text-amber-400/40 border-amber-500/20 bg-amber-500/5'
          }`}>
            {hasApiKey() ? 'Jamendo API' : 'Web Audio Synth'}
          </span>
        </motion.div>
      </motion.div>
    </div>
  )
}
