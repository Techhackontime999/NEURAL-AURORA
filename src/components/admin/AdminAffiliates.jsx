import { useCallback, useEffect, useState } from 'react'
import { Copy, Search, TrendingUp, UserPlus, X } from 'lucide-react'
import {
  AFFILIATE_STATUSES,
  approveCommission,
  bpsToPercent,
  COMMISSION_STATUSES,
  createAffiliate,
  isValidCode,
  listAffiliateCommissions,
  listAffiliates,
  listProductOptions,
  markCommissionPaid,
  normaliseAffiliatePayload,
  updateAffiliate,
  voidCommission,
} from '../../lib/adminAffiliates'
import {
  approveAffiliateApplication,
  listAffiliateApplications,
  rejectAffiliateApplication,
} from '../../lib/affiliateApplications'
import { useToast } from '../../context/ToastContext'

const emptyForm = {
  code: '',
  display_name: '',
  email: '',
  commission_percent: '10',
  status: 'active',
  product_slugs_csv: '',
  notes: '',
}

const emptyReview = {
  code: '',
  display_name: '',
  email: '',
  commission_percent: '10',
  product_slugs_csv: '',
  notes: '',
}

const inputStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
}

function toForm(affiliate) {
  return {
    code: affiliate.code || '',
    display_name: affiliate.display_name || '',
    email: affiliate.email || '',
    commission_percent: String(bpsToPercent(affiliate.commission_bps)),
    status: affiliate.status || 'active',
    product_slugs_csv: (affiliate.product_slugs || []).join(', '),
    notes: affiliate.notes || '',
  }
}

function fromForm(form) {
  return normaliseAffiliatePayload({
    code: form.code,
    display_name: form.display_name,
    email: form.email,
    commission_bps: Number(form.commission_percent) * 100,
    status: form.status,
    product_slugs: String(form.product_slugs_csv || '')
      .split(',')
      .map((slug) => slug.trim().toLowerCase())
      .filter(Boolean),
    notes: form.notes,
  })
}

function validate(form) {
  if (!isValidCode(form.code)) {
    return 'Code must be 3–24 uppercase letters, numbers, hyphens or underscores.'
  }
  if (!String(form.display_name || '').trim()) return 'Enter the partner name.'
  const percent = Number(form.commission_percent)
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    return 'Commission must be between 0 and 100%.'
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return 'Enter a valid sign-in email, or leave it blank.'
  }
  return null
}

function money(paise, currency = 'INR') {
  return `${currency === 'INR' ? '₹' : ''}${((Number(paise) || 0) / 100).toFixed(2)}`
}

function referralUrl(code) {
  const base = typeof window === 'undefined' ? '' : window.location.origin
  return `${base}/offerings/products?aff=${encodeURIComponent(code)}`
}

export default function AdminAffiliates() {
  const { toast, confirm } = useToast()
  const [affiliates, setAffiliates] = useState([])
  const [commissions, setCommissions] = useState([])
  const [productOptions, setProductOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editing, setEditing] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [ledgerAffiliate, setLedgerAffiliate] = useState(null)
  const [ledgerStatus, setLedgerStatus] = useState('')
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [applications, setApplications] = useState([])
  const [applicationFilter, setApplicationFilter] = useState('pending')
  const [reviewId, setReviewId] = useState(null)
  const [reviewDraft, setReviewDraft] = useState(emptyReview)

  const loadCommissions = useCallback(async (affiliateId = null, status = '') => {
    setLedgerLoading(true)
    try {
      setCommissions(await listAffiliateCommissions({ affiliateId, status }))
    } catch (err) {
      toast.error('Failed to load commissions: ' + err.message)
      setCommissions([])
    } finally {
      setLedgerLoading(false)
    }
  }, [toast])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rows, options, applications] = await Promise.all([
        listAffiliates(),
        listProductOptions().catch(() => []),
        listAffiliateApplications().catch(() => []),
      ])
      setAffiliates(rows)
      setProductOptions(options)
      setApplications(applications)
      if (ledgerAffiliate) await loadCommissions(ledgerAffiliate.id, ledgerStatus)
    } catch (err) {
      toast.error('Failed to load partners: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [toast, ledgerAffiliate, ledgerStatus, loadCommissions])

  useEffect(() => {
    load()
  }, [load])

  const openLedger = async (affiliate) => {
    if (ledgerAffiliate?.id === affiliate.id) {
      setLedgerAffiliate(null)
      setCommissions([])
      return
    }
    setLedgerAffiliate(affiliate)
    setLedgerStatus('')
    await loadCommissions(affiliate.id, '')
  }

  const changeLedgerStatus = async (status) => {
    setLedgerStatus(status)
    if (ledgerAffiliate) await loadCommissions(ledgerAffiliate.id, status)
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    const problem = validate(draft)
    if (problem) return toast.error(problem)
    setBusy(true)
    try {
      await createAffiliate(fromForm(draft))
      toast.success('Partner created. Share their referral link below.')
      setDraft(emptyForm)
      setShowCreate(false)
      await load()
    } catch (err) {
      toast.error(err.message?.includes('duplicate') ? 'That code or email is already in use.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleSave = async (id) => {
    const problem = validate(editing)
    if (problem) return toast.error(problem)
    setBusy(true)
    try {
      await updateAffiliate(id, fromForm(editing))
      toast.success('Partner saved. New rates apply to future orders only.')
      setEditingId(null)
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleToggle = async (affiliate) => {
    const next = affiliate.status === 'active' ? 'paused' : 'active'
    try {
      await updateAffiliate(affiliate.id, { status: next })
      toast.success(`Partner ${next}.`)
      await load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const copyLink = async (code) => {
    try {
      await navigator.clipboard.writeText(referralUrl(code))
      toast.success('Referral link copied.')
    } catch {
      toast.error(referralUrl(code))
    }
  }

  const handleCommissionAction = async (row, action) => {
    try {
      if (action === 'approve') {
        await approveCommission(row.id)
        toast.success('Commission approved.')
      } else if (action === 'paid') {
        const reference = window.prompt('Bank / UPI payment reference (optional):', row.payout_reference || '')
        if (reference === null) return
        await markCommissionPaid(row.id, reference)
        toast.success('Marked as paid. The partner can now see it in their dashboard.')
      } else {
        const ok = await confirm(`Void commission for ${row.order_ref}? This cannot be undone.`)
        if (!ok) return
        await voidCommission(row.id)
        toast.success('Commission voided.')
      }
      await loadCommissions(ledgerAffiliate?.id || null, ledgerStatus)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const openReview = (application) => {
    setReviewId(application.id)
    setReviewDraft({
      code: application.proposed_code,
      display_name: application.full_name,
      email: application.email,
      commission_percent: '10',
      product_slugs_csv: '',
      notes: `Applied via: ${application.channels}\n\n${application.message}`.slice(0, 500),
    })
  }

  const handleApprove = async (event) => {
    event.preventDefault()
    const application = applications.find((row) => row.id === reviewId)
    if (!application) return
    const problem = validate(reviewDraft)
    if (problem) return toast.error(problem)

    setBusy(true)
    try {
      await approveAffiliateApplication(application, {
        ...fromForm(reviewDraft),
        status: 'active',
      })
      toast.success('Application approved. The partner can now sign in at /partner.')
      setReviewId(null)
      setReviewDraft(emptyReview)
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async (application) => {
    const ok = await confirm(`Reject the application from ${application.full_name}? This cannot be undone.`)
    if (!ok) return
    const reason = window.prompt('Internal reason (optional):', '')
    if (reason === null) return
    try {
      await rejectAffiliateApplication(application.id, reason)
      toast.success('Application rejected.')
      if (reviewId === application.id) setReviewId(null)
      await load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const filtered = affiliates.filter((row) =>
    `${row.code} ${row.display_name} ${row.email}`.toLowerCase().includes(search.trim().toLowerCase())
  )
  const activeCount = affiliates.filter((row) => row.status === 'active').length
  const pendingApplications = applications.filter((row) => row.status === 'pending')
  const filteredApplications = applicationFilter
    ? applications.filter((row) => row.status === applicationFilter)
    : applications
  const averageRate = affiliates.length
    ? affiliates.reduce((sum, row) => sum + (Number(row.commission_bps) || 0), 0) / affiliates.length / 100
    : 0
  const paidPaise = commissions.filter((row) => row.status === 'paid').reduce((sum, row) => sum + (Number(row.commission_paise) || 0), 0)
  const pendingPaise = commissions.filter((row) => ['pending', 'approved'].includes(row.status)).reduce((sum, row) => sum + (Number(row.commission_paise) || 0), 0)

  const renderForm = (value, onChange, onSubmit, submitLabel, onCancel, hideStatus = false) => (
    <form onSubmit={onSubmit} className="mt-3 grid gap-3 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4 md:grid-cols-2">
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Referral code *</span>
        <input
          value={value.code}
          onChange={(e) => onChange({ ...value, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
          placeholder="PARTNER1"
          required
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm uppercase"
          style={inputStyle}
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Partner name *</span>
        <input
          value={value.display_name}
          onChange={(e) => onChange({ ...value, display_name: e.target.value })}
          placeholder="Arjun's Studio"
          required
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Sign-in email</span>
        <input
          type="email"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value.toLowerCase() })}
          placeholder="partner@example.com"
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
        <span className="mt-1 block text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          They sign in with this email at /partner. Leave blank to share the code before granting access.
        </span>
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Commission % *</span>
        <input
          type="number"
          min="0.01"
          max="100"
          step="0.25"
          value={value.commission_percent}
          onChange={(e) => onChange({ ...value, commission_percent: e.target.value })}
          required
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
        <span className="mt-1 block text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          Percentage of the amount actually paid, after discounts.
        </span>
      </label>
      {!hideStatus && (
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Status</span>
          <select
            value={value.status}
            onChange={(e) => onChange({ ...value, status: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          >
            {AFFILIATE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      )}
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Product scope (CSV slugs)</span>
        <input
          list="affiliate-product-slugs"
          value={value.product_slugs_csv}
          onChange={(e) => onChange({ ...value, product_slugs_csv: e.target.value })}
          placeholder="Leave blank for all products"
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
        <datalist id="affiliate-product-slugs">
          {productOptions.map((option) => <option key={option.slug} value={option.slug}>{option.title}</option>)}
        </datalist>
        <span className="mt-1 block text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          Only these products earn commission. Blank means the whole store.
        </span>
      </label>
      <label className="block md:col-span-2">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Internal notes</span>
        <textarea
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          rows={2}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </label>
      <div className="flex items-center gap-2 md:col-span-2">
        <button type="submit" disabled={busy} className="rounded-full bg-cyan-300 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-black disabled:opacity-40">
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-5 py-2.5 text-[11px] uppercase tracking-widest"
          style={{ borderColor: 'var(--border-color)' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold">Affiliate partners</h1>
          <p className="mt-1 max-w-2xl text-xs" style={{ color: 'var(--text-secondary)' }}>
            Invite people to sell your digital products. They share a code-only link; you pay
            commission from verified, paid orders and record each payout in the ledger.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate((open) => !open)
            setDraft(emptyForm)
          }}
          className="rounded-full bg-cyan-300 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-black"
        >
          {showCreate ? 'Close' : '+ New partner'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: 'Partners', value: affiliates.length, icon: UserPlus },
          { label: 'Active', value: activeCount, icon: UserPlus },
          { label: 'Applications', value: pendingApplications.length, icon: UserPlus },
          { label: 'Average rate', value: `${averageRate}%`, icon: TrendingUp },
          { label: 'Ledger pending', value: money(pendingPaise), icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </div>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {showCreate && renderForm(draft, setDraft, handleCreate, 'Create partner', () => setShowCreate(false))}

      <div className="glass-panel rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Partner applications</h2>
            <p className="mt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {pendingApplications.length} awaiting review · applicants choose a proposed code only; you set the final rate.
            </p>
          </div>
          <select
            value={applicationFilter}
            onChange={(event) => {
              setApplicationFilter(event.target.value)
              setReviewId(null)
            }}
            className="rounded-lg border px-3 py-2 text-xs"
            style={inputStyle}
            aria-label="Filter applications"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </select>
        </div>

        {filteredApplications.length === 0 ? (
          <p className="py-8 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
            No {applicationFilter || ''} applications.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                  <th className="pb-3 pr-4">Applicant</th>
                  <th className="pb-3 pr-4">Proposed code</th>
                  <th className="pb-3 pr-4">Reach</th>
                  <th className="pb-3 pr-4">Message</th>
                  <th className="pb-3 pr-4">Received</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((application) => (
                  <tr key={application.id} className="border-t border-black/5 align-top dark:border-white/5">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{application.full_name}</p>
                      <p className="mt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{application.email}</p>
                    </td>
                    <td className="py-3 pr-4 font-mono">{application.proposed_code}</td>
                    <td className="py-3 pr-4">{application.channels}</td>
                    <td className="py-3 pr-4">
                      <p className="line-clamp-2 max-w-xs" title={application.message}>{application.message}</p>
                    </td>
                    <td className="py-3 pr-4">
                      {new Date(application.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={application.status === 'approved' ? 'text-emerald-500' : application.status === 'rejected' ? 'text-red-500' : 'text-amber-500'}>
                        {application.status}
                      </span>
                      {application.review_notes && (
                        <p className="mt-1 max-w-[12rem] truncate text-[10px]" style={{ color: 'var(--text-tertiary)' }} title={application.review_notes}>
                          {application.review_notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3">
                      {application.status === 'pending' ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => (reviewId === application.id ? setReviewId(null) : openReview(application))}
                            className="text-[10px] uppercase tracking-widest text-cyan-500 hover:underline"
                          >
                            {reviewId === application.id ? 'Close' : 'Review'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(application)}
                            className="text-[10px] uppercase tracking-widest text-red-500 hover:underline"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Decided</span>
                      )}
                    </td>
                  </tr>
                ))}
                {reviewId && filteredApplications.some((row) => row.id === reviewId) && (
                  <tr>
                    <td colSpan={7}>
                      {renderForm(
                        reviewDraft,
                        setReviewDraft,
                        handleApprove,
                        'Approve & create partner',
                        () => setReviewId(null),
                        true
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-panel rounded-xl p-4">
        <label className="flex items-center gap-2 rounded-lg border px-3 py-2" style={inputStyle}>
          <Search className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search partners..."
            className="w-full bg-transparent text-sm outline-none"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
              <X className="h-4 w-4 opacity-60" aria-hidden="true" />
            </button>
          )}
        </label>

        {loading ? (
          <p className="py-8 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>Loading partners...</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {search ? 'No partners match that search.' : 'No partners yet. Create one to get started.'}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                  <th className="pb-3 pr-4">Code / link</th>
                  <th className="pb-3 pr-4">Partner</th>
                  <th className="pb-3 pr-4">Rate</th>
                  <th className="pb-3 pr-4">Scope</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-black/5 align-top dark:border-white/5">
                    <td className="py-3 pr-4">
                      <p className="font-mono font-semibold">{row.code}</p>
                      <button
                        type="button"
                        onClick={() => copyLink(row.code)}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] text-cyan-500 hover:underline"
                      >
                        <Copy className="h-3 w-3" aria-hidden="true" /> Copy link
                      </button>
                    </td>
                    <td className="py-3 pr-4">
                      <p>{row.display_name}</p>
                      <p className="mt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{row.email || 'No sign-in email'}</p>
                    </td>
                    <td className="py-3 pr-4">{bpsToPercent(row.commission_bps)}%</td>
                    <td className="py-3 pr-4">
                      {row.product_slugs?.length ? `${row.product_slugs.length} product(s)` : 'All products'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={row.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}>{row.status}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(editingId === row.id ? null : row.id)
                            setEditing(toForm(row))
                          }}
                          className="text-[10px] uppercase tracking-widest hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(row)}
                          className="text-[10px] uppercase tracking-widest hover:underline"
                        >
                          {row.status === 'active' ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openLedger(row)}
                          className="text-[10px] uppercase tracking-widest text-cyan-500 hover:underline"
                        >
                          {ledgerAffiliate?.id === row.id ? 'Close ledger' : 'Ledger'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {editingId && filtered.some((row) => row.id === editingId) && (
                  <tr>
                    <td colSpan={6}>
                      {renderForm(editing, setEditing, (e) => handleSave(editingId), 'Save partner', () => setEditingId(null))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {ledgerAffiliate && (
        <div className="glass-panel rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Commission ledger — {ledgerAffiliate.display_name}</h2>
              <p className="mt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                Paid this view: {money(paidPaise)} · awaiting payout: {money(pendingPaise)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={ledgerStatus}
                onChange={(e) => changeLedgerStatus(e.target.value)}
                className="rounded-lg border px-3 py-2 text-xs"
                style={inputStyle}
                aria-label="Filter commission status"
              >
                <option value="">All statuses</option>
                {COMMISSION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setLedgerAffiliate(null)}
                className="text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100"
              >
                Close
              </button>
            </div>
          </div>
          {ledgerLoading ? (
            <p className="py-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
          ) : commissions.length === 0 ? (
            <p className="py-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>No commissions in this view yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                    <th className="pb-2 pr-4">Order</th>
                    <th className="pb-2 pr-4">Net sale</th>
                    <th className="pb-2 pr-4">Commission</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((row) => (
                    <tr key={row.id} className="border-t border-black/5 dark:border-white/5">
                      <td className="py-2 pr-4 font-mono">{row.order_ref}</td>
                      <td className="py-2 pr-4">{money(row.net_paise, row.currency)}</td>
                      <td className="py-2 pr-4 font-semibold">{money(row.commission_paise, row.currency)}</td>
                      <td className="py-2 pr-4">
                        <span className={row.status === 'paid' ? 'text-emerald-500' : row.status === 'void' ? 'text-red-500' : 'text-amber-500'}>
                          {row.status}
                        </span>
                        {row.payout_reference && (
                          <p className="mt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{row.payout_reference}</p>
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          {row.status === 'pending' && (
                            <button type="button" onClick={() => handleCommissionAction(row, 'approve')} className="text-[10px] uppercase tracking-widest hover:underline">Approve</button>
                          )}
                          {['pending', 'approved'].includes(row.status) && (
                            <>
                              <button type="button" onClick={() => handleCommissionAction(row, 'paid')} className="text-[10px] uppercase tracking-widest text-emerald-500 hover:underline">Mark paid</button>
                              <button type="button" onClick={() => handleCommissionAction(row, 'void')} className="text-[10px] uppercase tracking-widest text-red-500 hover:underline">Void</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
