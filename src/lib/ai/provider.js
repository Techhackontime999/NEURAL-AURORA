// Browser side of the AI gateway. No provider key, model secret or API base is
// read here — Vite inlines every VITE_* value into the public bundle, so all
// billable model calls go through the serverless /api/ai endpoint instead.

const AI_ENDPOINT = '/api/ai'
const REQUEST_TIMEOUT_MS = 30000

let configuredCache = { value: null, at: 0 }

function normaliseOpts(opts) {
  if (typeof opts === 'number') return { max_tokens: opts }
  return opts || {}
}

function aiError(message, status, code, retryAfter) {
  const error = new Error(message)
  error.status = status
  error.code = code
  error.retryAfter = retryAfter
  return error
}

async function authHeaders(needsAdmin) {
  if (!needsAdmin) return {}
  try {
    const { supabase } = await import('../supabase')
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

/**
 * Ask the gateway whether a provider is configured. Cached for 60s and used by
 * callers that need an honest "AI unavailable" state instead of wasting a
 * round trip on every keystroke.
 */
export async function isAiConfigured() {
  if (configuredCache.value !== null && Date.now() - configuredCache.at < 60000) {
    return configuredCache.value
  }
  try {
    const res = await fetch(AI_ENDPOINT, { headers: { Accept: 'application/json' } })
    const data = await res.json().catch(() => ({}))
    configuredCache = { value: Boolean(data.configured), at: Date.now() }
  } catch {
    configuredCache = { value: false, at: Date.now() }
  }
  return configuredCache.value
}

/** Call an OpenAI-compatible model through the server-side gateway. */
export async function callAi(messages, tools, opts) {
  const options = normaliseOpts(opts)
  const feature = options.feature || 'general'
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const body = {
    feature,
    messages,
    temperature: options.temperature ?? 0.1,
    max_tokens: options.max_tokens ?? 1024,
  }
  if (options.jsonMode === true) body.jsonMode = true
  if (tools && tools.length > 0) {
    body.tools = tools
  }

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(await authHeaders(feature === 'portfolio')),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      if (res.status === 503) configuredCache = { value: false, at: Date.now() }
      throw aiError(
        payload.error || `AI API error (${res.status})`,
        res.status,
        payload.code,
        payload.retryAfter
      )
    }

    const data = await res.json()
    configuredCache = { value: true, at: Date.now() }
    return data
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw aiError('The AI request timed out.', 504, 'client_timeout')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/** Diagnostics for the admin panel — no key material is ever returned. */
export async function diagnoseAi() {
  try {
    const res = await fetch(AI_ENDPOINT, { headers: { Accept: 'application/json' } })
    const data = await res.json().catch(() => ({}))
    const info = {
      configured: Boolean(data.configured),
      provider: data.provider || null,
      status: res.status,
      ok: res.ok && Boolean(data.configured),
    }
    if (data.error) info.error = String(data.error).slice(0, 300)
    return info
  } catch (err) {
    return { configured: false, provider: null, ok: false, error: err.message }
  }
}
