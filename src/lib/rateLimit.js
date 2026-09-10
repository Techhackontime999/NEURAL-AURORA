/**
 * Rate Limiting and Lockout Utility for NEURAL AURORA
 * Provides sliding-window throttling, cooldowns, and brute-force lockout safeguards.
 */

const STORAGE_PREFIX = 'na_rl_'
const memoryStore = new Map()

function getStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Test if localStorage is accessible (can throw in private browsing)
      const testKey = '__test_storage__'
      window.localStorage.setItem(testKey, '1')
      window.localStorage.removeItem(testKey)
      return window.localStorage
    }
  } catch (_) {}
  
  return {
    getItem: (k) => memoryStore.get(k) || null,
    setItem: (k, v) => { memoryStore.set(k, String(v)) },
    removeItem: (k) => { memoryStore.delete(k) },
  }
}

function getItem(key, fallback = null) {
  const storage = getStorage()
  if (!storage) return fallback
  try {
    const val = storage.getItem(STORAGE_PREFIX + key)
    return val ? JSON.parse(val) : fallback
  } catch (_) {
    return fallback
  }
}

function setItem(key, value) {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch (_) {}
}

function removeItem(key) {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(STORAGE_PREFIX + key)
  } catch (_) {}
}

/**
 * Generic rate limiter using a sliding time window and optional minimum interval between requests.
 */
export function checkRateLimit(key, { maxAttempts = 5, windowMs = 60000, minIntervalMs = 0 } = {}) {
  const now = Date.now()
  const data = getItem(key, { timestamps: [], lastAttempt: 0 })
  
  // Filter out timestamps outside the sliding window
  const validTimestamps = (data.timestamps || []).filter(ts => now - ts < windowMs)
  
  // Check min interval between submissions
  if (minIntervalMs > 0 && data.lastAttempt) {
    const timeSinceLast = now - data.lastAttempt
    if (timeSinceLast < minIntervalMs) {
      const retryAfterSeconds = Math.ceil((minIntervalMs - timeSinceLast) / 1000)
      return {
        allowed: false,
        reason: 'interval',
        retryAfterSeconds,
        remainingAttempts: Math.max(0, maxAttempts - validTimestamps.length),
        totalAttempts: validTimestamps.length,
      }
    }
  }

  if (validTimestamps.length >= maxAttempts) {
    const oldestTimestamp = validTimestamps[0]
    const retryAfterSeconds = Math.ceil((windowMs - (now - oldestTimestamp)) / 1000)
    return {
      allowed: false,
      reason: 'window_limit',
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
      remainingAttempts: 0,
      totalAttempts: validTimestamps.length,
    }
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - validTimestamps.length,
    totalAttempts: validTimestamps.length,
    retryAfterSeconds: 0,
  }
}

/**
 * Record an attempt in the rate limiter history.
 */
export function recordRateLimitAttempt(key, { windowMs = 60000 } = {}) {
  const now = Date.now()
  const data = getItem(key, { timestamps: [], lastAttempt: 0 })
  const validTimestamps = (data.timestamps || []).filter(ts => now - ts < windowMs)
  validTimestamps.push(now)
  setItem(key, { timestamps: validTimestamps, lastAttempt: now })
}

/**
 * Reset rate limit history for a key.
 */
export function resetRateLimit(key) {
  removeItem(key)
}

/* ==========================================================================
   Login Lockout & Brute-force Protection
   ========================================================================== */

const LOGIN_KEY = 'login_lockout'
const MAX_LOGIN_ATTEMPTS = 5
const BASE_LOCKOUT_MS = 60000 // 1 minute
const MAX_LOCKOUT_MS = 900000 // 15 minutes

/**
 * Returns current login lockout status.
 */
export function getLoginLockoutStatus() {
  const now = Date.now()
  const state = getItem(LOGIN_KEY, {
    failedAttempts: 0,
    lockoutUntil: 0,
    consecutiveLockouts: 0,
  })

  if (state.lockoutUntil && state.lockoutUntil > now) {
    const remainingSeconds = Math.ceil((state.lockoutUntil - now) / 1000)
    return {
      isLocked: true,
      remainingSeconds,
      failedAttempts: state.failedAttempts,
      remainingAttempts: 0,
    }
  }

  // If lockout expired, reset lockoutUntil
  if (state.lockoutUntil && state.lockoutUntil <= now) {
    state.lockoutUntil = 0
    setItem(LOGIN_KEY, state)
  }

  const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - (state.failedAttempts || 0))
  return {
    isLocked: false,
    remainingSeconds: 0,
    failedAttempts: state.failedAttempts || 0,
    remainingAttempts,
  }
}

/**
 * Record a failed login attempt. Triggers exponential lockout after MAX_LOGIN_ATTEMPTS.
 */
export function recordLoginFailure() {
  const now = Date.now()
  const state = getItem(LOGIN_KEY, {
    failedAttempts: 0,
    lockoutUntil: 0,
    consecutiveLockouts: 0,
  })

  state.failedAttempts = (state.failedAttempts || 0) + 1

  if (state.failedAttempts >= MAX_LOGIN_ATTEMPTS) {
    state.consecutiveLockouts = (state.consecutiveLockouts || 0) + 1
    // Exponential backoff: 60s, 120s, 240s... capped at MAX_LOCKOUT_MS
    const multiplier = Math.pow(2, state.consecutiveLockouts - 1)
    const lockoutDuration = Math.min(BASE_LOCKOUT_MS * multiplier, MAX_LOCKOUT_MS)
    state.lockoutUntil = now + lockoutDuration
    setItem(LOGIN_KEY, state)
    return {
      isLocked: true,
      remainingSeconds: Math.ceil(lockoutDuration / 1000),
      remainingAttempts: 0,
    }
  }

  setItem(LOGIN_KEY, state)
  return {
    isLocked: false,
    remainingSeconds: 0,
    remainingAttempts: MAX_LOGIN_ATTEMPTS - state.failedAttempts,
  }
}

/**
 * Reset login failure counter on successful authentication.
 */
export function recordLoginSuccess() {
  removeItem(LOGIN_KEY)
}

/* ==========================================================================
   Public Forms Rate Limiting: Contact, Reviews, Password Reset
   ========================================================================== */

/**
 * Contact Message Submission:
 * - Max 3 messages per 5 minutes
 * - At least 15 seconds between submissions
 */
export function checkContactRateLimit() {
  return checkRateLimit('contact_submissions', {
    maxAttempts: 3,
    windowMs: 5 * 60 * 1000,
    minIntervalMs: 15 * 1000,
  })
}

export function recordContactSubmission() {
  recordRateLimitAttempt('contact_submissions', { windowMs: 5 * 60 * 1000 })
}

/**
 * Review Submission:
 * - Max 2 reviews per 10 minutes
 * - At least 30 seconds between submissions
 */
export function checkReviewRateLimit() {
  return checkRateLimit('review_submissions', {
    maxAttempts: 2,
    windowMs: 10 * 60 * 1000,
    minIntervalMs: 30 * 1000,
  })
}

export function recordReviewSubmission() {
  recordRateLimitAttempt('review_submissions', { windowMs: 10 * 60 * 1000 })
}

/**
 * Password Reset Requests:
 * - Max 3 requests per 15 minutes
 * - At least 60 seconds between requests
 */
export function checkPasswordResetRateLimit() {
  return checkRateLimit('pwd_reset_requests', {
    maxAttempts: 3,
    windowMs: 15 * 60 * 1000,
    minIntervalMs: 60 * 1000,
  })
}

export function recordPasswordResetAttempt() {
  recordRateLimitAttempt('pwd_reset_requests', { windowMs: 15 * 60 * 1000 })
}
