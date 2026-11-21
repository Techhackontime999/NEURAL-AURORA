/**
 * Names of the optional runtime caches used by the service worker.
 *
 * Workbox's precache is deliberately separate: it holds only the offline
 * application shell. These caches hold content that is fetched on demand
 * (lazy route chunks, public images, hero video, résumé). The UI uses the same
 * constants to offer a targeted "clear cached page files" recovery action.
 */
export const LAZY_ASSETS_CACHE = 'neural-aurora-lazy-assets'
export const MEDIA_CACHE = 'neural-aurora-media'

export const RUNTIME_CACHES = [LAZY_ASSETS_CACHE, MEDIA_CACHE]

/**
 * Remove only the optional runtime caches. Never touches the Workbox
 * precache, font caches, or the Spline cache.
 *
 * @returns {Promise<number>} number of caches removed
 */
export async function clearRuntimeCaches() {
  if (typeof caches === 'undefined') return 0
  const names = await caches.keys()
  const stale = names.filter((name) => RUNTIME_CACHES.includes(name))
  await Promise.all(stale.map((name) => caches.delete(name)))
  return stale.length
}
