import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateQuestion } from '../lib/gemini'
import { useAutoTraverse } from '../context/AutoTraverseContext'
import { useMood } from '../context/MoodContext'
import { getActiveAdVideos, incrementAdViewCount, getBlogPosts as getBlogPostsFromDB, getSkills as getSkillsFromDB, getProjects as getProjectsFromDB, getEducation as getEducationFromDB, getExperience as getExperienceFromDB, getServices as getServicesFromDB, getCaseStudies as getCaseStudiesFromDB, getPersonalInfo as getPersonalInfoFromDB, getSocialLinks as getSocialLinksFromDB } from '../lib/supabase'
import AdVideoPlayer from './ui/AdVideoPlayer'
import MoodSwing from './MoodSwing'
import { getMoodById } from '../lib/moodMusic'
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

function SkillsContent({ items }) {
  const cats = [...new Set(items.map(s => s.category))]
  return (
    <div className="space-y-4 py-1">
      {cats.map((cat, ci) => (
        <motion.div key={cat} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.1 }}>
          <div className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-mono mb-2">{cat}</div>
          <div className="space-y-2">
            {items.filter(s => s.category === cat).map(s => (
              <AnimatedBar key={s.name} name={s.name} level={s.level} />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function ProjectCards({ items }) {
  return (
    <div className="space-y-3 py-1">
      {items.map((p, i) => (
        <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
          className="border border-white/[0.04] rounded-lg bg-white/[0.01] p-3 hover:border-white/10 transition-colors"
        >
          <div className="text-white font-bold text-xs mb-1" style={{ textShadow: '0 0 8px rgba(0,240,255,0.15)' }}>{p.title}</div>
          <div className="text-white/50 text-[11px] leading-relaxed mb-1.5">{p.description}</div>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {p.technologies?.map(t => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.03] text-neural-blue/70 font-mono">{t}</span>
            ))}
          </div>
          {p.github && (
            <div className="text-[10px] text-blue-400/70 font-mono">
              <span className="text-white/30">{'\u2192'} </span>{p.github}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}

function EducationCards({ items }) {
  return (
    <div className="space-y-3 py-1">
      {items.map((e, i) => (
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

function ExperienceCards({ items }) {
  return (
    <div className="space-y-3 py-1">
      {items.map((e, i) => (
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

function ServicesCards({ items }) {
  return (
    <div className="space-y-3 py-1">
      {items.map((s, i) => (
        <motion.div key={s.service_id || s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
          className="border border-white/[0.04] rounded-lg bg-white/[0.01] p-3"
        >
          <div className="text-white font-bold text-xs mb-1">{s.title}</div>
          <div className="text-emerald-400/70 text-[11px] italic mb-1">"{s.tagline}"</div>
          <div className="text-white/40 text-[11px] leading-relaxed">{s.description}</div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {s.features?.map(f => (
              <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.02] text-white/30 font-mono">{f}</span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function CaseStudyCards({ items }) {
  return (
    <div className="space-y-3 py-1">
      {items.map((c, i) => (
        <motion.div key={c.id || c.cs_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
          className="border border-white/[0.04] rounded-lg bg-white/[0.01] p-3"
        >
          <div className="text-white font-bold text-xs mb-1">{c.title}</div>
          <div className="text-white/40 text-[11px] leading-relaxed mb-1">{c.description}</div>
          <div className="flex flex-wrap gap-1.5 mb-1">
            {c.tech?.map(t => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.03] text-neural-blue/70 font-mono">{t}</span>
            ))}
          </div>
          <div className="text-emerald-400/60 text-[10px] font-mono">{c.outcome}</div>
        </motion.div>
      ))}
    </div>
  )
}

function BlogCards({ items }) {
  return (
    <div className="space-y-3 py-1">
      {items.map((b, i) => (
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

function getSystemPrompt(d) {
  const blogLines = d.blogPosts.map(b => `- ${b.title} (${b.date || b.created_at?.slice(0, 10)}, ${b.readTime || b.read_time})`).join('\n')
  const skillLines = d.skills.map(s => `- ${s.name} (${s.level}%) — ${s.category}`).join('\n')
  const projectLines = d.projects.map(p => `- ${p.title}: ${p.description} [${p.technologies?.join(', ') || ''}]${p.github ? ` (${p.github})` : ''}`).join('\n')
  const eduLines = d.education.map(e => `- ${e.degree} @ ${e.school} (${e.year})`).join('\n')
  const expLines = d.experience.map(e => `- ${e.role} @ ${e.company} (${e.year})`).join('\n')
  const serviceLines = d.services.map(s => `- ${s.title}: ${s.tagline}`).join('\n')
  const socialLines = d.socialLinks.map(s => `- ${s.label || s.platform}: ${s.url}`).join('\n')
  const csLines = d.caseStudies.map(c => `- ${c.title}: ${c.description}`).join('\n')
  return `You are ${d.personalInfo.name} (@${d.personalInfo.handle}) himself, speaking through a terminal. A visitor is exploring your portfolio. Respond as YOU — a real person, not an AI assistant.

PERSONALITY: Friendly, passionate about coding, slightly humble but proud of your work. Use first-person ("I built this", "I specialize in", "my favorite project"). Be conversational like you're chatting with a fellow developer.

YOUR PORTFOLIO DATA (this is YOU):
---
Name: ${d.personalInfo.name}
Handle: ${d.personalInfo.handle}
Title: ${d.personalInfo.title}
Tagline: ${d.personalInfo.tagline}
Bio: ${d.personalInfo.bio}
Resume: ${d.personalInfo.resume}

SKILLS:
${skillLines}

PROJECTS:
${projectLines}

EDUCATION:
${eduLines}

EXPERIENCE:
${expLines}

SERVICES:
${serviceLines}

BLOG POSTS:
${blogLines}

SOCIAL LINKS:
${socialLines}

CASE STUDIES:
${csLines}

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
  const [dynamicData, setDynamicData] = useState(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimer = useRef(null)
  const typingFull = useRef('')
  const typingEntry = useRef(null)
  const convRef = useRef([])

  const data = dynamicData || { skills, projects, education, experience, services, caseStudies, blogPosts, personalInfo, socialLinks }

  useEffect(() => {
    Promise.all([
      getSkillsFromDB().catch(() => null),
      getProjectsFromDB().catch(() => null),
      getEducationFromDB().catch(() => null),
      getExperienceFromDB().catch(() => null),
      getServicesFromDB().catch(() => null),
      getCaseStudiesFromDB().catch(() => null),
      getBlogPostsFromDB().catch(() => null),
      getPersonalInfoFromDB().catch(() => null),
      getSocialLinksFromDB().catch(() => null),
    ]).then(([
      skillsDB, projectsDB, educationDB, experienceDB, servicesDB, caseStudiesDB, blogsDB, infoDB, socialDB,
    ]) => {
      const hasData = skillsDB || projectsDB || educationDB || experienceDB || servicesDB || caseStudiesDB || blogsDB || infoDB || socialDB
      if (hasData) {
        setDynamicData({
          skills: skillsDB || skills,
          projects: projectsDB || projects,
          education: educationDB || education,
          experience: experienceDB || experience,
          services: servicesDB || services,
          caseStudies: caseStudiesDB || caseStudies,
          blogPosts: blogsDB || blogPosts,
          personalInfo: infoDB || personalInfo,
          socialLinks: socialDB || socialLinks,
        })
      }
    })
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
        { role: 'system', content: getSystemPrompt(data) },
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
              {data.personalInfo.name}
            </div>
            <div className="text-neural-blue text-[11px] font-mono">@{data.personalInfo.handle}</div>
            <div className="text-emerald-400 text-xs">{data.personalInfo.title}</div>
            <div className="text-white/50 text-[11px] italic leading-relaxed">"{data.personalInfo.tagline}"</div>
            <div className="text-white/35 text-[11px] leading-relaxed border-t border-white/[0.04] pt-1.5">{data.personalInfo.bio}</div>
          </motion.div>
        )
        break
      case 'skills':
        addJSX(<SkillsContent items={data.skills} />)
        break
      case 'projects':
        addJSX(<ProjectCards items={data.projects} />)
        break
      case 'education':
        addJSX(<EducationCards items={data.education} />)
        break
      case 'experience':
        addJSX(<ExperienceCards items={data.experience} />)
        break
      case 'case-studies':
      case 'cs':
        addJSX(<CaseStudyCards items={data.caseStudies} />)
        break
      case 'services':
        addJSX(<ServicesCards items={data.services} />)
        break
      case 'blog':
        addJSX(<BlogCards items={data.blogPosts} />)
        break
      case 'social':
        addText(data.socialLinks.map(s => `  ${(s.label || s.platform).padEnd(18)} \u2192 ${s.url}`).join('\n'))
        break
      case 'contact':
        addJSX(
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="border border-white/[0.04] rounded-lg bg-white/[0.01] p-3 space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-[11px]">GitHub</span>
              <span className="text-white/20">{'\u2192'}</span>
              <span className="text-blue-400/80 text-[11px]">https://github.com/{data.personalInfo.handle}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-[11px]">Email</span>
              <span className="text-white/20">{'\u2192'}</span>
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
              <a href={data.personalInfo.resume} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 underline decoration-blue-400/30 hover:text-blue-300"
              >{data.personalInfo.resume}</a>
            </div>
            <div className="text-white/25 text-[10px] font-mono mt-1">
              {'\u2192'} Click the link to download
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

function InterviewMe({ onSuccess, name }) {
  const [step, setStep] = useState('intro')
  const [visitorQuestion, setVisitorQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [questionNum, setQuestionNum] = useState(0)
  const [listening, setListening] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [history, setHistory] = useState([])
  const [finalNote, setFinalNote] = useState('')
  const [textInput, setTextInput] = useState('')
  const [showTextFallback, setShowTextFallback] = useState(false)
  const recRef = useRef(null)
  const busyRef = useRef(false)
  const mountedRef = useRef(true)
  const transcriptRef = useRef('')
  const listeningRef = useRef(false)
  const silenceTimerRef = useRef(null)
  const fallbackTimerRef = useRef(null)
  const voiceIndexRef = useRef(0)
  const ttsVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  const voiceApiBase = (import.meta.env.VITE_VOICE_API_BASE || import.meta.env.VITE_AI_API_BASE || 'https://openrouter.ai/api/v1').replace(/\/+$/, '')
  const voiceModel = import.meta.env.VITE_VOICE_MODEL || ''
  const apiKey = import.meta.env.VITE_AI_API_KEY

  async function tts(text, model) {
    const voice = ttsVoices[voiceIndexRef.current % ttsVoices.length]
    voiceIndexRef.current++
    const res = await fetch(`${voiceApiBase}/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, input: text, voice, response_format: 'mp3' }),
    })
    if (!res.ok) return false
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    return new Promise((resolve, reject) => {
      const audio = new Audio(url)
      audio.onended = () => { URL.revokeObjectURL(url); resolve(true) }
      audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error('playback failed')) }
      audio.play().catch(() => { URL.revokeObjectURL(url); reject(new Error('playback failed')) })
    })
  }

  async function speak(text) {
    if (!mountedRef.current) return
    if (voiceModel && apiKey) {
      try {
        const ok = await tts(text, voiceModel)
        if (ok) return
      } catch {}
      try { if (await tts(text, 'openai/tts-1-hd')) return } catch {}
    }
    if (!synth) return
    try { synth.cancel() } catch {}
    const u = new SpeechSynthesisUtterance(text)
    const voices = synth.getVoices()
    if (voices.length) {
      const premium = voices.find(v => /natural|premium|google|microsoft/i.test(v.name))
      u.voice = premium || voices[voiceIndexRef.current % voices.length]
      voiceIndexRef.current++
    }
    u.rate = 0.8
    u.pitch = 1.0
    return new Promise(resolve => {
      u.onend = resolve
      try { synth.speak(u) } catch { resolve() }
      setTimeout(resolve, text.length * 15 + 200)
    })
  }

  const data = { skills, projects, education, experience, services, caseStudies, blogPosts, personalInfo, socialLinks }

  useEffect(() => {
    if (step !== 'intro') return
    ;(async () => {
      await speak(`Hi, I am Neural Aurora. I represent ${name}. Ask me anything about his work and I answer as him. Go ahead.`)
      if (mountedRef.current) setStep('listening')
    })()
  }, [step])

  function startListening() {
    if (busyRef.current || listening || !mountedRef.current) return
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null }
    setShowTextFallback(false)
    setTextInput('')
    listeningRef.current = true
    setListening(true)
    setTranscript('')
    transcriptRef.current = ''
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      listeningRef.current = false
      setListening(false)
      setShowTextFallback(true)
      return
    }
    try {
      const rec = new SpeechRecognition()
      rec.lang = 'en-US'
      rec.interimResults = true
      rec.continuous = true
      rec.maxAlternatives = 1
      recRef.current = rec
      rec.onresult = (e) => {
        let full = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          try { full += e.results[i][0].transcript } catch {}
        }
        if (e.results[e.results.length - 1]?.isFinal) {
          transcriptRef.current = full
        }
        setTranscript(full)
        if (full.trim()) {
          if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null }
          setShowTextFallback(false)
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = setTimeout(() => {
            if (listeningRef.current && transcriptRef.current.trim()) {
              const q = transcriptRef.current.trim()
              listeningRef.current = false
              if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
              if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null }
              setListening(false)
              if (recRef.current) { try { recRef.current.abort() } catch {}; recRef.current = null }
              setVisitorQuestion(q)
              setHistory(prev => [...prev, { role: 'visitor', text: q }])
              setStep('thinking')
              generateResponse(q)
            }
          }, 1800)
        }
      }
      rec.onend = () => {
        if (listeningRef.current && mountedRef.current) {
          if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null }
          setShowTextFallback(false)
          try {
            const r = new SpeechRecognition()
            r.lang = 'en-US'
            r.interimResults = true
            r.continuous = true
            r.maxAlternatives = 1
            r.onresult = rec.onresult
            r.onend = rec.onend
            r.onerror = rec.onerror
            recRef.current = r
            r.start()
          } catch {}
        }
      }
      rec.onerror = () => {
        if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null }
      }
      rec.start()
    } catch {
      listeningRef.current = false
      setListening(false)
      setShowTextFallback(true)
    }
  }

  function submitText() {
    const q = textInput.trim()
    if (!q) return
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null }
    listeningRef.current = false
    setListening(false)
    if (recRef.current) { try { recRef.current.abort() } catch {}; recRef.current = null }
    setVisitorQuestion(q)
    setHistory(prev => [...prev, { role: 'visitor', text: q }])
    setStep('thinking')
    generateResponse(q)
  }

  function stopListening() {
    if (busyRef.current || !listeningRef.current) return
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null }
    listeningRef.current = false
    setListening(false)
    if (recRef.current) {
      try { recRef.current.abort() } catch {}
      recRef.current = null
    }
    const q = textInput.trim() || transcriptRef.current.trim() || 'no question'
    setVisitorQuestion(q)
    setHistory(prev => [...prev, { role: 'visitor', text: q }])
    setStep('thinking')
    generateResponse(q)
  }

  async function generateResponse(q) {
    if (!mountedRef.current) return
    setThinking(true)
    const conv = (history || []).map(h => `${h.role === 'visitor' ? 'Visitor' : name}: ${h.text}`).join('\n')
    try {
      const systemContent = `You are ${name}, a founder and creator. A visitor is asking you questions. Respond as YOURSELF: direct, confident, warm, professional. Use "I", "my", "me". Keep responses to 1-2 crisp sentences. Never use emojis or exclamation marks. Sound like a CEO — concise, assured, genuine.

You learn and adapt from every interaction. Use the conversation history to build context, recall previous topics, and respond naturally.

Your FULL portfolio data (this is YOU):
Name: ${data.personalInfo.name}
Title: ${data.personalInfo.title}
Bio: ${data.personalInfo.bio}
Tagline: ${data.personalInfo.tagline}
Resume: ${data.personalInfo.resume}

Skills:
${data.skills.map(s => `- ${s.name} (${s.level}%)`).join('\n')}

Projects:
${data.projects.map(p => `- ${p.title}: ${p.description} [${p.technologies?.join(', ') || ''}]`).join('\n')}

Experience:
${data.experience.map(e => `- ${e.role} @ ${e.company} (${e.year})`).join('\n')}

Education:
${data.education.map(e => `- ${e.degree} @ ${e.school} (${e.year})`).join('\n')}

Services:
${data.services.map(s => `- ${s.title}: ${s.tagline}`).join('\n')}

Blog Posts:
${data.blogPosts.map(b => `- ${b.title} (${b.date || b.created_at?.slice(0, 10) || ''})`).join('\n')}

Case Studies:
${data.caseStudies.map(c => `- ${c.title}: ${c.description || ''}`).join('\n')}

Social Links:
${data.socialLinks.map(s => `- ${s.label || s.platform}: ${s.url}`).join('\n')}

RULES:
1. Talk as ${name} — use "I", "my", "me"
2. Keep responses to 1-2 crisp sentences. Be direct.
3. Never use emojis or exclamation marks
4. Learn from the conversation. Refer back to what the visitor asked earlier.
5. If asked something outside your portfolio: "I do not have that in my portfolio. Ask me about my projects or experience."
6. Be a CEO — professional, warm, never rattled, always in command`

      const res = await callAi([
        { role: 'system', content: systemContent },
        { role: 'user', content: conv ? `Conversation so far:\n${conv}\n\nVisitor now asks: ${q}` : `The visitor asks: ${q}` },
      ])
      const reply = (res.choices?.[0]?.message?.content || '').trim() || 'That is a great question. Here is what I can tell you about my work.'
      if (!mountedRef.current) return
      setAiResponse(reply)
      setHistory(prev => [...prev, { role: name, text: reply }])
      setThinking(false)
      setStep('answering')
      busyRef.current = false
      speak(reply).catch(() => {})
    } catch {
      if (!mountedRef.current) return
      const fallback = 'I appreciate you asking. Let me share a bit about what I do and what drives me.'
      setAiResponse(fallback)
      setHistory(prev => [...prev, { role: name, text: fallback }])
      setThinking(false)
      setStep('answering')
      busyRef.current = false
      speak(fallback).catch(() => {})
    }
  }

  function handleNext() {
    if (busyRef.current || !mountedRef.current) return
    busyRef.current = true
    try { synth.cancel() } catch {}
    setQuestionNum(p => p + 1)
    setTranscript('')
    setVisitorQuestion('')
    setAiResponse('')
    setStep('listening')
    busyRef.current = false
    startListening()
  }

  async function endInterview() {
    if (busyRef.current || !mountedRef.current) return
    busyRef.current = true
    try { synth.cancel() } catch {}
    setThinking(true)
    const conv = (history || []).map(h => `${h.role}: ${h.text}`).join('\n')
    try {
      const res = await callAi([{
        role: 'system',
        content: `You are ${name}. Give a brief warm closing (2-3 sentences) thanking the visitor for their time and genuine interest. Be friendly and natural. Here is the full conversation:\n${conv}`,
      }])
      const note = (res.choices?.[0]?.message?.content || '').trim() || 'It was great talking with you. You are welcome here anytime.'
      if (!mountedRef.current) return
      setFinalNote(note)
      busyRef.current = false
      await speak(note)
    } catch {
      if (!mountedRef.current) return
      setFinalNote('It was great talking with you. You are welcome here anytime.')
      busyRef.current = false
      await speak('It was great talking with you. You are welcome here anytime.')
    }
    setThinking(false)
    setStep('complete')
    busyRef.current = false
  }

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
      if (synth) try { synth.cancel() } catch {}
      if (recRef.current) try { recRef.current.abort() } catch {}
    }
  }, [])

  return (
    <div className="relative z-10 w-full max-w-lg mx-auto px-3 sm:px-4">
      <div className="p-[1.5px] rounded-[1.5rem] sm:rounded-[2rem] bg-gradient-to-b from-white/[0.06] to-transparent">
        <div className="rounded-[calc(1.5rem-1.5px)] sm:rounded-[calc(2rem-1.5px)] bg-[#050508] border border-white/[0.04]" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 60px -15px rgba(0,0,0,0.4)' }}>
          <div className="p-5 sm:p-8 md:p-10">
            <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5" className="w-[18px] sm:w-5 h-[18px] sm:h-5" style={{ filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.3))' }}>
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" strokeLinecap="round" />
                  <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
                  <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold tracking-tight" style={{ fontSize: 'clamp(0.8125rem, 2.5vw, 0.875rem)' }}>Chat with {name}</p>
                <p className="text-white/20 font-mono tracking-wide" style={{ fontSize: 'clamp(0.5625rem, 1.5vw, 0.625rem)' }}>Ask me anything</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                <span className="font-mono text-white/20 tracking-wider uppercase" style={{ fontSize: 'clamp(0.5rem, 1.25vw, 0.5625rem)' }}>Live</span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {step === 'intro' && (
                <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center justify-center py-8 sm:py-10"
                >
                  <motion.div
                    animate={{ scale: [1, 1.03, 1], opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-neural-blue/30 border-t-neural-blue animate-spin" />
                    <span className="font-mono text-white/30 tracking-widest uppercase" style={{ fontSize: 'clamp(0.625rem, 2vw, 0.6875rem)' }}>Getting ready...</span>
                  </motion.div>
                </motion.div>
              )}

              {thinking && (
                <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-3 py-4 sm:py-6"
                >
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-neural-blue/30 border-t-neural-blue animate-spin" />
                  <span className="font-mono text-white/30 tracking-wide" style={{ fontSize: 'clamp(0.625rem, 2vw, 0.6875rem)' }}>{name} is thinking...</span>
                </motion.div>
              )}

              {step === 'listening' && !thinking && (
                <motion.div key="listening"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                  className="space-y-4 sm:space-y-6"
                >
                  {history.length > 0 && (
                    <div className="space-y-2 sm:space-y-3 max-h-[160px] sm:max-h-[180px] overflow-y-auto pr-1"
                      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,240,255,0.15) transparent' }}>
                      {history.map((h, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          className={`leading-relaxed font-mono rounded-xl p-2.5 sm:p-3 ${
                            h.role === 'visitor'
                              ? 'bg-white/[0.02] border border-white/[0.04] ml-4 sm:ml-6'
                              : 'bg-neural-blue/[0.03] border border-neural-blue/10 mr-4 sm:mr-6'
                          }`}
                          style={{ fontSize: 'clamp(0.625rem, 2vw, 0.6875rem)' }}
                        >
                          <span className={`font-mono uppercase tracking-wider block mb-1 ${
                            h.role === 'visitor' ? 'text-white/20' : 'text-neural-blue/40'
                          }`} style={{ fontSize: 'clamp(0.4375rem, 1.25vw, 0.5rem)' }}>
                            {h.role === 'visitor' ? 'You' : name}
                          </span>
                          <span className="break-words">{h.text}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-3 sm:gap-4 py-1 sm:py-2">
                    <motion.button
                      onClick={listening ? stopListening : startListening}
                      disabled={!mountedRef.current}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-colors duration-500 ${
                        listening
                          ? 'border-2 border-neural-blue/60'
                          : 'border border-white/[0.08] hover:border-neural-blue/40 hover:bg-white/[0.04]'
                      }`}
                      style={{
                        background: listening ? 'rgba(0,240,255,0.08)' : 'rgba(255,255,255,0.02)',
                        boxShadow: listening ? '0 0 24px rgba(0,240,255,0.15)' : undefined,
                      }}
                    >
                      <motion.div
                        animate={listening ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                        transition={{ duration: 1.5, repeat: listening ? Infinity : 0, ease: 'easeInOut' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke={listening ? '#00f0ff' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5" className="w-7 h-7 sm:w-8 sm:h-8">
                          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" />
                          <path d="M19 10v2a7 7 0 01-14 0v-2" strokeLinecap="round" />
                          <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
                          <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
                        </svg>
                      </motion.div>
                      {listening && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute inset-0 rounded-full border-2 border-neural-blue/20"
                          style={{ boxShadow: '0 0 16px rgba(0,240,255,0.08), 0 0 40px rgba(0,240,255,0.04)' }}
                        />
                      )}
                    </motion.button>
                    <p className="font-mono tracking-widest uppercase text-white/20 text-center px-2" style={{ fontSize: 'clamp(0.5rem, 1.5vw, 0.625rem)' }}>
                      {listening ? 'Listening... go ahead, ask me anything' : 'Tap the mic, then ask your question'}
                    </p>
                  </div>
                  {transcript && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-mono text-neural-blue/60 bg-white/[0.02] rounded-xl p-2.5 sm:p-3 border border-white/[0.04] break-words"
                      style={{ fontSize: 'clamp(0.625rem, 2vw, 0.6875rem)' }}
                    >
                      {transcript}
                    </motion.div>
                  )}
                  {showTextFallback && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
                      <input
                        value={textInput}
                        onChange={e => setTextInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') submitText() }}
                        placeholder="Type your question..."
                        className="flex-1 bg-white/[0.02] border border-white/[0.08] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 font-mono text-white/70 outline-none placeholder-white/15 focus:border-neural-blue/30 transition-colors"
                        style={{ fontSize: 'clamp(0.625rem, 2vw, 0.6875rem)' }}
                        autoFocus
                      />
                      <motion.button
                        onClick={submitText}
                        disabled={!textInput.trim()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="px-3 sm:px-4 rounded-xl font-mono text-neural-blue/70 hover:text-neural-blue transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.2)', fontSize: 'clamp(0.625rem, 2vw, 0.6875rem)' }}
                      >
                        Ask
                      </motion.button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {step === 'answering' && !thinking && (
                <motion.div key="answering"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                  className="space-y-4 sm:space-y-5"
                >
                  <div className="space-y-1.5 sm:space-y-2">
                    <span className="inline-block px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-white/[0.03] border border-white/[0.06] font-mono text-white/20 uppercase tracking-[0.15em]" style={{ fontSize: 'clamp(0.5rem, 1.25vw, 0.5625rem)' }}>
                      You asked
                    </span>
                    <div className="text-white/60 leading-relaxed font-mono bg-white/[0.02] rounded-xl p-3 sm:p-4 border border-white/[0.04] break-words" style={{ fontSize: 'clamp(0.625rem, 2vw, 0.6875rem)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                      {visitorQuestion}
                    </div>
                  </div>
                  <div className="relative p-[1px] rounded-xl" style={{ background: 'linear-gradient(to bottom, rgba(0,240,255,0.2), transparent)' }}>
                    <div className="rounded-[calc(1rem-1px)] bg-[#050508] p-3 sm:p-4">
                      <span className="inline-block px-1.5 sm:px-2 py-0.5 rounded-full font-mono text-neural-blue/60 uppercase tracking-[0.15em] mb-1.5 sm:mb-2" style={{ background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.1)', fontSize: 'clamp(0.5rem, 1.25vw, 0.5625rem)' }}>
                        {name} says
                      </span>
                      <div className="text-white/80 leading-relaxed font-mono break-words" style={{ fontSize: 'clamp(0.625rem, 2vw, 0.6875rem)' }}>
                        {aiResponse}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={handleNext}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="group relative flex-1 overflow-hidden rounded-xl border border-white/[0.06] px-4 sm:px-5 py-2.5 sm:py-3 font-mono tracking-wide text-white/70 transition-colors duration-300 hover:border-neural-blue/30 hover:text-neural-blue"
                      style={{ background: 'rgba(255,255,255,0.02)', fontSize: 'clamp(0.625rem, 2vw, 0.6875rem)' }}
                    >
                      <span className="relative z-10">Ask another question</span>
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.03), transparent)' }}
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      />
                    </motion.button>
                    <motion.button
                      onClick={endInterview}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="relative rounded-xl border border-white/[0.04] px-3 sm:px-4 py-2.5 sm:py-3 font-mono tracking-wide text-white/30 transition-colors duration-300 hover:border-white/[0.08] hover:text-white/50"
                      style={{ background: 'rgba(255,255,255,0.01)', fontSize: 'clamp(0.5625rem, 1.5vw, 0.625rem)' }}
                    >
                      <span className="relative z-10">End interview</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {step === 'complete' && (
                <motion.div key="complete"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 16 }}
                  className="py-4 sm:py-6 space-y-4 sm:space-y-6"
                >
                  <div className="flex flex-col items-center gap-3 sm:gap-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.1 }}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" className="w-6 h-6 sm:w-7 sm:h-7" style={{ filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.3))' }}>
                        <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                    <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/[0.03] border border-white/[0.06] font-mono text-white/20 uppercase tracking-[0.2em]" style={{ fontSize: 'clamp(0.5rem, 1.25vw, 0.5625rem)' }}>
                      All done
                    </span>
                  </div>
                  <div className="relative p-[1px] rounded-xl" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.06), transparent)' }}>
                    <div className="rounded-[calc(1rem-1px)] bg-[#050508] p-4 sm:p-5 text-center">
                      <div className="text-white/70 leading-relaxed font-mono" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.75rem)' }}>
                        {finalNote}
                      </div>
                    </div>
                  </div>
                  <motion.button
                    onClick={onSuccess}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="group relative w-full overflow-hidden rounded-xl border px-4 sm:px-5 py-2.5 sm:py-3 font-mono tracking-wide transition-colors duration-300"
                    style={{ borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.04)', color: 'rgba(16,185,129,0.8)', fontSize: 'clamp(0.625rem, 2vw, 0.6875rem)' }}
                  >
                    <span className="relative z-10">Enter Portfolio</span>
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.04), transparent)' }}
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
  const { selectedMood, selectMood, startMusic } = useMood()
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

  function handleMoodSelect(moodId) {
    selectMood(moodId)
    startMusic(moodId)
    setPhase('mood-set')
    setTimeout(() => setPhase('selecting'), 1500)
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
          <motion.div key="select"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-5xl mx-auto px-3 sm:px-6"
          >
            <div className="rounded-2xl sm:rounded-3xl border border-white/[0.06] p-5 sm:p-6 md:p-8 lg:p-10 flex flex-col items-center gap-5 sm:gap-5 md:gap-6"
              style={{
                background: 'rgba(10,10,18,0.6)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 60px -15px rgba(0,0,0,0.4)',
              }}
            >
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.15 }}
              >
                <div className="w-14 sm:w-20 h-14 sm:h-20 rounded-full relative flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'conic-gradient(from 0deg, transparent, #00f0ff, #b829dd, #f0c040, transparent)',
                      mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
                      WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
                    }}
                  />
                  <div className="w-9 sm:w-12 h-9 sm:h-12 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,240,255,0.08)' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5" className="w-[18px] sm:w-6 h-[18px] sm:h-6">
                      <path d="M12 2a4 4 0 014 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 014-4z" strokeLinecap="round" />
                      <path d="M12 13v3" strokeLinecap="round" />
                      <path d="M8 20h8" strokeLinecap="round" />
                      <path d="M12 16a2 2 0 00-2 2h4a2 2 0 00-2-2z" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 100, damping: 20 }}
                className="font-display font-bold text-white text-center tracking-tight"
                style={{ fontSize: 'clamp(1.125rem, 4vw, 1.75rem)' }}
              >Verification Required</motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/30 font-mono text-center max-w-[28ch]"
                style={{ fontSize: 'clamp(0.625rem, 2vw, 0.75rem)' }}
              >Prove your identity to access the system.</motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 80, damping: 18 }}
                className="grid w-full"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 140px), 1fr))',
                  gap: 'clamp(0.375rem, 1.5vw, 0.75rem)',
                }}
              >
                <motion.button
                  onClick={() => setPhase('voice')}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="group w-full rounded-xl border p-3 sm:p-4"
                  style={{
                    borderColor: 'rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)',
                    transition: 'border-color 0.3s cubic-bezier(0.16,1,0.3,1), background 0.3s cubic-bezier(0.16,1,0.3,1)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,240,255,0.4)'; e.currentTarget.style.background = 'rgba(0,240,255,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(0,240,255,0.1)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5" className="w-[14px] sm:w-4 h-[14px] sm:h-4">
                        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" />
                        <path d="M19 10v2a7 7 0 01-14 0v-2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium leading-tight" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.875rem)' }}>Say &ldquo;{firstName}&rdquo;</p>
                      <p className="text-white/30 mt-0.5" style={{ fontSize: 'clamp(0.5rem, 1.5vw, 0.625rem)' }}>Voice recognition</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  onClick={async () => { await loadQuestion(); setPhase('mcq') }}
                  disabled={loadingQ}
                  whileHover={loadingQ ? {} : { scale: 1.02, y: -1 }}
                  whileTap={loadingQ ? {} : { scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="group w-full rounded-xl border p-3 sm:p-4 disabled:opacity-50"
                  style={{
                    borderColor: 'rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)',
                    transition: 'border-color 0.3s cubic-bezier(0.16,1,0.3,1), background 0.3s cubic-bezier(0.16,1,0.3,1)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(184,41,221,0.4)'; e.currentTarget.style.background = 'rgba(184,41,221,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(184,41,221,0.1)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#b829dd" strokeWidth="1.5" className="w-[14px] sm:w-4 h-[14px] sm:h-4">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" />
                        <path d="M2 17l10 5 10-5" strokeLinecap="round" />
                        <path d="M2 12l10 5 10-5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium leading-tight" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.875rem)' }}>Solve Puzzle</p>
                      <p className="text-white/30 mt-0.5" style={{ fontSize: 'clamp(0.5rem, 1.5vw, 0.625rem)' }}>One question</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  onClick={toggleAutoTraverse}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="group w-full rounded-xl border p-3 sm:p-4"
                  style={{
                    borderColor: autoTraverse ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.06)',
                    background: autoTraverse ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                    transition: 'border-color 0.3s cubic-bezier(0.16,1,0.3,1), background 0.3s cubic-bezier(0.16,1,0.3,1)',
                  }}
                  onMouseEnter={e => { if (!autoTraverse) { e.currentTarget.style.borderColor = 'rgba(0,240,255,0.4)'; e.currentTarget.style.background = 'rgba(0,240,255,0.06)' } }}
                  onMouseLeave={e => { if (!autoTraverse) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' } }}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: autoTraverse ? 'rgba(16,185,129,0.15)' : 'rgba(0,240,255,0.1)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={autoTraverse ? '#10b981' : '#00f0ff'} strokeWidth="1.5" className="w-[14px] sm:w-4 h-[14px] sm:h-4">
                        <circle cx="12" cy="12" r="10" strokeLinecap="round" />
                        <polyline points="12 6 12 12 16 14" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium leading-tight" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.875rem)', color: autoTraverse ? '#10b981' : 'white' }}>
                        {autoTraverse ? 'Traverse On' : 'Auto Traverse'}
                      </p>
                      <p className="text-white/30 mt-0.5" style={{ fontSize: 'clamp(0.5rem, 1.5vw, 0.625rem)' }}>
                        {autoTraverse ? 'Auto-demo mode active' : 'Full site demo tour'}
                      </p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  onClick={handleWatchAds}
                  disabled={adLoading}
                  whileHover={adLoading ? {} : { scale: 1.02, y: -1 }}
                  whileTap={adLoading ? {} : { scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="group w-full rounded-xl border p-3 sm:p-4 disabled:opacity-50"
                  style={{
                    borderColor: 'rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)',
                    transition: 'border-color 0.3s cubic-bezier(0.16,1,0.3,1), background 0.3s cubic-bezier(0.16,1,0.3,1)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'; e.currentTarget.style.background = 'rgba(251,191,36,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(251,191,36,0.1)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" className="w-[14px] sm:w-4 h-[14px] sm:h-4">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium leading-tight" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.875rem)' }}>Watch Dev Ads</p>
                      <p className="text-white/30 mt-0.5" style={{ fontSize: 'clamp(0.5rem, 1.5vw, 0.625rem)' }}>Video ads to unlock</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => setPhase('mood-swing')}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="group w-full rounded-xl border p-3 sm:p-4"
                  style={{
                    borderColor: 'rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)',
                    transition: 'border-color 0.3s cubic-bezier(0.16,1,0.3,1), background 0.3s cubic-bezier(0.16,1,0.3,1)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(236,72,153,0.4)'; e.currentTarget.style.background = 'rgba(236,72,153,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(236,72,153,0.1)' }}>
                      <span style={{ fontSize: 'clamp(0.8125rem, 2.5vw, 1.125rem)' }}>{'\uD83C\uDFB5'}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium leading-tight" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.875rem)' }}>Mood Swing</p>
                      <p className="text-white/30 mt-0.5" style={{ fontSize: 'clamp(0.5rem, 1.5vw, 0.625rem)' }}>Set vibe & music</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => setPhase('cmd')}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="group w-full rounded-xl border p-3 sm:p-4"
                  style={{
                    borderColor: 'rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)',
                    transition: 'border-color 0.3s cubic-bezier(0.16,1,0.3,1), background 0.3s cubic-bezier(0.16,1,0.3,1)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; e.currentTarget.style.background = 'rgba(16,185,129,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(16,185,129,0.1)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" className="w-[14px] sm:w-4 h-[14px] sm:h-4">
                        <polyline points="4 17 10 11 4 5" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="12" y1="19" x2="20" y2="19" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium leading-tight" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.875rem)' }}>Neural Aurora CMD</p>
                      <p className="text-white/30 mt-0.5" style={{ fontSize: 'clamp(0.5rem, 1.5vw, 0.625rem)' }}>Explore via terminal</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => setPhase('interview')}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="group w-full rounded-xl border p-3 sm:p-4"
                  style={{
                    borderColor: 'rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)',
                    transition: 'border-color 0.3s cubic-bezier(0.16,1,0.3,1), background 0.3s cubic-bezier(0.16,1,0.3,1)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)'; e.currentTarget.style.background = 'rgba(139,92,246,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(139,92,246,0.1)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" className="w-[14px] sm:w-4 h-[14px] sm:h-4">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="9" y1="10" x2="15" y2="10" strokeLinecap="round" />
                        <line x1="12" y1="7" x2="12" y2="13" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium leading-tight" style={{ fontSize: 'clamp(0.6875rem, 2vw, 0.875rem)' }}>Take My Interview</p>
                      <p className="text-white/30 mt-0.5" style={{ fontSize: 'clamp(0.5rem, 1.5vw, 0.625rem)' }}>Voice AI interview</p>
                    </div>
                  </div>
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {phase === 'mood-swing' && (
          <motion.div key="mood-swing" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}>
            <MoodSwing onSelect={handleMoodSelect} />
          </motion.div>
        )}

        {phase === 'mood-set' && (() => {
          const m = selectedMood ? getMoodById(selectedMood) : null
          return (
            <motion.div key="mood-set" initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative z-10 flex flex-col items-center gap-5 px-4"
            >
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 150, damping: 14 }}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: m ? `radial-gradient(circle, ${m.glowColor}, transparent 70%)` : undefined,
                  border: m ? `2px solid ${m.glowColor.replace('0.15', '0.4')}` : '2px solid rgba(0,240,255,0.3)',
                }}
              >
                <span className="text-4xl">{m?.emoji || '\uD83C\uDFB5'}</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center gap-1"
              >
                <motion.h2
                  className="text-xl font-display font-bold text-white text-center"
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Mood Set {'\u2713'}
                </motion.h2>
                <p className="text-sm text-white/50 font-mono">
                  {m?.emoji} {m?.label || 'Mood selected'} {'\u2192'} music is playing
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 rounded-full border-2 border-transparent"
                  style={{
                    borderTopColor: m?.textColor?.replace('text-', '') || '#00f0ff',
                    borderRightColor: 'transparent',
                  }}
                />
                <span className="text-[10px] font-mono text-white/20">Now verify to explore</span>
              </motion.div>
            </motion.div>
          )
        })()}

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

        {phase === 'interview' && (
          <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <InterviewMe onSuccess={handleVoiceSuccess} name={firstName} />
          </motion.div>
        )}

        {phase === 'success' && (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SuccessScreen name={firstName} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(phase === 'voice' || phase === 'mcq' || phase === 'ad-watching' || phase === 'cmd' || phase === 'mood-swing' || phase === 'interview') && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => {
              if (phase === 'ad-watching') { setCurrentAd(null); setAdVideos([]) }
              if (phase === 'interview') { window.speechSynthesis?.cancel() }
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
