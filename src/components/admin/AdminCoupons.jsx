import { useCallback, useEffect, useState } from 'react'
import { Search, Tag, TrendingUp, X } from 'lucide-react'
import {
  createCoupon,
  deleteCoupon,
  listCouponRedemptions,
  listCoupons,
  updateCoupon,
} from '../../lib/adminCoupons'
import { useToast } from '../../context/ToastContext'

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,23}$/

const emptyForm = {
  code: '',
  description: '',
  discount_type: 'percent',
  value: '',
  min_subtotal_rupees: '0',
  max_discount_rupees: '',
  product_slugs_csv: '',
  starts_at: '',
  expires_at: '',
  usage_limit: '',
  per_customer_limit: '1',
  first_order_only: false,
  active: true,
}

const inputStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
}

function rupeesToPaise(value) {
  return Math.round((Number(value) || 0) * 100)
}

function toForm(coupon) {
  return {
    code: coupon.code || '',
    description: coupon.description || '',
    discount_type: coupon.discount_type === 'percent' ? 'percent' : 'fixed',
    value:
      coupon.discount_type === 'percent'
        ? String(coupon.value ?? '')
        : String((Number(coupon.value) || 0) / 100),
    min_subtotal_rupees: String((Number(coupon.min_subtotal_paise) || 0) / 100),
    max_discount_rupees: coupon.max_discount_paise
      ? String(Number(coupon.max_discount_paise) / 100)
      : '',
    product_slugs_csv: (coupon.product_slugs || []).join(', '),
    starts_at: coupon.starts_at ? String(coupon.starts_at).slice(0, 16) : '',
    expires_at: coupon.expires_at ? String(coupon.expires_at).slice(0, 16) : '',
    usage_limit: coupon.usage_limit == null ? '' : String(coupon.usage_limit),
    per_customer_limit: String(coupon.per_customer_limit ?? 1),
    first_order_only: Boolean(coupon.first_order_only),
    active: coupon.active !== false,
  }
}

function fromForm(form) {
  const isPercent = form.discount_type === 'percent'
  return {
    code: String(form.code || '').trim().toUpperCase(),
    description: String(form.description || '').trim(),
    discount_type: isPercent ? 'percent' : 'fixed',
    value: isPercent
      ? Math.trunc(Number(form.value) || 0)
      : rupeesToPaise(form.value),
    min_subtotal_paise: rupeesToPaise(form.min_subtotal_rupees),
    max_discount_paise: isPercent && form.max_discount_rupees !== ''
      ? rupeesToPaise(form.max_discount_rupees)
      : null,
    product_slugs: String(form.product_slugs_csv || '')
      .split(',')
      .map((slug) => slug.trim().toLowerCase())
      .filter(Boolean),
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
    expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    usage_limit: form.usage_limit === '' ? null : Math.trunc(Number(form.usage_limit)),
    per_customer_limit: Math.max(1, Math.trunc(Number(form.per_customer_limit) || 1)),
    first_order_only: Boolean(form.first_order_only),
    active: Boolean(form.active),
  }
}

function validate(form) {
  const payload = fromForm(form)
  if (!CODE_PATTERN.test(payload.code)) {
    return 'Code must be 3–24 uppercase letters, numbers, hyphens or underscores.'
  }
  if (payload.value <= 0) return 'Enter a discount greater than zero.'
  if (payload.discount_type === 'percent' && payload.value > 100) {
    return 'Percentage discount cannot exceed 100%.'
  }
  if (payload.starts_at && payload.expires_at && new Date(payload.expires_at) <= new Date(payload.starts_at)) {
    return 'The end date must be after the start date.'
  }
  if (payload.usage_limit != null && payload.usage_limit <= 0) {
    return 'Usage limit must be a positive whole number.'
  }
  return null
}

function discountLabel(coupon) {
  if (coupon.discount_type === 'percent') return `${coupon.value}% off`
  return `₹${(Number(coupon.value) || 0) / 100} off`
}

function conditionsLabel(coupon) {
  const parts = []
  if (coupon.min_subtotal_paise > 0) parts.push(`Min ₹${coupon.min_subtotal_paise / 100}`)
  if (coupon.max_discount_paise) parts.push(`Cap ₹${coupon.max_discount_paise / 100}`)
  if (coupon.product_slugs?.length) parts.push(`${coupon.product_slugs.length} product(s)`)
  if (coupon.first_order_only) parts.push('First order only')
  if (coupon.expires_at) parts.push(`Ends ${new Date(coupon.expires_at).toLocaleDateString()}`)
  return parts.length ? parts.join(' · ') : 'No extra conditions'
}

/**
 * Owner-controlled coupons. Every write goes through Supabase RLS, so a
 * customer account can never create or read a code even if it knows the table.
 */
export default function AdminCoupons() {
  const { toast, confirm } = useToast()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editing, setEditing] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [redemptions, setRedemptions] = useState([])
  const [selectedCode, setSelectedCode] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setCoupons(await listCoupons())
    } catch (err) {
      toast.error('Failed to load coupons: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = async (coupon) => {
    if (selectedCode === coupon.code) {
      setSelectedCode(null)
      return
    }
    setSelectedCode(coupon.code)
    setDetailLoading(true)
    try {
      setRedemptions(await listCouponRedemptions(coupon.id))
    } catch (err) {
      toast.error('Failed to load redemptions: ' + err.message)
      setRedemptions([])
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    const problem = validate(draft)
    if (problem) {
      toast.error(problem)
      return
    }
    setBusy(true)
    try {
      await createCoupon(fromForm(draft))
      toast.success('Coupon created. It is live immediately.')
      setDraft(emptyForm)
      setShowCreate(false)
      await load()
    } catch (err) {
      toast.error(err.message?.includes('duplicate') ? 'That code already exists.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleSave = async (id) => {
    const problem = validate(editing)
    if (problem) {
      toast.error(problem)
      return
    }
    setBusy(true)
    try {
      await updateCoupon(id, fromForm(editing))
      toast.success('Coupon saved.')
      setEditingId(null)
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleToggle = async (coupon) => {
    try {
      await updateCoupon(coupon.id, { active: !coupon.active })
      await load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDelete = async (coupon) => {
    const ok = await confirm(`Delete coupon ${coupon.code}? Past orders keep their discount.`)
    if (!ok) return
    try {
      await deleteCoupon(coupon.id)
      toast.success('Coupon deleted.')
      if (selectedCode === coupon.code) setSelectedCode(null)
      await load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const filtered = coupons.filter((coupon) =>
    `${coupon.code} ${coupon.description}`.toLowerCase().includes(search.trim().toLowerCase())
  )
  const activeCount = coupons.filter((coupon) => coupon.active).length
  const redemptionCount = coupons.reduce((sum, coupon) => sum + (coupon.uses_count || 0), 0)

  const renderForm = (value, onChange, onSubmit, submitLabel, onCancel) => (
    <form onSubmit={onSubmit} className="mt-3 grid gap-3 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4 md:grid-cols-2">
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Code *</span>
        <input
          value={value.code}
          onChange={(e) => onChange({ ...value, code: e.target.value.toUpperCase() })}
          placeholder="LAUNCH20"
          required
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm uppercase"
          style={inputStyle}
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Description</span>
        <input
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="Launch week offer"
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Discount type</span>
        <select
          value={value.discount_type}
          onChange={(e) => onChange({ ...value, discount_type: e.target.value })}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        >
          <option value="percent">Percentage (%)</option>
          <option value="fixed">Fixed amount (₹)</option>
        </select>
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
          {value.discount_type === 'percent' ? 'Discount % *' : 'Discount ₹ *'}
        </span>
        <input
          type="number"
          min="1"
          max={value.discount_type === 'percent' ? 100 : undefined}
          step={value.discount_type === 'percent' ? 1 : 0.01}
          value={value.value}
          onChange={(e) => onChange({ ...value, value: e.target.value })}
          required
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Minimum spend (₹)</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value.min_subtotal_rupees}
          onChange={(e) => onChange({ ...value, min_subtotal_rupees: e.target.value })}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
          Max discount (₹) — percentage only
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value.max_discount_rupees}
          onChange={(e) => onChange({ ...value, max_discount_rupees: e.target.value })}
          disabled={value.discount_type !== 'percent'}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
          style={inputStyle}
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Starts at</span>
        <input
          type="datetime-local"
          value={value.starts_at}
          onChange={(e) => onChange({ ...value, starts_at: e.target.value })}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Expires at</span>
        <input
          type="datetime-local"
          value={value.expires_at}
          onChange={(e) => onChange({ ...value, expires_at: e.target.value })}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Total usage limit</span>
        <input
          type="number"
          min="1"
          value={value.usage_limit}
          onChange={(e) => onChange({ ...value, usage_limit: e.target.value })}
          placeholder="Unlimited"
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Per-customer limit</span>
        <input
          type="number"
          min="1"
          value={value.per_customer_limit}
          onChange={(e) => onChange({ ...value, per_customer_limit: e.target.value })}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </label>
      <label className="block md:col-span-2">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
          Product slugs (comma separated, blank = all products)
        </span>
        <input
          value={value.product_slugs_csv}
          onChange={(e) => onChange({ ...value, product_slugs_csv: e.target.value })}
          placeholder="starter-kit, ui-kit"
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={value.first_order_only}
          onChange={(e) => onChange({ ...value, first_order_only: e.target.checked })}
          className="accent-cyan-500"
        />
        First order only
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={value.active}
          onChange={(e) => onChange({ ...value, active: e.target.checked })}
          className="accent-cyan-500"
        />
        Active (customers can use it)
      </label>
      <div className="flex items-center gap-2 md:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-cyan-300 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-black disabled:opacity-50"
        >
          {busy ? 'Saving...' : submitLabel}
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
          <h1 className="text-2xl font-display font-semibold">Coupons</h1>
          <p className="mt-1 max-w-2xl text-xs" style={{ color: 'var(--text-secondary)' }}>
            Discounts are verified by the server at checkout. Set a code, a value and optional
            limits — customers can preview it in the cart before paying.
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
          {showCreate ? 'Close' : '+ New coupon'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[
          { label: 'Total coupons', value: coupons.length, icon: Tag },
          { label: 'Active', value: activeCount, icon: Tag },
          { label: 'Redemptions', value: redemptionCount, icon: TrendingUp },
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

      {showCreate && renderForm(draft, setDraft, handleCreate, 'Create coupon', () => setShowCreate(false))}

      <div className="glass-panel rounded-xl p-4">
        <label className="flex items-center gap-2 rounded-lg border px-3 py-2" style={inputStyle}>
          <Search className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search coupon codes..."
            className="w-full bg-transparent text-sm outline-none"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
              <X className="h-4 w-4 opacity-60" aria-hidden="true" />
            </button>
          )}
        </label>

        {loading ? (
          <p className="py-8 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>Loading coupons...</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {search ? 'No coupons match that search.' : 'No coupons yet. Create one to get started.'}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 pr-4">Discount</th>
                  <th className="pb-3 pr-4">Conditions</th>
                  <th className="pb-3 pr-4">Usage</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((coupon) => (
                  <CouponRow
                    key={coupon.id}
                    coupon={coupon}
                    editing={editingId === coupon.id}
                    form={editing}
                    onFormChange={setEditing}
                    onEdit={() => {
                      setEditingId(coupon.id)
                      setEditing(toForm(coupon))
                    }}
                    onCancelEdit={() => setEditingId(null)}
                    onSave={() => handleSave(coupon.id)}
                    onToggle={() => handleToggle(coupon)}
                    onDelete={() => handleDelete(coupon)}
                    onDetail={() => openDetail(coupon)}
                    selected={selectedCode === coupon.code}
                    renderForm={renderForm}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCode && (
        <div className="glass-panel rounded-xl p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent redemptions — {selectedCode}</h2>
            <button
              type="button"
              onClick={() => setSelectedCode(null)}
              className="text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100"
            >
              Close
            </button>
          </div>
          {detailLoading ? (
            <p className="py-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
          ) : redemptions.length === 0 ? (
            <p className="py-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>No redemptions yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                    <th className="pb-2 pr-4">Order</th>
                    <th className="pb-2 pr-4">Customer</th>
                    <th className="pb-2 pr-4">Discount</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((row) => (
                    <tr key={row.id} className="border-t border-black/5 dark:border-white/5">
                      <td className="py-2 pr-4 font-mono">{row.order_ref}</td>
                      <td className="py-2 pr-4">{row.customer_email}</td>
                      <td className="py-2 pr-4">₹{(Number(row.discount_paise) || 0) / 100}</td>
                      <td className="py-2">{new Date(row.created_at).toLocaleString()}</td>
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

function CouponRow({
  coupon,
  editing,
  form,
  onFormChange,
  onEdit,
  onCancelEdit,
  onSave,
  onToggle,
  onDelete,
  onDetail,
  selected,
  renderForm,
}) {
  return (
    <>
      <tr className="border-t border-black/5 align-top dark:border-white/5">
        <td className="py-3 pr-4">
          <button
            type="button"
            onClick={onDetail}
            className="font-mono text-xs font-semibold text-cyan-500 hover:underline"
          >
            {coupon.code}
          </button>
          {coupon.description && (
            <span className="mt-1 block max-w-[180px] truncate text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {coupon.description}
            </span>
          )}
        </td>
        <td className="py-3 pr-4 font-semibold">{discountLabel(coupon)}</td>
        <td className="py-3 pr-4 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          {conditionsLabel(coupon)}
        </td>
        <td className="py-3 pr-4">
          <span className="text-xs">{coupon.uses_count || 0}</span>
          {coupon.usage_limit != null && (
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}> / {coupon.usage_limit}</span>
          )}
        </td>
        <td className="py-3 pr-4">
          <span
            className={`inline-flex rounded-full px-2 py-1 text-[9px] uppercase tracking-widest ${
              coupon.active ? 'bg-emerald-500/15 text-emerald-500' : 'bg-white/10 text-white/50'
            }`}
          >
            {coupon.active ? 'Active' : 'Paused'}
          </span>
        </td>
        <td className="py-3">
          <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-widest">
            <button type="button" onClick={onEdit} className="hover:text-cyan-500">Edit</button>
            <button type="button" onClick={onToggle} className="hover:text-cyan-500">
              {coupon.active ? 'Pause' : 'Activate'}
            </button>
            <button type="button" onClick={onDetail} className="hover:text-cyan-500">
              {selected ? 'Hide usage' : 'Usage'}
            </button>
            <button type="button" onClick={onDelete} className="hover:text-red-500">Delete</button>
          </div>
        </td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={6}>
            {renderForm(form, onFormChange, (event) => {
              event.preventDefault()
              onSave()
            }, 'Save changes', onCancelEdit)}
          </td>
        </tr>
      )}
    </>
  )
}
