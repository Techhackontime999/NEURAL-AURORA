// ---------------------------------------------------------------------------
// Database and application-service layer for the Neural Aurora MCP server.
//
// Every operation here is allowlisted and portfolio-scoped. Payment, refund,
// payout, licensing, entitlement, credential, privilege and access-control
// tables are deliberately absent: there is no code path from MCP to them.
// Existing content tables are reused through the same service-role access
// pattern already used by the trusted admin API handlers (RLS is still
// enforced by the explicit owner checks in verifyConnectionOwner).
// ---------------------------------------------------------------------------

const { getServiceClient, requireAdmin } = require('./adminAuth')
const {
  TOOL_MAP,
  SCOPES,
  redactAudit,
  sha256,
  randomToken,
  constantEqual,
  sanitizeText,
  untrustedResult,
  simpleResult,
} = require('./mcp-policy')

const PORTFOLIO_ID = 'primary'
const CODE_TTL_MS = 10 * 60 * 1000
const ACCESS_TTL_MS = 60 * 60 * 1000
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000
const PENDING_TTL_MS = 10 * 60 * 1000

function httpError(status, code, message) {
  const error = new Error(message || code)
  error.status = status
  error.code = code
  return error
}

function db() {
  const client = getServiceClient()
  if (!client) throw httpError(503, 'mcp_unconfigured', 'AI connections are not configured on this deployment.')
  return client
}

function must(result, code = 'database_error') {
  if (result.error) {
    console.error('[mcp] database error:', result.error.message)
    throw httpError(500, code, 'Application data operation failed.')
  }
  return result.data
}

function nowPlus(ms) {
  return new Date(Date.now() + ms).toISOString()
}

function callerHash(req, salt = '') {
  const forwarded = String(req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'] || '')
  const ip = forwarded.split(',')[0].trim() || 'unknown'
  return sha256(`${salt}:${ip}`)
}

function normalEmail(value) {
  return String(value || '').trim().toLowerCase()
}

// ---------------------------------------------------------------------------
// Owner binding
// ---------------------------------------------------------------------------

/**
 * A provider connection is never proof of ownership. Every grant is bound to
 * one Supabase user who must still be an admin AND still hold the configured
 * portfolio owner email.
 */
async function verifyConnectionOwner(ownerUserId, client = db()) {
  if (!ownerUserId) throw httpError(403, 'owner_not_bound', 'Connection has no authenticated owner.')

  const profile = must(
    await client.from('profiles').select('role').eq('id', ownerUserId).maybeSingle(),
    'owner_lookup_failed'
  )
  if (profile?.role !== 'admin') {
    throw httpError(403, 'owner_not_admin', 'The connection owner is no longer an administrator.')
  }

  const settings = must(
    await client.from('admin_settings').select('admin_email').eq('id', 1).maybeSingle(),
    'owner_lookup_failed'
  )
  const configuredOwner = normalEmail(settings?.admin_email)
  if (!configuredOwner) {
    throw httpError(403, 'owner_not_configured', 'Set the portfolio owner email in admin settings first.')
  }

  const { data: authUser, error: authError } = await client.auth.admin.getUserById(ownerUserId)
  if (authError || !authUser?.user?.email) {
    throw httpError(403, 'owner_identity_unavailable', 'The connection owner identity could not be verified.')
  }
  if (normalEmail(authUser.user.email) !== configuredOwner) {
    throw httpError(403, 'owner_changed', 'The portfolio owner has changed. Reconnect as the current owner.')
  }
  return { ownerUserId, email: configuredOwner }
}

/**
 * Admin API gate: the browser token must resolve to a current administrator
 * AND to the email configured as this portfolio's owner. This prevents a stale
 * admin profile from authorising new external connections after ownership has
 * moved to another account.
 */
async function requireOwnerAdmin(req, client = db()) {
  const user = await requireAdmin(req, client)
  if (!user) return null
  try {
    await verifyConnectionOwner(user.id, client)
    return user
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Settings and tool registry
// ---------------------------------------------------------------------------

async function getAccessSettings(client = db()) {
  const row = must(
    await client.from('ai_access_settings').select('enabled, require_approval_default, updated_at').eq('id', 1).maybeSingle()
  )
  return row || { enabled: false, require_approval_default: true, updated_at: null }
}

async function setAccessSettings(patch, ownerUserId, client = db()) {
  const changes = {
    updated_at: new Date().toISOString(),
    updated_by: ownerUserId || null,
  }
  if (patch.enabled !== undefined) changes.enabled = Boolean(patch.enabled)
  if (patch.requireApprovalDefault !== undefined) {
    changes.require_approval_default = Boolean(patch.requireApprovalDefault)
  }
  const data = must(
    await client
      .from('ai_access_settings')
      .update(changes)
      .eq('id', 1)
      .select('enabled, require_approval_default, updated_at')
      .maybeSingle()
  )
  if (!data) throw httpError(500, 'settings_missing', 'AI access settings row is missing.')
  return data
}

async function listToolSettings(client = db()) {
  const rows = must(await client.from('ai_tool_settings').select('tool_name, enabled, require_approval'))
  const byName = new Map(rows.map((row) => [row.tool_name, row]))
  return Array.from(TOOL_MAP.values()).map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    scope: tool.scope,
    risk: tool.risk,
    approval: tool.approval,
    enabled: byName.has(tool.name) ? byName.get(tool.name).enabled : true,
    require_approval: byName.has(tool.name)
      ? byName.get(tool.name).require_approval
      : tool.approval === 'always',
  }))
}

async function getEnabledToolMap(client = db()) {
  const rows = await listToolSettings(client)
  const map = Object.create(null)
  for (const row of rows) map[row.name] = row.enabled !== false
  return map
}

async function getToolSettingsMap(client = db()) {
  const rows = await listToolSettings(client)
  const map = Object.create(null)
  for (const row of rows) map[row.name] = row
  return map
}

async function setToolSetting(toolName, patch, client = db()) {
  if (!TOOL_MAP.has(toolName)) throw httpError(400, 'unknown_tool', 'Unknown tool.')
  const data = must(
    await client
      .from('ai_tool_settings')
      .upsert(
        {
          tool_name: toolName,
          enabled: patch.enabled === undefined ? true : Boolean(patch.enabled),
          require_approval: patch.requireApproval === undefined
            ? TOOL_MAP.get(toolName).approval === 'always'
            : Boolean(patch.requireApproval),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tool_name' }
      )
      .select('tool_name, enabled, require_approval')
      .maybeSingle()
  )
  return data
}

// ---------------------------------------------------------------------------
// OAuth clients, codes and tokens
// ---------------------------------------------------------------------------

function validateRedirectUris(uris) {
  if (!Array.isArray(uris) || uris.length === 0 || uris.length > 8) {
    throw httpError(400, 'invalid_redirect_uris', 'Provide between 1 and 8 redirect URIs.')
  }
  const clean = []
  for (const raw of uris) {
    if (typeof raw !== 'string' || raw.length > 500) {
      throw httpError(400, 'invalid_redirect_uris', 'Invalid redirect URI.')
    }
    let url
    try {
      url = new URL(raw)
    } catch {
      throw httpError(400, 'invalid_redirect_uris', 'Invalid redirect URI.')
    }
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
      throw httpError(400, 'invalid_redirect_uris', 'Redirect URIs must use HTTPS or loopback HTTP.')
    }
    if (url.hash) throw httpError(400, 'invalid_redirect_uris', 'Redirect URIs must not contain fragments.')
    clean.push(raw)
  }
  return [...new Set(clean)]
}

function scopesForTools(tools, requested) {
  const available = new Set(['offline_access'])
  for (const tool of tools) {
    const descriptor = TOOL_MAP.get(tool)
    if (descriptor) available.add(descriptor.scope)
  }
  if (requested === undefined || requested === null) return [...available]
  const wanted = Array.isArray(requested)
    ? requested
    : String(requested).split(/\s+/).filter(Boolean)
  const clean = [...new Set(wanted)]
  for (const scope of clean) {
    if (!SCOPES.includes(scope) || !available.has(scope)) {
      throw httpError(400, 'invalid_scope', `Scope is not available to the selected tools: ${scope}`)
    }
  }
  return clean
}

async function createClient({ ownerUserId, name, redirectUris, allowedTools, scopes, authMethod = 'none' }, client = db()) {
  const cleanName = sanitizeText(name, 80).trim()
  if (!cleanName) throw httpError(400, 'invalid_client_name', 'Client name is required.')
  const redirects = validateRedirectUris(redirectUris)
  const tools = Array.isArray(allowedTools)
    ? [...new Set(allowedTools.filter((tool) => TOOL_MAP.has(tool)))].slice(0, TOOLS_LIMIT())
    : []
  const allowedScopes = scopesForTools(tools, scopes)
  const method = authMethod === 'client_secret_post' ? 'client_secret_post' : 'none'
  const clientId = `na_c_${randomToken('').replace(/^na_mcp_/, '').slice(0, 48)}`
  const secret = method === 'none' ? '' : randomToken('na_s_')
  const row = must(
    await client
      .from('ai_oauth_clients')
      .insert({
        owner_user_id: ownerUserId,
        portfolio_id: PORTFOLIO_ID,
        client_id: clientId,
        client_secret_hash: secret ? sha256(secret) : null,
        client_name: cleanName,
        redirect_uris: redirects,
        allowed_tools: tools,
        allowed_scopes: allowedScopes,
        token_endpoint_auth_method: method,
        enabled: true,
      })
      .select('id, client_id, client_name, redirect_uris, allowed_tools, allowed_scopes, token_endpoint_auth_method, enabled, created_at')
      .maybeSingle()
  )
  return { ...row, client_secret: secret }
}

function TOOLS_LIMIT() {
  return TOOL_MAP.size
}

async function findClient(clientId, client = db()) {
  const row = must(
    await client.from('ai_oauth_clients').select('*').eq('client_id', String(clientId || '')).maybeSingle()
  )
  if (!row || row.portfolio_id !== PORTFOLIO_ID || row.revoked_at) return null
  return row
}

async function listClients(client = db()) {
  const rows = must(
    await client
      .from('ai_oauth_clients')
      .select('id, client_id, client_name, redirect_uris, allowed_tools, allowed_scopes, token_endpoint_auth_method, enabled, created_at, revoked_at, last_used_at')
      .order('created_at', { ascending: false })
      .limit(100)
  )
  return rows
}

async function updateClient(clientId, patch, client = db()) {
  const current = await findClient(clientId, client)
  if (!current) throw httpError(404, 'client_not_found', 'Connection not found.')
  const data = {}
  if (patch.name !== undefined) data.client_name = sanitizeText(patch.name, 80).trim() || current.client_name
  if (patch.redirectUris !== undefined) data.redirect_uris = validateRedirectUris(patch.redirectUris)
  if (patch.allowedTools !== undefined) {
    if (!Array.isArray(patch.allowedTools)) throw httpError(400, 'invalid_tools', 'Invalid tool list.')
    data.allowed_tools = [...new Set(patch.allowedTools.filter((tool) => TOOL_MAP.has(tool)))].slice(0, TOOLS_LIMIT())
    data.allowed_scopes = scopesForTools(data.allowed_tools, patch.scopes)
  } else if (patch.scopes !== undefined) {
    data.allowed_scopes = scopesForTools(current.allowed_tools || [], patch.scopes)
  }
  if (patch.enabled !== undefined) data.enabled = Boolean(patch.enabled)
  const row = must(
    await client.from('ai_oauth_clients').update(data).eq('id', current.id).select('id, client_id, client_name, redirect_uris, allowed_tools, allowed_scopes, enabled').maybeSingle()
  )
  return row
}

async function revokeClient(clientId, client = db()) {
  const current = await findClient(clientId, client)
  if (!current) throw httpError(404, 'client_not_found', 'Connection not found.')
  const stamp = new Date().toISOString()
  must(await client.from('ai_oauth_clients').update({ enabled: false, revoked_at: stamp }).eq('id', current.id))
  must(await client.from('ai_oauth_tokens').update({ revoked_at: stamp }).eq('client_id', clientId).is('revoked_at', null))
  must(await client.from('ai_oauth_codes').update({ used_at: stamp }).eq('client_id', clientId).is('used_at', null))
  return { revoked: true }
}

async function createAuthorizationCode({ code, clientRow, ownerUserId, redirectUri, codeChallenge, state, scopes, allowedTools, resource }, client = db()) {
  const codeHash = sha256(code)
  must(
    await client.from('ai_oauth_codes').insert({
      code_hash: codeHash,
      client_id: clientRow.client_id,
      owner_user_id: ownerUserId,
      portfolio_id: PORTFOLIO_ID,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      state_hash: sha256(state),
      scopes,
      allowed_tools: allowedTools,
      resource,
      expires_at: nowPlus(CODE_TTL_MS),
    })
  )
  return { code_hash: codeHash }
}

/** Stage an authorize request before the owner has consented. */
async function createAuthorizationRequest({ requestId, clientRow, redirectUri, codeChallenge, state, scopes, allowedTools, resource }, client = db()) {
  must(
    await client.from('ai_oauth_codes').insert({
      code_hash: sha256(`request:${requestId}`),
      client_id: clientRow.client_id,
      owner_user_id: null,
      portfolio_id: PORTFOLIO_ID,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      state_hash: sha256(state),
      scopes,
      allowed_tools: allowedTools,
      resource,
      expires_at: nowPlus(CODE_TTL_MS),
    })
  )
  return { request_id: requestId, expires_at: nowPlus(CODE_TTL_MS) }
}

async function getAuthorizationRequest(requestId, state, client = db()) {
  const row = must(
    await client.from('ai_oauth_codes').select('*').eq('code_hash', sha256(`request:${requestId}`)).maybeSingle()
  )
  if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) return null
  if (state !== undefined && !constantEqual(sha256(state), row.state_hash)) return null
  return row
}

async function approveAuthorizationRequest({ requestId, state, ownerUserId }, client = db()) {
  const row = await getAuthorizationRequest(requestId, state, client)
  if (!row || row.owner_user_id) throw httpError(400, 'invalid_request', 'Authorization request is invalid or already decided.')
  await verifyConnectionOwner(ownerUserId, client)

  const code = randomToken('na_code_')
  const updated = must(
    await client
      .from('ai_oauth_codes')
      .update({
        code_hash: sha256(code),
        owner_user_id: ownerUserId,
        approved_at: new Date().toISOString(),
      })
      .eq('code_hash', sha256(`request:${requestId}`))
      .is('owner_user_id', null)
      .is('used_at', null)
      .select('redirect_uri')
      .maybeSingle()
  )
  if (!updated) throw httpError(400, 'invalid_request', 'Authorization request is invalid or already decided.')
  return { code, redirectUri: updated.redirect_uri, scopes: row.scopes || [] }
}

async function denyAuthorizationRequest({ requestId, state }, client = db()) {
  const row = await getAuthorizationRequest(requestId, state, client)
  if (!row) throw httpError(400, 'invalid_request', 'Authorization request is invalid or expired.')
  must(
    await client.from('ai_oauth_codes').update({ used_at: new Date().toISOString() })
      .eq('code_hash', sha256(`request:${requestId}`)).is('used_at', null)
  )
  return { redirectUri: row.redirect_uri }
}

async function redeemAuthorizationCode({ code, clientId, redirectUri, verifier, resource }, client = db()) {
  if (typeof code !== 'string' || !code.startsWith('na_code_')) {
    throw httpError(400, 'invalid_grant', 'Invalid authorization code.')
  }
  const codeHash = sha256(code)
  const row = must(
    await client.from('ai_oauth_codes').select('*').eq('code_hash', codeHash).maybeSingle()
  )
  if (!row || row.client_id !== clientId || !row.owner_user_id || row.used_at ||
      new Date(row.expires_at).getTime() <= Date.now()) {
    throw httpError(400, 'invalid_grant', 'Authorization code is invalid, expired or already used.')
  }
  const clientRow = await findClient(clientId, client)
  if (!clientRow || !clientRow.enabled) throw httpError(400, 'invalid_client', 'Client is disabled.')
  const canonicalResource = resource ? String(resource) : row.resource
  if (canonicalResource !== row.resource) {
    throw httpError(400, 'invalid_target', 'Resource indicator does not match the authorization request.')
  }
  // Redirect URI is compared against the value bound to the code, not one
  // supplied freely at token time.
  if (redirectUri !== row.redirect_uri) {
    throw httpError(400, 'invalid_grant', 'Redirect URI does not match the authorization request.')
  }
  const { verifyPkce } = require('./mcp-policy')
  if (!verifyPkce(verifier, row.code_challenge)) {
    throw httpError(400, 'invalid_grant', 'PKCE verification failed.')
  }
  const claimed = must(
    await client
      .from('ai_oauth_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('code_hash', codeHash)
      .is('used_at', null)
      .select('code_hash')
      .maybeSingle()
  )
  if (!claimed) throw httpError(400, 'invalid_grant', 'Authorization code was already redeemed.')
  return row
}

async function issueTokens({ clientRow, ownerUserId, scopes, allowedTools, resource }, client = db()) {
  const accessToken = randomToken('na_mcp_')
  const refreshToken = randomToken('na_ref_')
  must(
    await client.from('ai_oauth_tokens').insert({
      token_hash: sha256(accessToken),
      refresh_token_hash: sha256(refreshToken),
      client_id: clientRow.client_id,
      owner_user_id: ownerUserId,
      portfolio_id: PORTFOLIO_ID,
      scopes,
      allowed_tools: allowedTools,
      resource,
      expires_at: nowPlus(ACCESS_TTL_MS),
      refresh_expires_at: nowPlus(REFRESH_TTL_MS),
    })
  )
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: Math.floor(ACCESS_TTL_MS / 1000),
    scope: scopes.join(' '),
  }
}

async function findAccessToken(rawToken, client = db()) {
  const tokenHash = sha256(rawToken)
  const token = must(
    await client.from('ai_oauth_tokens').select('*').eq('token_hash', tokenHash).maybeSingle()
  )
  if (!token || token.revoked_at || new Date(token.expires_at).getTime() <= Date.now()) return null
  const clientRow = await findClient(token.client_id, client)
  if (!clientRow || !clientRow.enabled) return null
  if (token.portfolio_id !== PORTFOLIO_ID) return null
  await verifyConnectionOwner(token.owner_user_id, client)
  must(await client.from('ai_oauth_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', token.id))
  must(await client.from('ai_oauth_clients').update({ last_used_at: new Date().toISOString() }).eq('id', clientRow.id))
  return { token, client: clientRow }
}

async function refreshTokens({ refreshToken, clientId, resource }, client = db()) {
  const hash = sha256(refreshToken)
  const token = must(
    await client.from('ai_oauth_tokens').select('*').eq('refresh_token_hash', hash).maybeSingle()
  )
  if (!token || token.revoked_at || token.client_id !== clientId) {
    throw httpError(400, 'invalid_grant', 'Refresh token is invalid.')
  }
  if (!token.refresh_expires_at || new Date(token.refresh_expires_at).getTime() <= Date.now()) {
    throw httpError(400, 'invalid_grant', 'Refresh token has expired.')
  }
  const clientRow = await findClient(clientId, client)
  if (!clientRow || !clientRow.enabled) throw httpError(400, 'invalid_client', 'Client is disabled.')
  if (resource && resource !== token.resource) {
    throw httpError(400, 'invalid_target', 'Resource indicator does not match the original grant.')
  }
  await verifyConnectionOwner(token.owner_user_id, client)

  const nextRefresh = randomToken('na_ref_')
  const claimed = must(
    await client
      .from('ai_oauth_tokens')
      .update({ refresh_token_hash: sha256(nextRefresh), refresh_expires_at: nowPlus(REFRESH_TTL_MS) })
      .eq('id', token.id)
      .eq('refresh_token_hash', hash)
      .select('id')
      .maybeSingle()
  )
  if (!claimed) throw httpError(400, 'invalid_grant', 'Refresh token was already rotated.')

  const accessToken = randomToken('na_mcp_')
  must(
    await client.from('ai_oauth_tokens').update({
      token_hash: sha256(accessToken),
      expires_at: nowPlus(ACCESS_TTL_MS),
      revoked_at: null,
      last_used_at: null,
    }).eq('id', token.id)
  )
  return {
    access_token: accessToken,
    refresh_token: nextRefresh,
    token_type: 'Bearer',
    expires_in: Math.floor(ACCESS_TTL_MS / 1000),
    scope: (token.scopes || []).join(' '),
  }
}

async function revokeToken(rawToken, client = db()) {
  const hash = sha256(rawToken)
  const token = must(
    await client.from('ai_oauth_tokens').select('id, client_id').eq('token_hash', hash).maybeSingle()
  )
  if (token) {
    must(await client.from('ai_oauth_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', token.id))
  }
  return { revoked: Boolean(token) }
}

async function revokeTokenById(id, client = db()) {
  const row = must(
    await client.from('ai_oauth_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', id).select('id').maybeSingle()
  )
  return Boolean(row)
}

async function listTokens(clientId, client = db()) {
  let query = client
    .from('ai_oauth_tokens')
    .select('id, client_id, scopes, allowed_tools, resource, expires_at, refresh_expires_at, revoked_at, last_used_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (clientId) query = query.eq('client_id', clientId)
  return must(await query)
}

// ---------------------------------------------------------------------------
// Pending confirmation and audit
// ---------------------------------------------------------------------------

async function createPending(ctx, toolName, args, summary, client = db()) {
  const id = randomToken('apr_').replace('na_mcp_', '')
  must(
    await client.from('ai_pending_actions').insert({
      id,
      owner_user_id: ctx.ownerUserId,
      client_id: ctx.client.client_id,
      token_id: ctx.token.id,
      tool_name: toolName,
      args,
      args_hash: sha256(JSON.stringify(args)),
      summary,
      expires_at: nowPlus(PENDING_TTL_MS),
    })
  )
  return { approval_id: id, expires_at: nowPlus(PENDING_TTL_MS), summary }
}

async function getPending(approvalId, ctx, client = db()) {
  const row = must(
    await client.from('ai_pending_actions').select('*').eq('id', String(approvalId || '')).maybeSingle()
  )
  if (!row || row.owner_user_id !== ctx.ownerUserId || row.client_id !== ctx.client.client_id) return null
  if (row.token_id !== ctx.token.id || row.used_at || row.decision === 'rejected') return null
  if (new Date(row.expires_at).getTime() <= Date.now()) return null
  return row
}

async function consumePending(id, client = db()) {
  const row = must(
    await client
      .from('ai_pending_actions')
      .update({ used_at: new Date().toISOString() })
      .eq('id', id)
      .is('used_at', null)
      .neq('decision', 'rejected')
      .select('*')
      .maybeSingle()
  )
  return row
}

async function listPending(client = db()) {
  return must(
    await client
      .from('ai_pending_actions')
      .select('id, client_id, tool_name, summary, expires_at, used_at, decision, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
  )
}

async function decidePending(id, decision, client = db()) {
  if (!['approved', 'rejected'].includes(decision)) throw httpError(400, 'invalid_decision', 'Invalid decision.')
  return Boolean(
    must(
      await client
        .from('ai_pending_actions')
        .update({ decision, decided_at: new Date().toISOString() })
        .eq('id', id)
        .select('id')
        .maybeSingle()
    )
  )
}

async function recordAudit(entry, client = db()) {
  const row = {
    created_at: new Date().toISOString(),
    owner_user_id: entry.ownerUserId || null,
    client_id: entry.clientId || null,
    token_id: entry.tokenId || null,
    portfolio_id: entry.portfolioId || PORTFOLIO_ID,
    event_type: String(entry.eventType || 'tool_call').slice(0, 40),
    tool_name: entry.toolName ? String(entry.toolName).slice(0, 80) : null,
    outcome: String(entry.outcome || 'error').slice(0, 40),
    request_id: entry.requestId ? String(entry.requestId).slice(0, 80) : null,
    summary: redactAudit(entry.summary),
    error_code: entry.errorCode ? String(entry.errorCode).slice(0, 80) : null,
    caller_hash: entry.callerHash ? String(entry.callerHash).slice(0, 80) : null,
    user_agent: entry.userAgent ? sanitizeText(entry.userAgent, 140) : null,
  }
  must(await client.from('ai_connection_audit').insert(row))
}

async function listAudit({ clientId, toolName, limit = 100 } = {}, client = db()) {
  let query = client
    .from('ai_connection_audit')
    .select('id, created_at, client_id, tool_name, event_type, outcome, request_id, summary, error_code')
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(Number(limit) || 100, 1), 200))
  if (clientId) query = query.eq('client_id', clientId)
  if (toolName) query = query.eq('tool_name', toolName)
  return must(await query)
}

async function countRecentRegistrations(callerHashValue, client = db()) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const result = await client
    .from('ai_connection_audit')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'registration')
    .eq('caller_hash', callerHashValue)
    .gte('created_at', since)
  if (result.error) return 999
  return result.count || 0
}

// ---------------------------------------------------------------------------
// Application tool execution
// ---------------------------------------------------------------------------

function numericOrColumn(idValue) {
  const value = String(idValue || '')
  return /^\d+$/.test(value) ? { column: 'id', value: Number(value) } : { column: null, value }
}

function applyIdFilter(query, idValue, columnMap) {
  const parsed = numericOrColumn(idValue)
  const column = parsed.column || columnMap?.slug || 'id'
  return query.eq(column, parsed.column ? parsed.value : parsed.value)
}

async function countRows(client, table, filter) {
  let query = client.from(table).select('id', { count: 'exact', head: true })
  if (filter) query = query.eq(filter.column, filter.value)
  const result = await query
  if (result.error) throw httpError(500, 'database_error', 'Application data operation failed.')
  return result.count || 0
}

async function executeTool(name, args, ctx, client = db()) {
  const ownerUserId = ctx.ownerUserId
  switch (name) {
    case 'mcp_get_profile': {
      const profile = must(
        await client.from('personal_info').select('name, handle, title, tagline, bio, avatar').eq('id', 1).maybeSingle()
      )
      const identity = `prf_${sha256(`profile:${ownerUserId}`).slice(0, 16)}`
      return untrustedResult({
        id: identity,
        name: profile?.name || 'Neural Aurora',
        email: ctx.ownerEmail || undefined,
        nickname: profile?.handle || 'portfolio owner',
        portfolio_id: PORTFOLIO_ID,
        title: profile?.title || '',
        tagline: profile?.tagline || '',
      })
    }

    case 'mcp_list_projects': {
      const rows = must(
        await client.from('projects').select('id, project_id, title, description, technologies, link, github, demo, display_order')
          .order('display_order', { ascending: true }).limit(args.limit || 30)
      )
      return untrustedResult({ projects: rows })
    }

    case 'mcp_get_project': {
      const parsed = numericOrColumn(args.id)
      let query = client.from('projects').select('id, project_id, title, description, technologies, image, images, link, github, demo, display_order')
      query = parsed.column ? query.eq('id', parsed.value) : query.eq('project_id', parsed.value)
      const row = must(await query.maybeSingle())
      if (!row) throw httpError(404, 'not_found', 'Project not found.')
      return untrustedResult({ project: row })
    }

    case 'mcp_list_services': {
      const rows = must(
        await client.from('services').select('id, service_id, title, tagline, description, price, currency, period, delivery, display_order')
          .order('display_order', { ascending: true }).limit(args.limit || 30)
      )
      return untrustedResult({ services: rows })
    }

    case 'mcp_get_service': {
      const parsed = numericOrColumn(args.id)
      let query = client.from('services').select('id, service_id, title, tagline, description, features, price, currency, period, delivery')
      query = parsed.column ? query.eq('id', parsed.value) : query.eq('service_id', parsed.value)
      const row = must(await query.maybeSingle())
      if (!row) throw httpError(404, 'not_found', 'Service not found.')
      return untrustedResult({ service: row })
    }

    case 'mcp_list_blog_posts': {
      const columns = args.includeContent
        ? 'id, post_id, title, slug, excerpt, content, date, tags'
        : 'id, post_id, title, slug, excerpt, date, tags'
      const rows = must(await client.from('blog_posts').select(columns).order('date', { ascending: false }).limit(args.limit || 30))
      return untrustedResult({ posts: rows })
    }

    case 'mcp_get_blog_post': {
      const parsed = numericOrColumn(args.id)
      let query = client.from('blog_posts').select('id, post_id, title, slug, excerpt, content, date, read_time, tags')
      query = parsed.column ? query.eq('id', parsed.value) : query.eq('slug', parsed.value)
      const row = must(await query.maybeSingle())
      if (!row) throw httpError(404, 'not_found', 'Blog post not found.')
      return untrustedResult({ post: row })
    }

    case 'mcp_list_blog_drafts': {
      const rows = must(
        await client.from('ai_content_drafts').select('id, title, slug, excerpt, tags, created_at')
          .eq('owner_user_id', ownerUserId).is('published_at', null)
          .order('created_at', { ascending: false }).limit(args.limit || 30)
      )
      return untrustedResult({ drafts: rows })
    }

    case 'mcp_list_gallery': {
      const rows = must(
        await client.from('gallery').select('id, gallery_id, title, category, image_url, description, display_order')
          .order('display_order', { ascending: true }).limit(args.limit || 30)
      )
      return untrustedResult({ gallery: rows })
    }

    case 'mcp_get_analytics_summary': {
      const [visitorRow, projects, posts, services, inquiries, paidOrders] = await Promise.all([
        client.from('visitor_stats').select('count').eq('id', 1).maybeSingle(),
        countRows(client, 'projects'),
        countRows(client, 'blog_posts'),
        countRows(client, 'services'),
        countRows(client, 'contact_messages'),
        countRows(client, 'orders', { column: 'payment_status', value: 'paid' }),
      ])
      if (visitorRow.error) throw httpError(500, 'database_error', 'Application data operation failed.')

      // Same paged, per-currency approach as the trusted admin dashboard stats.
      const revenueByCurrency = {}
      const PAGE_SIZE = 1000
      let from = 0
      for (;;) {
        const page = await client
          .from('orders')
          .select('id, total_paise, currency')
          .eq('payment_status', 'paid')
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1)
        if (page.error) throw httpError(500, 'database_error', 'Application data operation failed.')
        for (const order of page.data || []) {
          const currency = order.currency || 'INR'
          revenueByCurrency[currency] = (revenueByCurrency[currency] || 0) + Number(order.total_paise || 0)
        }
        if (!page.data || page.data.length < PAGE_SIZE) break
        from += PAGE_SIZE
      }

      return simpleResult({
        visitors: Number(visitorRow.data?.count || 0),
        projects,
        blog_posts: posts,
        services,
        inquiries,
        paid_orders: paidOrders,
        revenue_by_currency_paise: revenueByCurrency,
      })
    }

    case 'mcp_list_crm_inquiries': {
      let query = client.from('contact_messages').select('id, name, email, message, read, created_at')
      if (args.unreadOnly) query = query.eq('read', false)
      const rows = must(await query.order('created_at', { ascending: false }).limit(args.limit || 30))
      return untrustedResult({
        inquiries: rows.map((row) => ({
          ...row,
          name: sanitizeText(row.name, 160),
          message: sanitizeText(row.message, 4000),
        })),
      })
    }

    case 'mcp_get_crm_inquiry': {
      const parsed = numericOrColumn(args.id)
      if (!parsed.column) throw httpError(400, 'invalid_id', 'Inquiry id must be numeric.')
      const row = must(
        await client.from('contact_messages').select('id, name, email, message, read, created_at').eq('id', parsed.value).maybeSingle()
      )
      if (!row) throw httpError(404, 'not_found', 'Inquiry not found.')
      return untrustedResult({ inquiry: { ...row, message: sanitizeText(row.message, 4000) } })
    }

    case 'mcp_list_order_summaries': {
      let query = client.from('orders').select('id, order_ref, payment_status, currency, total_paise, created_at')
      if (args.status) query = query.eq('payment_status', args.status)
      const rows = must(await query.order('created_at', { ascending: false }).limit(args.limit || 30))
      return untrustedResult({
        orders: rows.map((row) => ({
          id: row.id,
          order_ref: row.order_ref,
          payment_status: row.payment_status,
          currency: row.currency,
          total_paise: row.total_paise,
          created_at: row.created_at,
        })),
      })
    }

    case 'mcp_list_tasks': {
      let query = client.from('admin_tasks').select('id, title, description, status, priority, due_date, created_at')
        .eq('owner_user_id', ownerUserId)
      if (args.status) query = query.eq('status', args.status)
      const rows = must(await query.order('created_at', { ascending: false }).limit(args.limit || 30))
      return untrustedResult({ tasks: rows })
    }

    case 'mcp_create_task': {
      const row = must(
        await client.from('admin_tasks').insert({
          owner_user_id: ownerUserId,
          created_by: ownerUserId,
          title: args.title,
          description: args.description || '',
          priority: args.priority || 'normal',
          due_date: args.due_date || null,
          status: 'open',
        }).select('id, title, status, priority, due_date, created_at').maybeSingle()
      )
      return simpleResult({ task: row })
    }

    case 'mcp_update_task': {
      const parsed = numericOrColumn(args.id)
      if (!parsed.column) throw httpError(400, 'invalid_id', 'Task id must be numeric.')
      const patch = {}
      for (const key of ['title', 'description', 'status', 'priority']) {
        if (args[key] !== undefined) patch[key] = args[key]
      }
      if (Object.keys(patch).length === 0) throw httpError(400, 'empty_update', 'No fields to update.')
      const row = must(
        await client.from('admin_tasks').update(patch).eq('id', parsed.value).eq('owner_user_id', ownerUserId)
          .select('id, title, description, status, priority, due_date, updated_at').maybeSingle()
      )
      if (!row) throw httpError(404, 'not_found', 'Task not found.')
      return simpleResult({ task: row })
    }

    case 'mcp_create_report': {
      let payload = null
      if (args.data) {
        try {
          payload = JSON.parse(args.data)
        } catch {
          payload = { text: args.data }
        }
      }
      const row = must(
        await client.from('admin_reports').insert({
          owner_user_id: ownerUserId,
          created_by: ownerUserId,
          title: args.title,
          summary: args.summary,
          period_start: args.period_start || null,
          period_end: args.period_end || null,
          payload,
        }).select('id, title, summary, period_start, period_end, created_at').maybeSingle()
      )
      return simpleResult({ report: row })
    }

    case 'mcp_draft_customer_reply': {
      const parsed = numericOrColumn(args.inquiry_id)
      if (!parsed.column) throw httpError(400, 'invalid_id', 'Inquiry id must be numeric.')
      const inquiry = must(
        await client.from('contact_messages').select('id, name').eq('id', parsed.value).maybeSingle()
      )
      if (!inquiry) throw httpError(404, 'not_found', 'Inquiry not found.')
      const row = must(
        await client.from('customer_reply_drafts').insert({
          owner_user_id: ownerUserId,
          created_by: ownerUserId,
          inquiry_id: parsed.value,
          recipient_name: sanitizeText(inquiry.name, 160),
          subject: args.subject || '',
          body: args.body,
          status: 'draft',
        }).select('id, inquiry_id, subject, body, status, created_at').maybeSingle()
      )
      return simpleResult({ draft: row, sent: false })
    }

    case 'mcp_mark_inquiry_read': {
      const parsed = numericOrColumn(args.id)
      if (!parsed.column) throw httpError(400, 'invalid_id', 'Inquiry id must be numeric.')
      const row = must(
        await client.from('contact_messages').update({ read: true }).eq('id', parsed.value)
          .select('id, read').maybeSingle()
      )
      if (!row) throw httpError(404, 'not_found', 'Inquiry not found.')
      return simpleResult({ inquiry: row })
    }

    case 'mcp_create_blog_draft': {
      const row = must(
        await client.from('ai_content_drafts').insert({
          owner_user_id: ownerUserId,
          created_by: ownerUserId,
          kind: 'blog',
          title: args.title,
          slug: args.slug,
          excerpt: args.excerpt || '',
          content: args.content,
          tags: args.tags || [],
        }).select('id, title, slug, excerpt, tags, created_at').maybeSingle()
      )
      return simpleResult({ draft: row, published: false })
    }

    case 'mcp_publish_blog_draft': {
      const draft = must(
        await client.from('ai_content_drafts').select('*').eq('id', args.draft_id).eq('owner_user_id', ownerUserId).is('published_at', null).maybeSingle()
      )
      if (!draft) throw httpError(404, 'not_found', 'Draft not found or already published.')
      const published = must(
        await client.from('blog_posts').insert({
          post_id: `mcp_${Date.now()}_${sha256(draft.id).slice(0, 8)}`,
          title: draft.title,
          slug: draft.slug,
          excerpt: draft.excerpt || '',
          content: draft.content || '',
          date: new Date().toISOString().slice(0, 10),
          read_time: '5 min read',
          tags: draft.tags || [],
        }).select('id, post_id, title, slug, date').maybeSingle()
      )
      must(await client.from('ai_content_drafts').update({ published_at: new Date().toISOString() }).eq('id', draft.id))
      return simpleResult({ published: true, post: published })
    }

    case 'mcp_update_blog_post': {
      const parsed = numericOrColumn(args.id)
      const patch = {}
      for (const key of ['title', 'excerpt', 'content', 'tags']) {
        if (args[key] !== undefined) patch[key] = args[key]
      }
      if (Object.keys(patch).length === 0) throw httpError(400, 'empty_update', 'No fields to update.')
      let query = client.from('blog_posts').update(patch)
      query = parsed.column ? query.eq('id', parsed.value) : query.eq('slug', parsed.value)
      const row = must(await query.select('id, post_id, title, slug, excerpt, date').maybeSingle())
      if (!row) throw httpError(404, 'not_found', 'Blog post not found.')
      return simpleResult({ post: row })
    }

    case 'mcp_create_project': {
      const row = must(
        await client.from('projects').insert({
          project_id: args.project_id,
          title: args.title,
          description: args.description,
          technologies: args.technologies || [],
          link: args.link || '',
          github: '',
          demo: '',
          image: '/images/project-placeholder.png',
          images: [],
          display_order: args.display_order || 0,
        }).select('id, project_id, title').maybeSingle()
      )
      return simpleResult({ project: row })
    }

    case 'mcp_update_project': {
      const parsed = numericOrColumn(args.id)
      const patch = {}
      for (const key of ['title', 'description', 'technologies', 'link', 'display_order']) {
        if (args[key] !== undefined) patch[key] = args[key]
      }
      if (Object.keys(patch).length === 0) throw httpError(400, 'empty_update', 'No fields to update.')
      let query = client.from('projects').update(patch)
      query = parsed.column ? query.eq('id', parsed.value) : query.eq('project_id', parsed.value)
      const row = must(await query.select('id, project_id, title, description').maybeSingle())
      if (!row) throw httpError(404, 'not_found', 'Project not found.')
      return simpleResult({ project: row })
    }

    case 'mcp_delete_project': {
      if (args.confirm_delete !== true) throw httpError(400, 'confirmation_required', 'confirm_delete must be true.')
      const parsed = numericOrColumn(args.id)
      let query = client.from('projects').delete()
      query = parsed.column ? query.eq('id', parsed.value) : query.eq('project_id', parsed.value)
      const row = must(await query.select('id, project_id').maybeSingle())
      if (!row) throw httpError(404, 'not_found', 'Project not found.')
      return simpleResult({ deleted: true, project: row })
    }

    case 'mcp_create_gallery_item': {
      const url = new URL(args.image_url)
      if (!['https:'].includes(url.protocol)) throw httpError(400, 'invalid_image_url', 'Gallery images must use HTTPS.')
      const row = must(
        await client.from('gallery').insert({
          gallery_id: args.gallery_id,
          title: args.title || '',
          category: args.category || '',
          image_url: args.image_url,
          description: args.description || '',
          display_order: args.display_order || 0,
        }).select('id, gallery_id, title, image_url').maybeSingle()
      )
      return simpleResult({ gallery_item: row })
    }

    case 'mcp_delete_gallery_item': {
      if (args.confirm_delete !== true) throw httpError(400, 'confirmation_required', 'confirm_delete must be true.')
      const parsed = numericOrColumn(args.id)
      if (!parsed.column) throw httpError(400, 'invalid_id', 'Gallery id must be numeric.')
      const row = must(await client.from('gallery').delete().eq('id', parsed.value).select('id, gallery_id').maybeSingle())
      if (!row) throw httpError(404, 'not_found', 'Gallery item not found.')
      return simpleResult({ deleted: true, gallery_item: row })
    }

    default:
      throw httpError(403, 'prohibited_operation', 'Tool is not permitted.')
  }
}

module.exports = {
  PORTFOLIO_ID,
  CODE_TTL_MS,
  ACCESS_TTL_MS,
  REFRESH_TTL_MS,
  PENDING_TTL_MS,
  httpError,
  db,
  must,
  callerHash,
  verifyConnectionOwner,
  requireOwnerAdmin,
  getAccessSettings,
  setAccessSettings,
  listToolSettings,
  getEnabledToolMap,
  getToolSettingsMap,
  setToolSetting,
  validateRedirectUris,
  scopesForTools,
  createClient,
  findClient,
  listClients,
  updateClient,
  revokeClient,
  createAuthorizationCode,
  createAuthorizationRequest,
  getAuthorizationRequest,
  approveAuthorizationRequest,
  denyAuthorizationRequest,
  redeemAuthorizationCode,
  issueTokens,
  findAccessToken,
  refreshTokens,
  revokeToken,
  revokeTokenById,
  listTokens,
  createPending,
  getPending,
  consumePending,
  listPending,
  decidePending,
  recordAudit,
  listAudit,
  countRecentRegistrations,
  executeTool,
}
