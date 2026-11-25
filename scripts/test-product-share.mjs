// Guards the product share experience across cards, detail pages and socials.
// Run: npm run test:product-share
import fs from 'node:fs'
import {
  nativeSharePayload,
  productShareLinks,
  productShareUrl,
} from '../src/lib/productShare.js'

const read = (file) => fs.readFileSync(file, 'utf8')
const card = read('src/components/offerings/ProductCard.jsx')
const detail = read('src/components/offerings/ProductDetail.jsx')
const menu = read('src/components/offerings/ShareMenu.jsx')
const en = JSON.parse(read('src/locales/en.json'))

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

const url = productShareUrl('nextjs-starter')
const links = productShareLinks({
  slug: 'nextjs-starter',
  title: 'Next.js Starter',
  description: 'A production-ready starter.',
})

check('share URL is canonical and public', url === 'https://neural-aurora.vercel.app/offerings/products/nextjs-starter')
check('share URL does not carry session or referral noise', !url.includes('?') && !url.includes('#'))
check('native share payload carries title, text and URL', (() => {
  const payload = nativeSharePayload({ slug: 'nextjs-starter', title: 'Next.js Starter' })
  return payload.url === url && payload.title.includes('Next.js Starter') && Boolean(payload.text)
})())

check('share menu covers personal channels', ['x', 'linkedin', 'facebook', 'whatsapp', 'telegram', 'email'].every((id) =>
  links.some((link) => link.id === id)
))
check('every channel link carries the product URL', links.every((link) =>
  link.href.includes(encodeURIComponent(url)) || link.href.includes(url)
))
check('external channel links use a safe opener', links.filter((link) => link.external).every((link) =>
  link.href.startsWith('https://')
) && menu.includes('noopener noreferrer'))
check('email share uses a mailto link', links.find((link) => link.id === 'email')?.href.startsWith('mailto:'))

check('every catalogue card exposes the share control', card.includes('<ShareMenu') && card.includes('slug={product.slug}'))
check('product detail exposes the share control', detail.includes('<ShareMenu') && detail.includes('slug={product.slug}'))
check('share menu supports native sharing and clipboard fallback',
  menu.includes('navigator.share') &&
  menu.includes('navigator.clipboard') &&
  menu.includes("execCommand('copy')"))
check('share menu is keyboard accessible',
  menu.includes('aria-haspopup="menu"') &&
  menu.includes('aria-expanded={open}') &&
  menu.includes('role="menu"') &&
  menu.includes("event.key !== 'Escape'"))
check('share menu closes on outside interaction', menu.includes('pointerdown') && menu.includes('resize') && menu.includes('scroll'))
check('share copy has accessible feedback', menu.includes('shareCopied') && menu.includes('shareCopyFailed'))
check('English share copy exists', [
  'shareProduct',
  'shareCopyLink',
  'shareCopied',
  'shareCopyFailed',
  'shareFailed',
  'shareWithDevice',
  'shareOnX',
  'shareOnLinkedIn',
  'shareOnFacebook',
  'shareOnWhatsApp',
  'shareOnTelegram',
  'shareByEmail',
].every((key) => typeof en.store[key] === 'string' && en.store[key].length > 0))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
