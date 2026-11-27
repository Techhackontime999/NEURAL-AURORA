import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  KeyRound,
  Lock,
  PlugZap,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { mcpOAuthRequest } from '../../lib/mcpAdmin'
import './ai-connections.css'

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

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

function Badge({ children, variant = '' }) {
  return <span className={`mcp-badge ${variant ? `mcp-badge-${variant}` : ''}`}>{children}</span>
}

export default function AdminAiOAuthConsent() {
  const [searchParams] = useSearchParams()
  const request = searchParams.get('request') || ''
  const state = searchParams.get('state') || ''
  const { toast } = useToast()
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    mcpOAuthRequest('request-details', { params: { request, state } })
      .then((data) => {
        if (active) setDetails(data)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [request, state])

  const detailTools = useMemo(() => {
    if (details?.tool_details?.length) return details.tool_details
    return (details?.tools || []).map((name) => ({
      name,
      title: name,
      description: '',
      scope: '',
      risk: 'unknown',
      approval: 'never',
    }))
  }, [details])

  async function decide(decision) {
    setBusy(true)
    try {
      const result = await mcpOAuthRequest('approve', {
        method: 'POST',
        body: { request_id: request, state, decision },
      })
      if (result.redirect_uri) window.location.assign(result.redirect_uri)
    } catch (err) {
      toast.error(err.message)
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="mcp-consent">
      <div className="mcp-consent-brand">
        <span className="mcp-consent-mark"><ShieldCheck size={18} /></span>
        Neural Aurora · Owner consent
      </div>

      {error && (
        <div className="mcp-error"><AlertTriangle size={16} /><span>{error}</span></div>
      )}

      {!details && !error && (
        <div className="mcp-loading"><span className="mcp-spinner" />Loading authorization request…</div>
      )}

      {details && (
        <div className="mcp-consent-card">
          <div className="mcp-consent-head">
            <span className="mcp-consent-avatar"><PlugZap size={22} /></span>
            <div style={{ minWidth: 0 }}>
              <div className="mcp-consent-title">Authorize {details.client_name}</div>
              <div className="mcp-consent-sub">
                Review the exact capabilities before a one-time code is returned to the client.
              </div>
            </div>
          </div>

          <div className="mcp-consent-body">
            <div className="mcp-eyebrow">Redirect destination</div>
            <div className="mcp-consent-value" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <ExternalLink size={14} style={{ flex: '0 0 auto', marginTop: 3, color: 'var(--mcp-cyan)' }} />
              <code className="mcp-mono" style={{ wordBreak: 'break-all', color: 'var(--text-primary)' }}>
                {details.redirect_uri}
              </code>
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="mcp-eyebrow">Scopes</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>
                {(details.scopes || []).length ? (
                  details.scopes.map((scope) => (
                    <Badge key={scope} variant="cyan">{SCOPE_LABELS[scope] || scope} · {scope}</Badge>
                  ))
                ) : (
                  <Badge>No scopes</Badge>
                )}
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="mcp-eyebrow">Allowed tools</div>
              <div className="mcp-permission-list">
                {detailTools.length ? (
                  detailTools.map((tool, index) => (
                    <div className="mcp-permission" key={tool.name || index}>
                      <span className="mcp-permission-icon"><KeyRound size={15} /></span>
                      <div style={{ minWidth: 0 }}>
                        <div className="mcp-permission-name">{tool.title || tool.name}</div>
                        <div className="mcp-mono">{tool.name}</div>
                        {tool.description && (
                          <div className="mcp-permission-desc">{tool.description}</div>
                        )}
                        {tool.approval === 'always' && (
                          <div style={{ marginTop: 7 }}>
                            <Badge variant="amber">Second confirmation always required</Badge>
                          </div>
                        )}
                      </div>
                      <div className="mcp-permission-scope">
                        <Badge variant={tool.risk === 'read' ? '' : tool.risk === 'destructive' ? 'red' : 'amber'}>
                          {tool.scope || tool.risk}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="mcp-empty">
                    <span className="mcp-empty-icon"><Lock size={17} /></span>
                    <span>This client was granted no tools. Approving it will not expose any capability.</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Badge><Clock3 size={12} /> Expires {formatDate(details.expires_at)}</Badge>
              <Badge><Lock size={12} /> PKCE S256</Badge>
              <Badge><ShieldCheck size={12} /> Resource {details.resource ? 'bound' : 'checked'}</Badge>
            </div>

            <div className="mcp-consent-note">
              <ShieldCheck size={16} />
              <span>
                No payment, refund, payout, licence, entitlement, credential, privilege, access-control, raw database,
                arbitrary HTTP or shell capability is included. Externally visible and destructive tools still require a
                second explicit confirmation when the client calls them.
              </span>
            </div>
          </div>

          <div className="mcp-consent-foot">
            <span className="mcp-consent-foot-note">
              You can revoke this connection at any time from AI Connections. Tool activity is written to a redacted audit log.
            </span>
            <div className="mcp-row-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => decide('approve')}
                className="mcp-btn mcp-btn-primary"
              >
                <CheckCircle2 size={15} />
                {busy ? 'Authorizing…' : 'Authorize client'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => decide('deny')}
                className="mcp-btn"
              >
                <X size={15} /> Deny
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
