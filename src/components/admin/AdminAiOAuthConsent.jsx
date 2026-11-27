import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { mcpOAuthRequest } from '../../lib/mcpAdmin'

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

  const cardStyle = { borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Authorize AI client</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
        Review the exact capabilities before sending a one-time authorization code back to the client.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      )}
      {!details && !error && (
        <div className="mt-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading authorization request…</div>
      )}

      {details && (
        <div className="mt-5 rounded-2xl border p-5" style={cardStyle}>
          <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{details.client_name}</p>
          <p className="mt-1 break-all font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{details.client_id}</p>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <p style={{ color: 'var(--text-tertiary)' }}>Redirect destination</p>
              <p className="break-all font-mono" style={{ color: 'var(--text-primary)' }}>{details.redirect_uri}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-tertiary)' }}>Scopes</p>
              <p className="font-mono" style={{ color: 'var(--text-primary)' }}>{(details.scopes || []).join(' ') || '(none)'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-tertiary)' }}>Tools</p>
              <ul className="mt-1 space-y-1 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                {(details.tools || []).map((tool) => <li key={tool}>{tool}</li>)}
                {!details.tools?.length && <li>(none)</li>}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            No payment, refund, payout, licence, entitlement, credential, privilege, access-control, raw database,
            arbitrary HTTP or shell capability is included. Externally visible and destructive tools still require a
            second explicit confirmation when the client calls them.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => decide('approve')}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {busy ? 'Authorizing…' : 'Authorize client'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => decide('deny')}
              className="rounded-lg border px-4 py-2 text-sm hover:brightness-110 disabled:opacity-50"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              Deny
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
