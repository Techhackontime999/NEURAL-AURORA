// Source guards for the admin icon/emoji pickers and the small UX gaps closed
// in this batch. These are source assertions, not renders: they stop a later
// edit from quietly restoring raw icon selects or the old silent 404 redirect.
// Run: npm run test:ui-controls
import fs from 'node:fs'

const read = (file) => fs.readFileSync(file, 'utf8')

const picker = read('src/components/ui/IconPicker.jsx')
const glyph = picker.slice(picker.indexOf('export function IconGlyph'), picker.indexOf('export default function IconPicker'))
const catalog = read('src/lib/iconCatalog.js')
const services = read('src/components/admin/AdminServices.jsx')
const social = read('src/components/admin/AdminSocialLinks.jsx')
const categories = read('src/components/admin/CategoryManager.jsx')
const videoHero = read('src/components/admin/AdminVideoHero.jsx')
const payments = read('src/components/admin/AdminPaymentSettings.jsx')
const app = read('src/App.jsx')
const boundary = read('src/lib/RenderErrorBoundary.jsx')
const notFound = read('src/components/NotFound.jsx')
const css = read('src/index.css')
const projects = read('src/components/Projects.jsx')
const loader = read('src/components/StartingLoader.jsx')
const en = JSON.parse(read('src/locales/en.json'))
const videoDefaults = read('src/lib/videoHeroDefaults.js')
const signatureForm = read('src/components/admin/AdminDocumentSignature.jsx')
const navScroller = read('src/components/ui/nav-scroller.tsx')
const themeToggle = read('src/components/ui/curtain-theme-toggle.jsx')
const library = read('src/components/offerings/Library.jsx')
const settings = read('src/components/Settings.jsx')
const adminLayout = read('src/components/admin/AdminLayout.jsx')
const products = read('src/components/offerings/Products.jsx')
const contributor = read('src/components/offerings/ContributorApply.jsx')

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

// --- Document signature form ------------------------------------------------
check(
  'signature form: typing keeps internal spaces',
  signatureForm.includes('setForm((current) => ({ ...current, ...next }))') &&
    !signatureForm.includes('mergeDocumentSignature({ ...current, ...next })') &&
    signatureForm.includes('const next = mergeDocumentSignature(form)')
)

// --- Shared picker ----------------------------------------------------------
check('picker: exports a shared glyph renderer', picker.includes('export function IconGlyph'))
check('picker: searchable icon grid', picker.includes('Search icons') && picker.includes('grid-cols-5'))
check('picker: separate emoji tab', picker.includes("['emoji', 'Emoji']") && catalog.includes('EMOJI_ICON_OPTIONS'))
check('picker: custom values are accepted without rewriting', picker.includes('const nextValue = custom.trim()') && picker.includes('onChange(nextValue)') && !picker.includes('toLowerCase()\n  onChange'))
check('picker: Escape closes and restores focus', picker.includes("event.key === 'Escape'") && picker.includes('triggerRef.current?.focus()'))
check('picker: fixed panel survives admin overflow containers', picker.includes('position') === false && picker.includes('className="fixed z-[100]'))
check('glyph: unknown stored values remain visible text', glyph.includes('isTextGlyph(value)') && glyph.includes('Unknown icon'))
check('catalogue: social keys stay lowercase for public icon maps', /value: 'github'/.test(catalog) && /value: 'linkedin'/.test(catalog) && /value: 'mail'/.test(catalog))
check('catalogue: video hero keys match the shared defaults', videoDefaults.includes("'store'") && catalog.includes("value: 'store'") && catalog.includes("value: 'contact'"))

// --- Admin adoption: no raw icon dropdowns/text fields ----------------------
check('services: icon fields use the picker', services.includes('<IconPicker') && services.includes('options={LUCIDE_ICON_OPTIONS}') && !services.includes('lucide-react'))
check('services: icon branch has no raw select', !/f\.type === 'icon'[\s\S]{0,500}<select/.test(services))
check('social links: picker preserves lowercase values', social.includes('SOCIAL_ICON_OPTIONS') && social.includes('<IconPicker'))
check('social links: raw icon select removed', !/value=\{newForm\.icon\}[\s\S]{0,200}<select/.test(social) && !/value=\{editForm\.icon\}[\s\S]{0,200}<select/.test(social))
check('categories: icon name text input replaced', categories.includes('<IconPicker') && !categories.includes('Icon name'))
check('video hero: button icon select replaced', videoHero.includes('<IconPicker') && videoHero.includes('allowCustom={false}') && !/<select[\s>]/.test(videoHero))
check('payments: donation preset icon text input replaced', payments.includes('label="Preset icon"') && !/placeholder="Icon name"/.test(payments))

// --- Real 404 and route-level error recovery -------------------------------
check('404: component exists and is routed', notFound.includes('This page isn’t here.') && app.includes("element={<NotFound />}"))
check('404: unknown URLs no longer redirect home', !app.includes('<Navigate to="/" replace />'))
check('404: head is private/noindex', app.includes('Page not found') && app.includes("robots: PRIVATE_ROBOTS"))
check('error boundary: resets on reset-key change', boundary.includes('componentDidUpdate(prevProps)') && boundary.includes('this.props.resetKey !== prevProps.resetKey') && boundary.includes('hasError: false'))
check('error boundary: route key is supplied', app.includes('resetKey={`${location.pathname}${location.search}`}'))

// --- Anchors and keyboard access -------------------------------------------
check('anchors: every id target gets scroll margin', /\[id\]\s*\{[^}]*scroll-margin-top/.test(css) && css.includes('--anchor-scroll-margin'))
check('projects: explicit keyboard toggle on each card', projects.includes('aria-expanded={expanded}') && projects.includes('type="button"') && projects.includes('event.stopPropagation()'))
check('projects: toggle copy is translated', en.projects?.showDetails === 'Show details' && en.projects?.hideDetails === 'Hide details' && projects.includes("t('projects.showDetails'") && projects.includes("t('projects.hideDetails'"))

// --- Verification content exploration --------------------------------------
const exploreOptions = ['store', 'blog', 'case-studies', 'projects', 'services', 'skills', 'experience', 'education', 'gallery', 'certificates', 'achievements', 'reviews', 'resume']
check('loader: thirteen content options exist', exploreOptions.every((id) => loader.includes(`testId="verification-option-${id}"`)))
check('loader: content options open the exploration gallery', loader.includes('function handleExploreOption(section)') && loader.includes("setPhase('explore')") && loader.includes('initialSection={exploreSection}'))
check('loader: exploration gallery uses accessible tabs', loader.includes('role="tablist"') && loader.includes('role="tab"') && loader.includes('role="tabpanel"') && loader.includes('aria-selected={selected}') && loader.includes('aria-controls="explore-panel"'))
check('loader: gallery reuses existing content cards', ['<BlogCards', '<CaseStudyCards', '<ProjectCards', '<ServicesCards', '<SkillsContent', '<ExperienceCards', '<EducationCards', '<GalleryCards', '<CertificateCards', '<AchievementCards', '<ReviewCards', '<ResumeCard'].every((component) => loader.includes(component)))
check('loader: new sections use shared portfolio hooks', ['useGallery()', 'useCertificates()', 'useAchievements()', 'useReviews()', 'usePersonalInfo()'].every((hook) => loader.includes(hook)))
check('loader: store keeps an honest unconfigured state', loader.includes('getPublishedProducts({ limit: 8 })') && loader.includes("storeStatus === 'loading'") && loader.includes("storeStatus === 'error'") && !productsSourceHasSecret())
check('loader: new sections keep honest unconfigured states', loader.includes('function ContentState(') && ['gallery.empty', 'certificates.empty', 'achievements.empty', 'reviews.empty', 'resume.empty'].every((key) => loader.includes(`loader.explore.${key}`)))
check('loader: exploration copy is translated', ['digitalStore', 'storeDesc', 'blogDesc', 'caseStudies', 'projectsDesc', 'services', 'skillsDesc', 'experience', 'education', 'gallery', 'galleryDesc', 'certificates', 'certificatesDesc', 'achievements', 'achievementsDesc', 'reviews', 'reviewsDesc', 'resume', 'resumeDesc'].every((key) => Boolean(en.loader?.cards?.[key])) && ['eyebrow', 'title', 'subtitle', 'back', 'continue', 'openFull', 'loading', 'empty', 'error', 'viewCredential', 'viewLink', 'gallery', 'certificates', 'achievements', 'reviews', 'resume', 'store'].every((key) => Boolean(en.loader?.explore?.[key])))
check(
  'loader: gateway can be filtered and searched',
  loader.includes('const GATEWAY_FILTERS = [') &&
    loader.includes('data-gateway-item') &&
    loader.includes('type="search"') &&
    loader.includes('visibleGatewayCount') &&
    ['all', 'verify', 'explore', 'exit'].every((key) => Boolean(en.loader?.gateway?.filters?.[key])) &&
    Boolean(en.loader?.gateway?.noResults)
)
check(
  'loader: gateway and gallery disclose live data state',
  loader.includes('function LiveDataBadge(') &&
    loader.includes("'gateway-data-status'") &&
    loader.includes("'gallery-data-status'") &&
    Boolean(en.loader?.gateway?.liveData) &&
    Boolean(en.loader?.gateway?.localData)
)
check(
  'loader: every gallery tab uses shared portfolio hooks',
  ['useBlogPosts()', 'useCaseStudies()', 'useProjects()', 'useServices()', 'useSkills()', 'useExperience()', 'useEducation()'].every((hook) => loader.includes(hook)) &&
    loader.includes('invalidatePortfolioCache(activeSection.resourceKey)') &&
    Boolean(en.loader?.explore?.emptyNamed) &&
    Boolean(en.loader?.explore?.retry)
)

function productsSourceHasSecret() {
  // Keep the gallery coupled to the shared published-products API, never a
  // browser-side admin credential.
  return /DATABASE_URL|SUPABASE_SERVICE|SERVICE_ROLE/i.test(loader)
}

// --- Verification screen scrolling ----------------------------------------
check('loader: verification cards reflow from one column to four', loader.includes("grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4") && !loader.includes('md:flex overflow-auto'))
check('loader: responsive verification hooks are exposed', loader.includes('data-testid="verification-panel"') && loader.includes('data-testid="verification-grid"'))
check('loader: verification panel scrolls on short screens', loader.includes('max-h-[calc(100dvh-1.5rem)]') && loader.includes('overflow-y-auto overscroll-contain') && !loader.includes('maxHeight: \'clamp('))
check('loader: mouse wheel is not hijacked into horizontal scroll', !loader.includes('onWheel') && !loader.includes('scrollLeft') && !loader.includes("scrollSnapType: 'x mandatory'"))
check('loader: cards no longer force a horizontal min width', !loader.includes("minWidth: 'clamp(120px, 30vw, 160px)'") && !loader.includes("scrollSnapAlign: 'start'"))
check('loader: idle failsafe waits 30 seconds', loader.includes('const IDLE_SKIP_MS = 30_000') && loader.includes('}, IDLE_SKIP_MS)') && !loader.includes('}, 10000)'))
check('loader: scrolling counts as interaction', loader.includes("addEventListener('wheel', onInteract") && loader.includes("addEventListener('scroll', onInteract") && loader.includes("removeEventListener('wheel', onInteract") && loader.includes("removeEventListener('scroll', onInteract"))
check('loader: explore panel fills its width and keeps one scroll region',
  loader.includes('data-testid="explore-stage"') &&
  loader.includes('className="w-full min-w-0"') &&
  loader.includes('md:gap-5 max-h-[calc(100dvh-1.5rem)]"') &&
  loader.includes('min-h-0 flex-1 rounded-xl') &&
  !loader.includes('max-h-[46dvh]')
)
check('loader: explore controls stay usable on touch screens',
  loader.includes('min-h-10 items-center rounded-full border px-3 py-2') &&
  loader.includes('inline-flex h-9 w-9 shrink-0 items-center justify-center') &&
  loader.includes("phase === 'explore' ? 'hidden sm:flex' : 'flex'")
)

// --- Touch comfort and measured spacing -------------------------------------
check('touch: upper mobile nav links are 44px and readable', navScroller.includes('min-h-11 shrink-0 whitespace-nowrap') && navScroller.includes('text-[11px] font-semibold'))
check('touch: theme toggle is a 44px target', themeToggle.includes('buttonSize   = 44'))
check('touch: library sign-in tabs, fields and submit are 44px', library.includes('min-h-11 flex-1 rounded-lg') && library.includes('mt-1 min-h-11 w-full rounded-lg') && library.includes('mt-4 min-h-11 w-full rounded-lg'))
check('touch: library secondary actions carry padded hit areas', library.includes('-mx-2 mt-4 inline-flex min-h-11 items-center px-2') && library.includes('-mx-2 inline-flex min-h-11 items-center gap-1.5 px-2'))
check('spacing: library helper copy is readable, not microcopy', library.includes('max-w-[38ch] text-[11px] leading-relaxed') && !library.includes('mt-4 text-[10px] leading-relaxed'))
check('touch: settings sign-in link has a real hit area', settings.includes('-mr-2 ml-auto inline-flex min-h-11 items-center px-2'))
check('spacing: catalogue breathes above the rail and footer', products.includes('flex min-h-[100svh] flex-col pb-12 pt-12 md:pb-16 md:pt-14'))
check('spacing: contributor content opens with a measured gap', contributor.includes('wrap space-y-14 pb-24 pt-14 md:space-y-16 md:pt-16'))
check('touch: gateway filters and search are 44px high', loader.includes('inline-flex min-h-11 items-center justify-center rounded-full border px-3 py-1.5 text-[10px] font-mono') && loader.includes('min-h-11 w-full rounded-full border border-white/[0.08]'))
check('contrast: gateway guidance and filter labels are not faint microcopy', loader.includes('text-white/60 font-mono text-center max-w-[28ch]') && loader.includes('text-white/60 hover:border-white/20 hover:text-white'))
check('touch: store data chip is 44px on phones and visible on focus', products.includes('inline-flex min-h-11 items-center gap-1.5 rounded-full border') && products.includes('focus-visible:opacity-100 sm:min-h-9'))
check('a11y: outline-none utilities restore a concrete focus ring', css.includes('outline: 2px solid #22d3ee') && css.includes('.focus\\:outline-none:focus {') && css.includes('box-shadow: 0 0 0 2px var(--accent-glow, #22d3ee)'))
check('admin theme toggle uses crisp icons and a labelled hit area', adminLayout.includes('Sun size={16}') && adminLayout.includes('Moon size={16}') && adminLayout.includes("aria-label={isDark ? 'Switch to light mode'"))
check('admin routes hide the public WhatsApp launcher', app.includes('const showFloatingWhatsApp = loaderDone && !isEmbedRoute && !isAdminRoute') && app.includes('{showFloatingWhatsApp && <FloatingWhatsApp />}'))

// --- Stale lazy-chunk recovery ----------------------------------------------
const { isChunkLoadError, recoverFromChunkError } = await import('../src/lib/chunkRecovery.js')
check(
  'chunk recovery: recognises Vite lazy import failures',
  isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x.test/assets/Page-a1b2.js'))
)
check(
  'chunk recovery: ignores ordinary render errors',
  !isChunkLoadError(new Error('Cannot read properties of undefined'))
)
check(
  'chunk recovery: boundary forwards errors to the app',
  boundary.includes('this.props.onError?.(error, info)') && app.includes('onError={handleRouteError}')
)
check(
  'chunk recovery: manual reload uses the bounded helper',
  app.includes('const recovered = await recoverFromChunkError()')
)

{
  const values = new Map()
  const storage = {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
  let reloads = 0
  let unregisters = 0
  let skipMessages = 0
  const registration = {
    waiting: { postMessage: () => { skipMessages++ } },
    unregister: async () => { unregisters++ },
  }
  const options = {
    storage,
    isOnline: () => true,
    reload: () => { reloads++ },
    getRegistration: async () => registration,
    clearCaches: async () => 1,
    now: () => 1000,
  }

  const first = await recoverFromChunkError(options)
  check(
    'chunk recovery: first failure clears caches and reloads once',
    first === true && reloads === 1 && skipMessages === 1 && unregisters === 0
  )
  const second = await recoverFromChunkError(options)
  check(
    'chunk recovery: second failure unregisters the stale worker',
    second === true && reloads === 2 && unregisters === 1
  )
  const third = await recoverFromChunkError(options)
  check('chunk recovery: stops after two attempts', third === false && reloads === 2)
  const offline = await recoverFromChunkError({ ...options, isOnline: () => false })
  check('chunk recovery: offline never reloads', offline === false && reloads === 2)
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
