import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { ThemeToggle } from './ui/curtain-theme-toggle'

const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Projects', href: '#projects' },
  { label: 'Services', href: '/services', route: true },
  { label: 'Resume', href: '#resume' },
  { label: 'Contact', href: '#contact' },
  { label: 'More', href: '/more', route: true },
]

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, type: 'spring', stiffness: 100, damping: 20 },
  }),
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleClick = (href, isRoute) => {
    setOpen(false)
    if (isRoute) {
      navigate(href)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (location.pathname === '/') {
      const el = document.querySelector(href)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate('/')
      setTimeout(() => {
        const el = document.querySelector(href)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'mt-0' : 'mt-4'
        }`}
      >
        <div className={`mx-auto w-max transition-all duration-500 ${
          scrolled
            ? 'glass-panel-strong rounded-2xl px-4 py-2'
            : 'glass-panel rounded-full px-6 py-3'
        }`}>
          <div className="flex items-center gap-8">
            <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="text-sm font-medium tracking-tight text-black/70 dark:text-white/80 hover:text-black dark:hover:text-white active:scale-[0.97] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]">
              NA
            </a>
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleClick(link.href, link.route)}
                  className="text-xs tracking-wider uppercase text-black/50 dark:text-white/50 hover:text-black/90 dark:hover:text-white/90 active:scale-[0.97] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                >
                  {link.label}
                </button>
              ))}
              <div className="flex items-center gap-2">
                <a
                  href="/login"
                  onClick={(e) => { e.preventDefault(); navigate('/login') }}
                  className="text-xs text-black/40 dark:text-white/40 hover:text-black/80 dark:hover:text-white/80 transition-colors"
                  title="Admin Login"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </a>
              </div>
            </div>
            <ThemeToggle variant="icon" defaultTheme="dark" duration={550} />
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden relative w-6 h-6 flex items-center justify-center"
              aria-label="Menu"
            >
              <div className="flex flex-col gap-1.5">
                <motion.span
                  animate={open ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
                  className="block w-5 h-px bg-black/40 dark:bg-white/60"
                />
                <motion.span
                  animate={open ? { opacity: 0 } : { opacity: 1 }}
                  className="block w-5 h-px bg-black/40 dark:bg-white/60"
                />
                <motion.span
                  animate={open ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
                  className="block w-5 h-px bg-black/40 dark:bg-white/60"
                />
              </div>
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden bg-[var(--bg-primary)]/95"
            style={{ backdropFilter: 'blur(40px)' }}
          >
            <div className="flex flex-col items-center justify-center h-full gap-8">
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.href}
                  custom={i}
                  variants={staggerItem}
                  initial="hidden"
                  animate="visible"
                  onClick={() => handleClick(link.href, link.route)}
                  className="text-2xl tracking-tight text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
                >
                  {link.label}
                </motion.button>
              ))}
              <motion.button
                custom={navLinks.length}
                variants={staggerItem}
                initial="hidden"
                animate="visible"
                onClick={() => { setOpen(false); navigate('/login') }}
                className="text-2xl tracking-tight text-neural-500 hover:text-neural-400 transition-colors"
              >
                Admin
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
