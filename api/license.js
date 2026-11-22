// One Vercel function serves both licence routes so the Hobby plan stays
// within its 12-function limit. Public URLs are unchanged by rewrites in
// vercel.json:
//   /api/license-verify   -> /api/license?action=verify
//   /api/license-document -> /api/license?action=document

const verifyLicense = require('./_lib/license-verify-handler')
const licenseDocument = require('./_lib/license-document-handler')

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
    default:
      return res.status(404).json({ error: 'Not found' })
  }
}
