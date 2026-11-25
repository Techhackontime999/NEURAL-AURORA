// Server-rendered product card for social and messaging crawlers. The SPA
// shell is rewritten here only for known preview bots (see vercel.json), so
// WhatsApp/Telegram/X/LinkedIn receive real Open Graph tags in the raw HTML.

const {
  normalizeSlug,
  getPublishedProduct,
  buildPreviewHtml,
} = require('./product-preview')

const CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400'

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
    console.error('[product-preview] lookup failed', error?.message || error)
    product = null
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', CACHE_CONTROL)
  res.setHeader('Vercel-CDN-Cache-Control', CACHE_CONTROL)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  return res.status(slug && !product ? 404 : 200).send(buildPreviewHtml(product, slug))
}
