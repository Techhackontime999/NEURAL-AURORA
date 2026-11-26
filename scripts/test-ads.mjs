// Guards monetization configuration, placement UI and the dynamic sitemap.
// Run: npm run test:ads
import fs from 'node:fs'
import { createRequire } from 'node:module'
import {
  AD_PROVIDERS,
  AD_SLOTS,
  getAdSenseClient,
  getAdSenseSlot,
  isAdSenseEnabled,
  sanitizeAdClient,
  sanitizeAdSlot,
} from '../src/lib/adsConfig.js'

const require = createRequire(import.meta.url)
const sitemapHandler = require('../api/_lib/sitemap-handler.js')

const read = (file) => fs.readFileSync(file, 'utf8')
const ads = read('src/lib/ads.js')
const slot = read('src/components/ads/AdSlot.jsx')
const admin = read('src/components/admin/AdminAdPlacements.jsx')
const layout = read('src/components/admin/AdminLayout.jsx')
const dashboard = read('src/components/admin/AdminDashboard.jsx')
const video = read('src/components/ui/AdVideoPlayer.jsx')
const css = read('src/index.css')
const schema = read('supabase-schema.sql')
const vercel = JSON.parse(read('vercel.json'))
const robots = read('public/robots.txt')
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

check('ads: publisher client accepts only the real AdSense shape',
  sanitizeAdClient(' ca-pub-1234567890123456 ') === 'ca-pub-1234567890123456' &&
  sanitizeAdClient('javascript:alert(1)') === '')
check('ads: slot ids are numeric only',
  sanitizeAdSlot(' 1234567890 ') === '1234567890' && sanitizeAdSlot('auto') === '')
check('ads: a usable fallback client keeps existing deployments working',
  /^ca-pub-\d{8,}$/.test(getAdSenseClient()) && isAdSenseEnabled())
check('ads: unset slot means responsive auto ads', getAdSenseSlot('blog_listing') === '')
check('ads: all six premium slots are declared',
  Object.keys(AD_SLOTS).length === 6 &&
  ['blog_listing', 'article_footer', 'store_listing', 'product_detail', 'search_results', 'offerings']
    .every((key) => Boolean(AD_SLOTS[key])))
check('ads: sponsor, affiliate and custom streams are supported',
  ['adsense', 'sponsor', 'affiliate', 'custom'].every((key) => Boolean(AD_PROVIDERS[key])))

check('ads: env fallback activates before any table exists',
  ads.includes('getAdSenseClient') && ads.includes('envFallbackPlacements') && ads.includes('getPublicAdPlacements'))
check('ads: env vars use the unprefixed ADSENSE_ names', (() => {
  const config = read('src/lib/adsConfig.js')
  const example = read('.env.example')
  const viteConfig = read('vite.config.js')
  return config.includes('env.ADSENSE_CLIENT') &&
    config.includes('ADSENSE_SLOT_') &&
    config.includes("env.ADSENSE_ENABLED") &&
    viteConfig.includes("envPrefix: ['VITE_', 'ADSENSE_']") &&
    example.includes('ADSENSE_CLIENT=ca-pub-') &&
    !config.includes('VITE_ADSENSE') && !example.includes('VITE_ADSENSE') && !viteConfig.includes('VITE_ADSENSE')
})())
check('ads: session frequency caps protect the experience',
  ads.includes('MAX_TOTAL_PER_SESSION') && ads.includes('sessionStorage'))
check('ads: impressions and clicks are tracked without blocking',
  ads.includes('markAdImpression') && ads.includes('markAdClick') && ads.includes('record_ad_event'))
check('ads: only visible units count as impressions', slot.includes('IntersectionObserver'))
check('ads: unfilled units collapse instead of leaving blank boxes',
  css.includes("ins.adsbygoogle[data-ad-status='unfilled']") && css.includes("aside:has(> ins.adsbygoogle[data-ad-status='unfilled'])"))
check('ads: every unit is labelled for readers', slot.includes('aria-label={label}'))
check('ads: external links are rel=sponsored', slot.includes("'sponsored noopener noreferrer'"))

const slots = {
  'src/components/Blog.jsx': 'blog_listing',
  'src/components/BlogPost.jsx': 'article_footer',
  'src/components/CaseStudyDetail.jsx': 'article_footer',
  'src/components/offerings/Products.jsx': 'store_listing',
  'src/components/offerings/ProductDetail.jsx': 'product_detail',
  'src/components/search/SearchPage.jsx': 'search_results',
  'src/components/Service.jsx': 'offerings',
  'src/components/ServiceDetail.jsx': 'offerings',
}
for (const [file, expected] of Object.entries(slots)) {
  check(`placement: ${file.split('/').pop()} uses ${expected}`,
    read(file).includes(`slot="${expected}"`))
}

check('admin: placements can be created, edited and deleted',
  admin.includes('addAdPlacement') && admin.includes('updateAdPlacement') && admin.includes('deleteAdPlacement') &&
  admin.includes('handleCreate') && admin.includes('handleSave') && admin.includes('handleDelete'))
check('admin: placements are reachable from the console',
  layout.includes('/admin/ad-placements') && dashboard.includes('ad-placements'))
check('ads: gateway player reuses the central client config',
  video.includes('getAdSenseClient') && video.includes('loadAdSenseScript'))

check('database: ad_placements table and event RPC exist',
  schema.includes('CREATE TABLE IF NOT EXISTS ad_placements') && schema.includes('record_ad_event'))
check('database: event RPC pins its search path', (() => {
  const start = schema.indexOf('CREATE OR REPLACE FUNCTION record_ad_event')
  const block = start === -1 ? '' : schema.slice(start, start + 900)
  return block.includes('LANGUAGE plpgsql SECURITY DEFINER SET search_path = public')
})())

check('seo: /sitemap.xml is rewritten to the shared function',
  vercel.rewrites.some((rule) => rule.source === '/sitemap.xml' && rule.destination === '/api/license?action=sitemap'))
check('seo: catch-all rewrite remains last',
  vercel.rewrites[vercel.rewrites.length - 1].destination === '/index.html')
check('seo: robots still advertises the sitemap', robots.includes('Sitemap: https://neural-aurora.vercel.app/sitemap.xml'))
check('seo: shared API dispatches the sitemap action', license.includes("case 'sitemap':"))
check('seo: stale static sitemap was removed', !fs.existsSync('public/sitemap.xml'))

const oldUrl = process.env.SUPABASE_URL
const oldViteUrl = process.env.VITE_SUPABASE_URL
const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY
delete process.env.SUPABASE_SERVICE_ROLE_KEY
delete process.env.SUPABASE_URL
delete process.env.VITE_SUPABASE_URL

const headers = {}
let status = 0
let xml = ''
const res = {
  setHeader(key, value) { headers[key] = value },
  status(code) { status = code; return this },
  send(body) { xml = String(body); return this },
  json(body) { xml = JSON.stringify(body); return this },
}

try {
  await sitemapHandler({ method: 'GET' }, res)
} finally {
  if (oldUrl !== undefined) process.env.SUPABASE_URL = oldUrl
  if (oldViteUrl !== undefined) process.env.VITE_SUPABASE_URL = oldViteUrl
  if (oldKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey
}

check('sitemap: handler returns XML even without a database',
  status === 200 && headers['Content-Type'] === 'application/xml; charset=utf-8')
check('sitemap: public destinations are present',
  xml.includes('<loc>https://neural-aurora.vercel.app/</loc>') &&
  xml.includes('<loc>https://neural-aurora.vercel.app/offerings/products</loc>') &&
  xml.includes('<loc>https://neural-aurora.vercel.app/blog</loc>'))
check('sitemap: private destinations are excluded',
  !xml.includes('/admin') && !xml.includes('/cart') && !xml.includes('/search'))
check('sitemap: method guard is explicit',
  typeof sitemapHandler === 'function' && read('api/_lib/sitemap-handler.js').includes("res.setHeader('Allow', 'GET, HEAD')"))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
