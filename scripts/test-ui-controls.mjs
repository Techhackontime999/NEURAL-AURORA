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
const en = JSON.parse(read('src/locales/en.json'))
const videoDefaults = read('src/lib/videoHeroDefaults.js')

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

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
