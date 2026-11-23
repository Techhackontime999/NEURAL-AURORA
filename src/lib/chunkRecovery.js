// ---------------------------------------------------------------------------
// Recovery from a stale lazy chunk after a deployment.
//
// The entry chunk and index.html are precached, but route chunks are fetched on
// demand. A tab that was open before a deploy can still ask for an old hashed
// chunk that no longer exists, which React reports through the route error
// boundary. Rather than asking the visitor to debug browser storage, clear the
// optional caches and reload automatically — with a small retry budget so a
// genuine application bug never turns into a reload loop.
// ---------------------------------------------------------------------------

import { clearRuntimeCaches } from './pwaCaches.js'

const RECOVERY_KEY = 'neural-aurora:chunk-recovery'
const MAX_ATTEMPTS = 2
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000

const CHUNK_PATTERNS = [
  /dynamically imported module/i,
  /importing a module script failed/i,
  /error loading dynamically imported module/i,
  /loading chunk .* failed/i,
  /chunkloaderror/i,
]

/** Vite/browser wording for a failed lazy import, not an application bug. */
export function isChunkLoadError(error) {
  if (error?.name === 'ChunkLoadError') return true
  const message = String(error?.message || error || '')
  return CHUNK_PATTERNS.some((pattern) => pattern.test(message))
}

function readState(storage, now) {
  if (!storage) return { count: 0 }
  try {
    const raw = JSON.parse(storage.getItem(RECOVERY_KEY) || 'null')
    if (!raw || typeof raw.count !== 'number') return { count: 0 }
    // A long gap means the visitor recovered; start a fresh budget.
    if (!Number.isFinite(raw.at) || now - raw.at > ATTEMPT_WINDOW_MS) return { count: 0 }
    return { count: Math.min(raw.count, MAX_ATTEMPTS), at: raw.at }
  } catch {
    return { count: 0 }
  }
}

function writeState(storage, state, now) {
  if (!storage) return
  try {
    if (!state) storage.removeItem(RECOVERY_KEY)
    else storage.setItem(RECOVERY_KEY, JSON.stringify({ ...state, at: now }))
  } catch {
    // Private mode can deny storage. Recovery still works without a budget.
  }
}

/**
 * Try one bounded recovery. Returns true when a reload was scheduled.
 * The second attempt also unregisters the worker so a stale precached shell
 * cannot keep requesting the same dead chunk.
 */
export async function recoverFromChunkError(options = {}) {
  const {
    storage = typeof sessionStorage === 'undefined' ? null : sessionStorage,
    isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false,
    reload = () => window.location.reload(),
    getRegistration = () =>
      typeof navigator !== 'undefined' && 'serviceWorker' in navigator
        ? navigator.serviceWorker.getRegistration()
        : Promise.resolve(null),
    clearCaches = clearRuntimeCaches,
    now = () => Date.now(),
  } = options

  if (!isOnline()) return false

  const timestamp = now()
  const previous = readState(storage, timestamp)
  if (previous.count >= MAX_ATTEMPTS) {
    // Stop here: this is probably a real bug, so show the manual fallback.
    writeState(storage, null, timestamp)
    return false
  }

  writeState(storage, { count: previous.count + 1 }, timestamp)

  try {
    await clearCaches()
  } catch {
    // A failed cache clear must not block the reload attempt.
  }

  try {
    const registration = await getRegistration()
    if (previous.count >= 1) {
      // Second failure: the shell itself is stale. Dropping the worker makes
      // the next load fetch index.html from the network. It re-registers on
      // load, so offline support returns as soon as that succeeds.
      await registration?.unregister()
    } else {
      registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    }
  } catch {
    // No worker or no permission: the cache clear and reload still help.
  }

  reload()
  return true
}

export const CHUNK_RECOVERY_KEY = RECOVERY_KEY
export const CHUNK_RECOVERY_MAX_ATTEMPTS = MAX_ATTEMPTS
