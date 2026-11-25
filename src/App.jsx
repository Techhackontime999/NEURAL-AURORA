import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useSpring, MotionConfig, useTransform } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { StoreProvider, useStore } from './context/StoreContext'
import { AutoTraverseProvider } from './context/AutoTraverseContext'
import { MoodProvider } from './context/MoodContext'
import AutoTraverseEffect from './components/ui/auto-traverse-effect'
import StartingLoader from './components/StartingLoader'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import VideoHero from './components/VideoHero'
import About from './components/About'
import Skills from './components/Skills'
import Projects from './components/Projects'
import Resume from './components/Resume'
import Contact from './components/Contact'
import ReviewsList from './components/ReviewsList'
import ReviewForm from './components/ReviewForm'
import { Footer } from './components/ui/footer-section'
import { AdminRoute } from './components/admin/ProtectedRoute'
import PwaStatus from './components/ui/PwaStatus'
import NotFound from './components/NotFound'
import RenderErrorBoundary from './lib/RenderErrorBoundary'
import { NeuralCursor } from './components/ui/neural-cursor'
import MithiWidget from './components/mithi/MithiWidget'
import { useMood } from './context/MoodContext'
import { clearRuntimeCaches } from './lib/pwaCaches'
import { isChunkLoadError, recoverFromChunkError } from './lib/chunkRecovery'
import DocumentHead from './components/ui/DocumentHead'
import FloatingNav from './components/ui/floating-nav'
import { SITE_NAME } from './lib/documentHead'

// Route-level code splitting: only the app shell, navigation and overlays stay
// in the entry chunk. Pages and the WebGL background load on demand.
const AuroraBackground = lazy(() => import('./components/AuroraBackground'))
const More = lazy(() => import('./components/More'))
const Certificates = lazy(() => import('./components/more/Certificates'))
const Achievements = lazy(() => import('./components/more/Achievements'))
const Gallery = lazy(() => import('./components/more/Gallery'))
const Service = lazy(() => import('./components/Service'))
const ServiceDetail = lazy(() => import('./components/ServiceDetail'))
const Products = lazy(() => import('./components/offerings/Products'))
const ProductDetail = lazy(() => import('./components/offerings/ProductDetail'))
const ProductEmbed = lazy(() => import('./components/offerings/ProductEmbed'))
const Library = lazy(() => import('./components/offerings/Library'))
const PurchaseSuccess = lazy(() => import('./components/offerings/PurchaseSuccess'))
const Cart = lazy(() => import('./components/offerings/Cart'))
const Wishlist = lazy(() => import('./components/offerings/Wishlist'))
const Blog = lazy(() => import('./components/Blog'))
const BlogPost = lazy(() => import('./components/BlogPost'))
const CaseStudyDetail = lazy(() => import('./components/CaseStudyDetail'))
const Support = lazy(() => import('./components/Support'))
const LegalPage = lazy(() => import('./components/legal/LegalPage'))
const Login = lazy(() => import('./components/admin/Login'))
const Register = lazy(() => import('./components/admin/Register'))
const ForgotPassword = lazy(() => import('./components/admin/ForgotPassword'))
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'))
const PartnerPortal = lazy(() => import('./components/partner/PartnerPortal'))
const AffiliateApply = lazy(() => import('./components/partner/AffiliateApply'))
const ContributorApply = lazy(() => import('./components/offerings/ContributorApply'))
const Settings = lazy(() => import('./components/Settings'))

function RouteFallback() {
  return (
    <div className="min-h-[60dvh] flex items-center justify-center px-6" role="status" aria-live="polite">
      <span className="text-sm text-[var(--text-secondary)]">Loading…</span>
    </div>
  )
}

// A lazy chunk can fail for two different reasons: the visitor is offline and
// has never opened this route, or a cached chunk expired / changed after a
// deploy. Never claim an unvisited page is available offline; offer the right
// recovery action for each case instead.
function RouteErrorFallback() {
  const offline = typeof navigator !== 'undefined' && !navigator.onLine
  const [clearing, setClearing] = useState(false)
  const [recovering, setRecovering] = useState(false)

  async function handleReload() {
    setRecovering(true)
    try {
      const recovered = await recoverFromChunkError()
      if (!recovered) window.location.reload()
    } catch {
      window.location.reload()
    }
  }

  async function handleClear() {
    setClearing(true)
    try {
      await clearRuntimeCaches()
    } catch {
      // A failed cache clear must not block the reload attempt.
    }
    window.location.reload()
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 text-center" role="alert">
      <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
        {offline ? "This page isn't available offline yet" : 'Could not load this page'}
      </h1>
      <p className="text-sm text-[var(--text-secondary)] max-w-[46ch]">
        {offline
          ? 'Open it once while online and it can work offline later. The homepage and pages you have already visited remain available.'
          : 'The page files may have expired or changed after an update. Reload, or clear the cached page files and try again.'}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={handleReload}
          disabled={recovering || clearing}
          className="px-5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--glass-bg)] text-sm font-medium text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors disabled:opacity-50"
        >
          {recovering ? 'Retrying…' : 'Reload'}
        </button>
        {!offline && (
          <button
            onClick={handleClear}
            disabled={clearing}
            className="px-5 py-2.5 rounded-xl border border-[var(--border-color)] text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] transition-colors disabled:opacity-50"
          >
            {clearing ? 'Clearing…' : 'Clear cached page files'}
          </button>
        )}
        <button
          onClick={() => { window.location.href = '/' }}
          className="px-5 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Go home
        </button>
      </div>
    </div>
  )
}

function SectionSeparator() {
  return (
    <div className="relative z-10 flex justify-center">
      <div className="w-px h-16 md:h-24 bg-gradient-to-b from-transparent via-[var(--border-color)] to-transparent" />
    </div>
  )
}

// /services was renamed to /offerings. Keeps old bookmarks and shared links
// working, including deep links to a single service.
function LegacyServicesRedirect() {
  const params = useParams()
  const rest = params['*'] || ''
  return <Navigate to={rest ? `/offerings/${rest}` : '/offerings'} replace />
}

// /checkout/:orderId is accepted as an alias for the order-status screen. It
// only ever renders the status view — it is never a source of authorization.
function CheckoutAlias() {
  const { orderId } = useParams()
  return <Navigate to={`/purchase/success?ref=${encodeURIComponent(orderId || '')}`} replace />
}

// Static route metadata. Product detail is handled by the product page itself
// because its title, image, price and JSON-LD come from the loaded product.
const ROUTE_HEADS = {
  '/': {},
  '/more': {
    title: `More from ${SITE_NAME}`,
    description: 'Certificates, achievements and a visual gallery from Amit Kumar (Techhackontime999).',
  },
  '/more/certificates': {
    title: `Certificates — ${SITE_NAME}`,
    description: 'Verified certifications and continuous learning milestones.',
  },
  '/more/achievements': {
    title: `Achievements — ${SITE_NAME}`,
    description: 'Selected builds, recognitions and project milestones.',
  },
  '/more/gallery': {
    title: `Gallery — ${SITE_NAME}`,
    description: 'A visual record of interfaces, experiments and digital work.',
  },
  '/offerings': {
    title: `Offerings — ${SITE_NAME}`,
    description: 'Digital products, custom web development and support offerings.',
  },
  '/offerings/products': {
    title: `Digital Store — ${SITE_NAME}`,
    description: 'Browse downloadable templates, guides and digital products.',
  },
  '/affiliate-apply': {
    title: `Become a Partner — ${SITE_NAME}`,
    description: 'Apply to sell NEURAL AURORA digital products and earn commission on referred orders.',
  },
  '/contributor-apply': {
    title: `Become a Contributor — ${SITE_NAME}`,
    description: 'Apply for a free personal-use contributor license on selected digital products.',
  },
  '/blog': {
    title: `Journal — ${SITE_NAME}`,
    description: 'Notes on development, design and building on the web.',
  },
  '/support': {
    title: `Support — ${SITE_NAME}`,
    description: 'Get help with an order, download or digital product.',
  },
  '/privacy': {
    title: `Privacy Policy — ${SITE_NAME}`,
    description: 'How NEURAL AURORA collects, uses and protects your information.',
  },
  '/terms': {
    title: `Terms of Use — ${SITE_NAME}`,
    description: 'The terms that govern your use of NEURAL AURORA and its digital store.',
  },
}

const PRIVATE_ROBOTS = 'noindex, nofollow'
const NOT_FOUND_HEAD = {
  title: `Page not found — ${SITE_NAME}`,
  description: 'The requested NEURAL AURORA page does not exist.',
  robots: PRIVATE_ROBOTS,
}

function headForPath(pathname) {
  // Embeds live inside third-party pages; they never need their own index entry.
  if (pathname.startsWith('/embed/')) return { title: `${SITE_NAME}`, robots: PRIVATE_ROBOTS }
  if (pathname.startsWith('/offerings/products/')) return null
  if (pathname === '/offerings/products') return ROUTE_HEADS['/offerings/products']
  if (pathname.startsWith('/offerings/')) {
    return {
      title: `Service — ${SITE_NAME}`,
      description: 'A service offering from NEURAL AURORA.',
    }
  }
  if (pathname.startsWith('/blog/') || pathname.startsWith('/case-study/')) {
    return {
      title: `Reading — ${SITE_NAME}`,
      description: 'An article or case study from NEURAL AURORA.',
    }
  }
  if (
    pathname === '/library' ||
    pathname === '/cart' ||
    pathname === '/wishlist' ||
    pathname === '/purchase/success' ||
    pathname.startsWith('/checkout/') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/affiliate-login' ||
    pathname === '/contributor-login' ||
    pathname === '/partner' ||
    pathname === '/settings' ||
    pathname.startsWith('/admin/')
  ) {
    return { title: `${SITE_NAME}`, robots: PRIVATE_ROBOTS }
  }
  return ROUTE_HEADS[pathname] || NOT_FOUND_HEAD
}

function RouteHead() {
  const { pathname } = useLocation()
  const head = headForPath(pathname)
  if (!head && pathname.startsWith('/offerings/products/')) return null
  return <DocumentHead {...(head || {})} path={pathname} />
}

function HomePage() {
  const mouse = useRef({ x: 0, y: 0 })

  const handleMouseMove = (e) => {
    mouse.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: (e.clientY / window.innerHeight) * 2 - 1,
    }
  }

  const videoRevealRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: videoRevealRef,
    offset: ['start 92%', 'start 20%'],
  })
  const videoOpacity = useTransform(scrollYProgress, [0, 1], [0, 1])
  const videoScale = useTransform(scrollYProgress, [0, 1], [0.98, 1])
  const videoY = useTransform(scrollYProgress, [0, 1], [40, 0])

  // NOTE: there used to be an `if (!hasLoaded) return <div />` gate here.
  // It blanked the entire home page whenever the personal_info request was
  // slow or impossible (localhost without internet, placeholder credentials).
  // usePersonalInfo() seeds its cache with the bundled static data before the
  // first render, so there is always something to show — render immediately
  // and let the fetched data replace it when (and if) it arrives.

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative min-h-[100dvh] overflow-clip"
    >
      {/* Local boundary so a slow WebGL chunk never swaps out the whole page. */}
      <Suspense fallback={null}>
        <AuroraBackground mouse={mouse} />
      </Suspense>
      <Navbar />
      <Hero />
      <motion.div
        ref={videoRevealRef}
        style={{
          opacity: videoOpacity,
          scale: videoScale,
          y: videoY,
          willChange: 'transform, opacity',
        }}
        className="relative z-10 origin-top"
      >
        <VideoHero />
      </motion.div>
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
  const { cartCount, wishlistCount } = useStore()
  const isAuthRoute = location.pathname.startsWith('/login') || location.pathname.startsWith('/forgot-password') || location.pathname.startsWith('/affiliate-login') || location.pathname.startsWith('/contributor-login') || location.pathname.startsWith('/admin') || location.pathname.startsWith('/support')
  // An embed is a guest in another site's page: no cursor, companion, music or
  // site chrome should travel with it.
  const isEmbedRoute = location.pathname.startsWith('/embed/')
  // Mithi is a portfolio companion: no admin, auth, payment or embed screens.
  const showMithi = !isEmbedRoute && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/login') && !location.pathname.startsWith('/register') && !location.pathname.startsWith('/forgot-password') && !location.pathname.startsWith('/affiliate-login') && !location.pathname.startsWith('/contributor-login')
  const [loaderDone, setLoaderDone] = useState(isAuthRoute || location.pathname !== '/')
  // The top navigation stays untouched. This is a mobile-only quick bar for
  // the pages people reach most; admin and embeds keep their own chrome.
  const showFloatingNav = loaderDone && !isEmbedRoute && !location.pathname.startsWith('/admin')

  // A failed lazy import after a deploy is a stale-cache problem, not a page
  // bug. Recover once automatically; real render errors keep the manual UI.
  const handleRouteError = useCallback((error) => {
    if (isChunkLoadError(error)) recoverFromChunkError()
  }, [])

  useEffect(() => {
    // If user navigates away from home, skip the full verification loader.
    if (location.pathname !== '/') {
      setLoaderDone(true)
    }
  }, [location.pathname])

  return (
    <>
      {!isEmbedRoute && <ScrollProgress />}
      {!isEmbedRoute && <AutoTraverseEffect />}
      {loaderDone && !isEmbedRoute && <MoodMusicToggle />}
      {!isEmbedRoute && <NeuralCursor />}
      {loaderDone && showMithi && <MithiWidget />}
      {!isEmbedRoute && <PwaStatus />}
      {showFloatingNav && (
        <FloatingNav
          profileHref="/library"
          cartCount={cartCount}
          wishlistCount={wishlistCount}
        />
      )}
      {!loaderDone && <StartingLoader onComplete={() => setLoaderDone(true)} />}
      <AnimatePresence>
        {loaderDone && (
          <motion.div
            animate={{ opacity: 1 }}
            className={
              showFloatingNav
                ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0'
                : undefined
            }
          >
            {/* Last line of defence: a stray render error or a failed lazy
                chunk (3D scene offline, expired route chunk) must degrade to a
                readable, honest screen, never to a blank page. */}
            <RouteHead />
            <RenderErrorBoundary
              resetKey={`${location.pathname}${location.search}`}
              onError={handleRouteError}
              fallback={<RouteErrorFallback />}
            >
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/more" element={<More />} />
              <Route path="/more/certificates" element={<Certificates />} />
              <Route path="/more/achievements" element={<Achievements />} />
              <Route path="/more/gallery" element={<Gallery />} />
              <Route path="/offerings" element={<Service />} />
              {/* Product store — static segments outrank /offerings/:serviceId,
                  so "products" never opens the generic service-detail page. */}
              <Route path="/offerings/products" element={<Products />} />
              <Route path="/offerings/products/:slug" element={<ProductDetail />} />
              {/* Compact, chrome-free card for embeds on third-party sites. */}
              <Route path="/embed/products/:slug" element={<ProductEmbed />} />
              <Route path="/offerings/:serviceId" element={<ServiceDetail />} />
              {/* Customer purchase library and post-payment status screen. */}
              <Route path="/library" element={<Library />} />
              <Route path="/purchase/success" element={<PurchaseSuccess />} />
              {/* Saved shopping state. Noindex: personal, device-local views. */}
              <Route path="/cart" element={<Cart />} />
              <Route path="/wishlist" element={<Wishlist />} />
              {/* /checkout/:orderId is an alias for the status screen. */}
              <Route
                path="/checkout/:orderId"
                element={<CheckoutAlias />}
              />
              {/* /services was renamed to /offerings — keep old links working */}
              <Route path="/services" element={<Navigate to="/offerings" replace />} />
              <Route path="/services/*" element={<LegacyServicesRedirect />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/case-study/:slug" element={<CaseStudyDetail />} />
              <Route path="/support" element={<Support />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/privacy" element={<LegalPage doc="privacy" />} />
              <Route path="/terms" element={<LegalPage doc="terms" />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              {/* Partners sign in here, separately from the admin console. */}
              <Route path="/affiliate-login" element={<Login variant="partner" />} />
              {/* Public application; approval still happens in /admin/affiliates. */}
              <Route path="/affiliate-apply" element={<AffiliateApply />} />
              {/* Contributors sign in here, separately from the portfolio admin console. */}
              <Route path="/contributor-login" element={<Login variant="contributor" />} />
              {/* Contributor personal-use applications; licenses are admin-issued. */}
              <Route path="/contributor-apply" element={<ContributorApply />} />
              {/* Signed-in resellers see their own earnings and referral links. */}
              <Route path="/partner" element={<PartnerPortal />} />
              <Route
                path="/admin/*"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              {/* Unknown URLs get an honest, noindex 404 instead of a silent redirect. */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </RenderErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
    <AuthProvider>
      <ToastProvider>
        <StoreProvider>
          <AutoTraverseProvider>
            <MoodProvider>
              <AppContent />
            </MoodProvider>
          </AutoTraverseProvider>
        </StoreProvider>
      </ToastProvider>
    </AuthProvider>
    </MotionConfig>
  )
}
