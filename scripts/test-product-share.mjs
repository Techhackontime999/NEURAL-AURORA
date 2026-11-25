// Guards the product share experience across cards, detail pages and socials.
// Run: npm run test:product-share
import fs from 'node:fs'
import {
  nativeSharePayload,
  normaliseAffiliateCode,
  productEmbedSnippet,
  productEmbedUrl,
  productShareLinks,
  productShareUrl,
} from '../src/lib/productShare.js'

const read = (file) => fs.readFileSync(file, 'utf8')
const app = read('src/App.jsx')
const card = read('src/components/offerings/ProductCard.jsx')
const detail = read('src/components/offerings/ProductDetail.jsx')
const embed = read('src/components/offerings/ProductEmbed.jsx')
const menu = read('src/components/offerings/ShareMenu.jsx')
const partner = read('src/components/partner/PartnerPortal.jsx')
const toast = read('src/context/ToastContext.jsx')
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

check('personal embed has no referral code',
  productEmbedUrl('nextjs-starter') === 'https://neural-aurora.vercel.app/embed/products/nextjs-starter')
check('partner embed carries a normalised code',
  productEmbedUrl('nextjs-starter', 'partner-12') === 'https://neural-aurora.vercel.app/embed/products/nextjs-starter?aff=PARTNER-12' &&
  normaliseAffiliateCode(' bad code! ') === '')
check('embed snippet is copy-pasteable and safe', (() => {
  const snippet = productEmbedSnippet({
    slug: 'nextjs-starter',
    title: 'Next.js Starter',
    affiliateCode: 'PARTNER-12',
  })
  return snippet.startsWith('<iframe src="https://neural-aurora.vercel.app/embed/products/nextjs-starter?aff=PARTNER-12"') &&
    snippet.includes('title="Next.js Starter — NEURAL AURORA"') &&
    snippet.includes('loading="lazy"') &&
    snippet.includes('referrerpolicy="strict-origin-when-cross-origin"') &&
    !snippet.includes('<script')
})())
check('hostile embed input cannot inject markup', (() => {
  const snippet = productEmbedSnippet({
    slug: 'nextjs-starter',
    title: '"><script>alert(1)</script>',
    affiliateCode: 'BAD CODE!',
  })
  return !snippet.includes('<script>') && snippet.includes('&lt;script&gt;') && !snippet.includes('?aff=')
})())

check('share menu covers personal channels', ['x', 'linkedin', 'facebook', 'whatsapp', 'telegram', 'email'].every((id) =>
  links.some((link) => link.id === id)
))
check('channel labels are compact for a share sheet', links.every((link) =>
  link.labelKey.startsWith('store.channel')
))
check('every channel link carries the product URL', links.every((link) =>
  link.href.includes(encodeURIComponent(url)) || link.href.includes(url)
))
check('external channel links use a safe opener', links.filter((link) => link.external).every((link) =>
  link.href.startsWith('https://')
) && menu.includes('noopener noreferrer'))
check('email share uses a mailto link', links.find((link) => link.id === 'email')?.href.startsWith('mailto:'))

check('every catalogue card exposes the share control with a preview image',
  card.includes('<ShareMenu') &&
  card.includes('slug={product.slug}') &&
  card.includes('image={cover}'))
check('product detail exposes the share control with a preview image',
  detail.includes('<ShareMenu') &&
  detail.includes('slug={product.slug}') &&
  detail.includes('image={productImage}'))

check('share menu renders a product link preview',
  menu.includes('previewImage') &&
  menu.includes('shareLinkLabel') &&
  menu.includes('sharePreviewHint') &&
  menu.includes('line-clamp-2'))
check('share menu has a selectable canonical link field',
  menu.includes('readOnly') &&
  menu.includes('event.target.select()') &&
  menu.includes('data-share-initial-focus'))
check('share menu supports native sharing and clipboard fallback',
  menu.includes('navigator.share') &&
  menu.includes('navigator.clipboard') &&
  menu.includes("execCommand('copy')"))
check('share menu uses a dialog with focus trapping',
  menu.includes('aria-haspopup="dialog"') &&
  menu.includes('aria-expanded={open}') &&
  menu.includes('role="dialog"') &&
  menu.includes("event.key !== 'Tab'") &&
  menu.includes('first.focus()') &&
  menu.includes('last.focus()'))
check('share menu closes on Escape and outside interaction',
  menu.includes("event.key === 'Escape'") &&
  menu.includes('pointerdown') &&
  menu.includes('resize') &&
  menu.includes('scroll'))
check('mobile users get a bottom sheet with safe-area padding',
  menu.includes('MOBILE_QUERY') &&
  menu.includes('max-h-[88svh]') &&
  menu.includes('env(safe-area-inset-bottom)'))
check('background blur is rendered above the neural aurora overlay',
  menu.includes('data-share-scrim') &&
  menu.includes('z-[200001]') &&
  menu.includes('z-[200002]') &&
  menu.includes('backdrop-blur-[6px]') &&
  menu.includes('backdrop-blur-[10px]') &&
  menu.includes('glass-panel-strong') &&
  menu.includes('aria-modal="true"') &&
  menu.includes("body.style.overflow = 'hidden'"))
check('share toasts also render above the aurora overlay',
  toast.includes('z-[200003]') && toast.includes('z-[200004]'))
check('share menu animates and respects reduced motion',
  menu.includes('AnimatePresence') &&
  menu.includes('motion.div') &&
  menu.includes('useReducedMotion'))
check('share copy has accessible feedback', menu.includes('shareCopied') && menu.includes('shareCopyFailed'))
check('share sheet offers personal and partner embeds',
  menu.includes('shareEmbedTitle') &&
  menu.includes('shareEmbedPersonal') &&
  menu.includes('shareEmbedPartner') &&
  menu.includes('productEmbedSnippet') &&
  menu.includes('normaliseAffiliateCode') &&
  menu.includes('shareEmbedPartnerSteps') &&
  menu.includes('to="/partner"') &&
  menu.includes('textarea:not([disabled])'))
check('embed route is chrome-free and carries the referral forward',
  app.includes("path=\"/embed/products/:slug\"") &&
  app.includes('isEmbedRoute') &&
  embed.includes('getProductBySlug') &&
  embed.includes('applyAffiliateCode(referral)') &&
  embed.includes('AFFILIATE_QUERY_KEY') &&
  embed.includes('target="_blank"'))
check('partner dashboard copies embeds with its own code',
  partner.includes('getPublishedProducts') &&
  partner.includes('productEmbedSnippet') &&
  partner.includes('affiliateCode: affiliate.code') &&
  partner.includes('store.affiliateEmbedCopied'))
check('English share copy exists', [
  'shareProduct',
  'shareCopyLink',
  'shareCopiedShort',
  'shareCopied',
  'shareCopyFailed',
  'shareFailed',
  'shareWithDevice',
  'shareLinkLabel',
  'sharePreviewHint',
  'shareChannels',
  'shareHint',
  'shareEmbedTitle',
  'shareEmbedPersonal',
  'shareEmbedPartner',
  'shareEmbedCode',
  'shareEmbedCodePlaceholder',
  'shareEmbedPartnerSteps',
  'shareEmbedOpenDashboard',
  'shareEmbedCodeHint',
  'shareEmbedPersonalHint',
  'shareEmbedPartnerHint',
  'shareEmbedLabel',
  'shareEmbedCopy',
  'shareEmbedCopied',
  'embedViewProduct',
  'embedPowered',
  'embedReferred',
  'embedLoading',
  'embedUnavailable',
  'embedLoadFailed',
  'affiliateEmbedTitle',
  'affiliateEmbedSubtitle',
  'affiliateEmbedCopied',
  'affiliateEmbedEmpty',
  'channelX',
  'channelLinkedIn',
  'channelFacebook',
  'channelWhatsApp',
  'channelTelegram',
  'channelEmail',
].every((key) => typeof en.store[key] === 'string' && en.store[key].length > 0))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
