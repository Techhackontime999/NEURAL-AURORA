import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'

const inputStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
}

export default function ContributorApplicationPanel({ user }) {
  const { toast } = useToast()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    github_profile: '',
    contribution_summary: '',
    intended_use: '',
    personal_use_attestation: false,
    no_commercial_use_attestation: false,
    no_redistribution_attestation: false,
  })

  async function token() {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || ''
  }

  async function load() {
    if (!user) { setApps([]); return }
    setLoading(true)
    try {
      const t = await token()
      const res = await fetch('/api/license?action=my-contributor-applications', {
        headers: { Authorization: `Bearer ${t}` },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Could not load applications.')
      setApps(body.applications || [])
    } catch (err) {
      // Non-blocking; keep library usable.
      console.warn('[ContributorApplicationPanel]', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.id])

  if (!user) return null

  const hasActive = apps.some((a) => ['pending', 'under_review', 'approved'].includes(a.status))

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const t = await token()
      const res = await fetch('/api/license?action=contributor-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(form),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Could not submit application.')
      toast.success(body?.message || 'Application submitted.')
      setForm((f) => ({ ...f, contribution_summary: '', intended_use: '' }))
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-16">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
          Contributor personal-use access
        </h2>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
          Approved contributors may apply for a free <code>APPROVED_CONTRIBUTOR_PERSONAL</code> license. This is personal-use only:
          no commercial/client deployment, no organisation-wide use, no resale/redistribution/sublicensing/transfer, and no paid/enterprise entitlements.
          Submitting an application or having a GitHub account/PR does not auto-grant access.
        </p>
      </div>

      {apps.length > 0 && (
        <div className="mb-4 space-y-2">
          {apps.map((a) => (
            <div key={a.id} className="rounded-lg border px-3 py-2 text-[11px]" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
              <span style={{ color: 'var(--text-primary)' }}>{a.application_ref}</span>
              <span style={{ color: 'var(--text-tertiary)' }}> · {a.status}</span>
              {a.review_notes ? <span style={{ color: 'var(--text-tertiary)' }}> · {a.review_notes}</span> : null}
            </div>
          ))}
        </div>
      )}

      {!hasActive && (
        <form onSubmit={submit} className="glass-panel rounded-xl p-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">Full name</span>
              <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">GitHub profile (optional)</span>
              <input value={form.github_profile} onChange={(e) => setForm({ ...form, github_profile: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">Contribution summary</span>
            <textarea required minLength={10} value={form.contribution_summary} onChange={(e) => setForm({ ...form, contribution_summary: e.target.value })} rows={4} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">Intended personal use (optional)</span>
            <input value={form.intended_use} onChange={(e) => setForm({ ...form, intended_use: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
          </label>
          <div className="space-y-2 text-[11px] text-[var(--text-secondary)]">
            <label className="flex gap-2"><input type="checkbox" checked={form.personal_use_attestation} onChange={(e) => setForm({ ...form, personal_use_attestation: e.target.checked })} /> <span>I request personal-use-only access.</span></label>
            <label className="flex gap-2"><input type="checkbox" checked={form.no_commercial_use_attestation} onChange={(e) => setForm({ ...form, no_commercial_use_attestation: e.target.checked })} /> <span>I will not use this grant for commercial, client, or organisation-wide deployment.</span></label>
            <label className="flex gap-2"><input type="checkbox" checked={form.no_redistribution_attestation} onChange={(e) => setForm({ ...form, no_redistribution_attestation: e.target.checked })} /> <span>I will not redistribute, resell, sublicense, or transfer access.</span></label>
          </div>
          <button disabled={submitting} type="submit" className="rounded-lg bg-black/90 px-4 py-2.5 text-[10px] uppercase tracking-widest text-white disabled:opacity-50 dark:bg-white/90 dark:text-black">
            {submitting ? 'Submitting…' : 'Submit application'}
          </button>
          {loading ? <p className="text-[10px] text-[var(--text-tertiary)]">Loading application status…</p> : null}
        </form>
      )}
    </section>
  )
}