import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getAllProducts } from '../../lib/adminProducts'
import { useToast } from '../../context/ToastContext'

const inputStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
}

const STATUS_OPTIONS = ['', 'pending', 'under_review', 'approved', 'rejected', 'withdrawn']

export default function AdminContributorApplications() {
  const { toast, confirm } = useToast()
  const [applications, setApplications] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [drafts, setDrafts] = useState({})

  const getToken = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (!token) throw new Error('Please sign in again.')
    return token
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const qs = new URLSearchParams({ resource: 'contributor-applications' })
      if (statusFilter) qs.set('status', statusFilter)
      if (search.trim()) qs.set('search', search.trim())
      const res = await fetch(`/api/admin-license?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Could not load applications.')
      setApplications(body.applications || [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    // Only products explicitly enabled for contributor access may be licensed.
    getAllProducts()
      .then((rows) => setProducts(rows.filter((p) => p.contributor_access && p.status !== 'archived')))
      .catch(() => {})
  }, [])

  const setDraft = (id, patch) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }))

  async function runAction(app, action) {
    const draft = drafts[app.id] || {}
    const reason = String(draft.reason || '').trim()
    if (['reject', 'issue'].includes(action) && reason.length < 3) {
      return toast.error('A reason is required for this action.')
    }
    if (action === 'issue') {
      if (!draft.product_id) return toast.error('Select a product for the personal-use license.')
      const ok = await confirm({
        title: 'Issue APPROVED_CONTRIBUTOR_PERSONAL license',
        message: `Issue a personal-use-only license to ${app.email} for the selected product? This grants access only after explicit admin action and is auditable.`,
        confirmText: 'Issue license',
      })
      if (!ok) return
    }

    setBusyId(app.id)
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          resource: 'contributor_application',
          action,
          id: app.id,
          reason,
          product_id: draft.product_id ? Number(draft.product_id) : undefined,
          expires_at: draft.expires_at || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Action failed.')
      toast.success(action === 'issue' ? 'Contributor personal-use license issued.' : `Application ${action}d.`)
      setDraft(app.id, { reason: '' })
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Contributor Applications
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Review applications for <code>APPROVED_CONTRIBUTOR_PERSONAL</code> licenses. No PR, GitHub account, registration,
          star, fork, or commit auto-grants access. Issuance is explicit, auditable, and personal-use only.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ref, email, name..."
          className="rounded-lg border px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
          {STATUS_OPTIONS.map((s) => <option key={s || 'all'} value={s}>{s || 'All statuses'}</option>)}
        </select>
        <button onClick={load} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>Refresh</button>
      </div>

      {loading ? <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading…</p> : null}

      <div className="space-y-3">
        {applications.map((app) => {
          const requestedEligible = products.some((p) => p.id === app.requested_product_id)
          const draft = {
            product_id: requestedEligible ? String(app.requested_product_id) : '',
            ...drafts[app.id],
          }
          return (
            <div key={app.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {app.full_name} <span style={{ color: 'var(--text-tertiary)' }}>· {app.application_ref}</span>
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {app.email} {app.github_profile ? `· ${app.github_profile}` : ''}
                  </p>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ color: app.status === 'approved' ? '#10b981' : '#f59e0b', background: 'var(--input-bg)' }}>
                  {app.status}
                </span>
              </div>

              <p className="mt-2 text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{app.contribution_summary}</p>
              {app.intended_use ? <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Intended use: {app.intended_use}</p> : null}
              <p className="mt-1 text-[11px]" style={{ color: requestedEligible ? '#a78bfa' : 'var(--text-tertiary)' }}>
                Requested product: {app.products?.title || 'General (no product selected)'}
                {app.requested_product_id && !requestedEligible
                  ? ' — no longer contributor-eligible; choose another product below.'
                  : ''}
              </p>
              {app.review_notes ? <p className="mt-1 text-[11px]" style={{ color: '#f59e0b' }}>Review note: {app.review_notes}</p> : null}
              {app.issued_license_id ? <p className="mt-1 text-[11px]" style={{ color: '#10b981' }}>Issued license ID: {app.issued_license_id}</p> : null}

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Reason / review note</span>
                  <input value={draft.reason || ''} onChange={(e) => setDraft(app.id, { reason: e.target.value })} className="mt-1 w-full rounded border px-2 py-1.5 text-xs" style={inputStyle} />
                </label>
                <label className="block">
                  <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Product for personal-use license</span>
                  <select value={draft.product_id || ''} onChange={(e) => setDraft(app.id, { product_id: e.target.value })} className="mt-1 w-full rounded border px-2 py-1.5 text-xs" style={inputStyle}>
                    <option value="">Select product…</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.slug})</option>)}
                  </select>
                  <span className="mt-1 block text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    Only products marked as contributor products can be selected here.
                  </span>
                </label>
                <label className="block">
                  <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Optional expiry (ISO date)</span>
                  <input value={draft.expires_at || ''} onChange={(e) => setDraft(app.id, { expires_at: e.target.value })} placeholder="2027-01-01T00:00:00Z" className="mt-1 w-full rounded border px-2 py-1.5 text-xs" style={inputStyle} />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={busyId === app.id} onClick={() => runAction(app, 'under_review')} className="rounded px-3 py-1.5 text-xs border" style={inputStyle}>Mark under review</button>
                <button disabled={busyId === app.id} onClick={() => runAction(app, 'approve')} className="rounded px-3 py-1.5 text-xs text-white" style={{ background: '#059669' }}>Approve</button>
                <button disabled={busyId === app.id} onClick={() => runAction(app, 'reject')} className="rounded px-3 py-1.5 text-xs text-white" style={{ background: '#dc2626' }}>Reject</button>
                <button disabled={busyId === app.id || app.status !== 'approved' || app.issued_license_id} onClick={() => runAction(app, 'issue')} className="rounded px-3 py-1.5 text-xs text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>Issue personal-use license</button>
              </div>
            </div>
          )
        })}
        {!loading && applications.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No applications found.</p> : null}
      </div>
    </div>
  )
}