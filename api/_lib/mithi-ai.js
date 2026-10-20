const { envPresence } = require('./diag')

// ---------------------------------------------------------------------------
// Server-only AI provider for Mithi, the portfolio companion.
//
// API keys are read with `process.env` and never returned to the browser and
// never logged. Two provider shapes are supported:
//
//   * Gemini      GEMINI_API_KEY (or GOOGLE_AI_API_KEY / GOOGLE_API_KEY)
//                 GEMINI_MODEL        default gemini-2.0-flash
//   * OpenAI-ish  AI_API_KEY (or OPENAI_API_KEY)
//                 AI_API_BASE         default https://api.openai.com/v1
//                 AI_MODEL            default gpt-4o-mini
//
// VITE_* keys are deliberately ignored: those are bundled into the browser
// build, so they are not treated as secrets.
//
// There is no retry loop and no hidden fallback to a canned reply: when no
// provider is configured the handler reports `configured: false` and the UI
// says so instead of pretending the assistant is live.
// ---------------------------------------------------------------------------

const GEMINI_ENV_NAMES = ['GEMINI_API_KEY', 'GOOGLE_AI_API_KEY', 'GOOGLE_API_KEY']
const OPENAI_ENV_NAMES = ['AI_API_KEY', 'OPENAI_API_KEY']
const PROVIDER_ENV_NAMES = [...GEMINI_ENV_NAMES, ...OPENAI_ENV_NAMES, 'AI_API_BASE', 'AI_MODEL', 'GEMINI_MODEL']

const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash'
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
const REQUEST_TIMEOUT_MS = 25000

function firstSet(names) {
  for (const name of names) {
    const value = process.env[name]
    if (typeof value === 'string' && value.trim()) return { name, value: value.trim() }
  }
  return null
}

/** Describe the configured provider without ever returning the key. */
function getProvider() {
  const gemini = firstSet(GEMINI_ENV_NAMES)
  if (gemini) {
    return {
      kind: 'gemini',
      key: gemini.value,
      keyEnv: gemini.name,
      model: (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim(),
      base: 'https://generativelanguage.googleapis.com/v1beta',
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

async function callGemini(provider, { system, messages }) {
  const contents = messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }))

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
        generationConfig: { temperature: 0.75, maxOutputTokens: 600 },
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

async function callOpenAiCompatible(provider, { system, messages }) {
  const response = await fetchWithTimeout(`${provider.base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.key}`,
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.75,
      max_tokens: 600,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
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
async function chat({ system, messages }) {
  const provider = getProvider()
  if (!provider) {
    const error = new Error('No AI provider is configured for this deployment.')
    error.code = 'unconfigured'
    error.status = 503
    throw error
  }

  return provider.kind === 'gemini'
    ? callGemini(provider, { system, messages })
    : callOpenAiCompatible(provider, { system, messages })
}

module.exports = {
  getProvider,
  providerDiagnostics,
  chat,
  PROVIDER_ENV_NAMES,
}
