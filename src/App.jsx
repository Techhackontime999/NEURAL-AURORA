import { useState, useRef, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import { AutoTraverseProvider } from './context/AutoTraverseContext'
import { MoodProvider } from './context/MoodContext'
import AutoTraverseEffect from './components/ui/auto-traverse-effect'
import StartingLoader from './components/StartingLoader'
import Navbar from './components/Navbar'
import AuroraBackground from './components/AuroraBackground'
import Hero from './components/Hero'
import About from './components/About'
import Skills from './components/Skills'
import Projects from './components/Projects'
import Resume from './components/Resume'
import Contact from './components/Contact'
import ReviewsList from './components/ReviewsList'
import ReviewForm from './components/ReviewForm'
import More from './components/More'
import Service from './components/Service'
import Blog from './components/Blog'
import BlogPost from './components/BlogPost'
import CaseStudyDetail from './components/CaseStudyDetail'
import { Footer } from './components/ui/footer-section'
import Login from './components/admin/Login'
import Register from './components/admin/Register'
import ForgotPassword from './components/admin/ForgotPassword'
import AdminDashboard from './components/admin/AdminDashboard'
import { AdminRoute } from './components/admin/ProtectedRoute'
import BottomToTop from './components/ui/bottom-to-top'
import { usePersonalInfo } from './lib/usePortfolioData'
import { useMood } from './context/MoodContext'

function SectionSeparator() {
  return (
    <div className="relative z-10 flex justify-center">
      <div className="w-px h-16 md:h-24 bg-gradient-to-b from-transparent via-[var(--border-color)] to-transparent" />
    </div>
  )
}

function HomePage() {
  const { loaded } = usePersonalInfo()
  const mouse = useRef({ x: 0, y: 0 })

  const handleMouseMove = (e) => {
    mouse.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: (e.clientY / window.innerHeight) * 2 - 1,
    }
  }

  if (!loaded) {
    return <div className="relative min-h-[100dvh] overflow-hidden" />
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative min-h-[100dvh] overflow-hidden"
    >
      <AuroraBackground mouse={mouse} />
      <Navbar />
      <Hero />
      <SectionSeparator />
      <About />
      <SectionSeparator />
      <Skills />
      <SectionSeparator />
      <Projects />
      <SectionSeparator />
      <Resume />
      <SectionSeparator />
      <ReviewsList />
      <ReviewForm />
      <SectionSeparator />
      <Contact />
      <Footer />
    </div>
  )
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 })

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] origin-left bg-gradient-to-r from-[#00f0ff] via-[#b829dd] to-[#f0c040]"
    />
  )
}

function MoodMusicToggle() {
  const { selectedMood, mood, musicPlaying, musicLoading, musicMode, toggleMusic, stopMusic } = useMood()
  const [expanded, setExpanded] = useState(false)
  const hoverRef = useRef(null)
  const timeoutRef = useRef(null)

  if (!selectedMood) return null

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      className="fixed bottom-24 right-4 z-[100]"
      ref={hoverRef}
      onMouseEnter={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setExpanded(true)
      }}
      onMouseLeave={() => {
        timeoutRef.current = setTimeout(() => setExpanded(false), 1500)
      }}
    >
      <motion.div
        animate={{ width: expanded ? 'auto' : 44 }}
        className="flex items-center gap-2 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 overflow-hidden"
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
      >
        <button
          onClick={toggleMusic}
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 hover:bg-white/5 transition-colors"
        >
          {musicLoading ? (
            <motion.svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-4 h-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </motion.svg>
          ) : musicPlaying ? (
            <motion.svg viewBox="0 0 24 24" fill="none" stroke={mood?.textColor || '#00f0ff'} strokeWidth="1.5" className="w-4 h-4"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <path d="M9 18V5l12-2v13" strokeLinecap="round" />
              <circle cx="6" cy="18" r="3" strokeLinecap="round" />
              <circle cx="18" cy="16" r="3" strokeLinecap="round" />
            </motion.svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-4 h-4 opacity-50">
              <path d="M9 18V5l12-2v13" strokeLinecap="round" />
              <circle cx="6" cy="18" r="3" strokeLinecap="round" />
              <circle cx="18" cy="16" r="3" strokeLinecap="round" />
              <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
            </svg>
          )}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex items-center gap-2 overflow-hidden pr-3"
            >
              <span className="text-sm">{mood?.emoji}</span>
              <span className="text-[10px] font-mono text-white/50 whitespace-nowrap">{mood?.label}</span>
              {!musicLoading && musicMode && (
                <span className={`text-[8px] font-mono ${musicMode === 'api' ? 'text-emerald-400/50' : 'text-amber-400/50'} uppercase tracking-wider whitespace-nowrap`}>
                  {musicMode === 'api' ? 'Jamendo' : 'Synth'}
                </span>
              )}
              <button
                onClick={stopMusic}
                className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-3 h-3 opacity-40">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

function AppContent() {
  const location = useLocation()
  const isAuthRoute = location.pathname.startsWith('/login') || location.pathname.startsWith('/forgot-password') || location.pathname.startsWith('/admin')
  const [loaderDone, setLoaderDone] = useState(isAuthRoute)
  const glowRef = useRef(null)

  useEffect(() => {
    function onMouseMove(e) {
      if (glowRef.current) {
        glowRef.current.style.left = e.clientX + 'px'
        glowRef.current.style.top = e.clientY + 'px'
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [])

  useEffect(() => {
    import('@splinetool/react-spline')
  }, [])

  return (
    <>
      <ScrollProgress />
      <AutoTraverseEffect />
      <BottomToTop />
      {loaderDone && <MoodMusicToggle />}
      <div ref={glowRef} className="cursor-glow" />
      {!loaderDone && <StartingLoader onComplete={() => setLoaderDone(true)} />}
      <AnimatePresence>
        {loaderDone && (
          <motion.div
            animate={{ opacity: 1 }}
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/more" element={<More />} />
              <Route path="/services" element={<Service />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/case-study/:slug" element={<CaseStudyDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/admin/*"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
            </Routes>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AutoTraverseProvider>
        <MoodProvider>
          <AppContent />
        </MoodProvider>
      </AutoTraverseProvider>
    </AuthProvider>
  )
}
