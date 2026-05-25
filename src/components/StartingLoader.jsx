import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateQuestion } from '../lib/gemini'
import { useAutoTraverse } from '../context/AutoTraverseContext'
import { getActiveAdVideos, incrementAdViewCount } from '../lib/supabase'
import AdVideoPlayer from './ui/AdVideoPlayer'

const TERMINAL_LINES = [
  'Initializing Neural Aurora system...',
  'Calibrating biometric scanners...',
  'Scanning visitor credentials...',
  'Security protocol: ACTIVE',
  'Verification required to proceed.',
]

function Particles() {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    let id, w, h
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 0.5, o: Math.random() * 0.4 + 0.1,
    }))
    function resize() { w = c.width = innerWidth; h = c.height = innerHeight }
    resize(); addEventListener('resize', resize)
    function draw() {
      ctx.clearRect(0, 0, w, h)
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,240,255,${p.o})`; ctx.fill()
      })
      pts.forEach((a, i) => {
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx*dx+dy*dy)
          if (d < 100) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(0,240,255,${(1-d/100)*0.12})`; ctx.stroke()
          }
        }
      })
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" />
}

function TerminalBoot({ onDone }) {
  const [lines, setLines] = useState([])
  const [typing, setTyping] = useState('')
  const [cursor, setCursor] = useState(true)
  const [currentLine, setCurrentLine] = useState(0)
  const charIdx = useRef(0)

  useEffect(() => {
    const ci = setInterval(() => setCursor(p => !p), 500)
    return () => clearInterval(ci)
  }, [])

  useEffect(() => {
    if (currentLine >= TERMINAL_LINES.length) {
      const t = setTimeout(onDone, 600)
      return () => clearTimeout(t)
    }
    const line = TERMINAL_LINES[currentLine]
    charIdx.current = 0
    setTyping('')
    const ti = setInterval(() => {
      charIdx.current++
      setTyping(line.slice(0, charIdx.current))
      if (charIdx.current >= line.length) {
        clearInterval(ti)
        setLines(p => [...p, line])
        setCurrentLine(p => p + 1)
      }
    }, 20)
    return () => clearInterval(ti)
  }, [currentLine, onDone])

  return (
    <div className="relative z-10 w-full max-w-xl mx-auto px-4">
      <div className="rounded-xl border border-white/10 backdrop-blur-xl bg-black/50">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 text-[9px] uppercase tracking-widest text-white/20 font-mono">Neural Aurora Terminal</span>
        </div>
        <div className="p-5 font-mono text-xs leading-relaxed space-y-1.5 min-h-[220px]">
          <div className="text-neural-blue/40 text-[10px] mb-3">Neural Aurora OS v2.0</div>
          {lines.map((l, i) => (
            <div key={i} className="flex">
              <span className="text-neural-blue/30 mr-2 shrink-0">&gt;</span>
              <span className="text-white/70">{l}</span>
            </div>
          ))}
          {currentLine < TERMINAL_LINES.length && (
            <div className="flex">
              <span className="text-neural-blue/30 mr-2">&gt;</span>
              <span>{typing}{cursor && <span className="text-neural-blue animate-pulse">_</span>}</span>
            </div>
          )}
          {currentLine >= TERMINAL_LINES.length && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-neural-blue/30 mr-2">&gt;</span>
              <span className="text-emerald-400">System ready.</span>
              <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} className="text-emerald-400">_</motion.span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function VoiceChallenge({ onSuccess }) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [msg, setMsg] = useState('Click the mic and say "Amit"')
  const recRef = useRef(null)
  const maxConfidence = useRef(0)

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setTimeout(() => {
        const u = new SpeechSynthesisUtterance('Say my name to enter.')
        u.rate = 0.9; speechSynthesis.speak(u)
      }, 500)
    }
  }, [])

  function speak(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 0.9; speechSynthesis.speak(u)
    }
  }

  useEffect(() => {
    return () => {
      if (recRef.current) try { recRef.current.stop() } catch {}
    }
  }, [])

  function startListening() {
    setListening(true)
    setTranscript('')
    setConfidence(0)
    maxConfidence.current = 0
    speak('Speak now.')

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setListening(false)
      setMsg('Speech recognition not supported')
      return
    }
    const rec = new SpeechRecognition()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = true
    recRef.current = rec

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i][0]
        const text = result.transcript.toLowerCase().trim()
        const conf = Math.round(result.confidence * 100)
        setTranscript(text)
        if (conf > maxConfidence.current) {
          maxConfidence.current = conf
          setConfidence(conf)
        }
        if (text.includes('amit')) {
          rec.stop()
          speak('Welcome to Amit\'s world.')
          setMsg('Amit detected!')
          setTimeout(() => {
            setListening(false)
            onSuccess()
          }, 600)
          return
        }
      }
    }
    rec.onerror = () => {}
    rec.start()
  }

  function stopListening() {
    setListening(false)
    if (recRef.current) try { recRef.current.stop() } catch {}
  }

  const circumference = 2 * Math.PI * 50
  const progress = (confidence / 100) * circumference

  return (
    <div className="relative z-10 flex flex-col items-center gap-6 px-4">
      <p className="text-xs font-mono text-white/30 uppercase tracking-[0.2em]">Voice Verification</p>
      <div className="relative">
        <button
          onClick={listening ? stopListening : startListening}
          className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${listening ? 'bg-neural-blue/20 border-2 border-neural-blue' : 'bg-white/5 border-2 border-white/20 hover:border-neural-blue/50'}`}
        >
          <motion.div animate={listening ? { scale: [1, 1.08, 1] } : { scale: 1 }} transition={{ duration: 1.5, repeat: listening ? Infinity : 0, ease: 'easeInOut' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`w-10 h-10 ${listening ? 'text-neural-blue' : 'text-white/50'}`}>
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" /><line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
            </svg>
          </motion.div>
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="56" cy="56" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <motion.circle cx="56" cy="56" r="50" fill="none" stroke="#00f0ff" strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - progress} initial={false} style={{ filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.4))' }} />
          </svg>
        </button>
        {listening && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-neural-blue/20 border border-neural-blue/50 flex items-center justify-center">
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-2.5 h-2.5 rounded-full bg-neural-blue" />
          </div>
        )}
      </div>
      <p className="text-sm font-mono text-white/60 text-center min-h-[20px]">{msg}</p>
      {transcript && <p className="text-xs font-mono text-neural-blue/60 italic">Heard: "{transcript}"</p>}
      <div className="w-full max-w-xs space-y-2">
        <div className="flex justify-between text-[10px] font-mono">
          <span className="text-white/20">Recognition Confidence</span>
          <span className={confidence >= 50 ? 'text-emerald-400' : 'text-neural-blue'}>{confidence}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #00f0ff, #b829dd)', width: `${Math.min(confidence, 100)}%` }} layout />
        </div>
      </div>
    </div>
  )
}

function MCQChallenge({ question, onCorrect, onWrong }) {
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)

  function handleSelect(i) {
    if (result) return
    setSelected(i)
    if (i === question.ans) {
      setResult('correct')
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance('Correct')
        u.rate = 0.9; speechSynthesis.speak(u)
      }
      setTimeout(onCorrect, 800)
    } else {
      setResult('wrong')
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance('Wrong answer')
        u.rate = 0.9; speechSynthesis.speak(u)
      }
      setTimeout(onWrong, 1000)
    }
  }

  return (
    <div className="relative z-10 w-full max-w-md mx-auto px-4">
      <p className="text-xs font-mono text-white/30 uppercase tracking-[0.2em] text-center mb-6">Logic Verification</p>
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-xl border border-white/10 backdrop-blur-xl bg-black/40 p-6"
      >
        <h3 className="text-base md:text-lg font-display font-bold text-white mb-5">{question.q}</h3>
        <div className="space-y-2.5">
          {question.opts.map((opt, i) => (
            <motion.button
              key={i}
              onClick={() => handleSelect(i)}
              whileHover={result ? {} : { scale: 1.02 }}
              whileTap={result ? {} : { scale: 0.98 }}
              animate={result === 'wrong' && selected === i ? { x: [0, -8, 8, -8, 8, 0] } : {}}
              transition={{ duration: 0.3 }}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-300 font-mono text-sm ${
                result === 'correct' && i === question.ans ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' :
                result === 'wrong' && i === selected ? 'border-red-500/50 bg-red-500/10 text-red-400' :
                selected === i ? 'border-neural-blue bg-neural-blue/10 text-white' :
                'border-white/10 bg-white/5 text-white/50 hover:border-white/30 hover:text-white/70'
              }`}
            >
              <span className="inline-block w-5 h-5 rounded-full border border-current text-[10px] flex items-center justify-center mr-2.5 shrink-0">{String.fromCharCode(65 + i)}</span>
              {opt}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function SuccessScreen() {
  const [showAccess, setShowAccess] = useState(false)
  const [showText, setShowText] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setShowAccess(true), 300)
    const t2 = setTimeout(() => setShowText(true), 1500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="relative z-10 flex flex-col items-center justify-center gap-4 px-4">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
      >
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-emerald-400">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </motion.div>
      <AnimatePresence>
          {showAccess && (
          <motion.h1
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="text-5xl md:text-7xl font-display font-bold tracking-tighter text-center"
            style={{
              background: 'linear-gradient(135deg, #00f0ff, #b829dd, #f0c040)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              filter: 'drop-shadow(0 0 25px rgba(0,240,255,0.25))',
            }}
          >ACCESS GRANTED</motion.h1>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showText && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
            className="text-base text-white/40 font-mono tracking-wider"
          >Welcome to Amit&apos;s world.</motion.p>
        )}
      </AnimatePresence>
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.div key={i} className="absolute pointer-events-none"
          style={{ left: `${5 + Math.random() * 90}%`, bottom: '-5%' }}
          initial={{ y: 0, opacity: 0.7, scale: 0 }}
          animate={{ y: -(window.innerHeight * (0.4 + Math.random() * 0.4) + 150), opacity: [0.7, 0], scale: [0, 1, 0.4] }}
          transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.5, ease: 'easeOut' }}
        >
          {i % 2 === 0
            ? <svg viewBox="0 0 24 24" fill="#ff006e" className="w-4 h-4" style={{ filter: 'drop-shadow(0 0 5px rgba(255,0,110,0.5))' }}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
            : <div className="w-2 h-5 rounded-full" style={{ background: '#00f0ff', boxShadow: '0 0 6px rgba(0,240,255,0.5)' }} />
          }
        </motion.div>
      ))}
    </div>
  )
}

function Confetti() {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    let id, w, h
    const pieces = Array.from({ length: 50 }, () => ({
      x: Math.random() * innerWidth, y: -Math.random() * 200,
      vx: (Math.random() - 0.5) * 4, vy: 1 + Math.random() * 3,
      w: 3 + Math.random() * 5, h: 2 + Math.random() * 4,
      color: ['#00f0ff','#b829dd','#f0c040','#ff006e','#00ff88'][Math.floor(Math.random() * 5)],
      rot: Math.random() * 360, rs: (Math.random() - 0.5) * 8,
    }))
    function resize() { w = c.width = innerWidth; h = c.height = innerHeight }
    resize(); addEventListener('resize', resize)
    function draw() {
      ctx.clearRect(0, 0, w, h)
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rot += p.rs; p.vy += 0.03
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180)
        ctx.globalAlpha = Math.max(0, 1 - p.y / h)
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
        if (p.y > h + 20) { p.y = -Math.random() * 100; p.x = Math.random() * w; p.vy = 1 + Math.random() * 3 }
      })
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }} />
}

export default function StartingLoader({ onComplete }) {
  const [phase, setPhase] = useState('booting')
  const [question, setQuestion] = useState(null)
  const [loadingQ, setLoadingQ] = useState(false)
  const [adVideos, setAdVideos] = useState([])
  const [currentAd, setCurrentAd] = useState(null)
  const [adLoading, setAdLoading] = useState(false)
  const { enabled: autoTraverse, toggle: toggleAutoTraverse } = useAutoTraverse()
  const doneRef = useRef(onComplete)
  doneRef.current = onComplete

  useEffect(() => {
    if (sessionStorage.getItem('neural-aurora-verified')) {
      doneRef.current()
    }
  }, [])

  async function loadQuestion() {
    setLoadingQ(true)
    const q = await generateQuestion()
    setQuestion(q)
    setLoadingQ(false)
    return q
  }

  async function handleBootDone() {
    await loadQuestion()
    setPhase('selecting')
  }

  function handleVoiceSuccess() {
    sessionStorage.setItem('neural-aurora-verified', 'true')
    setPhase('success')
    setTimeout(() => setPhase('transitioning'), 2200)
    setTimeout(() => doneRef.current(), 3200)
  }

  async function handleMCQCorrect() {
    sessionStorage.setItem('neural-aurora-verified', 'true')
    setPhase('success')
    setTimeout(() => setPhase('transitioning'), 2200)
    setTimeout(() => doneRef.current(), 3200)
  }

  async function handleMCQWrong() {
    await loadQuestion()
    setPhase('selecting')
  }

  async function handleWatchAds() {
    setAdLoading(true)
    try {
      const videos = await getActiveAdVideos()
      if (videos.length === 0) {
        handleVoiceSuccess()
        setAdLoading(false)
        return
      }
      setAdVideos(videos)
      setCurrentAd(0)
      setPhase('ad-watching')
    } catch {
      handleVoiceSuccess()
    }
    setAdLoading(false)
  }

  async function handleAdComplete() {
    try {
      await incrementAdViewCount(adVideos[currentAd].id)
    } catch {}
    const next = currentAd + 1
    if (next < adVideos.length) {
      setCurrentAd(next)
    } else {
      sessionStorage.setItem('neural-aurora-verified', 'true')
      setPhase('success')
      setTimeout(() => setPhase('transitioning'), 2200)
      setTimeout(() => doneRef.current(), 3200)
    }
  }

  function handleAdSkip() {
    setCurrentAd(null)
    setAdVideos([])
    setPhase('selecting')
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, #0a0a12 0%, #050508 100%)' }}
      animate={phase === 'transitioning' ? { opacity: 0, scale: 1.05 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, ease: 'easeInOut' }}
    >
      <Particles />
      {phase === 'success' && <Confetti />}

      <AnimatePresence mode="wait">
        {phase === 'booting' && (
          <motion.div key="boot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TerminalBoot onDone={handleBootDone} />
          </motion.div>
        )}

        {phase === 'selecting' && (
          <motion.div key="select" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
            className="relative z-10 flex flex-col items-center gap-6 px-4"
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.2 }}>
              <div className="w-20 h-20 rounded-full relative flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-transparent"
                  style={{ borderTopColor: '#00f0ff', borderRightColor: '#b829dd', borderBottomColor: '#f0c040' }}
                />
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neural-blue/20 to-neural-purple/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5" className="w-6 h-6">
                    <path d="M12 2a4 4 0 014 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 014-4z" strokeLinecap="round" />
                    <path d="M12 13v3" strokeLinecap="round" /><path d="M8 20h8" strokeLinecap="round" />
                    <path d="M12 16a2 2 0 00-2 2h4a2 2 0 00-2-2z" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </motion.div>

            <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="text-xl font-display font-bold text-white text-center"
            >Verification Required</motion.h2>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="text-xs text-white/30 font-mono text-center max-w-sm"
            >Prove your identity to access the system.</motion.p>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <button
                onClick={() => setPhase('voice')}
                className="group px-6 py-4 rounded-xl border border-white/10 bg-white/5 hover:border-neural-blue/50 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-neural-blue/10 flex items-center justify-center group-hover:bg-neural-blue/20 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5" className="w-4 h-4">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div><p className="text-white text-sm">Say "Amit"</p><p className="text-[10px] text-white/30 mt-0.5">Voice recognition</p></div>
                </div>
              </button>
              <button
                onClick={async () => { await loadQuestion(); setPhase('mcq') }}
                disabled={loadingQ}
                className="group px-6 py-4 rounded-xl border border-white/10 bg-white/5 hover:border-neural-purple/50 transition-all duration-300 disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-neural-purple/10 flex items-center justify-center group-hover:bg-neural-purple/20 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#b829dd" strokeWidth="1.5" className="w-4 h-4">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" />
                      <path d="M2 17l10 5 10-5" strokeLinecap="round" /><path d="M2 12l10 5 10-5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div><p className="text-white text-sm">Solve Puzzle</p><p className="text-[10px] text-white/30 mt-0.5">One question</p></div>
                </div>
              </button>
              <button
                onClick={toggleAutoTraverse}
                className={`group px-6 py-4 rounded-xl border transition-all duration-300 ${
                  autoTraverse
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5 hover:border-neural-blue/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    autoTraverse ? 'bg-emerald-500/20' : 'bg-neural-blue/10 group-hover:bg-neural-blue/20'
                  }`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={autoTraverse ? '#10b981' : '#00f0ff'} strokeWidth="1.5" className="w-4 h-4">
                      <circle cx="12" cy="12" r="10" strokeLinecap="round" />
                      <polyline points="12 6 12 12 16 14" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm ${autoTraverse ? 'text-emerald-400' : 'text-white'}`}>
                      {autoTraverse ? 'Traverse On' : 'Auto Traverse'}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {autoTraverse ? 'Auto-demo mode active' : 'Full site demo tour'}
                    </p>
                  </div>
                </div>
              </button>
              <button
                onClick={handleWatchAds}
                disabled={adLoading}
                className="group px-6 py-4 rounded-xl border border-white/10 bg-white/5 hover:border-amber-400/50 transition-all duration-300 disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-400/10 flex items-center justify-center group-hover:bg-amber-400/20 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" className="w-4 h-4">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-sm">Watch Dev Ads</p>
                    <p className="text-[10px] text-white/30 mt-0.5">Video ads to unlock</p>
                  </div>
                </div>
              </button>
            </motion.div>
          </motion.div>
        )}

        {phase === 'voice' && (
          <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <VoiceChallenge onSuccess={handleVoiceSuccess} />
          </motion.div>
        )}

        {phase === 'mcq' && question && (
          <motion.div key="mcq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MCQChallenge question={question} onCorrect={handleMCQCorrect} onWrong={handleMCQWrong} />
          </motion.div>
        )}

        {phase === 'ad-watching' && currentAd !== null && adVideos[currentAd] && (
          <motion.div
            key={`ad-${currentAd}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 px-4 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <motion.span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#fbbf24', boxShadow: '0 0 6px rgba(251,191,36,0.4)' }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-[10px] font-mono tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Ad {currentAd + 1} / {adVideos.length}
              </span>
            </motion.div>
            <AdVideoPlayer
              video={adVideos[currentAd]}
              onComplete={handleAdComplete}
              onSkip={handleAdSkip}
            />
          </motion.div>
        )}

        {phase === 'success' && (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SuccessScreen />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(phase === 'voice' || phase === 'mcq' || phase === 'ad-watching') && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => {
              if (phase === 'ad-watching') { setCurrentAd(null); setAdVideos([]) }
              setPhase('selecting')
            }}
            className="absolute top-5 left-5 z-10 w-9 h-9 rounded-full border border-white/10 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/30 hover:text-white hover:border-white/30 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <p className="text-[9px] font-mono text-white/10 tracking-[0.3em] uppercase">Neural Aurora</p>
      </div>
    </motion.div>
  )
}
