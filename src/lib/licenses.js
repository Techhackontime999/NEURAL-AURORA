// ---------------------------------------------------------------------------
// Customer-facing license data layer.
//
// Reading `licenses` directly through Supabase is safe: RLS only returns the
// signed-in customer's own rows. Keys are shown to their owner only. Issuing,
// revoking and reissuing happen exclusively in serverless functions.
// ---------------------------------------------------------------------------

import { supabase } from './supabase'

/** Options configured by the owner for one published product. */
export async function getProductLicenseOptions(productId) {
  if (!productId) return []
  const { data, error } = await supabase
    .from('product_license_options')
    .select('id, code, label, summary, terms, display_order, is_default')
    .eq('product_id', productId)
    .order('display_order', { ascending: true })

  if (error) throw error
  return data || []
}

/** All licenses belonging to the signed-in customer, newest first. */
export async function getMyLicenses() {
  const { data, error } = await supabase
    .from('licenses')
    .select(
      `id, license_ref, license_key, license_type, terms, seats, status,
       expires_at, issued_at, revoked_at, revocation_reason, product_id, order_id,
       products (title, slug, cover_image_url, version)`
    )
    .order('issued_at', { ascending: false })

  if (error) throw error
  return (data || []).map((row) => ({ ...row, product: row.products || null }))
}

/**
 * Download the server-generated license document for one owned license.
 * Ownership is rechecked on the server; the id is not a capability.
 */
export async function downloadLicenseDocument(licenseId) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError

  const token = sessionData?.session?.access_token
  if (!token) throw new Error('Please sign in to download your license.')

  const response = await fetch(`/api/license-document?id=${encodeURIComponent(licenseId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error || 'Could not download the license document.')
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = `license-${licenseId}.html`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000)
}
