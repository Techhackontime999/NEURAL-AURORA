// ---------------------------------------------------------------------------
// Server-side AI gateway for every billable AI feature in Neural Aurora.
//
// The browser never sees a provider key. All AI traffic goes through this
// endpoint, which reads server-only environment variables, validates input,
// caps output tokens, applies a timeout and keeps a small in-process budget.
//
// Portfolio mutation requests (feature = "portfolio") additionally require a
// Supabase Bearer token whose profile role is admin. Database writes themselves
// are still performed by the client under RLS; this gate protects the paid
// model call and makes anonymous cost abuse much harder.
//
// GET  /api/ai                 -> { configured, provider }
// POST /api/ai { feature, ... } -> OpenAI-shaped JSON (or audio for voice)
// ---------------------------------------------------------------------------

const crypto = require('node:crypto')
const { getProvider, providerDiagnostics, chat } = require('./_lib/mithi-ai')
const { getServiceClient, requireAdmin } = require('./_lib/adminAuth')

const MAX_BODY_BYTES = 32 * 1024
const MAX_MESSAGES = 20
const MAX_MESSAGE_CHARS = 8000
const MAX_TOTAL_CHARS = 30000
const MAX_TOOLS = 24
const MAX_TOOL_NAME = 64
const MAX_INPUT_CHARS = 2000
const TIMEOUT_MS = 20000
const RATE_WINDOW_MS = 60_000
const ANON_BUDGET = 20
const AUTH_BUDGET = 60

// Per-feature output ceilings. These are enforced here, never trusted from the
// request body, so a modified client cannot turn a puzzle into a long essay.
const FEATURE_TOKENS = {
  general: 700,
  chat: 1200,
  portfolio: 1200,
  generation: 2048,
  puzzle: 200,
  autocomplete: 150,
}

const FEATURES = new Set([...Object.keys(FEATURE_TOKENS), 'voice'])
const ROLES = new Set(['system', 'user', 'assistant', 'tool'])

// In-process, per-instance budget. Serverless instances are short lived, so
// this is a cost brake, not a durable quota; provider-side limits still apply.
const budgets = new Map()

function json(res, status, payload) {
  res.status(status).json(payload)
}

function clientKey(req, authenticated) {
  const auth = String(req.headers?.authorization || req.headers?.Authorization || '')
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim()
    if (token) return `user:${crypto.createHash('sha256').update(token).digest('hex').slice(0, 24)}`
  }
  if (authenticated) return 'authenticated'
  const forwarded = String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || '')
  const ip = forwarded.split(',')[0].trim()
  return ip ? `ip:${ip}` : 'anonymous'
}

function allowRequest(key, authenticated) {
  const now = Date.now()
  if (budgets.size > 5000) {
    for (const [entryKey, entry] of budgets) {
      if (entry.resetAt <= now || entry.lastSeen < now - 10 * 60_000) budgets.delete(entryKey)
    }
  }
  const limit = authenticated ? AUTH_BUDGET : ANON_BUDGET
  const entry = budgets.get(key)
  if (!entry || entry.resetAt <= now) {
    budgets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS, lastSeen: now })
    return { ok: true, remaining: limit - 1 }
  }
  entry.lastSeen = now
  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count += 1
  return { ok: true, remaining: limit - entry.count }
}

function boundedString(value, max) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
}

function sanitizeMessages(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) return null
  let total = 0
  const messages = []
  for (const item of value) {
    if (!item || !ROLES.has(item.role)) return null
    const content = boundedString(item.content, MAX_MESSAGE_CHARS)
    if (!content) return null
    total += content.length
    if (total > MAX_TOTAL_CHARS) return null
    messages.push({ role: item.role, content })
  }
  return messages
}

function sanitizeTools(value) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.length > MAX_TOOLS) return null
  const tools = []
  for (const tool of value) {
    if (!tool || tool.type !== 'function' || !tool.function) return null
    const name = boundedString(tool.function.name, MAX_TOOL_NAME)
    if (!name || !/^[A-Za-z0-9_-]{1,64}$/.test(name)) return null
    const description = boundedString(tool.function.description, 1000) || ''
    const parameters =
      tool.function.parameters && typeof tool.function.parameters === 'object' &&
      !Array.isArray(tool.function.parameters)
        ? tool.function.parameters
        : { type: 'object', properties: {} }
    tools.push({ type: 'function', function: { name, description, parameters } })
  }
  return tools
}

function tokenLimit(feature, requested) {
  const cap = FEATURE_TOKENS[feature] || FEATURE_TOKENS.general
  const parsed = Number.parseInt(requested, 10)
  if (!Number.isFinite(parsed)) return cap
  return Math.max(64, Math.min(parsed, cap))
}

function errorForProvider(response) {
  if (response.status === 429) {
    const error = new Error('The AI provider is rate limiting requests.')
    error.code = 'provider_rate_limited'
    error.status = 429
    return error
  }
  if (response.status === 401 || response.status === 403) {
    const error = new Error('The configured AI key was rejected by the provider.')
    error.code = 'provider_unauthorized'
    error.status = 502
    return error
  }
  const error = new Error('The AI provider returned an error.')
  error.code = 'provider_error'
  error.status = 502
  return error
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (error) {
    const failure = new Error(
      error?.name === 'AbortError'
        ? 'The AI provider timed out.'
        : 'The AI provider could not be reached.'
    )
    failure.code = error?.name === 'AbortError' ? 'provider_timeout' : 'provider_unreachable'
    failure.status = error?.name === 'AbortError' ? 504 : 502
    throw failure
  } finally {
    clearTimeout(timer)
  }
}

function voiceIsConfigured(provider) {
  if (!provider) return false
  if (provider.kind === 'gemini') {
    return Boolean(process.env.VOICE_API_KEY && process.env.VOICE_API_BASE)
  }
  return Boolean(process.env.VOICE_API_KEY || process.env.VOICE_API_BASE || provider.key)
}

async function handleVoice(req, res, provider) {
  if (!voiceIsConfigured(provider)) {
    return json(res, 501, {
      error: 'Speech synthesis is not available with the configured provider.',
      code: 'voice_unsupported',
    })
  }

  const input = boundedString(req.body?.input, MAX_INPUT_CHARS)
  const voice = boundedString(req.body?.voice, 64)
  const model = boundedString(req.body?.model, 120) ||
    boundedString(process.env.VOICE_MODEL, 120) ||
    'openai/tts-1-hd'
  if (!input || !voice || !/^[A-Za-z0-9_.:\/-]{1,120}$/.test(model) || !/^[A-Za-z0-9_-]{1,64}$/.test(voice)) {
    return json(res, 400, { error: 'Invalid speech request.', code: 'invalid_voice_request' })
  }

  const base = (process.env.VOICE_API_BASE || provider.base || '').replace(/\/+$/, '')
  const key = process.env.VOICE_API_KEY || provider.key
  if (!base || !key) {
    return json(res, 503, { configured: false, error: 'No speech provider is configured.', code: 'unconfigured' })
  }

  try {
    const response = await fetchWithTimeout(`${base}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        ...(provider.extraHeaders || {}),
      },
      body: JSON.stringify({ model, input, voice, response_format: 'mp3' }),
    })
    if (!response.ok) throw errorForProvider(response)
    const audio = Buffer.from(await response.arrayBuffer())
    res.status(200)
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    return res.send(audio)
  } catch (error) {
    return json(res, error.status || 502, { error: error.message, code: error.code || 'voice_failed' })
  }
}

async function handleChat(req, res, feature, provider) {
  const messages = sanitizeMessages(req.body?.messages)
  const tools = sanitizeTools(req.body?.tools)
  if (!messages || tools === null) {
    return json(res, 400, {
      error: 'Invalid AI request. Check the message and tool payload.',
      code: 'invalid_request',
    })
  }

  const maxTokens = tokenLimit(feature, req.body?.max_tokens)
  const requestedTemperature = Number(req.body?.temperature)
  const temperature = Number.isFinite(requestedTemperature)
    ? Math.max(0, Math.min(1, requestedTemperature))
    : 0.2
  const jsonMode = req.body?.jsonMode === true || feature === 'generation'

  if (provider.kind === 'gemini') {
    try {
      const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
      const conversation = messages.filter((m) => m.role !== 'system')
      const text = await chat({ system, messages: conversation, jsonMode })
      return json(res, 200, {
        id: 'ai-gateway',
        model: provider.model,
        choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
      })
    } catch (error) {
      return json(res, error.status || 502, {
        error: error.message,
        code: error.code || 'provider_error',
      })
    }
  }

  const body = {
    model: provider.model,
    messages,
    temperature,
    max_tokens: maxTokens,
  }
  if (tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  } else if (jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  try {
    const response = await fetchWithTimeout(`${provider.base.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
        ...(provider.extraHeaders || {}),
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw errorForProvider(response)
    const data = await response.json().catch(() => null)
    if (!data || !Array.isArray(data.choices)) {
      throw new Error('The AI provider returned an unusable response.')
    }
    // Return only the fields the client needs; provider internals stay server-side.
    return json(res, 200, {
      id: data.id || 'ai-gateway',
      model: data.model || provider.model,
      choices: data.choices.slice(0, 4),
      usage: data.usage,
    })
  } catch (error) {
    if (!error.status) {
      return json(res, 502, {
        error: 'The AI provider returned an unusable response.',
        code: 'provider_error',
      })
    }
    return json(res, error.status, { error: error.message, code: error.code })
  }
}

module.exports = async function handler(req, res) {
  const provider = getProvider()

  if (req.method === 'GET') {
    return json(res, 200, {
      configured: Boolean(provider),
      provider: provider ? provider.kind : null,
      voiceConfigured: voiceIsConfigured(provider),
      diagnostics: providerDiagnostics(),
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return json(res, 405, { error: 'Method not allowed.', code: 'method_not_allowed' })
  }

  if (!provider) {
    return json(res, 503, {
      configured: false,
      error: 'AI is not configured for this deployment. Set a server-side AI key.',
      code: 'unconfigured',
    })
  }

  const feature = boundedString(req.body?.feature, 32) || 'general'
  if (!FEATURES.has(feature)) {
    return json(res, 400, { error: 'Unknown AI feature.', code: 'invalid_feature' })
  }

  const needsAdmin = feature === 'portfolio'
  let admin = null
  if (needsAdmin) {
    const service = getServiceClient()
    if (!service) {
      return json(res, 503, {
        configured: false,
        error: 'Server-side Supabase configuration is missing.',
        code: 'unconfigured',
      })
    }
    admin = await requireAdmin(req, service)
    if (!admin) {
      return json(res, 403, {
        error: 'Administrator authorization is required for this AI action.',
        code: 'forbidden',
      })
    }
  }

  const budget = allowRequest(clientKey(req, Boolean(admin)), Boolean(admin))
  if (!budget.ok) {
    res.setHeader('Retry-After', String(budget.retryAfter))
    return json(res, 429, {
      error: 'Too many AI requests. Please wait before trying again.',
      code: 'rate_limited',
      retryAfter: budget.retryAfter,
    })
  }

  if (feature === 'voice') return handleVoice(req, res, provider)
  return handleChat(req, res, feature, provider)
}
