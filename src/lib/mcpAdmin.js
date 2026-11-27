import { supabase } from './supabase'

/**
 * All AI Connections actions go through one audited server endpoint. The
 * browser sends its Supabase access token; the server resolves it to the
 * current portfolio owner before trusting any change.
 */
export async function mcpAdminRequest(action, options = {}) {
  const { method = 'GET', body, params } = options
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(sessionError.message)
  const token = sessionData?.session?.access_token
  if (!token) throw new Error('Sign in as the portfolio owner to manage AI connections.')

  const url = new URL('/api/ai', window.location.origin)
  url.searchParams.set('action', `admin-${action}`)
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed (${response.status}).`)
  }
  return data
}

export async function mcpOAuthRequest(action, options = {}) {
  const { method = 'GET', body, params } = options
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(sessionError.message)
  const token = sessionData?.session?.access_token
  if (!token) throw new Error('Sign in as the portfolio owner to review this request.')

  const url = new URL('/api/ai', window.location.origin)
  url.searchParams.set('action', `oauth-${action}`)
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error_description || data?.message || data?.error || `Request failed (${response.status}).`)
  }
  return data
}
