// Guards for route-level head metadata and product structured data.
// Run: npm run test:document-head
import fs from 'node:fs'
import {
  buildDocumentHead,
  SITE_ORIGIN,
  toAbsoluteUrl,
  toPlainText,
} from '../src/lib/documentHead.js'

const read = (file) => fs.readFileSync(file, 'utf8')
const html = read('index.html')
const app = read('src/App.jsx')
const detail = read('src/components/offerings/ProductDetail.jsx')
const manager = read('src/lib/documentHead.js')

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

const home = buildDocumentHead({ path: '/' })
const product = buildDocumentHead({
  title: 'Aurora Kit — Digital Store | NEURAL AURORA',
  description: 'A practical <b>kit</b> & guide.',
  path: '/offerings/products/aurora-kit',
  image: '/images/aurora-kit.jpg',
  type: 'product',
  jsonLd: { '@context': 'https://schema.org', '@type': 'Product', name: 'Aurora Kit' },
})
const privatePage = buildDocumentHead({ path: '/library', robots: 'noindex, nofollow' })

const meta = (built, attr, value) =>
  built.tags.some(([tag, attrs]) => tag === 'meta' && attrs[attr] === value)

check('head: default canonical is the site origin', home.canonical === `${SITE_ORIGIN}/`)
check('head: canonical follows the route path', product.canonical === `${SITE_ORIGIN}/offerings/products/aurora-kit`)
check('head: description is plain text', product.description === 'A practical kit & guide.')
check('head: plain-text helper strips markup', toPlainText('<p>One <em>two</em></p>') === 'One two')
check('head: relative images become absolute', product.image === `${SITE_ORIGIN}/images/aurora-kit.jpg`)
check('head: data URLs are never emitted as product images', toAbsoluteUrl('data:image/svg+xml;utf8,<svg/>') === '')
check('head: social tags are managed', meta(product, 'property', 'og:title') && meta(product, 'name', 'twitter:card'))
check('head: canonical link is managed', product.tags.some(([tag, attrs]) => tag === 'link' && attrs.rel === 'canonical'))
check(
  'head: Open Graph type follows the page',
  product.tags.some(([tag, attrs]) => tag === 'meta' && attrs.property === 'og:type' && attrs.content === 'product')
)
check(
  'head: private routes are not indexable',
  privatePage.tags.some(([tag, attrs]) => tag === 'meta' && attrs.name === 'robots' && attrs.content === 'noindex, nofollow')
)
check('head: JSON-LD is carried through', product.jsonLd?.['@type'] === 'Product')
check('head: stale managed tags are removed', manager.includes("querySelectorAll('[data-na-head]')"))

check('shell: static head tags are marked as managed', (html.match(/data-na-head="static"/g) || []).length >= 10)
check('app: a route head manager is mounted', app.includes('<RouteHead />') && app.includes('function RouteHead()'))
check('app: product detail is excluded from static head', app.includes("pathname.startsWith('/offerings/products/')"))
check('app: private routes are noindex', app.includes("const PRIVATE_ROBOTS = 'noindex, nofollow'"))

check('product: Product JSON-LD is emitted', detail.includes("'@type': 'Product'") && detail.includes('priceCurrency'))
check('product: JSON-LD has availability and canonical URL', detail.includes('availability') && detail.includes('productUrl'))
check('product: no fake ratings are invented', !detail.includes('aggregateRating') && !detail.includes('reviewCount'))
check('product: head path uses the live slug', detail.includes('path={`/offerings/products/${product.slug}`}'))
check('product: DocumentHead is rendered on detail', detail.includes('<DocumentHead') && detail.includes('jsonLd={productJsonLd}'))
check(
  'product: loading and not-found states are noindex',
  (detail.match(/robots="noindex, nofollow"/g) || []).length >= 2
)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
