import { useState } from 'react'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Heart, ShoppingBag } from 'lucide-react'
import { ThemeToggle } from './ui/curtain-theme-toggle'
import { BrandLogo } from './ui/BrandLogo'
import LanguageSwitcher from './LanguageSwitcher'
import { useStore } from '../context/StoreContext'

const navLinks = [
  { label: 'services.nav.services', href: '#services' },
  { label: 'services.nav.products', href: '/offerings/products', route: true },
  { label: 'services.nav.library', href: '/library', route: true },
  { label: 'services.nav.becomePartner', href: '/affiliate-apply', route: true },
  { label: 'services.nav.process', href: '#process' },
  { label: 'services.nav.pricing', href: '#pricing' },
  { label: 'services.nav.faq', href: '#faq' },
  { label: 'services.nav.contact', href: '#contact' },
]

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, type: 'spring', stiffness: 100, damping: 20 },
  }),
}

export default function ServiceNavbar() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { cartCount, wishlistCount } = useStore()
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 80)
  })

  const handleClick = (href, isRoute) => {
    setOpen(false)
    if (isRoute) {
      navigate(href)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const el = document.querySelector(href)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
      return
    }

    // Anchor target isn't on this page (e.g. "Pricing" while on the
    // Products storefront): go to the offerings page, then scroll.
    navigate('/offerings')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = document.querySelector(href)
        if (target) target.scrollIntoView({ behavior: 'smooth' })
      })
    })
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
        <a href="#catalogue" className="skip-link">Skip to content</a>
        <div className={`mx-auto flex w-full max-w-[calc(100vw-1rem)] items-center transition-all duration-500 md:w-max ${
          scrolled
            ? 'glass-panel-strong rounded-2xl px-3 py-2 md:px-4'
            : 'glass-panel rounded-full px-3 py-2 md:px-6 md:py-3'
        } bg-white/95 dark:bg-black/85`}>
          <div className="flex flex-1 items-center justify-between gap-2 md:flex-none md:gap-8">
            <BrandLogo
              size="small"
              onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            />
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleClick(link.href, link.route)}
                  className={`inline-flex min-h-11 items-center text-xs tracking-wider uppercase transition-all duration-[400ms] active:scale-[0.97] ${
                    link.route && location.pathname === link.href
                      ? 'text-black/90 dark:text-white/90'
                      : 'text-black/50 dark:text-white/50 hover:text-black/90 dark:hover:text-white/90'
                  }`}
                >
                  {t(link.label)}
                </button>
              ))}
            </div>
            <LanguageSwitcher />
            <Link
              to="/wishlist"
              aria-label={`${t('services.nav.wishlist')} (${wishlistCount})`}
              title={t('services.nav.wishlist')}
              className="relative inline-flex h-11 w-11 items-center justify-center text-black/50 transition-colors hover:text-rose-500 dark:text-white/50"
            >
              <Heart className="h-4 w-4" aria-hidden="true" />
              {wishlistCount > 0 && (
                <span className="absolute right-0 top-0 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold leading-4 text-white">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </Link>
            <Link
              to="/cart"
              aria-label={`${t('services.nav.cart')} (${cartCount})`}
              title={t('services.nav.cart')}
              className="relative inline-flex h-11 w-11 items-center justify-center text-black/50 transition-colors hover:text-cyan-500 dark:text-white/50"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute right-0 top-0 inline-flex min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[9px] font-semibold leading-4 text-black">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
            <ThemeToggle variant="icon" buttonSize={44} defaultTheme="dark" duration={550} />
            <button
              onClick={() => setOpen(!open)}
              className="relative flex h-11 w-11 items-center justify-center md:hidden"
              aria-label={t('common.menu')}
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
                className="inline-flex min-h-11 items-center text-2xl tracking-tight text-black/70 transition-colors hover:text-black dark:text-white/70 dark:hover:text-white"
              >
                {t('common.home')}
              </motion.button>
              <motion.button
                custom={1}
                variants={staggerItem}
                initial="hidden"
                animate="visible"
                onClick={() => { setOpen(false); navigate('/wishlist') }}
                className="inline-flex min-h-11 items-center gap-2 text-2xl tracking-tight text-black/70 transition-colors hover:text-rose-500 dark:text-white/70 dark:hover:text-rose-400"
              >
                <Heart className="h-5 w-5" aria-hidden="true" />
                {t('services.nav.wishlist')}
                {wishlistCount > 0 && (
                  <span className="text-xs text-rose-500">({wishlistCount})</span>
                )}
              </motion.button>
              <motion.button
                custom={2}
                variants={staggerItem}
                initial="hidden"
                animate="visible"
                onClick={() => { setOpen(false); navigate('/cart') }}
                className="inline-flex min-h-11 items-center gap-2 text-2xl tracking-tight text-black/70 transition-colors hover:text-cyan-500 dark:text-white/70 dark:hover:text-cyan-400"
              >
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                {t('services.nav.cart')}
                {cartCount > 0 && (
                  <span className="text-xs text-cyan-500">({cartCount})</span>
                )}
              </motion.button>
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.href}
                  custom={i + 3}
                  variants={staggerItem}
                  initial="hidden"
                  animate="visible"
                  onClick={() => handleClick(link.href, link.route)}
                  className="inline-flex min-h-11 items-center text-2xl tracking-tight text-black/70 transition-colors hover:text-black dark:text-white/70 dark:hover:text-white"
                >
                  {t(link.label)}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
