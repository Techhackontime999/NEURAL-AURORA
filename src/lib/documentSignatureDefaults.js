// ---------------------------------------------------------------------------
// Shared shape for the admin-managed document signature.
//
// The value lives in `admin_settings.document_signature` and is exposed in the
// public allowlist view. It contains only display data: an image URL plus the
// signer's name and title. Never put secrets in this document.
// ---------------------------------------------------------------------------

export const DEFAULT_DOCUMENT_SIGNATURE = {
  enabled: false,
  url: '',
  name: '',
  title: '',
}

const LIMITS = { url: 600, name: 80, title: 80 }

function clean(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

/** Normalise any stored/edited value into the four known fields. */
export function mergeDocumentSignature(value) {
  const raw = value && typeof value === 'object' ? value : {}
  return {
    enabled: raw.enabled === true,
    url: clean(raw.url, LIMITS.url),
    name: clean(raw.name, LIMITS.name),
    title: clean(raw.title, LIMITS.title),
  }
}

/** True only when there is enough data to show the signature. */
export function hasVisibleSignature(value) {
  const signature = mergeDocumentSignature(value)
  return signature.enabled && Boolean(signature.url)
}
