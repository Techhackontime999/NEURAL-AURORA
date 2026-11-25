// ---------------------------------------------------------------------------
// Product link-preview primitives.
//
// Chat apps and social networks do not execute the SPA. They fetch the raw
// HTML for a URL and read its Open Graph tags, then fetch the advertised image
// separately. These helpers produce both responses from the published product
// row, with every dynamic value escaped before it reaches HTML or SVG.
// ---------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js')

const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://neural-aurora.vercel.app').replace(/\/$/, '')
const SITE_NAME = 'NEURAL AURORA'
const OG_WIDTH = 1200
const OG_HEIGHT = 630

// Kept in sync with the `has` condition in vercel.json so preview bots get the
// server-rendered card while humans keep the SPA.
const CRAWLER_UA_PATTERN =
  '([Ff]acebookexternalhit|[Ff]acebot|[Tt]witterbot|[Ww]hatsApp|[Tt]elegram[Bb]ot|[Ll]inkedIn[Bb]ot|[Ss]lackbot|[Dd]iscordbot|[Aa]pplebot|[Gg]ooglebot|[Bb]ingbot|[Ss]kypeUriPreview|[Ii]framely|[Ee]mbedly|[Qq]uora Link Preview|[Pp]interest|[Rr]edditbot|[Vv]kShare|[Dd]uckDuckBot|[Yy]andexBot|[Bb]aiduspider)'

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const escapeXml = escapeHtml

function cleanText(value = '') {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(value, max) {
  const text = cleanText(value)
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}

function formatPrice(product) {
  const amount = Number(product?.price_paise || 0) / 100
  if (!Number.isFinite(amount) || amount <= 0) return ''
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: product?.currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`
  }
}

function productUrl(slug) {
  const clean = normalizeSlug(slug)
  return clean ? `${SITE_ORIGIN}/offerings/products/${clean}` : `${SITE_ORIGIN}/offerings/products`
}

function ogImageUrl(slug) {
  const clean = normalizeSlug(slug) || 'neural-aurora'
  return `${SITE_ORIGIN}/api/product-image/${clean}`
}

function absoluteImageUrl(value) {
  if (!value) return ''
  const str = String(value).trim()
  if (/^https:\/\//i.test(str)) return str
  if (str.startsWith('/')) return `${SITE_ORIGIN}${str}`
  return ''
}

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url === 'https://placeholder.supabase.co') return null
  return createClient(url, key, { auth: { persistSession: false } })
}

async function getPublishedProduct(slug) {
  const clean = normalizeSlug(slug)
  if (!clean) return null
  const supabase = getServiceClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('products')
    .select(
      'slug,title,short_description,description,cover_image_url,price_paise,currency,status,format,category_slug'
    )
    .eq('slug', clean)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw error
  return data || null
}

function metaTitle(product) {
  return product?.title
    ? `${truncate(product.title, 90)} — Digital Store | ${SITE_NAME}`
    : `${SITE_NAME} - Digital Store`
}

function metaDescription(product) {
  const description = truncate(
    product?.short_description || product?.description || 'First-party digital products, starters and templates.',
    135
  )
  const price = product ? formatPrice(product) : ''
  return price ? `${description} · ${price}` : description
}

function imageAlt(product) {
  return product?.title ? `${product.title} product preview` : `${SITE_NAME} digital products`
}

/** Full HTML document for crawler requests to a product URL. */
function buildPreviewHtml(product, slug) {
  const clean = normalizeSlug(slug) || normalizeSlug(product?.slug) || ''
  const canonical = productUrl(clean)
  const title = metaTitle(product)
  const description = metaDescription(product)
  const image = ogImageUrl(clean)
  const alt = imageAlt(product)
  const type = product ? 'product' : 'website'
  const price = product ? formatPrice(product) : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta name="robots" content="index, follow" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:type" content="${type}" />
<meta property="og:url" content="${escapeHtml(canonical)}" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:locale" content="en_US" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:image:secure_url" content="${escapeHtml(image)}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="${OG_WIDTH}" />
<meta property="og:image:height" content="${OG_HEIGHT}" />
<meta property="og:image:alt" content="${escapeHtml(alt)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
<meta name="twitter:image:alt" content="${escapeHtml(alt)}" />
<link rel="canonical" href="${escapeHtml(canonical)}" />
</head>
<body>
<main style="font-family:Arial,sans-serif;max-width:720px;margin:64px auto;padding:0 24px;color:#e8f4ff">
<p style="font-size:12px;letter-spacing:.2em;color:#00e5ff">${SITE_NAME} · DIGITAL STORE</p>
<h1 style="font-size:40px;line-height:1.1;margin:12px 0">${escapeHtml(product?.title || SITE_NAME)}</h1>
<p style="font-size:18px;line-height:1.6;color:#a8bdd0">${escapeHtml(description)}</p>
${price ? `<p style="font-size:22px;font-weight:700">${escapeHtml(price)}</p>` : ''}
<p><a style="color:#00e5ff" href="${escapeHtml(canonical)}">Open this product in ${SITE_NAME}</a></p>
</main>
</body>
</html>`
}

/** Wrap DB copy into SVG-safe lines without relying on a layout engine. */
function wrapText(value, maxChars, maxLines) {
  const words = cleanText(value).split(' ').filter(Boolean)
  const lines = []
  let current = ''

  for (let index = 0; index < words.length; index++) {
    const word = words[index]
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }
    if (current) lines.push(current)
    current = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word
    if (lines.length === maxLines - 1) {
      const remaining = words.slice(index + 1).join(' ')
      if (remaining) current = truncate(`${current} ${remaining}`, maxChars)
      lines.push(current)
      return lines.slice(0, maxLines)
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, maxLines)
}

function lineSpans(lines, x, dy) {
  return lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : dy}">${escapeXml(line)}</tspan>`)
    .join('')
}

/** 1200x630 social card, rendered by sharp in the image endpoint. */
function buildOgSvg(product, coverDataUrl = '') {
  const title = product?.title ? truncate(product.title, 72) : 'Neural Aurora Digital Store'
  const price = product ? formatPrice(product) || 'DIGITAL PRODUCT' : 'DIGITAL PRODUCTS'
  const titleLines = wrapText(title, 24, 3)
  const priceWidth = Math.min(520, Math.max(250, price.length * 27 + 60))
  const cover = coverDataUrl
    ? `<g clip-path="url(#coverClip)">
         <image x="86" y="86" width="428" height="428" preserveAspectRatio="xMidYMid slice" href="${coverDataUrl}" xlink:href="${coverDataUrl}" />
       </g>`
    : `<circle cx="300" cy="286" r="158" fill="none" stroke="#06b6d4" stroke-opacity="0.55" stroke-width="4" />
       <circle cx="300" cy="286" r="104" fill="none" stroke="#7c3aed" stroke-opacity="0.55" stroke-width="4" />
       <circle cx="300" cy="286" r="46" fill="#06b6d4" fill-opacity="0.14" />
       <text x="300" y="302" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700" fill="#0b1b2b">NA</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#f8fbff" />
<stop offset="1" stop-color="#eef3f9" />
</linearGradient>
<linearGradient id="aurora" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#06b6d4" />
<stop offset="1" stop-color="#7c3aed" />
</linearGradient>
<clipPath id="coverClip"><rect x="86" y="86" width="428" height="428" rx="34" /></clipPath>
</defs>
<rect width="1200" height="630" fill="url(#bg)" />
<circle cx="1130" cy="70" r="250" fill="url(#aurora)" fill-opacity="0.16" />
<circle cx="1060" cy="610" r="230" fill="#7c3aed" fill-opacity="0.08" />
<rect x="72" y="72" width="462" height="494" rx="42" fill="#dce6f2" />
<rect x="64" y="64" width="462" height="494" rx="42" fill="#ffffff" stroke="#dce6f2" stroke-width="2" />
${cover}
<rect x="86" y="532" width="154" height="8" rx="4" fill="url(#aurora)" />
<text x="86" y="566" font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="3" fill="#64748b">PRODUCT PREVIEW</text>
<rect x="590" y="112" width="8" height="56" rx="4" fill="url(#aurora)" />
<text x="618" y="136" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="700" letter-spacing="4" fill="#0b1b2b">NEURAL AURORA</text>
<text x="618" y="162" font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="3" fill="#64748b">DIGITAL STORE</text>
<text x="590" y="248" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700" fill="#0b1b2b">${lineSpans(titleLines, 590, 56)}</text>
<text x="590" y="398" font-family="Arial, Helvetica, sans-serif" font-size="20" letter-spacing="2" fill="#64748b">DIGITAL PRODUCT · INSTANT ACCESS</text>
<g>
<rect x="590" y="430" width="${priceWidth}" height="76" rx="20" fill="#0b1b2b" />
<text x="618" y="480" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="#ffffff">${escapeXml(price)}</text>
</g>
<text x="590" y="562" font-family="Arial, Helvetica, sans-serif" font-size="15" letter-spacing="2" fill="#8494a6">NEURAL-AURORA.VERCEL.APP</text>
</svg>`
}

module.exports = {
  SITE_ORIGIN,
  SITE_NAME,
  OG_WIDTH,
  OG_HEIGHT,
  CRAWLER_UA_PATTERN,
  normalizeSlug,
  escapeHtml,
  escapeXml,
  cleanText,
  truncate,
  formatPrice,
  productUrl,
  ogImageUrl,
  absoluteImageUrl,
  getServiceClient,
  getPublishedProduct,
  metaTitle,
  metaDescription,
  imageAlt,
  buildPreviewHtml,
  wrapText,
  buildOgSvg,
}
