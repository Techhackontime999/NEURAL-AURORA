import { useState, useRef, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
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
import { Footer } from './components/ui/footer-section'
import Login from './components/admin/Login'
import ForgotPassword from './components/admin/ForgotPassword'
import AdminDashboard from './components/admin/AdminDashboard'
import { AdminRoute } from './components/admin/ProtectedRoute'

function HomePage() {
  const mouse = useRef({ x: 0, y: 0 })

  const handleMouseMove = (e) => {
    mouse.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: (e.clientY / window.innerHeight) * 2 - 1,
    }
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative min-h-[100dvh] overflow-hidden"
    >
      <AuroraBackground mouse={mouse} />
      <Navbar />
      <Hero />
      <About />
      <Skills />
      <Projects />
      <Resume />
      <ReviewsList />
      <ReviewForm />
      <Contact />
      <Footer />
    </div>
  )
}

function AppContent() {
  const [loaderDone, setLoaderDone] = useState(false)
  const glowRef = useRef(null)
  const location = useLocation()

  const isAuthRoute = location.pathname.startsWith('/login') || location.pathname.startsWith('/forgot-password') || location.pathname.startsWith('/admin')

  useEffect(() => {
    if (isAuthRoute) setLoaderDone(true)
  }, [isAuthRoute])

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
      <div ref={glowRef} className="cursor-glow" />
      {!loaderDone && <StartingLoader onComplete={() => setLoaderDone(true)} />}
      <AnimatePresence>
        {loaderDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/more" element={<More />} />
              <Route path="/services" element={<Service />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/login" element={<Login />} />
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
      <AppContent />
    </AuthProvider>
  )
}
