import { useCallback, useEffect, useState } from 'react'
import {
  getAllProducts,
  getLicenseOptions,
  createLicenseOption,
  updateLicenseOption,
  deleteLicenseOption,
} from '../../lib/adminProducts'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'

const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ACTIONS = [
  { value: 'suspend', label: 'Suspend', needsReason: true },
  { value: 'revoke', label: 'Revoke', needsReason: true },
  { value: 'reinstate', label: 'Reinstate', needsReason: false },
  { value: 'reissue', label: 'Rotate key', needsReason: false },
  { value: 'delete', label: 'Delete licence', needsReason: true },
]

const inputStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
}

const emptyOption = {
  code: '',
  label: '',
  summary: '',
  terms: '',
  validity_days: '',
  display_order: '0',
  is_default: false,
}

/**
 * Owner-controlled licensing configuration plus a narrow issued-license
 * console. Every mutation either goes through RLS (options) or the audited
 * admin endpoint (status changes and key rotation). No key is generated here.
 */
export default function AdminLicenses() {
  const { toast, confirm } = useToast()

  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [options, setOptions] = useState([])
  const [draft, setDraft] = useState(emptyOption)
  const [editingId, setEditingId] = useState(null)
  const [editing, setEditing] = useState(emptyOption)
  const [optionsLoading, setOptionsLoading] = useState(false)

  const [licenses, setLicenses] = useState([])
  const [events, setEvents] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [licensesLoading, setLicensesLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [actions, setActions] = useState({})

  useEffect(() => {
    getAllProducts()
      .then((rows) => {
        setProducts(rows)
        const paid = rows.find((row) => row.price_paise > 0)
        if (paid) setProductId(String(paid.id))
      })
      .catch((err) => toast.error('Failed to load products: ' + err.message))
  }, [])

  const loadOptions = useCallback(async () => {
    if (!productId) {
      setOptions([])
      return
    }
    setOptionsLoading(true)
    try {
      setOptions(await getLicenseOptions(Number(productId)))
    } catch (err) {
      toast.error('Failed to load licence options: ' + err.message)
    } finally {
      setOptionsLoading(false)
    }
  }, [productId])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  const loadLicenses = useCallback(async () => {
    setLicensesLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) throw new Error('Please sign in again.')

      const query = new URLSearchParams()
      if (search.trim()) query.set('search', search.trim())
      if (status) query.set('status', status)
      const response = await fetch(`/api/admin-license?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.error || 'Could not load licences.')
      setLicenses(body.licenses || [])
      setEvents(body.events || [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLicensesLoading(false)
    }
  }, [search, status])

  useEffect(() => {
    loadLicenses()
  }, [loadLicenses])

  function validateOption(value) {
    if (!CODE_PATTERN.test(String(value.code || '').trim().toLowerCase())) {
      return 'Code must use lowercase letters, numbers and single hyphens.'
    }
    if (!String(value.label || '').trim()) return 'A label is required.'
    const raw = String(value.validity_days ?? '').trim()
    if (raw) {
      const days = Number(raw)
      if (!Number.isInteger(days) || days < 1 || days > 36500) {
        return 'Validity must be empty (perpetual) or a whole number of days (1-36500).'
      }
    }
    return null
  }

  const validityDays = (value) =>
    String(value ?? '').trim() === '' ? null : Number(value)

  async function handleCreateOption(event) {
    event.preventDefault()
    const problem = validateOption(draft)
    if (problem) return toast.error(problem)
    try {
      await createLicenseOption({
        ...draft,
        product_id: Number(productId),
        code: draft.code.trim().toLowerCase(),
        label: draft.label.trim(),
        validity_days: validityDays(draft.validity_days),
        display_order: Number(draft.display_order) || 0,
      })
      setDraft(emptyOption)
      toast.success('Licence option added')
      loadOptions()
    } catch (err) {
      toast.error('Failed to add option: ' + err.message)
    }
  }

  async function handleSaveOption(id) {
    const problem = validateOption(editing)
    if (problem) return toast.error(problem)
    try {
      await updateLicenseOption(id, {
        code: editing.code.trim().toLowerCase(),
        label: editing.label.trim(),
        summary: editing.summary,
        terms: editing.terms,
        validity_days: validityDays(editing.validity_days),
        display_order: Number(editing.display_order) || 0,
        is_default: Boolean(editing.is_default),
      })
      setEditingId(null)
      toast.success('Licence option saved')
      loadOptions()
    } catch (err) {
      toast.error('Failed to save option: ' + err.message)
    }
  }

  async function handleDeleteOption(option) {
    const ok = await confirm({
      title: 'Delete licence option',
      message: `Delete "${option.label}"? Existing licences keep their snapshot; only future checkouts are affected.`,
      confirmText: 'Delete',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteLicenseOption(option.id)
      toast.success('Licence option deleted')
      loadOptions()
    } catch (err) {
      toast.error('Failed to delete option: ' + err.message)
    }
  }

  async function handleLicenseAction(license) {
    const choice = actions[license.id] || {}
    if (!choice.action) return toast.error('Choose an action first.')
    const meta = ACTIONS.find((item) => item.value === choice.action)
    if (meta?.needsReason && String(choice.reason || '').trim().length < 3) {
      return toast.error('A reason is required for this change.')
    }
    if (choice.action === 'delete') {
      const ok = await confirm({
        title: 'Delete issued licence',
        message: `Permanently delete ${license.license_ref}? It will disappear from the customer's library. This cannot be undone.`,
        confirmText: 'Delete',
        danger: true,
      })
      if (!ok) return
    }
    setBusyId(license.id)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) throw new Error('Please sign in again.')
      const response = await fetch('/api/admin-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: license.id,
          action: choice.action,
          reason: choice.reason || '',
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.error || 'Could not update the licence.')
      setActions((current) => ({ ...current, [license.id]: {} }))
      toast.success(choice.action === 'delete' ? 'Licence deleted' : `Licence ${choice.action} applied`)
      loadLicenses()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  function setAction(licenseId, patch) {
    setActions((current) => ({ ...current, [licenseId]: { ...current[licenseId], ...patch } }))
  }

  function renderOptionFields(value, onChange) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Code</span>
          <input
            value={value.code || ''}
            onChange={(e) => onChange({ ...value, code: e.target.value })}
            placeholder="personal"
            className="mt-1 w-full rounded border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </label>
        <label className="block">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Label</span>
          <input
            value={value.label || ''}
            onChange={(e) => onChange({ ...value, label: e.target.value })}
            placeholder="Personal licence"
            className="mt-1 w-full rounded border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Summary</span>
          <input
            value={value.summary || ''}
            onChange={(e) => onChange({ ...value, summary: e.target.value })}
            className="mt-1 w-full rounded border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Terms shown at checkout and on the licence</span>
          <textarea
            value={value.terms || ''}
            onChange={(e) => onChange({ ...value, terms: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </label>
        <label className="block">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Validity (days, blank = perpetual)
          </span>
          <input
            type="number"
            min="1"
            value={value.validity_days ?? ''}
            onChange={(e) => onChange({ ...value, validity_days: e.target.value })}
            placeholder="Never expires"
            className="mt-1 w-full rounded border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </label>
        <label className="block">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Display order</span>
          <input
            type="number"
            value={value.display_order ?? 0}
            onChange={(e) => onChange({ ...value, display_order: e.target.value })}
            className="mt-1 w-full rounded border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={Boolean(value.is_default)}
            onChange={(e) => onChange({ ...value, is_default: e.target.checked })}
          />
          Default option
        </label>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Licences
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Configure the licence options buyers can choose, and manage licences already issued.
          Set each product's document type (licence certificate or receipt only) in Products.
        </p>
      </div>

      <section className="mb-10 rounded-xl border p-5" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Licence options</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Codes are fixed identifiers. Existing purchases keep the wording that was current when they were paid.
            </p>
          </div>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          >
            <option value="">Choose a product…</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.title} · {product.document_policy === 'receipt' ? 'receipt only' : 'licence'}
              </option>
            ))}
          </select>
        </div>

        {!productId ? (
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Select a product to manage its options.</p>
        ) : (
          <>
            <div className="space-y-2">
              {optionsLoading && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Loading…</p>}
              {!optionsLoading && options.length === 0 && (
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  No options configured. Checkout will issue no licence for this product.
                </p>
              )}
              {options.map((option) => (
                <div key={option.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}>
                  {editingId === option.id ? (
                    <>
                      {renderOptionFields(editing, setEditing)}
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => handleSaveOption(option.id)} className="rounded px-3 py-1.5 text-xs text-white" style={{ background: '#10b981' }}>Save</button>
                        <button onClick={() => setEditingId(null)} className="rounded px-3 py-1.5 text-xs" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{option.label}</span>
                          <code className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{option.code}</code>
                          {option.is_default && <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-500">Default</span>}
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {option.validity_days ? `${option.validity_days} days` : 'Perpetual'}
                          </span>
                        </div>
                        {option.summary && <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{option.summary}</p>}
                        {option.terms && <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{option.terms}</p>}
                      </div>
                      <div className="flex gap-3 text-xs">
                        <button
                          onClick={() => {
                            setEditingId(option.id)
                            setEditing({ ...option, display_order: String(option.display_order) })
                          }}
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Edit
                        </button>
                        <button onClick={() => handleDeleteOption(option)} className="text-red-400">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateOption} className="mt-4 rounded-lg border p-3" style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}>
              <h3 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Add an option</h3>
              {renderOptionFields(draft, setDraft)}
              <button type="submit" className="mt-3 rounded px-4 py-2 text-xs text-white transition-opacity hover:opacity-90" style={{ background: 'var(--accent)' }}>
                Add option
              </button>
            </form>
          </>
        )}
      </section>

      <section className="rounded-xl border p-5" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Issued licences</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Status changes and key rotations are recorded with your administrator identity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, customer, product…"
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="revoked">Revoked</option>
              <option value="expired">Expired</option>
            </select>
            <button onClick={loadLicenses} className="rounded-lg border px-3 py-2 text-xs" style={inputStyle}>Refresh</button>
          </div>
        </div>

        {licensesLoading ? (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Loading…</p>
        ) : licenses.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No licences match this view.</p>
        ) : (
          <div className="space-y-2">
            {licenses.map((license) => (
              <div key={license.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {license.products?.title || 'Product'} <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>· {license.license_ref}</span>
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {license.customer_email || 'Unknown customer'} · {license.license_type || 'Standard licence'} · {license.seats} seat(s)
                      {license.orders?.order_ref ? ` · ${license.orders.order_ref}` : ''}
                    </p>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ color: license.status === 'active' ? '#10b981' : '#f59e0b', background: 'var(--card-bg)' }}>
                    {license.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="block">
                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Action</span>
                    <select
                      value={actions[license.id]?.action || ''}
                      onChange={(e) => setAction(license.id, { action: e.target.value })}
                      className="ml-2 rounded border px-2 py-1.5 text-xs outline-none"
                      style={inputStyle}
                    >
                      <option value="">Choose…</option>
                      {ACTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  <label className="block flex-1">
                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Reason (required to suspend or revoke)</span>
                    <input
                      value={actions[license.id]?.reason || ''}
                      onChange={(e) => setAction(license.id, { reason: e.target.value })}
                      className="mt-1 w-full rounded border px-2 py-1.5 text-xs outline-none"
                      style={inputStyle}
                    />
                  </label>
                  <button
                    onClick={() => handleLicenseAction(license)}
                    disabled={busyId === license.id}
                    className="rounded px-3 py-1.5 text-xs text-white disabled:opacity-50"
                    style={{ background: actions[license.id]?.action === 'delete' ? '#dc2626' : 'var(--accent)' }}
                  >
                    Apply
                  </button>
                </div>

                {license.revocation_reason && (
                  <p className="mt-2 text-[11px]" style={{ color: '#f59e0b' }}>Reason: {license.revocation_reason}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {events.length > 0 && (
          <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Recent audit events</h3>
            <ul className="space-y-1">
              {events.slice(0, 8).map((event) => (
                <li key={event.id} className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(event.created_at).toLocaleString()} · {event.action}
                  {event.reason ? ` — ${event.reason}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
