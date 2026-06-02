import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { Lock, Shield, ExternalLink } from 'lucide-react'
import { ThemeToggle } from './ui/curtain-theme-toggle'
import { BrandLogo } from './ui/BrandLogo'
import { getCrmUrl } from '../lib/crm-config'
import { getDocsUrl } from '../lib/docs-config'

const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Projects', href: '#projects' },
  { label: 'Services', href: '/services', route: true },
  { label: 'Resume', href: '#resume' },
  { label: 'Contact', href: '#contact' },
  { label: 'More', href: '/more', route: true },
  { label: 'Support', href: '/support', route: true, highlight: true },
]

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, type: 'spring', stiffness: 100, damping: 20 },
  }),
}

function LoginMenuMobile({ crmUrl, docsUrl, staggerItem, navLinksLength, onNavigate }) {
  const [expanded, setExpanded] = useState(false)
  const mNavigate = useNavigate()

  return (
    <motion.div
      custom={navLinksLength}
      variants={staggerItem}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 text-xl tracking-tight transition-colors"
        style={{ color: 'var(--accent)' }}
      >
        <Lock className="w-4 h-4" strokeWidth={1.5} />
        <span>Login &amp; Setup</span>
        <motion.svg
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="w-4 h-4"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden flex flex-col items-center gap-5 pt-4"
          >
            <button
              onClick={() => { onNavigate(); mNavigate('/login') }}
              className="flex items-center gap-3 text-base tracking-tight transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Shield className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
              Admin Dashboard
            </button>
            {crmUrl && (
              <a
                href={crmUrl}
                target="_self"
                rel="noopener noreferrer"
                onClick={onNavigate}
                className="flex items-center gap-3 text-base tracking-tight transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ExternalLink className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                CRM Dashboard
              </a>
            )}
            {docsUrl && (
              <a
                href={docsUrl}
                target="_self"
                rel="noopener noreferrer"
                onClick={onNavigate}
                className="flex items-center gap-3 text-base tracking-tight transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ExternalLink className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                Get Started
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [crmUrl, setCrmUrl] = useState('')
  const [docsUrl, setDocsUrl] = useState('')
  const loginRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { scrollY } = useScroll()

  useEffect(() => {
    setCrmUrl(getCrmUrl())
    setDocsUrl(getDocsUrl())
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (loginRef.current && !loginRef.current.contains(e.target)) {
        setLoginOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 80)
  })

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
            <BrandLogo
              size="small"
              onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            />
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleClick(link.href, link.route)}
                  className={`text-xs tracking-wider uppercase active:scale-[0.97] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    link.highlight
                      ? 'bg-gradient-to-r from-rose-500 to-purple-500 text-transparent bg-clip-text font-semibold hover:from-rose-400 hover:to-purple-400'
                      : 'text-black/50 dark:text-white/50 hover:text-black/90 dark:hover:text-white/90'
                  }`}
                >
                  {link.label}
                </button>
              ))}
              <div className="flex items-center gap-2 relative" ref={loginRef}>
                <button
                  onClick={() => setLoginOpen(!loginOpen)}
                  className="relative flex items-center justify-center w-7 h-7 rounded-lg text-black/40 dark:text-white/40 hover:text-black/80 dark:hover:text-white/80 active:scale-[0.92] transition-all duration-300"
                  title="Login"
                >
                  <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <AnimatePresence>
                  {loginOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.8 }}
                      className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border shadow-xl"
                      style={{
                        background: 'var(--card-bg)',
                        borderColor: 'var(--border-color)',
                        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
                      }}
                    >
                      <div className="p-1.5">
                        <button
                          onClick={() => { setLoginOpen(false); navigate('/login') }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-medium tracking-wider uppercase active:scale-[0.98] transition-all duration-300"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Shield className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                          <span>Admin Dashboard</span>
                        </button>
                        {crmUrl && (
                          <>
                            <div className="mx-3 my-1 h-px" style={{ background: 'var(--border-color)' }} />
                            <a
                              href={crmUrl}
                              target="_self"
                              rel="noopener noreferrer"
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-medium tracking-wider uppercase active:scale-[0.98] transition-all duration-300"
                              style={{ color: 'var(--text-secondary)' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                              <span>CRM Dashboard</span>
                            </a>
                          </>
                        )}
                        {docsUrl && (
                          <>
                            <div className="mx-3 my-1 h-px" style={{ background: 'var(--border-color)' }} />
                            <a
                              href={docsUrl}
                              target="_self"
                              rel="noopener noreferrer"
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-medium tracking-wider uppercase active:scale-[0.98] transition-all duration-300"
                              style={{ color: 'var(--text-secondary)' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                              <span>Get Started</span>
                            </a>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                  className={`text-2xl tracking-tight transition-colors ${
                    link.highlight
                      ? 'bg-gradient-to-r from-rose-400 to-purple-400 text-transparent bg-clip-text font-bold'
                      : 'text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {link.label}
                </motion.button>
              ))}
              <LoginMenuMobile
                crmUrl={crmUrl}
                docsUrl={docsUrl}
                staggerItem={staggerItem}
                navLinksLength={navLinks.length}
                onNavigate={() => setOpen(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
