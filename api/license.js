// One Vercel function serves multiple licence/contributor routes so the Hobby
// plan stays within its 12-function limit. Public URLs are unchanged by
// rewrites in vercel.json:
//   /api/license-verify   -> /api/license?action=verify
//   /api/license-document -> /api/license?action=document
//   /api/order-receipt    -> /api/license?action=receipt
//   /api/product-image/:slug -> /api/license?action=og-image&slug=:slug
//   /sitemap.xml             -> /api/license?action=sitemap
// Crawler rewrite on product URLs -> /api/license?action=product-preview&slug=:slug
// Contributor endpoints (authenticated):
//   /api/license?action=contributor-apply
//   /api/license?action=my-contributor-applications

const verifyLicense = require('./_lib/license-verify-handler')
const licenseDocument = require('./_lib/license-document-handler')
const orderReceipt = require('./_lib/order-receipt-handler')
const productPreview = require('./_lib/product-preview-handler')
const ogImage = require('./_lib/og-image-handler')
const sitemap = require('./_lib/sitemap-handler')
const { submitApplication, listMyApplications } = require('./_lib/contributor-application-handler')

function requestedAction(req) {
  const direct = String(req.query?.action || '').trim().toLowerCase()
  if (direct) return direct

  const url = String(req.url || '')
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : ''
  return String(new URLSearchParams(query).get('action') || '').trim().toLowerCase()
}

module.exports = async function handler(req, res) {
  switch (requestedAction(req)) {
    case 'verify':
      return verifyLicense(req, res)
    case 'document':
      return licenseDocument(req, res)
    case 'receipt':
      return orderReceipt(req, res)
    case 'product-preview':
      return productPreview(req, res)
    case 'og-image':
      return ogImage(req, res)
    case 'sitemap':
      return sitemap(req, res)
    case 'contributor-apply':
      return submitApplication(req, res)
    case 'my-contributor-applications':
      return listMyApplications(req, res)
    default:
      return res.status(404).json({ error: 'Not found' })
  }
}
