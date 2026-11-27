import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Copy,
  FileText,
  KeyRound,
  Layers,
  ListChecks,
  Pencil,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { mcpAdminRequest } from '../../lib/mcpAdmin'
import './ai-connections.css'

const emptyForm = {
  name: '',
  redirectUri: '',
  tools: [],
  authMethod: 'none',
  offline: true,
}

const SCOPE_LABELS = {
  'profile:read': 'Identity',
  'content:read': 'Portfolio content',
  'content:write': 'Content changes',
  'crm:read': 'Inquiries',
  'orders:read': 'Order summaries',
  'analytics:read': 'Analytics',
  'tasks:write': 'Internal work',
  'offline_access': 'Refresh tokens',
}

const RISK_LABELS = {
  read: 'Read',
  write: 'Write',
  external: 'External',
  destructive: 'Destructive',
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

function short(value, length = 90) {
  const text = String(value ?? '')
  return text.length > length ? `${text.slice(0, length)}…` : text
}

function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <label className="mcp-switch" title={label}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
        disabled={disabled}
      />
      <span className="mcp-switch-track" aria-hidden="true">
        <span className="mcp-switch-thumb" />
      </span>
    </label>
  )
}

function CopyButton({ value, toast, label = 'Copied' }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied.`)
    } catch {
      toast.error('Copy failed. Select the value and copy it manually.')
    }
  }
  return (
    <button
      type="button"
      className="mcp-icon-btn"
      onClick={copy}
      aria-label={`Copy ${label.toLowerCase()}`}
      title={`Copy ${label.toLowerCase()}`}
    >
      <Copy size={14} />
    </button>
  )
}

function SectionHead({ eyebrow, title, sub, action }) {
  return (
    <div className="mcp-section-head">
      <div>
        <div className="mcp-eyebrow">{eyebrow}</div>
        <h2 className="mcp-h2">{title}</h2>
        {sub && <p className="mcp-sub">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

function Pill({ children, variant = '' }) {
  return <span className={`mcp-badge ${variant ? `mcp-badge-${variant}` : ''}`}>{children}</span>
}

function Empty({ icon: Icon, children }) {
  return (
    <div className="mcp-empty">
      <span className="mcp-empty-icon"><Icon size={17} /></span>
      <span>{children}</span>
    </div>
  )
}

function EndpointChip({ label, value, toast }) {
  return (
    <div className="mcp-field">
      <span className="mcp-endpoint-label">{label}</span>
      <div className="mcp-endpoint-row">
        <code className="mcp-mono" title={value}>{short(value, 48)}</code>
        <CopyButton value={value} toast={toast} label={label} />
      </div>
    </div>
  )
}

export default function AdminAiConnections() {
  const { toast, confirm } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [newSecret, setNewSecret] = useState('')
  const [health, setHealth] = useState(null)

  const siteOrigin = typeof window === 'undefined' ? '' : window.location.origin
  const mcpUrl = siteOrigin ? `${siteOrigin}/api/mcp` : '/api/mcp'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await mcpAdminRequest('overview'))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!siteOrigin) return undefined
    let active = true
    Promise.all([
      fetch('/.well-known/oauth-authorization-server', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
      fetch('/.well-known/oauth-protected-resource', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
    ]).then(([authorizationServer, protectedResource]) => {
      if (!active) return
      setHealth({
        issuer: authorizationServer?.issuer || '',
        resource: protectedResource?.resource || '',
        issuerOk: authorizationServer?.issuer === siteOrigin,
        resourceOk: protectedResource?.resource === `${siteOrigin}/api/mcp`,
      })
    })
    return () => {
      active = false
    }
  }, [siteOrigin])

  const tools = data?.tools || []
  const scopeFor = useMemo(() => {
    const map = {}
    for (const tool of tools) map[tool.name] = tool.scope
    return map
  }, [tools])

  const toolGroups = useMemo(() => {
    const groups = new Map()
    for (const tool of tools) {
      const key = tool.scope || 'other'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(tool)
    }
    return [...groups.entries()]
  }, [tools])

  const selectedScopes = useMemo(() => {
    const scopes = new Set(form.tools.map((tool) => scopeFor[tool]).filter(Boolean))
    if (form.offline) scopes.add('offline_access')
    return [...scopes]
  }, [form.tools, form.offline, scopeFor])

  const activeSessions = (data?.tokens || []).filter((token) => !token.revoked_at).length
  const pendingActions = (data?.pending || []).filter((item) => !item.used_at && !item.decision).length
  const discoveryOk = health?.issuerOk && health?.resourceOk

  function toggleTool(name) {
    setForm((current) => ({
      ...current,
      tools: current.tools.includes(name)
        ? current.tools.filter((tool) => tool !== name)
        : [...current.tools, name],
    }))
  }

  function startEdit(client) {
    setEditingId(client.client_id)
    setNewSecret('')
    setForm({
      name: client.client_name || '',
      redirectUri: (client.redirect_uris || [])[0] || '',
      tools: client.allowed_tools || [],
      authMethod: client.token_endpoint_auth_method || 'none',
      offline: (client.allowed_scopes || []).includes('offline_access'),
    })
  }

  function resetForm() {
    setEditingId('')
    setForm(emptyForm)
  }

  async function saveClient(event) {
    event.preventDefault()
    try {
      const payload = {
        name: form.name,
        redirectUris: [form.redirectUri],
        allowedTools: form.tools,
        scopes: selectedScopes,
        authMethod: form.authMethod,
      }
      if (editingId) {
        await mcpAdminRequest('client-update', {
          method: 'POST',
          body: { clientId: editingId, ...payload, enabled: true },
        })
        toast.success('Client permissions saved.')
      } else {
        const result = await mcpAdminRequest('client-create', { method: 'POST', body: payload })
        setNewSecret(result.client?.client_secret || '')
        toast.success('Client registered. Copy the secret now if one was issued.')
      }
      resetForm()
      await load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function updateSetting(patch) {
    try {
      await mcpAdminRequest('settings', { method: 'POST', body: patch })
      toast.success('Access settings saved.')
      await load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function updateTool(tool, patch) {
    try {
      await mcpAdminRequest('tool', {
        method: 'POST',
        body: {
          tool: tool.name,
          enabled: patch.enabled ?? tool.enabled,
          requireApproval: patch.requireApproval ?? tool.require_approval,
        },
      })
      await load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function toggleClient(client) {
    try {
      await mcpAdminRequest('client-update', {
        method: 'POST',
        body: { clientId: client.client_id, enabled: !client.enabled },
      })
      await load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function revokeClient(client) {
    const ok = await confirm({
      title: 'Revoke client',
      message: `Revoke ${client.client_name} and every session it holds? This cannot be undone.`,
      confirmText: 'Revoke client',
      danger: true,
    })
    if (!ok) return
    try {
      await mcpAdminRequest('client-revoke', { method: 'POST', body: { clientId: client.client_id } })
      toast.success('Client and its sessions were revoked.')
      await load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function revokeToken(token) {
    const ok = await confirm({
      title: 'Revoke session',
      message: 'Revoke this access and refresh token? The client must reconnect.',
      confirmText: 'Revoke session',
      danger: true,
    })
    if (!ok) return
    try {
      await mcpAdminRequest('token-revoke', { method: 'POST', body: { id: token.id } })
      toast.success('Session revoked.')
      await load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function decidePending(item, decision) {
    try {
      await mcpAdminRequest('pending-decide', { method: 'POST', body: { id: item.id, decision } })
      toast.success(decision === 'approved' ? 'Action approved. The client can now confirm it.' : 'Action rejected.')
      await load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="mcp-page">
      <div className="mcp-hero">
        <div className="mcp-hero-grid">
          <div>
            <span className="mcp-kicker">External AI access</span>
            <h1 className="mcp-h1">AI Connections</h1>
            <p className="mcp-lede">
              Connect approved AI clients through one standards-based MCP endpoint. Neural Aurora never runs a model or
              sends your portfolio data to a model provider. The client reasons; you decide which tools it can call.
            </p>
          </div>
          <div className="mcp-endpoint">
            <span className="mcp-endpoint-label">MCP endpoint</span>
            <div className="mcp-endpoint-row">
              <code title={mcpUrl}>{mcpUrl}</code>
              <CopyButton value={mcpUrl} toast={toast} label="MCP endpoint" />
            </div>
            <span className="mcp-sub">Use this URL in ChatGPT, Claude, Cursor, or any HTTP MCP client.</span>
          </div>
        </div>
      </div>

      <div className="mcp-stats">
        <div className="mcp-stat">
          <span className="mcp-stat-icon"><ShieldCheck size={18} /></span>
          <div>
            <div className="mcp-stat-value">{data?.settings?.enabled ? 'Enabled' : 'Disabled'}</div>
            <div className="mcp-stat-label">External access</div>
          </div>
        </div>
        <div className="mcp-stat">
          <span className="mcp-stat-icon"><PlugZap size={18} /></span>
          <div>
            <div className="mcp-stat-value">{data?.clients?.length ?? 0}</div>
            <div className="mcp-stat-label">Registered clients</div>
          </div>
        </div>
        <div className="mcp-stat">
          <span className="mcp-stat-icon"><KeyRound size={18} /></span>
          <div>
            <div className="mcp-stat-value">{activeSessions}</div>
            <div className="mcp-stat-label">Active sessions</div>
          </div>
        </div>
        <div className="mcp-stat">
          <span className="mcp-stat-icon"><Activity size={18} /></span>
          <div>
            <div className="mcp-stat-value">{data?.audit?.length ?? 0}</div>
            <div className="mcp-stat-label">Audit events</div>
          </div>
        </div>
      </div>

      {health && !discoveryOk && (
        <div className="mcp-banner mcp-banner-warn">
          <AlertTriangle size={17} />
          <div>
            <strong>OAuth discovery is not bound to this site.</strong>{' '}
            Clients will be sent to <code className="mcp-mono">{health.issuer || 'an unknown origin'}</code>{' '}
            instead of <code className="mcp-mono">{siteOrigin}</code>. Set{' '}
            <code className="mcp-mono">SITE_URL={siteOrigin}</code> in Vercel, redeploy, then refresh this page.
          </div>
        </div>
      )}

      {health && discoveryOk && (
        <div className="mcp-banner mcp-banner-ok">
          <CheckCircle2 size={17} />
          <div>
            <strong>OAuth discovery is healthy.</strong> Clients will return here for owner consent, and the resource
            indicator resolves to this MCP endpoint.
          </div>
        </div>
      )}

      {error && (
        <div className="mcp-error"><AlertTriangle size={16} /><span>{error}</span></div>
      )}

      {loading && !data && (
        <div className="mcp-loading"><span className="mcp-spinner" />Loading connections…</div>
      )}

      {data && (
        <>
          <section className="mcp-section">
            <SectionHead
              eyebrow="Start here"
              title="Access control"
              sub="External access is off until you enable it. Approval requirements are a floor: externally visible and destructive tools always need a second confirmation."
            />
            <div className="mcp-grid-2">
              <div className="mcp-switch-row">
                <div className="mcp-switch-copy">
                  <div className="mcp-switch-title">Enable MCP access</div>
                  <div className="mcp-switch-desc">Allow approved clients to call tools after owner consent.</div>
                </div>
                <Switch
                  checked={Boolean(data.settings.enabled)}
                  onChange={(enabled) => updateSetting({ enabled })}
                  label="Enable MCP access"
                />
              </div>
              <div className="mcp-switch-row">
                <div className="mcp-switch-copy">
                  <div className="mcp-switch-title">Approve internal writes</div>
                  <div className="mcp-switch-desc">Require a second confirmation for internal task and report changes.</div>
                </div>
                <Switch
                  checked={data.settings.require_approval_default !== false}
                  onChange={(requireApprovalDefault) => updateSetting({ requireApprovalDefault })}
                  label="Require approval for internal write tools"
                />
              </div>
            </div>

            <div className="mcp-steps">
              <div className="mcp-step"><strong>Add the endpoint</strong>Paste the MCP URL into your client and choose OAuth.</div>
              <div className="mcp-step"><strong>Approve the client</strong>Sign in as owner and review the exact redirect, scopes and tools.</div>
              <div className="mcp-step"><strong>Grant only what is needed</strong>Tools you do not tick never appear in the client.</div>
              <div className="mcp-step"><strong>Confirm public changes</strong>Publishing and deletion stay staged until explicitly confirmed.</div>
            </div>

            <div className="mcp-grid-3" style={{ marginTop: 16 }}>
              <EndpointChip label="Authorization" value={`${siteOrigin}/api/mcp/authorize`} toast={toast} />
              <EndpointChip label="Token" value={`${siteOrigin}/api/mcp/token`} toast={toast} />
              <EndpointChip label="Registration" value={`${siteOrigin}/api/mcp/register`} toast={toast} />
            </div>
          </section>

          <section className="mcp-section">
            <SectionHead
              eyebrow="Clients"
              title={editingId ? 'Edit client permissions' : 'Register a client'}
              sub="Exact redirect URI matching, PKCE and owner consent are required. A client secret is shown only once."
              action={editingId ? (
                <button type="button" className="mcp-btn mcp-btn-quiet" onClick={resetForm}>
                  Cancel edit
                </button>
              ) : null}
            />

            <form className="mcp-grid-2" style={{ marginTop: 18 }} onSubmit={saveClient}>
              <label className="mcp-field">
                Client name
                <input
                  className="mcp-input"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  maxLength={80}
                  placeholder="ChatGPT"
                  required
                />
              </label>
              <label className="mcp-field">
                Redirect URI
                <input
                  className="mcp-input"
                  value={form.redirectUri}
                  onChange={(event) => setForm({ ...form, redirectUri: event.target.value })}
                  placeholder="https://client.example.com/oauth/callback"
                  required
                />
              </label>
              <label className="mcp-field">
                Token endpoint auth
                <select
                  className="mcp-select"
                  value={form.authMethod}
                  onChange={(event) => setForm({ ...form, authMethod: event.target.value })}
                >
                  <option value="none">None (public client + PKCE)</option>
                  <option value="client_secret_post">Client secret (POST)</option>
                </select>
              </label>
              <div className="mcp-switch-row">
                <div className="mcp-switch-copy">
                  <div className="mcp-switch-title">Allow refresh tokens</div>
                  <div className="mcp-switch-desc">Rotated on every use; old tokens cannot be replayed.</div>
                </div>
                <Switch
                  checked={form.offline}
                  onChange={(offline) => setForm({ ...form, offline })}
                  label="Allow long-lived refresh tokens"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <div className="mcp-tool-group-title"><Layers size={13} /> Allowed tools</div>
                {toolGroups.map(([scope, group]) => (
                  <div className="mcp-tool-group" key={scope}>
                    <div className="mcp-tool-group-title">
                      <span>{SCOPE_LABELS[scope] || scope}</span>
                      <Pill variant="cyan">{scope}</Pill>
                    </div>
                    <div className="mcp-tool-grid">
                      {group.map((tool) => (
                        <label
                          key={tool.name}
                          className={`mcp-tool-option ${form.tools.includes(tool.name) ? 'is-selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={form.tools.includes(tool.name)}
                            onChange={() => toggleTool(tool.name)}
                          />
                          <span>
                            <span className="mcp-tool-name">{tool.title || tool.name}</span>
                            <span className="mcp-tool-meta">{tool.name}</span>
                            <span className="mcp-tool-desc">
                              {tool.description}
                              {' '}
                              <Pill variant={tool.risk === 'read' ? '' : tool.risk === 'destructive' ? 'red' : 'amber'}>
                                {RISK_LABELS[tool.risk] || tool.risk}
                              </Pill>
                              {tool.approval === 'always' && <Pill variant="amber">confirm always</Pill>}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="mcp-sub" style={{ marginTop: 12 }}>
                  Scopes granted: <span className="mcp-mono">{selectedScopes.join(' ') || '(none)'}</span>
                </p>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button type="submit" className="mcp-btn mcp-btn-primary">
                  <CheckCircle2 size={15} />
                  {editingId ? 'Save permissions' : 'Register client'}
                </button>
                <span className="mcp-sub">
                  Payments, licensing, credentials, admin roles, raw DB/HTTP/shell access are never available.
                </span>
              </div>
            </form>

            {newSecret && (
              <div className="mcp-secret">
                <div>
                  <strong>Copy this client secret now.</strong> It is stored only as a hash and cannot be shown again.
                  <code>{newSecret}</code>
                </div>
                <CopyButton value={newSecret} toast={toast} label="Client secret" />
              </div>
            )}
          </section>

          <section className="mcp-section">
            <SectionHead
              eyebrow="Registry"
              title="Registered clients"
              sub="Every client is bound to the current owner and can be disabled or revoked at any time."
              action={<Pill variant={data.clients.length ? 'green' : ''}>{data.clients.length} total</Pill>}
            />
            {!data.clients.length ? (
              <div style={{ marginTop: 16 }}>
                <Empty icon={PlugZap}>No clients registered yet.</Empty>
              </div>
            ) : (
              <div className="mcp-list">
                {data.clients.map((client) => (
                  <div className="mcp-list-item" key={client.client_id}>
                    <div className="mcp-list-top">
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span className="mcp-list-title">{client.client_name}</span>
                          {client.revoked_at ? (
                            <Pill variant="red">revoked</Pill>
                          ) : client.enabled ? (
                            <Pill variant="green">enabled</Pill>
                          ) : (
                            <Pill variant="amber">disabled</Pill>
                          )}
                        </div>
                        <div className="mcp-mono" style={{ marginTop: 5 }}>{client.client_id}</div>
                        <div className="mcp-list-meta">{short((client.redirect_uris || []).join(', '), 140)}</div>
                        <div className="mcp-list-meta">
                          {(client.allowed_tools || []).length} tools ·{' '}
                          {(client.allowed_scopes || []).join(' ') || 'no scopes'} ·{' '}
                          {client.revoked_at ? `revoked ${formatDate(client.revoked_at)}` : 'active'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <CopyButton value={client.client_id} toast={toast} label="Client ID" />
                        <div className="mcp-row-actions">
                          <button type="button" className="mcp-btn" onClick={() => startEdit(client)}>
                            <Pencil size={14} /> Edit
                          </button>
                          {!client.revoked_at && (
                            <button type="button" className="mcp-btn" onClick={() => toggleClient(client)}>
                              <RefreshCw size={14} /> {client.enabled ? 'Disable' : 'Enable'}
                            </button>
                          )}
                          {!client.revoked_at && (
                            <button type="button" className="mcp-btn mcp-btn-danger" onClick={() => revokeClient(client)}>
                              <Ban size={14} /> Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mcp-section">
            <SectionHead
              eyebrow="Policy"
              title="Tool permissions"
              sub="Global switches apply to every connection. A client must also be granted the tool and its scope before it appears."
            />
            <div className="mcp-table-wrap">
              <table className="mcp-table">
                <thead>
                  <tr>
                    <th>Tool</th>
                    <th>Scope</th>
                    <th>Risk</th>
                    <th>Enabled</th>
                    <th>Confirmation</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((tool) => (
                    <tr key={tool.name}>
                      <td>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{tool.title || tool.name}</div>
                        <div className="mcp-mono">{tool.name}</div>
                      </td>
                      <td><Pill variant="cyan">{tool.scope}</Pill></td>
                      <td>
                        <Pill variant={tool.risk === 'read' ? '' : tool.risk === 'destructive' ? 'red' : 'amber'}>
                          {RISK_LABELS[tool.risk] || tool.risk}
                        </Pill>
                      </td>
                      <td>
                        <Switch
                          checked={tool.enabled !== false}
                          onChange={(enabled) => updateTool(tool, { enabled })}
                          label={`Enable ${tool.title || tool.name}`}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Switch
                            checked={tool.approval === 'always' || Boolean(tool.require_approval)}
                            onChange={(requireApproval) => updateTool(tool, { requireApproval })}
                            label={`Require confirmation for ${tool.title || tool.name}`}
                            disabled={tool.approval === 'always'}
                          />
                          {tool.approval === 'always' && <Pill variant="amber">always</Pill>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mcp-grid-2">
            <section className="mcp-section">
              <SectionHead
                eyebrow="Sessions"
                title="Active sessions"
                sub="Revoking a session forces the client to reconnect and complete consent again."
              />
              {!data.tokens.length ? (
                <div style={{ marginTop: 16 }}><Empty icon={KeyRound}>No sessions.</Empty></div>
              ) : (
                <div className="mcp-list">
                  {data.tokens.map((token) => (
                    <div className="mcp-list-item" key={token.id}>
                      <div className="mcp-list-top">
                        <div style={{ minWidth: 0 }}>
                          <div className="mcp-mono" style={{ color: 'var(--text-primary)' }}>{token.client_id}</div>
                          <div className="mcp-list-meta">
                            {(token.scopes || []).join(' ') || 'no scopes'} · expires {formatDate(token.expires_at)}
                          </div>
                          <div className="mcp-list-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {token.revoked_at ? <Pill variant="red">revoked</Pill> : <Pill variant="green">active</Pill>}
                            {token.revoked_at && <span>{formatDate(token.revoked_at)}</span>}
                          </div>
                        </div>
                        {!token.revoked_at && (
                          <button type="button" className="mcp-btn mcp-btn-danger" onClick={() => revokeToken(token)}>
                            <Trash2 size={14} /> Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mcp-section">
              <SectionHead
                eyebrow="Confirmations"
                title="Pending actions"
                sub="Externally visible and destructive tools wait here until the owner and client both confirm."
                action={<Pill variant={pendingActions ? 'amber' : ''}>{pendingActions} waiting</Pill>}
              />
              {!data.pending.length ? (
                <div style={{ marginTop: 16 }}><Empty icon={ListChecks}>No staged actions.</Empty></div>
              ) : (
                <div className="mcp-list">
                  {data.pending.map((item) => (
                    <div className="mcp-list-item" key={item.id}>
                      <div className="mcp-list-title">{item.tool_name}</div>
                      <div className="mcp-list-meta">{short(item.summary, 180)}</div>
                      <div className="mcp-list-meta">
                        {item.client_id} · expires {formatDate(item.expires_at)} · {item.decision || 'awaiting decision'}
                      </div>
                      {!item.used_at && !item.decision && (
                        <div className="mcp-row-actions" style={{ marginTop: 12 }}>
                          <button type="button" className="mcp-btn mcp-btn-primary" onClick={() => decidePending(item, 'approved')}>
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button type="button" className="mcp-btn" onClick={() => decidePending(item, 'rejected')}>
                            <Ban size={14} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="mcp-section">
            <SectionHead
              eyebrow="Accountability"
              title="Audit log"
              sub="Redacted before storage. Tool arguments are recorded as key names only; tokens, secrets and customer identifiers are not written here."
              action={<Pill>{data.audit.length} events</Pill>}
            />
            {!data.audit.length ? (
              <div style={{ marginTop: 16 }}><Empty icon={FileText}>No tool activity yet.</Empty></div>
            ) : (
              <div className="mcp-table-wrap">
                <table className="mcp-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Event</th>
                      <th>Tool</th>
                      <th>Client</th>
                      <th>Outcome</th>
                      <th>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.audit.map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.created_at)}</td>
                        <td><Pill>{entry.event_type}</Pill></td>
                        <td className="mcp-mono">{entry.tool_name || '—'}</td>
                        <td className="mcp-mono">{short(entry.client_id, 24)}</td>
                        <td>
                          <Pill variant={entry.outcome === 'success' ? 'green' : entry.outcome === 'denied' ? 'red' : ''}>
                            {entry.outcome}{entry.error_code ? ` · ${entry.error_code}` : ''}
                          </Pill>
                        </td>
                        <td>{short(entry.summary, 180)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
