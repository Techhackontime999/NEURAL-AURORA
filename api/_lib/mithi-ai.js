const { envPresence } = require('./diag')

// ---------------------------------------------------------------------------
// Server-only AI provider for Mithi, the site companion.
//
// API keys are read with `process.env` and never returned to the browser and
// never logged. Providers are tried in this order:
//
//   1. OpenRouter (DEFAULT)  OPENROUTER_API_KEY
//                            OPENROUTER_MODEL  default openai/gpt-4o-mini
//                            (base is fixed to https://openrouter.ai/api/v1)
//   2. Any OpenAI-shaped key AI_API_KEY (or OPENAI_API_KEY)
//                            AI_API_BASE       default https://api.openai.com/v1
//                            AI_MODEL          default gpt-4o-mini
//   3. Google Gemini         GEMINI_API_KEY (or GOOGLE_AI_API_KEY / GOOGLE_API_KEY)
//                            GEMINI_MODEL      default gemini-2.0-flash
//
// VITE_* keys are deliberately ignored: those are bundled into the browser
// build, so they are not treated as secrets.
//
// There is no retry loop and no hidden fallback to a canned reply: when no
// provider is configured the handler reports `configured: false` and the UI
// says so instead of pretending the assistant is live.
// ---------------------------------------------------------------------------

const OPENROUTER_ENV_NAMES = ['OPENROUTER_API_KEY']
const OPENAI_ENV_NAMES = ['AI_API_KEY', 'OPENAI_API_KEY']
const GEMINI_ENV_NAMES = ['GEMINI_API_KEY', 'GOOGLE_AI_API_KEY', 'GOOGLE_API_KEY']
const PROVIDER_ENV_NAMES = [
  ...OPENROUTER_ENV_NAMES,
  ...OPENAI_ENV_NAMES,
  ...GEMINI_ENV_NAMES,
  'OPENROUTER_MODEL',
  'AI_API_BASE',
  'AI_MODEL',
  'GEMINI_MODEL',
]

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini'
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash'
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
const REQUEST_TIMEOUT_MS = 25000

// OpenRouter asks callers to identify themselves. These are the site's own
// URLs, supplied by the deployment; they are never secrets.
function openRouterAttribution() {
  const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || '').trim()
  const title = (process.env.SITE_NAME || process.env.VITE_SITE_NAME || 'NEURAL AURORA').trim()
  const headers = { 'X-Title': title }
  if (siteUrl) headers['HTTP-Referer'] = siteUrl
  return headers
}

function firstSet(names) {
  for (const name of names) {
    const value = process.env[name]
    if (typeof value === 'string' && value.trim()) return { name, value: value.trim() }
  }
  return null
}

/** Describe the configured provider without ever returning the key. */
function getProvider() {
  const openrouter = firstSet(OPENROUTER_ENV_NAMES)
  if (openrouter) {
    return {
      kind: 'openrouter',
      key: openrouter.value,
      keyEnv: openrouter.name,
      model: (process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL).trim(),
      base: OPENROUTER_BASE,
      extraHeaders: openRouterAttribution(),
    }
  }

  const openai = firstSet(OPENAI_ENV_NAMES)
  if (openai) {
    return {
      kind: 'openai',
      key: openai.value,
      keyEnv: openai.name,
      model: (process.env.AI_MODEL || DEFAULT_OPENAI_MODEL).trim(),
      base: (process.env.AI_API_BASE || 'https://api.openai.com/v1').replace(/\/+$/, ''),
      extraHeaders: {},
    }
  }

  const gemini = firstSet(GEMINI_ENV_NAMES)
  if (gemini) {
    return {
      kind: 'gemini',
      key: gemini.value,
      keyEnv: gemini.name,
      model: (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim(),
      base: 'https://generativelanguage.googleapis.com/v1beta',
      extraHeaders: {},
    }
  }

  return null
}

/** Boolean-only presence flags, safe to log. */
function providerDiagnostics() {
  return envPresence(PROVIDER_ENV_NAMES)
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeout = new Error('The AI provider timed out.')
      timeout.code = 'provider_timeout'
      throw timeout
    }
    const network = new Error('The AI provider could not be reached.')
    network.code = 'provider_unreachable'
    throw network
  } finally {
    clearTimeout(timer)
  }
}

async function readErrorMessage(response) {
  try {
    const text = await response.text()
    if (!text) return ''
    try {
      const parsed = JSON.parse(text)
      return String(parsed?.error?.message || parsed?.message || '').slice(0, 300)
    } catch {
      return text.slice(0, 300)
    }
  } catch {
    return ''
  }
}

function providerError(message, code = 'provider_error') {
  const error = new Error(message || 'The AI provider returned an error.')
  error.code = code
  return error
}

async function callGemini(provider, { system, messages, jsonMode = false }) {
  const contents = messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }))

  const generationConfig = { temperature: 0.75, maxOutputTokens: 700 }
  if (jsonMode) generationConfig.responseMimeType = 'application/json'

  const response = await fetchWithTimeout(
    `${provider.base}/models/${encodeURIComponent(provider.model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': provider.key,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig,
      }),
    }
  )

  if (!response.ok) {
    const detail = await readErrorMessage(response)
    if (response.status === 429) throw providerError('The AI provider is rate limiting requests.', 'provider_rate_limited')
    if (response.status === 401 || response.status === 403) {
      throw providerError('The configured AI key was rejected by the provider.', 'provider_unauthorized')
    }
    throw providerError(detail || 'The AI provider returned an error.', 'provider_error')
  }

  const data = await response.json().catch(() => null)
  const parts = data?.candidates?.[0]?.content?.parts
  const text = Array.isArray(parts) ? parts.map((part) => part?.text || '').join('').trim() : ''

  if (!text) {
    const blocked = data?.promptFeedback?.blockReason
    if (blocked) throw providerError('The provider blocked that request.', 'provider_blocked')
    throw providerError('The AI provider returned an empty answer.', 'provider_empty')
  }

  return text
}

async function callOpenAiCompatible(provider, { system, messages, jsonMode = false }) {
  const body = {
    model: provider.model,
    temperature: 0.75,
    max_tokens: 700,
    messages: [{ role: 'system', content: system }, ...messages],
  }
  // Ask for a JSON object when the caller wants structured actions. Providers
  // that do not support response_format simply ignore it.
  if (jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetchWithTimeout(`${provider.base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.key}`,
      ...(provider.extraHeaders || {}),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await readErrorMessage(response)
    if (response.status === 429) throw providerError('The AI provider is rate limiting requests.', 'provider_rate_limited')
    if (response.status === 401 || response.status === 403) {
      throw providerError('The configured AI key was rejected by the provider.', 'provider_unauthorized')
    }
    throw providerError(detail || 'The AI provider returned an error.', 'provider_error')
  }

  const data = await response.json().catch(() => null)
  const text = data?.choices?.[0]?.message?.content

  if (typeof text !== 'string' || !text.trim()) {
    throw providerError('The AI provider returned an empty answer.', 'provider_empty')
  }

  return text.trim()
}

/** Run one chat turn through whichever provider is configured. */
async function chat({ system, messages, jsonMode = false }) {
  const provider = getProvider()
  if (!provider) {
    const error = new Error('No AI provider is configured for this deployment.')
    error.code = 'unconfigured'
    error.status = 503
    throw error
  }

  // Gemini supports a JSON response MIME type; the OpenAI path uses
  // response_format. Both are best-effort — the handler still parses text.
  if (provider.kind === 'gemini') {
    return callGemini(provider, { system, messages, jsonMode })
  }
  return callOpenAiCompatible(provider, { system, messages, jsonMode })
}

module.exports = {
  getProvider,
  providerDiagnostics,
  chat,
  PROVIDER_ENV_NAMES,
}
