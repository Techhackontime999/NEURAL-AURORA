const ENDPOINT = '/api/mithi-chat'
import { sanitiseActions } from './siteActions'

export class MithiApiError extends Error {
  constructor(message, { code = 'mithi_error', status = 0, retryable = true } = {}) {
    super(message)
    this.name = 'MithiApiError'
    this.code = code
    this.status = status
    this.retryable = retryable
  }
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

/**
 * Ask the server whether a provider is configured without sending a prompt.
 * A missing endpoint (local Vite preview) is reported honestly rather than
 * pretending the assistant is live.
 */
export async function getMithiStatus(signal) {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    })
    const data = await readJson(response)

    if (!response.ok || typeof data?.configured !== 'boolean') {
      return {
        available: false,
        status: 'unavailable',
        reason: 'The Mithi AI endpoint is not available in this environment.',
      }
    }

    if (!data.configured) {
      return {
        available: false,
        status: 'unconfigured',
        reason: 'No server-side AI provider is configured for this deployment.',
      }
    }

    return { available: true, status: 'ready', reason: '' }
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    return {
      available: false,
      status: 'unavailable',
      reason: 'The Mithi AI endpoint is not available in this environment.',
    }
  }
}

export async function askMithi(messages, signal) {
  const safeMessages = (Array.isArray(messages) ? messages : [])
    .filter(
      (message) =>
        (message?.role === 'user' || message?.role === 'assistant') &&
        typeof message?.content === 'string' &&
        message.content.trim()
    )
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 1200),
    }))

  let response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({ messages: safeMessages }),
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new MithiApiError(
      "Mithi couldn't reach the server. Check your connection and try again.",
      { code: 'network_error', retryable: true }
    )
  }

  const data = await readJson(response)

  if (!response.ok) {
    throw new MithiApiError(
      typeof data?.error === 'string' && data.error
        ? data.error
        : 'Mithi could not answer right now. Please try again.',
      {
        code: data?.code || 'mithi_error',
        status: response.status,
        retryable: response.status >= 500 || response.status === 429,
      }
    )
  }

  if (typeof data?.reply !== 'string' || !data.reply.trim()) {
    throw new MithiApiError('Mithi returned an empty answer. Please try again.', {
      code: 'empty_reply',
      retryable: true,
    })
  }

  return {
    reply: data.reply.trim(),
    actions: sanitiseActions(data.actions),
  }
}
