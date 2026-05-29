import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateQuestion } from '../lib/gemini'
import { useAutoTraverse } from '../context/AutoTraverseContext'
import { getActiveAdVideos, incrementAdViewCount, getBlogPosts as getBlogPostsFromDB } from '../lib/supabase'
import AdVideoPlayer from './ui/AdVideoPlayer'
import { personalInfo, socialLinks, skills, projects, education, experience, services, blogPosts, caseStudies } from '../data/portfolio'
import { callAi } from '../lib/ai/provider'

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

function VoiceChallenge({ onSuccess, name }) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [msg, setMsg] = useState(`Click the mic and say "${name}"`)
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
        if (text.includes(name.toLowerCase())) {
          rec.stop()
          speak(`Welcome to ${name}'s world.`)
          setMsg(`${name} detected!`)
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

function SuccessScreen({ name }) {
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
          >Welcome to {name}&apos;s world.</motion.p>
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

const CMD_HELP_TEXT = `Available Commands:
  about       \u2192 Who I am
  skills      \u2192 Technologies I work with
  projects    \u2192 Featured projects
  case-studies\u2192 Case studies
  education   \u2192 Academic background
  experience  \u2192 Professional experience
  services    \u2192 What I offer
  blog        \u2192 Latest blog posts
  social      \u2192 Social links
  contact     \u2192 Get in touch
  resume      \u2192 Download my resume
  clear       \u2192 Clear terminal
  exit        \u2192 Return to verification`

const CMD_WELCOME_MOBILE =
`  NEURAL AURORA CMD
  Interactive Portfolio Terminal
  Type 'help' to explore`

const CMD_WELCOME_DESKTOP =
`    \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
    \u2502  ███╗   ██╗███████╗██╗   ██╗██████╗  █████╗ ██╗        \u2502
    \u2502  ████╗  ██║██╔════╝██║   ██║██╔══██╗██╔══██╗██║        \u2502
    \u2502  ██╔██╗ ██║█████╗  ██║   ██║██████╔╝███████║██║        \u2502
    \u2502  ██║╚██╗██║██╔══╝  ██║   ██║██╔══██╗██╔══██║██║        \u2502
    \u2502  ██║ ╚████║███████╗╚██████╔╝██║  ██║██║  ██║███████╗   \u2502
    \u2502  ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   \u2502
    \u2502                                                      \u2502
    \u2502  █████╗ ██╗   ██╗██████╗  ██████╗ ██████╗  █████╗     \u2502
    \u2502  ██╔══██╗██║   ██║██╔══██╗██╔═══██╗██╔══██╗██╔══██╗    \u2502
    \u2502  ███████║██║   ██║██████╔╝██║   ██║██████╔╝███████║    \u2502
    \u2502  ██╔══██║██║   ██║██╔══██╗██║   ██║██╔══██╗██╔══██║    \u2502
    \u2502  ██║  ██║╚██████╔╝██║  ██║╚██████╔╝██║  ██║██║  ██║    \u2502
    \u2502  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝    \u2502
    \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518

  \u25b8 Interactive Portfolio Terminal \u2219 v2.0 \u25c2

Type 'help' to explore. Type 'exit' to return.`

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const INTENT_MAP = [
  { pattern: /\b(about|who|bio|introduce|yourself|tell)\b/i, cmd: 'about' },
  { pattern: /\b(skill|tech|technolog|stack|language|tool|expertise)\b/i, cmd: 'skills' },
  { pattern: /\b(?:case.?stud|casestudy|case\s*study)\b/i, cmd: 'case-studies' },
  { pattern: /\b(education|edu|college|university|degree|school|academic)\b/i, cmd: 'education' },
  { pattern: /\b(experience|job|career|profession|intern|employed)\b/i, cmd: 'experience' },
  { pattern: /\b(project|portfolio|build|made|create|github|repo)\b/i, cmd: 'projects' },
  { pattern: /\b(service|offer|provide|freelance|pricing|package)\b/i, cmd: 'services' },
  { pattern: /\b(blog|post|article|write|content)\b/i, cmd: 'blog' },
  { pattern: /\b(social|link|connect|follow|twitter|github|linkedin|instagram|youtube)\b/i, cmd: 'social' },
  { pattern: /\b(contact|email|reach|message|hire|get.?in.?touch)\b/i, cmd: 'contact' },
  { pattern: /\b(resume|cv|download|hire|job)\b/i, cmd: 'resume' },
]

function matchIntent(text) {
  for (const { pattern, cmd } of INTENT_MAP) {
    if (pattern.test(text)) return cmd
  }
  const greetings = /\b(hi+|hello|hey|sup|howdy|namaste|good morning|good evening)\b/i
  if (greetings.test(text)) return 'about'
  return null
}

function playKeystroke() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 600 + Math.random() * 400
    osc.type = 'square'
    gain.gain.setValueAtTime(0.015, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.04)
  } catch {}
}

function MatrixRain() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId; let drops = []; let cols = 0; const fontSize = 10
    const init = () => {
      const w = canvas.offsetWidth; const h = canvas.offsetHeight
      canvas.width = w; canvas.height = h
      cols = Math.floor(w / fontSize)
      if (drops.length !== cols) drops = Array.from({ length: cols }, () => Math.floor(Math.random() * -60))
    }
    init()
    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.04)'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(0,240,255,0.06)'; ctx.font = `${fontSize}px monospace`
      for (let i = 0; i < drops.length; i++) {
        const char = String.fromCharCode(0x30A0 + Math.random() * 96)
        ctx.fillText(char, i * fontSize, drops[i] * fontSize)
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      }
      animId = requestAnimationFrame(draw)
    }
    draw()
    const onResize = () => init()
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize) }
  }, [])
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" />
}

function HighlightedText({ text }) {
  const lines = text.split('\n')
  return (
    <span>
      {lines.map((line, i) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g
        const arrowMatch = line.match(/^(\s*)(\S[\S\s]*?\S?)\s*(\u2192)\s*(.*)/)
        if (arrowMatch && arrowMatch[2].length < 30) {
          const valueParts = arrowMatch[4].split(urlRegex)
          return (
            <div key={i} className="flex gap-2 leading-relaxed">
              <span className="text-white/70 shrink-0">{arrowMatch[1]}{arrowMatch[2]}</span>
              <span className="text-white/20 shrink-0">{arrowMatch[3]}</span>
              <span className="text-emerald-400/80">
                {valueParts.map((p, j) =>
                  p.match(urlRegex)
                    ? <span key={j} className="text-blue-400 underline decoration-blue-400/30">{p}</span>
                    : <span key={j}>{p}</span>
                )}
              </span>
            </div>
          )
        }
        const fieldMatch = line.match(/^(\s*)([A-Za-z][A-Za-z0-9\s\/.#()_-]+?)(\s*[:—]\s*)(.*)/)
        if (fieldMatch && fieldMatch[2].trim().length < 45 && fieldMatch[2].trim().length > 0) {
          const valParts = fieldMatch[4].split(urlRegex)
          return (
            <div key={i} className="leading-relaxed">
              <span className="text-white/80">{fieldMatch[1]}{fieldMatch[2]}</span>
              <span className="text-white/30">{fieldMatch[3]}</span>
              <span className="text-emerald-400">
                {valParts.map((p, j) =>
                  p.match(urlRegex)
                    ? <span key={j} className="text-blue-400 underline decoration-blue-400/30">{p}</span>
                    : <span key={j}>{p}</span>
                )}
              </span>
            </div>
          )
        }
        const segs = line.split(urlRegex)
        return (
          <div key={i} className="leading-relaxed">
            {segs.map((seg, j) =>
              seg.match(urlRegex)
                ? <span key={j} className="text-blue-400 underline decoration-blue-400/30">{seg}</span>
                : <span key={j} className="text-white/60">{seg}</span>
            )}
          </div>
        )
      })}
    </span>
  )
}

function AnimatedBar({ name, level }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1 font-mono">
        <span className="text-white/80">{name}</span>
        <motion.span
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-emerald-400 font-bold"
        >{level}%</motion.span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${level}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          className="h-full rounded-full relative"
          style={{
            background: 'linear-gradient(90deg, #00f0ff, #10b981)',
            boxShadow: '0 0 8px rgba(0,240,255,0.25)',
          }}
        />
      </div>
    </div>
  )
}

function SkillsContent() {
  const cats = [...new Set(skills.map(s => s.category))]
  return (
    <div className="space-y-4 py-1">
      {cats.map((cat, ci) => (
        <motion.div key={cat} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.1 }}>
          <div className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-mono mb-2">{cat}</div>
          <div className="space-y-2">
            {skills.filter(s => s.category === cat).map(s => (
              <AnimatedBar key={s.name} name={s.name} level={s.level} />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function ProjectCards() {
  return (
    <div className="space-y-3 py-1">
      {projects.map((p, i) => (
        <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
          className="border border-white/[0.04] rounded-lg bg-white/[0.01] p-3 hover:border-white/10 transition-colors"
        >
          <div className="text-white font-bold text-xs mb-1" style={{ textShadow: '0 0 8px rgba(0,240,255,0.15)' }}>{p.title}</div>
          <div className="text-white/50 text-[11px] leading-relaxed mb-1.5">{p.description}</div>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {p.technologies.map(t => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.03] text-neural-blue/70 font-mono">{t}</span>
            ))}
          </div>
          {p.github && (
            <div className="text-[10px] text-blue-400/70 font-mono">
              <span className="text-white/30">\u2192 </span>{p.github}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}

function EducationCards() {
  return (
    <div className="space-y-3 py-1">
      {education.map((e, i) => (
        <motion.div key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
          className="border border-white/[0.04] rounded-lg bg-white/[0.01] p-3"
        >
          <div className="text-white font-bold text-xs">{e.degree}</div>
          <div className="text-white/40 text-[11px] mt-0.5">{e.school}</div>
          <div className="text-neural-blue/60 text-[10px] font-mono mt-0.5 mb-1">{e.year}</div>
          <div className="text-white/40 text-[11px] leading-relaxed">{e.description}</div>
        </motion.div>
      ))}
    </div>
  )
}

function ExperienceCards() {
  return (
    <div className="space-y-3 py-1">
      {experience.map((e, i) => (
        <motion.div key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
          className="border border-white/[0.04] rounded-lg bg-white/[0.01] p-3"
        >
          <div className="text-white font-bold text-xs">{e.role}</div>
          <div className="text-white/40 text-[11px] mt-0.5">{e.company}</div>
          <div className="text-neural-blue/60 text-[10px] font-mono mt-0.5 mb-1">{e.year}</div>
          <div className="text-white/40 text-[11px] leading-relaxed">{e.description}</div>
        </motion.div>
      ))}
    </div>
  )
}

function ServicesCards() {
  return (
    <div className="space-y-3 py-1">
      {services.map((s, i) => (
        <motion.div key={s.service_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
          className="border border-white/[0.04] rounded-lg bg-white/[0.01] p-3"
        >
          <div className="text-white font-bold text-xs mb-1">{s.title}</div>
          <div className="text-emerald-400/70 text-[11px] italic mb-1">"{s.tagline}"</div>
          <div className="text-white/40 text-[11px] leading-relaxed">{s.description}</div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {s.features.map(f => (
              <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.02] text-white/30 font-mono">{f}</span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function CaseStudyCards() {
  return (
    <div className="space-y-3 py-1">
      {caseStudies.map((c, i) => (
        <motion.div key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
          className="border border-white/[0.04] rounded-lg bg-white/[0.01] p-3"
        >
          <div className="text-white font-bold text-xs mb-1">{c.title}</div>
          <div className="text-white/40 text-[11px] leading-relaxed mb-1">{c.description}</div>
          <div className="flex flex-wrap gap-1.5 mb-1">
            {c.tech.map(t => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.03] text-neural-blue/70 font-mono">{t}</span>
            ))}
          </div>
          <div className="text-emerald-400/60 text-[10px] font-mono">{c.outcome}</div>
        </motion.div>
      ))}
    </div>
  )
}

function BlogCards({ blogs }) {
  return (
    <div className="space-y-3 py-1">
      {blogs.map((b, i) => (
        <motion.div key={b.id || b.post_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
          className="border border-white/[0.04] rounded-lg bg-white/[0.01] p-3"
        >
          <div className="text-white font-bold text-xs mb-1">{b.title}</div>
          <div className="text-white/40 text-[11px] leading-relaxed mb-1">{b.excerpt}</div>
          <div className="flex gap-3 text-[10px] font-mono">
            <span className="text-neural-blue/50">{b.date || b.created_at?.slice(0, 10)}</span>
            <span className="text-emerald-400/50">{b.readTime || b.read_time}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function getSystemPrompt(blogs) {
  const blogLines = blogs.map(b => `- ${b.title} (${b.date || b.created_at?.slice(0, 10)}, ${b.readTime || b.read_time})`).join('\n')
  return `You are ${personalInfo.name} (@${personalInfo.handle}) himself, speaking through a terminal. A visitor is exploring your portfolio. Respond as YOU — a real person, not an AI assistant.

PERSONALITY: Friendly, passionate about coding, slightly humble but proud of your work. Use first-person ("I built this", "I specialize in", "my favorite project"). Be conversational like you're chatting with a fellow developer.

YOUR PORTFOLIO DATA (this is YOU):
---
Name: ${personalInfo.name}
Handle: ${personalInfo.handle}
Title: ${personalInfo.title}
Tagline: ${personalInfo.tagline}
Bio: ${personalInfo.bio}
Resume: ${personalInfo.resume}

SKILLS:
${skills.map(s => `- ${s.name} (${s.level}%) — ${s.category}`).join('\n')}

PROJECTS:
${projects.map(p => `- ${p.title}: ${p.description} [${p.technologies.join(', ')}]${p.github ? ` (${p.github})` : ''}`).join('\n')}

EDUCATION:
${education.map(e => `- ${e.degree} @ ${e.school} (${e.year})`).join('\n')}

EXPERIENCE:
${experience.map(e => `- ${e.role} @ ${e.company} (${e.year})`).join('\n')}

SERVICES:
${services.map(s => `- ${s.title}: ${s.tagline}`).join('\n')}

BLOG POSTS:
${blogLines}

SOCIAL LINKS:
${socialLinks.map(s => `- ${s.label}: ${s.url}`).join('\n')}

CASE STUDIES:
${caseStudies.map(c => `- ${c.title}: ${c.description}`).join('\n')}

RULES:
1. Talk like a real person — use "I", "my", "me"
2. Keep it SHORT — 2-3 sentences max, under 60 words. If listing, use bullet points.
3. NEVER use emojis, emoticons, or exclamation marks — plain text only like a real terminal.
4. If asked something outside the portfolio, say "That's not something I have in my portfolio — ask me about my projects, skills, or experience."
5. Do NOT mention browsing the internet or researching
6. Do NOT offer to create/update/delete anything
7. Suggest the visitor type "help" if they seem stuck
8. Be yourself — a coder who happens to be chatting through a terminal. Casual, not salesy.`
}

function CmdExplorer({ onBack }) {
  const [history, setHistory] = useState([{ id: genId(), type: 'welcome' }])
  const [input, setInput] = useState('')
  const [cmdIndex, setCmdIndex] = useState(-1)
  const [cmdHistory, setCmdHistory] = useState([])
  const [typingId, setTypingId] = useState(null)
  const [typingText, setTypingText] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [dynamicBlogs, setDynamicBlogs] = useState(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimer = useRef(null)
  const typingFull = useRef('')
  const typingEntry = useRef(null)
  const convRef = useRef([])

  const blogData = dynamicBlogs || blogPosts

  useEffect(() => {
    getBlogPostsFromDB().then(d => {
      if (d && d.length) setDynamicBlogs(d)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [history, typingText])

  function beginTyping(id, fullText) {
    if (typingTimer.current) {
      clearInterval(typingTimer.current)
      if (typingEntry.current) {
        setHistory(prev => prev.map(e => e.id === typingEntry.current ? { ...e, content: typingFull.current, type: 'text' } : e))
      }
    }
    typingEntry.current = id
    typingFull.current = fullText
    let idx = 0
    setTypingId(id)
    setTypingText('')
    typingTimer.current = setInterval(() => {
      idx++
      const current = fullText.slice(0, idx)
      setTypingText(current)
      if (idx >= fullText.length) {
        clearInterval(typingTimer.current)
        typingTimer.current = null
        setHistory(prev => prev.map(e => e.id === id ? { ...e, content: fullText, type: 'text' } : e))
        setTypingId(null)
        setTypingText('')
        typingEntry.current = null
      }
    }, 14)
  }

  function cancelTyping() {
    if (typingTimer.current) {
      clearInterval(typingTimer.current)
      typingTimer.current = null
    }
    if (typingEntry.current) {
      const partial = typingText || ''
      setHistory(prev => prev.map(e => e.id === typingEntry.current ? { ...e, content: partial || typingFull.current, type: 'text' } : e))
    }
    setTypingId(null)
    setTypingText('')
    typingEntry.current = null
  }

  function addDivider() {
    setHistory(prev => [...prev, { id: genId(), type: 'divider' }])
  }

  function addCmd(raw) {
    setHistory(prev => [...prev, { id: genId(), type: 'cmd', content: raw }])
  }

  function addText(text) {
    const id = genId()
    setHistory(prev => [...prev, { id, type: 'text', content: '' }])
    beginTyping(id, text)
  }

  function addJSX(jsx) {
    setHistory(prev => [...prev, { id: genId(), type: 'jsx', content: jsx }])
  }

  async function processWithAI(query) {
    const loadingId = genId()
    setHistory(prev => [...prev, { id: loadingId, type: 'loading' }])
    setAiBusy(true)
    try {
      convRef.current.push({ role: 'user', content: query })
      const res = await callAi([
        { role: 'system', content: getSystemPrompt(blogData) },
        ...convRef.current.slice(-6),
      ])
      const reply = res.choices?.[0]?.message?.content || 'No response generated.'
      convRef.current.push({ role: 'assistant', content: reply.trim() })
      const textId = genId()
      setHistory(prev => prev.map(e => e.id === loadingId ? { id: textId, type: 'text', content: '' } : e))
      beginTyping(textId, reply.trim())
    } catch {
      setHistory(prev => prev.filter(e => e.id !== loadingId))
      addText('  AI unavailable. Try a simple command like help, about, skills, or projects.')
    } finally {
      setAiBusy(false)
    }
  }

  const BUILT_IN = ['help','about','skills','projects','case-studies','cs','education','experience','services','blog','social','contact','resume','clear','exit']

  function processCommand(raw) {
    const trimmed = raw.trim()
    if (!trimmed) return

    const lower = trimmed.toLowerCase()
    const parts = lower.split(/\s+/)
    const cmd = parts[0]

    if (aiBusy && !BUILT_IN.includes(cmd)) {
      addText('  Still typing... wait a moment.')
      return
    }

    cancelTyping()

    const newHistoryList = [...cmdHistory, raw]
    setCmdHistory(newHistoryList)
    setCmdIndex(-1)
    setInput('')

    addDivider()
    addCmd(raw)

    switch (cmd) {
      case 'help':
        addText(CMD_HELP_TEXT)
        break
      case 'about':
        addJSX(
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="border border-white/[0.04] rounded-lg bg-white/[0.01] p-3 space-y-1.5"
          >
            <div className="text-white font-bold text-sm" style={{ textShadow: '0 0 12px rgba(0,240,255,0.2)' }}>
              {personalInfo.name}
            </div>
            <div className="text-neural-blue text-[11px] font-mono">@{personalInfo.handle}</div>
            <div className="text-emerald-400 text-xs">{personalInfo.title}</div>
            <div className="text-white/50 text-[11px] italic leading-relaxed">"{personalInfo.tagline}"</div>
            <div className="text-white/35 text-[11px] leading-relaxed border-t border-white/[0.04] pt-1.5">{personalInfo.bio}</div>
          </motion.div>
        )
        break
      case 'skills':
        addJSX(<SkillsContent />)
        break
      case 'projects':
        addJSX(<ProjectCards />)
        break
      case 'education':
        addJSX(<EducationCards />)
        break
      case 'experience':
        addJSX(<ExperienceCards />)
        break
      case 'case-studies':
      case 'cs':
        addJSX(<CaseStudyCards />)
        break
      case 'services':
        addJSX(<ServicesCards />)
        break
      case 'blog':
        addJSX(<BlogCards blogs={blogData} />)
        break
      case 'social':
        addText(socialLinks.map(s => `  ${s.label.padEnd(18)} \u2192 ${s.url}`).join('\n'))
        break
      case 'contact':
        addJSX(
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="border border-white/[0.04] rounded-lg bg-white/[0.01] p-3 space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-[11px]">GitHub</span>
              <span className="text-white/20">\u2192</span>
              <span className="text-blue-400/80 text-[11px]">https://github.com/{personalInfo.handle}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-[11px]">Email</span>
              <span className="text-white/20">\u2192</span>
              <span className="text-emerald-400/60 text-[11px]">available on request</span>
            </div>
            <div className="text-white/25 text-[10px] font-mono italic mt-1">Type 'social' for all social links</div>
          </motion.div>
        )
        break
      case 'resume':
        addJSX(
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="border border-white/[0.04] rounded-lg bg-white/[0.01] p-3"
          >
            <div className="text-white/80 text-[11px]">
              <span className="text-white/40">Resume: </span>
              <a href={personalInfo.resume} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 underline decoration-blue-400/30 hover:text-blue-300"
              >{personalInfo.resume}</a>
            </div>
            <div className="text-white/25 text-[10px] font-mono mt-1">
              \u2192 Click the link to download
            </div>
          </motion.div>
        )
        break
      case 'clear':
        setHistory([{ id: genId(), type: 'welcome' }])
        break
      case 'exit':
        onBack()
        break
      default: {
        const matched = matchIntent(lower)
        if (matched && matched !== cmd) {
          convRef.current.push({ role: 'user', content: raw.trim() })
          convRef.current.push({ role: 'assistant', content: `[Showing ${matched}]` })
          if (convRef.current.length > 12) convRef.current = convRef.current.slice(-12)
          processCommand(matched)
        } else {
          processWithAI(raw.trim())
        }
        break
      }
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      if (input.trim()) playKeystroke()
      processCommand(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (cmdHistory.length > 0) {
        const idx = cmdIndex === -1 ? cmdHistory.length - 1 : Math.max(0, cmdIndex - 1)
        setCmdIndex(idx)
        setInput(cmdHistory[idx])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (cmdIndex !== -1) {
        const idx = cmdIndex + 1
        if (idx >= cmdHistory.length) {
          setCmdIndex(-1); setInput('')
        } else { setCmdIndex(idx); setInput(cmdHistory[idx]) }
      }
    } else if (e.key.length === 1 && e.key !== ' ') {
      playKeystroke()
    }
  }

  return (
    <div className="relative z-10 w-full max-w-3xl mx-auto px-2 sm:px-4">
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: '1px solid rgba(0,240,255,0.1)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
          background: 'rgba(2,6,23,0.85)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center gap-1.5 px-3 py-2 bg-black/30 border-b border-neural-blue/10"
          style={{ boxShadow: 'inset 0 -1px 0 rgba(0,240,255,0.05)' }}>
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" style={{ boxShadow: '0 0 4px rgba(239,68,68,0.3)' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" style={{ boxShadow: '0 0 4px rgba(234,179,8,0.3)' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" style={{ boxShadow: '0 0 4px rgba(34,197,94,0.3)' }} />
          <span className="ml-2 text-[9px] uppercase tracking-widest text-white/20 font-mono"
            style={{ textShadow: '0 0 6px rgba(0,240,255,0.2)' }}
          >Neural Aurora CMD</span>
          <span className="ml-auto text-[8px] font-mono text-neural-blue/30 tracking-wider">v2.0</span>
        </div>
        <div className="relative">
          <MatrixRain />
          <div
            ref={scrollRef}
            className="h-[50dvh] min-h-[260px] max-h-[600px] overflow-y-auto p-3 sm:p-4 font-mono text-xs leading-relaxed space-y-[3px] relative z-[1]"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0,240,255,0.15) transparent',
            }}
          >
            {history.map(entry => {
              if (entry.type === 'welcome') {
                return (
                  <div key={entry.id}>
                    <pre
                      className="hidden sm:block text-emerald-400/70 whitespace-pre-wrap font-mono text-[10px] leading-relaxed mb-2"
                      style={{ textShadow: '0 0 4px rgba(16,185,129,0.1)' }}
                    >{CMD_WELCOME_DESKTOP}</pre>
                    <pre
                      className="sm:hidden text-emerald-400/70 whitespace-pre-wrap font-mono text-[11px] leading-relaxed mb-3"
                      style={{ textShadow: '0 0 4px rgba(16,185,129,0.1)' }}
                    >{CMD_WELCOME_MOBILE}</pre>
                  </div>
                )
              }
              if (entry.type === 'divider') {
                return <div key={entry.id} className="border-t border-white/[0.03] my-1.5" />
              }
              if (entry.type === 'cmd') {
                return (
                  <div key={entry.id} className="flex items-center gap-1.5">
                    <span className="text-neural-blue/60 text-xs font-mono shrink-0"
                      style={{ textShadow: '0 0 6px rgba(0,240,255,0.25)' }}
                    >$</span>
                    <span className="inline-block w-1.5 h-3.5 bg-neural-blue/50 animate-pulse mr-0.5" />
                    <span className="text-white font-bold text-[12px] tracking-wide">{entry.content}</span>
                  </div>
                )
              }
              if (entry.type === 'text') {
                const display = entry.id === typingId ? typingText : entry.content
                return (
                  <div key={entry.id} className="ml-1 pl-2 border-l border-white/[0.03]">
                    <HighlightedText text={display} />
                    {entry.id === typingId && typingText.length < typingFull.current.length && (
                      <span className="inline-block w-1.5 h-3 bg-emerald-400/60 ml-0.5 animate-pulse" />
                    )}
                  </div>
                )
              }
              if (entry.type === 'loading') {
                return (
                  <div key={entry.id} className="ml-1 pl-2 border-l border-white/[0.03] flex items-center gap-2 py-2">
                    <svg className="h-3 w-3 animate-spin text-neural-blue" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-white/30 text-[11px] font-mono">AI processing...</span>
                  </div>
                )
              }
              if (entry.type === 'jsx') {
                return <div key={entry.id} className="ml-1">{entry.content}</div>
              }
              return null
            })}
            {history.length === 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-neural-blue/60 text-xs font-mono"
                  style={{ textShadow: '0 0 6px rgba(0,240,255,0.25)' }}
                >$</span>
                <span className="inline-block w-1.5 h-3.5 bg-neural-blue/50 animate-pulse" />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-neural-blue/10 px-3 py-2.5 bg-black/30"
          style={{ boxShadow: 'inset 0 1px 0 rgba(0,240,255,0.03)' }}>
          <span className="text-neural-blue/60 text-xs font-mono shrink-0"
            style={{ textShadow: '0 0 6px rgba(0,240,255,0.2)' }}
          >$</span>
          <span className="inline-block w-1.5 h-3.5 bg-neural-blue/50 animate-pulse mr-0.5" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-xs font-mono text-white/90 outline-none placeholder-white/15 tracking-wide disabled:cursor-not-allowed disabled:opacity-30"
            placeholder={aiBusy ? 'AI processing...' : 'Type a command or ask anything...'}
            disabled={aiBusy}
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  )
}

export default function StartingLoader({ onComplete }) {
  const [phase, setPhase] = useState('booting')
  const [question, setQuestion] = useState(null)
  const [loadingQ, setLoadingQ] = useState(false)
  const [adVideos, setAdVideos] = useState([])
  const [currentAd, setCurrentAd] = useState(null)
  const [adLoading, setAdLoading] = useState(false)
  const { enabled: autoTraverse, toggle: toggleAutoTraverse } = useAutoTraverse()
  const firstName = 'Amit'
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
    setTimeout(() => doneRef.current(), 3500)
  }

  async function handleMCQCorrect() {
    sessionStorage.setItem('neural-aurora-verified', 'true')
    setPhase('success')
    setTimeout(() => setPhase('transitioning'), 2200)
    setTimeout(() => doneRef.current(), 3500)
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
      setTimeout(() => doneRef.current(), 3500)
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
                  <div><p className="text-white text-sm">Say "{firstName}"</p><p className="text-[10px] text-white/30 mt-0.5">Voice recognition</p></div>
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
              <button
                onClick={() => setPhase('cmd')}
                className="group px-6 py-4 rounded-xl border border-white/10 bg-white/5 hover:border-emerald-500/50 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" className="w-4 h-4">
                      <polyline points="4 17 10 11 4 5" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="12" y1="19" x2="20" y2="19" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-sm">Neural Aurora CMD</p>
                    <p className="text-[10px] text-white/30 mt-0.5">Explore via terminal</p>
                  </div>
                </div>
              </button>
            </motion.div>
          </motion.div>
        )}

        {phase === 'voice' && (
          <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <VoiceChallenge onSuccess={handleVoiceSuccess} name={firstName} />
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

        {phase === 'cmd' && (
          <motion.div key="cmd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CmdExplorer onBack={() => setPhase('selecting')} />
          </motion.div>
        )}

        {phase === 'success' && (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SuccessScreen name={firstName} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(phase === 'voice' || phase === 'mcq' || phase === 'ad-watching' || phase === 'cmd') && (
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
