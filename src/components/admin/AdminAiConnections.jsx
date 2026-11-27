import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { mcpAdminRequest } from '../../lib/mcpAdmin'

const emptyForm = {
  name: '',
  redirectUri: '',
  tools: [],
  authMethod: 'none',
  offline: true,
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

export default function AdminAiConnections() {
  const { toast, confirm } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [newSecret, setNewSecret] = useState('')

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

  const tools = data?.tools || []
  const scopeFor = useMemo(() => {
    const map = {}
    for (const tool of tools) map[tool.name] = tool.scope
    return map
  }, [tools])

  const selectedScopes = useMemo(() => {
    const scopes = new Set(form.tools.map((tool) => scopeFor[tool]).filter(Boolean))
    if (form.offline) scopes.add('offline_access')
    return [...scopes]
  }, [form.tools, form.offline, scopeFor])

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
        body: { tool: tool.name, enabled: patch.enabled ?? tool.enabled, requireApproval: patch.requireApproval ?? tool.require_approval },
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

  const cardStyle = {
    borderColor: 'var(--border-color)',
    background: 'var(--bg-secondary)',
  }
  const muted = { color: 'var(--text-tertiary)' }
  const inputStyle = {
    background: 'var(--bg-primary)',
    borderColor: 'var(--border-color)',
    color: 'var(--text-primary)',
  }
  const buttonClass = 'rounded-lg border px-3 py-1.5 text-xs transition-colors hover:brightness-110'
  const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/40'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>AI Connections</h1>
        <p className="mt-1 max-w-3xl text-sm" style={muted}>
          Connect compatible external AI clients through a read-by-default, default-deny MCP server. Neural Aurora never
          runs a model or sends your data to a model provider; the client does the reasoning and calls only the tools you approve.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      )}
      {loading && !data && <div className="text-sm" style={muted}>Loading connections…</div>}

      {data && (
        <>
          <section className="rounded-2xl border p-5" style={cardStyle}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Access control</h2>
            <p className="mt-1 text-xs" style={muted}>
              External access is off until you enable it. Approval requirements never remove explicit confirmation for
              externally visible or destructive tools.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--border-color)' }}>
                <input
                  type="checkbox"
                  checked={Boolean(data.settings.enabled)}
                  onChange={(event) => updateSetting({ enabled: event.target.checked })}
                />
                <span style={{ color: 'var(--text-primary)' }}>Enable MCP access for approved clients</span>
              </label>
              <label className="flex items-center gap-3 rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--border-color)' }}>
                <input
                  type="checkbox"
                  checked={data.settings.require_approval_default !== false}
                  onChange={(event) => updateSetting({ requireApprovalDefault: event.target.checked })}
                />
                <span style={{ color: 'var(--text-primary)' }}>Require approval for internal write tools by default</span>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border p-5" style={cardStyle}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {editingId ? 'Edit client permissions' : 'Register a client'}
                </h2>
                <p className="mt-1 text-xs" style={muted}>
                  Exact redirect URI matching, PKCE and owner consent are required. A secret is shown only once.
                </p>
              </div>
              {editingId && (
                <button type="button" className={buttonClass} style={inputStyle} onClick={resetForm}>
                  Cancel edit
                </button>
              )}
            </div>
            <form className="mt-4 grid gap-4 lg:grid-cols-2" onSubmit={saveClient}>
              <label className="block text-sm" style={{ color: 'var(--text-secondary)' }}>
                Client name
                <input
                  className={`${inputClass} mt-1`}
                  style={inputStyle}
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  maxLength={80}
                  required
                />
              </label>
              <label className="block text-sm" style={{ color: 'var(--text-secondary)' }}>
                Redirect URI
                <input
                  className={`${inputClass} mt-1`}
                  style={inputStyle}
                  value={form.redirectUri}
                  onChange={(event) => setForm({ ...form, redirectUri: event.target.value })}
                  placeholder="https://client.example.com/oauth/callback"
                  required
                />
              </label>
              <label className="block text-sm" style={{ color: 'var(--text-secondary)' }}>
                Token endpoint auth
                <select
                  className={`${inputClass} mt-1`}
                  style={inputStyle}
                  value={form.authMethod}
                  onChange={(event) => setForm({ ...form, authMethod: event.target.value })}
                >
                  <option value="none">None (public client + PKCE)</option>
                  <option value="client_secret_post">Client secret (POST)</option>
                </select>
              </label>
              <label className="flex items-center gap-3 self-end rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--border-color)' }}>
                <input
                  type="checkbox"
                  checked={form.offline}
                  onChange={(event) => setForm({ ...form, offline: event.target.checked })}
                />
                <span>Allow long-lived refresh tokens</span>
              </label>
              <div className="lg:col-span-2">
                <p className="mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Allowed tools</p>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {tools.map((tool) => (
                    <label key={tool.name} className="flex items-start gap-2 rounded-lg border p-2 text-xs" style={{ borderColor: 'var(--border-color)' }}>
                      <input
                        type="checkbox"
                        checked={form.tools.includes(tool.name)}
                        onChange={() => toggleTool(tool.name)}
                      />
                      <span>
                        <span className="block font-mono" style={{ color: 'var(--text-primary)' }}>{tool.name}</span>
                        <span style={muted}>{tool.scope} · {tool.risk}{tool.approval === 'always' ? ' · confirmation always required' : ''}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs" style={muted}>Scopes granted: {selectedScopes.join(' ') || '(none)'}</p>
              </div>
              <div className="flex items-center gap-3 lg:col-span-2">
                <button type="submit" className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
                  {editingId ? 'Save permissions' : 'Register client'}
                </button>
                <span className="text-xs" style={muted}>Payments, licensing, credentials, admin roles, raw DB/HTTP/shell access are never available.</span>
              </div>
            </form>
            {newSecret && (
              <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs" style={{ color: 'var(--text-primary)' }}>
                Copy this client secret now; it is not stored in plaintext: <code className="break-all">{newSecret}</code>
              </div>
            )}
          </section>

          <section className="rounded-2xl border p-5" style={cardStyle}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Registered clients</h2>
            {!data.clients.length && <p className="mt-2 text-sm" style={muted}>No clients registered.</p>}
            <div className="mt-3 space-y-3">
              {data.clients.map((client) => (
                <div key={client.client_id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{client.client_name}</p>
                      <p className="break-all font-mono text-xs" style={muted}>{client.client_id}</p>
                      <p className="mt-1 break-all text-xs" style={muted}>{(client.redirect_uris || []).join(', ')}</p>
                      <p className="mt-1 text-xs" style={muted}>
                        {(client.allowed_tools || []).length} tools · {(client.allowed_scopes || []).join(' ') || 'no scopes'} ·
                        {' '}{client.revoked_at ? `revoked ${formatDate(client.revoked_at)}` : client.enabled ? 'enabled' : 'disabled'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={buttonClass} style={inputStyle} onClick={() => startEdit(client)}>Edit</button>
                      {!client.revoked_at && (
                        <button
                          type="button"
                          className={buttonClass}
                          style={inputStyle}
                          onClick={async () => {
                            try {
                              await mcpAdminRequest('client-update', {
                                method: 'POST',
                                body: { clientId: client.client_id, enabled: !client.enabled },
                              })
                              await load()
                            } catch (err) {
                              toast.error(err.message)
                            }
                          }}
                        >
                          {client.enabled ? 'Disable' : 'Enable'}
                        </button>
                      )}
                      {!client.revoked_at && (
                        <button type="button" className={buttonClass} style={inputStyle} onClick={() => revokeClient(client)}>Revoke</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border p-5" style={cardStyle}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Tool permissions</h2>
            <p className="mt-1 text-xs" style={muted}>Global off switch and approval requirement. A client must also be granted the tool and its scope.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead style={muted}>
                  <tr><th className="py-2">Tool</th><th>Scope</th><th>Risk</th><th>Enabled</th><th>Require approval</th></tr>
                </thead>
                <tbody>
                  {tools.map((tool) => (
                    <tr key={tool.name} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="py-2 font-mono" style={{ color: 'var(--text-primary)' }}>{tool.name}</td>
                      <td>{tool.scope}</td>
                      <td>{tool.risk}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={tool.enabled !== false}
                          onChange={(event) => updateTool(tool, { enabled: event.target.checked })}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(tool.require_approval)}
                          onChange={(event) => updateTool(tool, { requireApproval: event.target.checked })}
                        />
                        {tool.approval === 'always' && <span className="ml-2" style={muted}>always</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border p-5" style={cardStyle}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Active sessions</h2>
              {!data.tokens.length && <p className="mt-2 text-sm" style={muted}>No sessions.</p>}
              <div className="mt-3 space-y-2">
                {data.tokens.map((token) => (
                  <div key={token.id} className="rounded-lg border p-3 text-xs" style={{ borderColor: 'var(--border-color)' }}>
                    <p className="font-mono" style={{ color: 'var(--text-primary)' }}>{token.client_id}</p>
                    <p style={muted}>
                      {token.scopes?.join(' ') || 'no scopes'} · expires {formatDate(token.expires_at)} ·
                      {' '}{token.revoked_at ? `revoked ${formatDate(token.revoked_at)}` : 'active'}
                    </p>
                    {!token.revoked_at && (
                      <button type="button" className={`${buttonClass} mt-2`} style={inputStyle} onClick={() => revokeToken(token)}>
                        Revoke session
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border p-5" style={cardStyle}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Pending confirmations</h2>
              {!data.pending.length && <p className="mt-2 text-sm" style={muted}>No staged actions.</p>}
              <div className="mt-3 space-y-2">
                {data.pending.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3 text-xs" style={{ borderColor: 'var(--border-color)' }}>
                    <p className="font-mono" style={{ color: 'var(--text-primary)' }}>{item.tool_name}</p>
                    <p style={muted}>{short(item.summary, 160)}</p>
                    <p style={muted}>{item.client_id} · expires {formatDate(item.expires_at)} · {item.decision || 'awaiting decision'}</p>
                    {!item.used_at && !item.decision && (
                      <div className="mt-2 flex gap-2">
                        <button type="button" className={buttonClass} style={inputStyle} onClick={() => decidePending(item, 'approved')}>Approve</button>
                        <button type="button" className={buttonClass} style={inputStyle} onClick={() => decidePending(item, 'rejected')}>Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border p-5" style={cardStyle}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Audit log</h2>
            <p className="mt-1 text-xs" style={muted}>Values are redacted before storage. Tool arguments are recorded as key names only.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead style={muted}>
                  <tr><th className="py-2">Time</th><th>Event</th><th>Tool</th><th>Client</th><th>Outcome</th><th>Summary</th></tr>
                </thead>
                <tbody>
                  {data.audit.map((entry) => (
                    <tr key={entry.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="py-2">{formatDate(entry.created_at)}</td>
                      <td>{entry.event_type}</td>
                      <td className="font-mono">{entry.tool_name || '—'}</td>
                      <td className="font-mono">{short(entry.client_id, 24)}</td>
                      <td>{entry.outcome}{entry.error_code ? ` (${entry.error_code})` : ''}</td>
                      <td>{short(entry.summary, 180)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
