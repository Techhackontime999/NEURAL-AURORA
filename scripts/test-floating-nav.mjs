// Source guards for the mobile navigation. The components are leaf UI
// elements, so these checks assert the integration contract instead of
// rendering: commerce destinations, live badges, swipeable upper rails,
// layering and TS/shadcn setup. Run: npm run test:floating-nav
import fs from 'node:fs'

const read = (file) => fs.readFileSync(file, 'utf8')

const nav = read('src/components/ui/floating-nav.tsx')
const rail = read('src/components/ui/nav-scroller.tsx')
const css = read('src/index.css')
const settingsPage = read('src/components/Settings.jsx')
const library = read('src/components/offerings/Library.jsx')
const products = read('src/components/offerings/Products.jsx')
const mithi = read('src/components/mithi/MithiWidget.jsx')
const navbar = read('src/components/Navbar.jsx')
const serviceNavbar = read('src/components/ServiceNavbar.jsx')
const moreNavbar = read('src/components/MoreNavbar.jsx')
const supportNavbar = read('src/components/SupportNavbar.jsx')
const blogNavbar = read('src/components/BlogNavbar.jsx')
const app = read('src/App.jsx')
const en = JSON.parse(read('src/locales/en.json'))
const pkg = JSON.parse(read('package.json'))
const tsconfig = JSON.parse(read('tsconfig.json'))
const components = JSON.parse(read('components.json'))

let passed = 0
let failed = 0

function check(name, cond) {
  if (cond) {
    passed++
    console.log(`ok    ${name}`)
  } else {
    failed++
    console.log(`FAIL  ${name}`)
  }
}

// --- Bottom bar contract -----------------------------------------------------
check('floating nav: lives in the shadcn ui folder', fs.existsSync('src/components/ui/floating-nav.tsx'))
check('floating nav: is an isolated client component', nav.startsWith("'use client'"))
check('floating nav: keeps the six commerce destinations', [
  'bottomNav.home',
  'bottomNav.shop',
  'bottomNav.search',
  'bottomNav.saved',
  'bottomNav.cart',
  'bottomNav.account',
].every((key) => nav.includes(key)))
check('floating nav: store and search tabs resolve from the same route', nav.includes('isStorePath') && nav.includes('isSearchIntent'))
check('floating nav: live cart and wishlist counts become badges', nav.includes('badge: wishlistCount') && nav.includes('badge: cartCount') && nav.includes("badgeTone: 'rose'") && nav.includes("badgeTone: 'cyan'"))
check('floating nav: uses react-router links and lucide icons', nav.includes("from 'react-router-dom'") && nav.includes("from 'lucide-react'") && nav.includes('animate={{ x: indicator.x }}'))
check('floating nav: animates only transform, never left/width', nav.includes('relative grid grid-cols-6') && nav.includes('style={{ width: indicator.width') && !nav.includes('animate={{ width') && !nav.includes('animate={{ left'))
check('floating nav: mobile only with safe-area padding', nav.includes('md:hidden') && nav.includes('env(safe-area-inset-bottom)'))
check('floating nav: sits below the mobile menu and share overlays', nav.includes('z-30') && !nav.includes('z-[20000'))
check('floating nav: exposes active route and badge counts to assistive tech', nav.includes('aria-current={active ? \'page\' : undefined}') && nav.includes('aria-label={`${t(item.labelKey)}${badge ? ` (${badge})` : \'\'}`}'))
check('floating nav: honours reduced motion and cleans up resize listeners', nav.includes('useReducedMotion') && nav.includes('observer?.disconnect()') && nav.includes("window.removeEventListener('resize', updateIndicator)"))
check('bottom nav: account opens library sign-in, never admin login', nav.includes("profileHref = '/library'") && app.includes('profileHref="/library"') && !app.includes("user ? '/library' : '/login'") && !nav.includes("profileHref = '/login'"))
check('library: guest state is the customer sign-in screen', library.includes('if (!user)') && library.includes("t('store.signInTitle')") && library.includes('handlePasswordSignIn'))

// --- Upper navigation rail ---------------------------------------------------
check('upper nav: shared rail is swipeable, masked and mobile only', rail.includes('overflow-x-auto') && rail.includes('no-scrollbar') && rail.includes('nav-scroller') && rail.includes('md:hidden'))
check('upper nav: active link scrolls into view', rail.includes('scrollIntoView') && rail.includes("inline: 'center'") && rail.includes('prefers-reduced-motion'))
check('upper nav: every chrome navbar exposes the rail', [navbar, serviceNavbar, moreNavbar, supportNavbar, blogNavbar].every((src) => src.includes('<NavScroller')))
check('upper nav: primary tabs and account shortcuts are all reachable', [navbar, serviceNavbar].every((src) => ['/offerings/products', '/library', '/wishlist', '/cart', '/settings'].every((to) => src.includes(`'${to}'`))))
check('hamburger menu: all chrome menus scroll vertically', [navbar, serviceNavbar, moreNavbar, supportNavbar, blogNavbar].every((src) => src.includes('mobile-menu-scroll') && src.includes('overflow-y-auto') && src.includes('overscroll-y-contain')))
check('hamburger menu: scroll region clears fixed top chrome and keeps safe-area bottom', [navbar, serviceNavbar, moreNavbar, supportNavbar, blogNavbar].every((src) => src.includes('min-h-full') && src.includes('pt-32') && src.includes('env(safe-area-inset-bottom)')))
check('hamburger menu: thin scroll affordance is defined once', css.includes('.mobile-menu-scroll') && css.includes('overscroll-behavior-y: contain') && css.includes('scrollbar-color'))

// --- Integration: nothing from the existing chrome is lost ------------------
check('top navigation remains mounted on the home page', app.includes('<Navbar />'))
check('top navigation still owns its full-screen mobile menu', navbar.includes('role="dialog"') && navbar.includes('z-40') && navbar.includes('md:hidden'))
check('app mounts the bottom bar outside embeds and admin', app.includes('<FloatingNav') && app.includes('!isEmbedRoute && !isAdminRoute') && app.includes("location.pathname.startsWith('/admin')"))
check('app reserves space so page content is never hidden', app.includes('pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0'))
check('app feeds live store counts into the bottom bar', app.includes('cartCount={cartCount}') && app.includes('wishlistCount={wishlistCount}'))
check('companion widget moves above the bottom bar on mobile', mithi.includes('bottom-[calc(6rem+env(safe-area-inset-bottom))]') && mithi.includes('md:bottom-[calc(1rem+env(safe-area-inset-bottom))]'))
check('search destination focuses the catalogue search field', products.includes('searchInputRef.current?.focus()') && products.includes("current.get('focus') === 'search'") && products.includes('ref={searchInputRef}'))

// --- Settings destination ----------------------------------------------------
check('settings: route exists and is private', app.includes("path=\"/settings\"") && app.includes("pathname === '/settings'"))
check('settings: keeps shared top navigation and footer', settingsPage.includes('<ServiceNavbar />') && settingsPage.includes('<Footer />'))
check('settings: account links stay inside the app', ['/library', '/wishlist', '/partner', '/contributor-apply'].every((to) => settingsPage.includes(`to="${to}"`) || settingsPage.includes(`'${to}'`)))
check('settings: help shortcut opens the contact section, not the contribution page', settingsPage.includes('href="/#contact"') && !settingsPage.includes("to=\"/support\""))
check('settings: sign-in badge and library shortcut both open the customer library', (settingsPage.match(/to="\/library"/g) || []).length >= 2 && !settingsPage.includes('/login') && !settingsPage.includes("user ? '/library' : '/login'"))

// --- Project setup -----------------------------------------------------------
check('setup: Tailwind CSS v4 is installed', Boolean(pkg.devDependencies?.tailwindcss) && Boolean(pkg.devDependencies?.['@tailwindcss/postcss']))
check('setup: framer-motion and lucide-react are installed', Boolean(pkg.dependencies?.['framer-motion']) && Boolean(pkg.dependencies?.['lucide-react']))
check('setup: TypeScript is installed and typecheck is wired', Boolean(pkg.devDependencies?.typescript) && pkg.scripts?.typecheck === 'tsc --noEmit')
check('setup: @ alias resolves to src', tsconfig.compilerOptions?.paths?.['@/*']?.[0] === './src/*')
check('setup: shadcn ui path is explicit', components.aliases?.ui === '@/components/ui' && components.iconLibrary === 'lucide')
check('copy: all bottom nav labels exist in English', ['label', 'home', 'shop', 'search', 'saved', 'cart', 'account'].every((key) => Boolean(en.bottomNav?.[key])))
check('copy: all upper nav shortcuts exist in English', ['store', 'library', 'wishlist', 'cart', 'settings', 'quickLinks'].every((key) => Boolean(en.nav?.[key])))
check('copy: all settings labels exist in English', ['eyebrow', 'title', 'subtitle', 'appearance', 'account', 'library', 'saved', 'partner', 'contributor', 'support'].every((key) => Boolean(en.settings?.[key])))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
