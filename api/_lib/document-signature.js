// ---------------------------------------------------------------------------
// Server-side signature loading for licence PDFs.
//
// The admin UI stores only a public image URL plus display text. This module
// re-validates that value before the server fetches the image, so a tampered
// settings row cannot turn the PDF generator into an SSRF client or make it
// embed an unsupported or oversized file.
// ---------------------------------------------------------------------------

const { logError } = require('./diag')

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024
const FETCH_TIMEOUT_MS = 5000
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg'])
const ALLOWED_PATH_PREFIX = '/storage/v1/object/public/portfolio-images/'

function clean(value, max) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

/** Keep only the four documented, non-secret fields. */
function normaliseDocumentSignature(value) {
  const raw = value && typeof value === 'object' ? value : {}
  return {
    enabled: raw.enabled === true,
    url: clean(raw.url, 600),
    name: clean(raw.name, 80),
    title: clean(raw.title, 80),
  }
}

/** Optional environment base used to constrain the image host/protocol. */
function supabaseBaseUrl() {
  try {
    const value = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
    return value ? new URL(value) : null
  } catch {
    return null
  }
}

/**
 * Accept only a public portfolio-images object on the configured Supabase
 * origin. No query strings, fragments, private buckets or foreign hosts.
 */
function isAllowedSignatureUrl(value) {
  const url = clean(value, 600)
  if (!url) return false

  let candidate
  try {
    candidate = new URL(url)
  } catch {
    return false
  }

  const base = supabaseBaseUrl()
  if (!base) return false
  if (candidate.protocol !== base.protocol || candidate.host !== base.host) return false
  if (candidate.search || candidate.hash) return false
  return candidate.pathname.startsWith(ALLOWED_PATH_PREFIX) && candidate.pathname.length > ALLOWED_PATH_PREFIX.length
}

/** Cheap content sniffing before handing bytes to PDFKit. */
function hasAllowedImageMagic(buffer, mime) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || [])
  if (mime === 'image/png') {
    return (
      bytes.length >= 24 &&
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) &&
      bytes.subarray(12, 16).toString('ascii') === 'IHDR'
    )
  }
  if (mime === 'image/jpeg') {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff &&
      bytes[bytes.length - 2] === 0xff &&
      bytes[bytes.length - 1] === 0xd9
    )
  }
  return false
}

/**
 * Fetch the configured signature image. Returns `null` on ANY problem: the
 * signature is decorative, so a bad admin value must never block a licence
 * download.
 */
async function fetchSignatureImage(value, requestId, fetchImpl = globalThis.fetch) {
  const signature = normaliseDocumentSignature(value)
  if (!signature.enabled || !signature.url || !isAllowedSignatureUrl(signature.url)) return null
  if (typeof fetchImpl !== 'function') return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetchImpl(signature.url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'image/png,image/jpeg' },
    })
    if (!response?.ok) {
      logError('document-signature', requestId, { stage: 'fetch-rejected', status: response?.status })
      return null
    }

    const mime = String(response.headers?.get?.('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase()
    if (!ALLOWED_MIME.has(mime)) {
      logError('document-signature', requestId, { stage: 'mime-rejected' })
      return null
    }

    const declaredLength = Number(response.headers?.get?.('content-length') || 0)
    if (declaredLength > MAX_SIGNATURE_BYTES) {
      logError('document-signature', requestId, { stage: 'size-rejected' })
      return null
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > MAX_SIGNATURE_BYTES || !hasAllowedImageMagic(buffer, mime)) {
      logError('document-signature', requestId, { stage: 'content-rejected' })
      return null
    }

    return { buffer, mime, name: signature.name, title: signature.title }
  } catch (err) {
    logError('document-signature', requestId, { stage: 'fetch-failed', message: err?.message })
    return null
  } finally {
    clearTimeout(timer)
  }
}

module.exports = {
  MAX_SIGNATURE_BYTES,
  ALLOWED_MIME,
  ALLOWED_PATH_PREFIX,
  normaliseDocumentSignature,
  isAllowedSignatureUrl,
  hasAllowedImageMagic,
  fetchSignatureImage,
}
