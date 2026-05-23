import { useState } from 'react'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from './ui/curtain-theme-toggle'
import { BrandLogo } from './ui/BrandLogo'

const navLinks = [
  { label: 'Timeline', href: '#timeline' },
  { label: 'Case Studies', href: '#case-studies' },
  { label: 'Blog', href: '/blog', route: true },
]

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, type: 'spring', stiffness: 100, damping: 20 },
  }),
}

export default function MoreNavbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 80)
  })

  const handleClick = (href, isRoute) => {
    setOpen(false)
    if (isRoute) {
      navigate(href)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      const el = document.querySelector(href)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
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
                  className="text-xs tracking-wider uppercase text-black/50 dark:text-white/50 hover:text-black/90 dark:hover:text-white/90 active:scale-[0.97] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                >
                  {link.label}
                </button>
              ))}
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
              <motion.button
                custom={0}
                variants={staggerItem}
                initial="hidden"
                animate="visible"
                onClick={() => { setOpen(false); navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="text-2xl tracking-tight text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
              >
                Home
              </motion.button>
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.href}
                  custom={i + 1}
                  variants={staggerItem}
                  initial="hidden"
                  animate="visible"
                  onClick={() => handleClick(link.href, link.route)}
                  className="text-2xl tracking-tight text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
                >
                  {link.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
