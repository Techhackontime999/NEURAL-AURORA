// Generates the 1200x630 PNG advertised by og:image. Product cover art is
// composited when available; otherwise the card still has a branded design.
// PNG is used deliberately — chat clients support it far more reliably than SVG.

const sharp = require('sharp')
const {
  SITE_NAME,
  normalizeSlug,
  absoluteImageUrl,
  getPublishedProduct,
  buildOgSvg,
} = require('./product-preview')

const CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400'
const COVER_TIMEOUT_MS = 6000

async function coverDataUrl(source) {
  const url = absoluteImageUrl(source)
  if (!url) return ''

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), COVER_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': `${SITE_NAME} OG Image Generator` },
    })
    if (!response.ok) return ''
    if (!(response.headers.get('content-type') || '').startsWith('image/')) return ''

    const buffer = Buffer.from(await response.arrayBuffer())
    if (!buffer.length || buffer.length > 6 * 1024 * 1024) return ''

    const cropped = await sharp(buffer)
      .resize(360, 360, { fit: 'cover', position: 'attention' })
      .png()
      .toBuffer()

    return `data:image/png;base64,${cropped.toString('base64')}`
  } catch {
    return ''
  } finally {
    clearTimeout(timer)
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const slug = normalizeSlug(req.query?.slug)
  let product = null

  try {
    if (slug) product = await getPublishedProduct(slug)
  } catch (error) {
    console.error('[og-image] lookup failed', error?.message || error)
  }

  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', CACHE_CONTROL)
  res.setHeader('X-Content-Type-Options', 'nosniff')

  if (req.method === 'HEAD') {
    return res.status(200).end()
  }

  try {
    const cover = product ? await coverDataUrl(product.cover_image_url) : ''
    const png = await sharp(Buffer.from(buildOgSvg(product, cover)))
      .png({ compressionLevel: 9 })
      .toBuffer()

    res.setHeader('Content-Length', String(png.length))
    return res.status(200).send(png)
  } catch (error) {
    console.error('[og-image] render failed', error?.message || error)
    const fallback = await sharp(Buffer.from(buildOgSvg(null, ''))).png().toBuffer()
    res.setHeader('Content-Length', String(fallback.length))
    return res.status(200).send(fallback)
  }
}
