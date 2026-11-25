// Guards the server-rendered link previews that social apps and chat clients read.
// Run: npm run test:product-preview
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { buildDocumentHead } from '../src/lib/documentHead.js'

const require = createRequire(import.meta.url)
const sharp = require('sharp')
const preview = require('../api/_lib/product-preview.js')

const read = (file) => fs.readFileSync(file, 'utf8')
const html = read('index.html')
const detail = read('src/components/offerings/ProductDetail.jsx')
const vercel = JSON.parse(read('vercel.json'))
const imageHandler = read('api/_lib/og-image-handler.js')
const previewHandler = read('api/_lib/product-preview-handler.js')
const license = read('api/license.js')

let passed = 0
let failed = 0

function check(name, condition) {
  if (condition) {
    passed++
    console.log(`ok    ${name}`)
  } else {
    failed++
    console.log(`FAIL  ${name}`)
  }
}

const product = {
  slug: 'aurora-kit',
  title: 'Aurora Kit',
  short_description: 'A production-ready starter with billing and auth.',
  description: '<p>Rich copy</p>',
  cover_image_url: 'https://example.com/cover.png',
  price_paise: 199900,
  currency: 'INR',
  status: 'published',
}

const card = preview.buildPreviewHtml(product, product.slug)
const svg = preview.buildOgSvg(product, '')
const productHead = buildDocumentHead({
  title: 'Aurora Kit',
  path: '/offerings/products/aurora-kit',
  image: `${preview.SITE_ORIGIN}/api/og-product-image?slug=aurora-kit`,
  imageAlt: 'Aurora Kit product preview',
  type: 'product',
})
const metaContent = (built, attr, value, content) =>
  built.tags.some(
    ([tag, attrs]) => tag === 'meta' && attrs[attr] === value && attrs.content === content
  )

check('preview slug is normalized', preview.normalizeSlug('  Aurora Kit! ') === 'aurorakit')
check('preview HTML escapes hostile DB copy', (() => {
  const hostile = preview.buildPreviewHtml(
    { ...product, title: '<script>alert(1)</script> Kit' },
    product.slug
  )
  return !hostile.includes('<script>alert(1)</script>') && hostile.includes('&lt;script&gt;')
})())
check('preview HTML carries product-specific Open Graph tags',
  card.includes('og:title') &&
  card.includes('Aurora Kit — Digital Store | NEURAL AURORA') &&
  card.includes('og:description') &&
  card.includes('og:type" content="product"') &&
  card.includes('og:url" content="https://neural-aurora.vercel.app/offerings/products/aurora-kit"')
)
check('preview HTML advertises a valid PNG image', (() => {
  const image = `${preview.SITE_ORIGIN}/api/product-image/aurora-kit`
  return (
    card.includes(`og:image" content="${image}"`) &&
    card.includes(`og:image:secure_url" content="${image}"`) &&
    card.includes('og:image:type" content="image/png"') &&
    card.includes('og:image:width" content="1200"') &&
    card.includes('og:image:height" content="630"') &&
    card.includes('twitter:card" content="summary_large_image"') &&
    card.includes(`twitter:image" content="${image}"`)
  )
})())
check('preview HTML includes a human-readable fallback', card.includes('Open this product in NEURAL AURORA'))
check('price is formatted from paise', card.includes('₹1,999') || card.includes('1,999'))
check('OG SVG is 1200x630 and escapes dynamic copy',
  svg.includes('width="1200"') &&
  svg.includes('height="630"') &&
  svg.includes('Aurora Kit') &&
  !svg.includes('<script>')
)
check('long copy is wrapped and truncated', (() => {
  const lines = preview.wrapText('one two three four five six seven eight nine ten', 12, 2)
  return lines.length === 2 && lines[1].endsWith('…')
})())

check('SPA head also emits image dimensions and alt',
  metaContent(productHead, 'property', 'og:image:width', '1200') &&
  metaContent(productHead, 'property', 'og:image:height', '630') &&
  metaContent(productHead, 'property', 'og:site_name', 'NEURAL AURORA') &&
  metaContent(productHead, 'name', 'twitter:image:alt', 'Aurora Kit product preview')
)
check('static shell has a real Twitter image and OG dimensions',
  html.includes('name="twitter:image"') &&
  /og:image:width"[^>]*content="1200"/.test(html) &&
  /og:image:height"[^>]*content="630"/.test(html) &&
  html.includes('/og-image.png')
)
check('product detail uses the generated OG image',
  detail.includes('productOgImage') &&
  detail.includes('/api/product-image/') &&
  detail.includes('imageAlt={`${product.title} product preview`}')
)

const crawlerIndex = vercel.rewrites.findIndex((rule) =>
  String(rule.destination || '').includes('/api/license?action=product-preview&slug=:slug')
)
const catchAllIndex = vercel.rewrites.findIndex((rule) =>
  String(rule.source || '').startsWith('/((?!api')
)
check('crawler rewrite runs before the SPA catch-all', crawlerIndex >= 0 && crawlerIndex < catchAllIndex)
check('OG image has a stable public rewrite',
  vercel.rewrites.some((rule) =>
    rule.source === '/api/product-image/:slug' &&
    rule.destination === '/api/license?action=og-image&slug=:slug'
  )
)
check('both preview actions share the existing license function',
  license.includes("const productPreview = require('./_lib/product-preview-handler')") &&
  license.includes("const ogImage = require('./_lib/og-image-handler')") &&
  license.includes("case 'product-preview':") &&
  license.includes("case 'og-image':")
)
check('crawler rewrite covers social and chat bots',
  vercel.rewrites.some((rule) =>
    rule.has?.some(
      (condition) =>
        condition.type === 'header' &&
        condition.key === 'user-agent' &&
        condition.value.includes('[Ww]hatsApp') &&
        condition.value.includes('[Ff]acebookexternalhit') &&
        condition.value.includes('[Tt]elegram[Bb]ot') &&
        condition.value.includes('[Ll]inkedIn[Bb]ot')
    )
  )
)
check('shared crawler pattern matches the routing rule',
  preview.CRAWLER_UA_PATTERN.includes('[Ww]hatsApp') &&
  vercel.rewrites.some((rule) =>
    rule.has?.some((condition) => condition.value === preview.CRAWLER_UA_PATTERN)
  )
)

check('product preview endpoint is cacheable HTML',
  previewHandler.includes('text/html; charset=utf-8') &&
  previewHandler.includes('s-maxage=3600') &&
  previewHandler.includes('buildPreviewHtml')
)
check('OG image endpoint renders PNG with sharp',
  imageHandler.includes("require('sharp')") &&
  imageHandler.includes("res.setHeader('Content-Type', 'image/png')") &&
  imageHandler.includes('buildOgSvg') &&
  imageHandler.includes('s-maxage=3600')
)

const imageMetadata = await sharp('public/og-image.png').metadata()
check('fallback OG image exists at 1200x630',
  imageMetadata.width === 1200 &&
  imageMetadata.height === 630 &&
  imageMetadata.format === 'png'
)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
