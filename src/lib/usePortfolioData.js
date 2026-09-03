import { useCallback, useEffect, useSyncExternalStore } from 'react'
import {
  getPersonalInfo,
  getSocialLinks,
  getSkills,
  getProjects,
  getEducation,
  getExperience,
  getBlogPosts,
  getCaseStudies,
  getCaseStudyBySlug,
  getServices,
  getServicePage,
} from './supabase'
import {
  personalInfo as staticPersonalInfo,
  socialLinks as staticSocialLinks,
  skills as staticSkills,
  projects as staticProjects,
  education as staticEducation,
  experience as staticExperience,
  blogPosts as staticBlogPosts,
  caseStudies as staticCaseStudies,
  services as staticServices,
  defaultServicePage as staticServicePage,
} from '../data/portfolio'

const supabaseConfigured =
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co'

// ---------------------------------------------------------------------------
// Shared module-level cache
// ---------------------------------------------------------------------------
// Every hook below is backed by this single cache, keyed by resource name
// (e.g. 'socialLinks', 'caseStudy:my-slug'). This is what actually fixes the
// "up to a dozen duplicate network calls" problem: no matter how many
// components call useSocialLinks() on the same page, they all read from -
// and only the *first* of them triggers - the same in-flight/resolved entry.
//
// Each cache entry looks like:
//   { data, status: 'idle' | 'loading' | 'success' | 'error', error, promise }
//
// `resourceRegistry` additionally remembers each key's fetchFn/staticData/
// mergeFn the first time a hook seeds it, so invalidatePortfolioCache() can
// force a fresh fetch for already-mounted consumers without needing the
// caller to know the resource's fetch details.

const cacheStore = new Map()
const subscribers = new Map()
const resourceRegistry = new Map()

function getCacheEntry(key) {
  return cacheStore.get(key) || { data: undefined, status: 'idle', error: null, promise: null }
}

function setCacheEntry(key, entry) {
  cacheStore.set(key, entry)
  const subs = subscribers.get(key)
  if (subs) subs.forEach((callback) => callback())
}

function subscribe(key, callback) {
  if (!subscribers.has(key)) subscribers.set(key, new Set())
  subscribers.get(key).add(callback)
  return () => {
    subscribers.get(key)?.delete(callback)
  }
}

function hasUsableData(raw) {
  return Boolean(raw) && (!Array.isArray(raw) || raw.length > 0)
}

/**
 * Ensures exactly one in-flight (or resolved) fetch exists per cache key.
 * Concurrent callers within the same tick (e.g. 6 components all mounting
 * useSocialLinks() at once) all see the same in-flight promise instead of
 * each firing their own Supabase query.
 */
function ensureFetch(key, fetchFn, staticData, mergeFn, { force = false } = {}) {
  const existing = cacheStore.get(key)

  // Never fire a second concurrent request while one is already in flight,
  // forced or not.
  if (existing && existing.status === 'loading') {
    return existing.promise
  }
  if (!force && existing && existing.status === 'success') {
    return Promise.resolve(existing.data)
  }
  if (!supabaseConfigured) {
    setCacheEntry(key, { data: staticData, status: 'success', error: null, promise: null })
    return Promise.resolve(staticData)
  }

  const fallbackData = existing?.data ?? staticData
  const promise = fetchFn()
    .then((raw) => {
      const finalData = hasUsableData(raw) ? (mergeFn ? mergeFn(raw, staticData) : raw) : fallbackData
      setCacheEntry(key, { data: finalData, status: 'success', error: null, promise: null })
      return finalData
    })
    .catch((error) => {
      setCacheEntry(key, { data: fallbackData, status: 'error', error, promise: null })
      return fallbackData
    })

  setCacheEntry(key, { data: fallbackData, status: 'loading', error: null, promise })
  return promise
}

/**
 * Clears/refreshes a cached resource so already-mounted subscribers pick up
 * fresh data. Call this after an admin save so the public-facing hooks
 * relying on the same table stop showing stale content.
 *
 * @param {string} [key] - A specific resource key (see the exported hooks
 *   below for the key each one uses, e.g. 'socialLinks'). Omit to
 *   invalidate every currently-registered resource.
 */
export function invalidatePortfolioCache(key) {
  if (key) {
    const meta = resourceRegistry.get(key)
    if (meta) {
      ensureFetch(key, meta.fetchFn, meta.staticData, meta.mergeFn, { force: true })
    } else {
      cacheStore.delete(key)
    }
    return
  }
  for (const [registeredKey, meta] of resourceRegistry.entries()) {
    ensureFetch(registeredKey, meta.fetchFn, meta.staticData, meta.mergeFn, { force: true })
  }
}

/**
 * Generic hook backing every portfolio-data hook below. Seeds the shared
 * cache with static fallback data synchronously (so the first render never
 * shows a blank state), subscribes the component to that cache key via
 * useSyncExternalStore, and kicks off (or joins) a deduplicated fetch.
 */
function usePortfolioResource(key, fetchFn, staticData, mergeFn) {
  if (!cacheStore.has(key)) {
    cacheStore.set(key, { data: staticData, status: 'idle', error: null, promise: null })
  }
  if (!resourceRegistry.has(key)) {
    resourceRegistry.set(key, { fetchFn, staticData, mergeFn })
  }

  const subscribeFn = useCallback((callback) => subscribe(key, callback), [key])
  const getSnapshotFn = useCallback(() => getCacheEntry(key), [key])
  const entry = useSyncExternalStore(subscribeFn, getSnapshotFn, getSnapshotFn)

  useEffect(() => {
    ensureFetch(key, fetchFn, staticData, mergeFn)
    // Deliberately depend on `key` only: fetchFn/staticData/mergeFn are
    // stable per resource for the lifetime of the app (module-level
    // functions/constants), and re-running this effect whenever a caller
    // passes a new inline mergeFn reference would defeat the dedup cache.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return {
    data: entry.data,
    isLoading: entry.status === 'loading' || entry.status === 'idle',
    error: entry.error,
  }
}

// ---------------------------------------------------------------------------
// Merge helpers (unchanged logic, extracted so they can be passed in)
// ---------------------------------------------------------------------------

function mergeServices(raw, staticData) {
  return raw.map((svc) => {
    const fallback = staticData.find((s) => s.service_id === svc.service_id)
    if (!fallback) return svc
    const mergedSvc = { ...fallback, ...svc }
    for (const key of ['price', 'currency', 'period', 'delivery', 'pricing']) {
      const val = svc[key]
      if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
        mergedSvc[key] = fallback[key]
      }
    }
    return mergedSvc
  })
}

function mergeServicePage(raw, staticData) {
  const merged = { ...staticData }
  for (const key of Object.keys(merged)) {
    if (key in raw) {
      const val = raw[key]
      if (Array.isArray(val) && val.length === 0) continue
      if (val === null || val === undefined) continue
      merged[key] = val
    }
  }
  return merged
}

// ---------------------------------------------------------------------------
// Public hooks
// ---------------------------------------------------------------------------
// Every hook below returns the same { data, isLoading, error } shape.

export function usePersonalInfo() {
  const result = usePortfolioResource('personalInfo', getPersonalInfo, staticPersonalInfo)

  // Preserve the previous refetch-on-focus/visibility behavior. Because the
  // fetch itself is deduplicated through the shared cache, multiple
  // mounted components each registering this listener still only ever
  // triggers a single network call per focus/visibility event.
  useEffect(() => {
    if (!supabaseConfigured) return
    const refetch = () => ensureFetch('personalInfo', getPersonalInfo, staticPersonalInfo, undefined, { force: true })
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    window.addEventListener('focus', refetch)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('focus', refetch)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return result
}

export function useSocialLinks() {
  return usePortfolioResource('socialLinks', getSocialLinks, staticSocialLinks)
}

export function useSkills() {
  return usePortfolioResource('skills', getSkills, staticSkills)
}

export function useProjects() {
  return usePortfolioResource('projects', getProjects, staticProjects)
}

export function useEducation() {
  return usePortfolioResource('education', getEducation, staticEducation)
}

export function useExperience() {
  return usePortfolioResource('experience', getExperience, staticExperience)
}

export function useBlogPosts() {
  return usePortfolioResource('blogPosts', getBlogPosts, staticBlogPosts)
}

export function useCaseStudyBySlug(slug) {
  const staticMatch = staticCaseStudies.find((s) => s.slug === slug) || null
  return usePortfolioResource(`caseStudy:${slug}`, () => getCaseStudyBySlug(slug), staticMatch)
}

export function useCaseStudies() {
  return usePortfolioResource('caseStudies', getCaseStudies, staticCaseStudies)
}

export function useServices() {
  return usePortfolioResource('services', getServices, staticServices, mergeServices)
}

export function useServicePage() {
  return usePortfolioResource('servicePage', getServicePage, staticServicePage, mergeServicePage)
}
