// ---------------------------------------------------------------------------
// Public preview-media validation.
//
// Gallery URLs are public, but they still come from database rows. Only plain
// http(s) image/PDF URLs are allowed to reach a renderer. Everything else is
// reported as unsupported so a product page cannot be turned into an arbitrary
// iframe/script injection surface.
// ---------------------------------------------------------------------------

const IMAGE_EXTENSIONS = /\.(avif|gif|jpe?g|png|webp|svg)(\?.*)?$/i
const PDF_EXTENSION = /\.pdf(\?.*)?$/i

export function isSafePreviewUrl(value, kind) {
  if (typeof value !== 'string' || !value) return false
  try {
    const url = new URL(value, 'https://preview.invalid')
    if (!['http:', 'https:'].includes(url.protocol)) return false
    return kind === 'pdf' ? PDF_EXTENSION.test(url.pathname) : IMAGE_EXTENSIONS.test(url.pathname)
  } catch {
    return false
  }
}

/** Split raw gallery URLs into known image, PDF and unsupported buckets. */
export function splitPreviewMedia(urls = []) {
  const images = []
  const pdfs = []
  const unsupported = []
  for (const url of Array.isArray(urls) ? urls : []) {
    if (!url) continue
    if (isSafePreviewUrl(url, 'image')) images.push(url)
    else if (isSafePreviewUrl(url, 'pdf')) pdfs.push(url)
    else unsupported.push(url)
  }
  return { images, pdfs, unsupported }
}
