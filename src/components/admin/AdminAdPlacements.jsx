import { useEffect, useMemo, useState } from 'react'
import {
  getAllAdPlacements, addAdPlacement, updateAdPlacement, deleteAdPlacement,
} from '../../lib/ads'
import { AD_PROVIDERS, AD_SLOTS, getAdSenseClient, isAdTestMode, setAdTestMode } from '../../lib/adsConfig'
import { useToast } from '../../context/ToastContext'
import useBulkSelect from '../../lib/useBulkSelect'
import SearchBar from '../ui/SearchBar'
import BulkActionsBar from '../ui/BulkActionsBar'

const emptyForm = {
  name: '', slot: 'blog_listing', provider: 'adsense',
  ad_client: getAdSenseClient(), ad_slot: '', title: '', description: '',
  image_url: '', target_url: '', cta_label: 'Learn more', active: true,
  weight: 1, max_per_session: 2, starts_at: '', ends_at: '',
}

const inputStyle = {
  borderColor: 'var(--border-color)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
}

function toInputDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16)
}

function payload(form) {
  return {
    ...form,
    ad_client: form.provider === 'adsense' ? form.ad_client : '',
    ad_slot: form.provider === 'adsense' ? form.ad_slot : '',
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    weight: Number(form.weight) || 1,
    max_per_session: Number(form.max_per_session) || 2,
  }
}

function validate(form) {
  if (!form.name.trim()) return 'Name is required'
  if (!AD_SLOTS[form.slot]) return 'Choose a valid placement slot'
  if (form.provider === 'adsense' && !form.ad_client.trim()) return 'AdSense client is required'
  if (form.provider !== 'adsense') {
    if (!form.title.trim()) return 'Title is required for sponsored placements'
    if (!form.target_url.trim()) return 'Destination URL is required'
    if (!/^https?:\/\//i.test(form.target_url) && !form.target_url.startsWith('/')) return 'Destination must be an http(s) URL or a site path'
  }
  if (form.starts_at && form.ends_at && new Date(form.starts_at) >= new Date(form.ends_at)) return 'End date must be after start date'
  return ''
}

function FormFields({ form, set }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <input type="text" placeholder="Internal name" value={form.name} onChange={(e) => set({ name: e.target.value })} className="rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle} />
      <select value={form.slot} onChange={(e) => set({ slot: e.target.value })} className="rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle}>
        {Object.entries(AD_SLOTS).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
      </select>
      <select value={form.provider} onChange={(e) => set({ provider: e.target.value })} className="rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle}>
        {Object.entries(AD_PROVIDERS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>

      {form.provider === 'adsense' ? (
        <>
          <input type="text" placeholder="ca-pub-…" value={form.ad_client} onChange={(e) => set({ ad_client: e.target.value })} className="rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle} />
          <input type="text" placeholder="Ad slot ID (optional)" value={form.ad_slot} onChange={(e) => set({ ad_slot: e.target.value })} className="rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle} />
          <p className="text-xs sm:col-span-2 lg:col-span-1" style={{ color: 'var(--text-tertiary)' }}>Leave the slot ID empty for a responsive auto unit.</p>
        </>
      ) : (
        <>
          <input type="text" placeholder="Card title" value={form.title} onChange={(e) => set({ title: e.target.value })} className="rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle} />
          <input type="url" placeholder="Destination URL" value={form.target_url} onChange={(e) => set({ target_url: e.target.value })} className="rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle} />
          <input type="text" placeholder="Image URL (optional)" value={form.image_url} onChange={(e) => set({ image_url: e.target.value })} className="rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle} />
          <input type="text" placeholder="Button label" value={form.cta_label} onChange={(e) => set({ cta_label: e.target.value })} className="rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle} />
          <input type="text" placeholder="Short description" value={form.description} onChange={(e) => set({ description: e.target.value })} className="rounded-lg border px-3 py-2 text-sm outline-none sm:col-span-2" style={inputStyle} />
        </>
      )}

      <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Active
      </label>
      <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        Weight <input type="number" min={1} max={10} value={form.weight} onChange={(e) => set({ weight: +e.target.value })} className="w-16 rounded border px-2 py-1" style={inputStyle} />
      </label>
      <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        Max / session <input type="number" min={1} max={8} value={form.max_per_session} onChange={(e) => set({ max_per_session: +e.target.value })} className="w-16 rounded border px-2 py-1" style={inputStyle} />
      </label>
      <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Starts <input type="datetime-local" value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} className="mt-1 w-full rounded border px-2 py-1" style={inputStyle} />
      </label>
      <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Ends <input type="datetime-local" value={form.ends_at} onChange={(e) => set({ ends_at: e.target.value })} className="mt-1 w-full rounded border px-2 py-1" style={inputStyle} />
      </label>
    </div>
  )
}

export default function AdminAdPlacements() {
  const { toast, confirm } = useToast()
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ ...emptyForm })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ ...emptyForm })
  const [error, setError] = useState('')
  const [testMode, setTestModeState] = useState(() => isAdTestMode())
  const { selectedIds, toggleSelect, toggleAll, clearSelection, allSelected, handleBulkDelete: bulkDeleteRows } = useBulkSelect(rows)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setRows(await getAllAdPlacements())
    } catch (e) {
      toast.error('Could not load placements: ' + e.message)
    }
  }

  function handleToggleTestMode() {
    const next = setAdTestMode(!testMode)
    setTestModeState(next)
    toast.success(next ? 'Test ads on — this browser only' : 'Test ads off')
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) => [row.name, row.title, row.slot, row.provider, row.target_url]
      .some((value) => String(value || '').toLowerCase().includes(term)))
  }, [rows, search])

  async function handleCreate() {
    const err = validate(newForm)
    if (err) { setError(err); return }
    setError('')
    try {
      await addAdPlacement(payload(newForm))
      setNewForm({ ...emptyForm })
      setShowNew(false)
      toast.success('Placement created')
      load()
    } catch (e) {
      toast.error('Failed to create: ' + e.message)
    }
  }

  async function handleSave(id) {
    const err = validate(editForm)
    if (err) { setError(err); return }
    setError('')
    try {
      await updateAdPlacement(id, payload(editForm))
      setEditingId(null)
      toast.success('Placement updated')
      load()
    } catch (e) {
      toast.error('Failed to update: ' + e.message)
    }
  }

  async function handleDelete(id) {
    const ok = await confirm({ title: 'Delete Placement', message: 'Delete this ad placement permanently?', confirmText: 'Delete', danger: true })
    if (!ok) return
    try {
      await deleteAdPlacement(id)
      toast.success('Placement deleted')
      load()
    } catch (e) {
      toast.error('Failed to delete: ' + e.message)
    }
  }

  async function handleBulkDelete() {
    if (!selectedIds.size) return
    const ok = await confirm({ title: 'Delete Placements', message: `Delete ${selectedIds.size} selected placement(s)?`, confirmText: 'Delete All', danger: true })
    if (!ok) return
    const { deleted, errors } = await bulkDeleteRows(deleteAdPlacement)
    if (deleted) toast.success(`Deleted ${deleted} placement(s)`)
    if (errors?.length) toast.error(`Failed to delete ${errors.length} placement(s)`)
    clearSelection()
    load()
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Ad Placements</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage premium ad slots across the site. Direct sponsors and affiliate picks earn more than passive ads.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew((current) => !current)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          {showNew ? 'Cancel' : '+ Add Placement'}
        </button>
      </div>

      <div className="mb-5 rounded-xl border p-4 text-xs leading-relaxed" style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)', background: 'var(--card-bg)' }}>
        <p><strong className="text-cyan-400">Setup:</strong> run the <code>ad_placements</code> migration to create the table, then add placements here. Until then, the site uses responsive AdSense units from <code>ADSENSE_CLIENT</code> and optional <code>ADSENSE_SLOT_*</code> values.</p>
        <p className="mt-1">Impressions are counted only when an ad is actually visible, and each visitor sees at most a few ads per session.</p>
      </div>

      <div
        className="mb-5 rounded-xl border p-4"
        style={{ borderColor: testMode ? '#f59e0b' : 'var(--border-color)', background: 'var(--card-bg)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AdSense test mode</h2>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ background: testMode ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.06)', color: testMode ? '#fbbf24' : 'var(--text-tertiary)' }}
              >
                {testMode ? 'On' : 'Off'}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Shows non-billable Google test ads in <strong>this browser only</strong>. Visitors keep seeing real ads, so your earnings are unaffected. Turn it off when you are done.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={testMode}
            aria-label="AdSense test mode for this browser"
            onClick={handleToggleTestMode}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${testMode ? 'bg-amber-500' : 'bg-white/15'}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${testMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>
            How to test
          </p>
          <ol className="mt-2 grid gap-1.5 text-[11px] leading-relaxed sm:grid-cols-2" style={{ color: 'var(--text-tertiary)' }}>
            <li><span className="font-semibold text-cyan-400">1.</span> Turn the switch on above.</li>
            <li><span className="font-semibold text-cyan-400">2.</span> Hard-refresh: Ctrl/Cmd + Shift + R.</li>
            <li><span className="font-semibold text-cyan-400">3.</span> Open a page with ads and check the layout.</li>
            <li><span className="font-semibold text-cyan-400">4.</span> Turn it off, then hard-refresh again.</li>
          </ol>
          <p className="mt-2 text-[11px] leading-relaxed" style={{ color: testMode ? '#fbbf24' : 'var(--text-tertiary)' }}>
            {testMode
              ? 'Test mode is ON in this browser. Test creatives are not counted or billed — never click your own ads.'
              : 'Test mode is off. The setting expires after 24 hours; visitors always see real ads.'}
          </p>
        </div>
      </div>

      {showNew && (
        <div className="mb-5 rounded-xl border p-4" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
          <FormFields form={newForm} set={(patch) => setNewForm((current) => ({ ...current, ...patch }))} />
          {error && !editingId && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <button type="button" onClick={handleCreate} className="mt-3 rounded-lg px-4 py-2 text-sm text-white" style={{ background: '#10b981' }}>Create</button>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search placements…" className="w-full sm:w-72" />
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{filtered.length} placement(s)</span>
      </div>

      <BulkActionsBar selectedCount={selectedIds.size} onDelete={handleBulkDelete} onClear={clearSelection} />

      <div className="rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
        {allSelected !== undefined && rows.length > 0 && (
          <div className="flex items-center gap-3 border-b px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider" style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}>
            <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={allSelected} onChange={toggleAll} /> Select All</label>
          </div>
        )}
        {filtered.map((row) => (
          <div key={row.id} className="border-b p-4 last:border-b-0" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex flex-wrap items-center gap-3">
              <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} aria-label={`Select ${row.name}`} />
              {editingId === row.id ? (
                <>
                  <div className="min-w-0 flex-1">
                    <FormFields form={editForm} set={(patch) => setEditForm((current) => ({ ...current, ...patch }))} />
                    {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
                  </div>
                  <div className="flex gap-2 self-start">
                    <button type="button" onClick={() => handleSave(row.id)} className="text-xs text-emerald-400">Save</button>
                    <button type="button" onClick={() => { setEditingId(null); setError('') }} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.name || row.title}</p>
                    <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {AD_SLOTS[row.slot]?.label || row.slot} · {AD_PROVIDERS[row.provider] || row.provider} · {row.target_url || row.ad_slot || 'responsive'}
                    </p>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{row.impression_count || 0} views / {row.click_count || 0} clicks</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${row.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                    {row.active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setEditingId(row.id); setEditForm({ ...emptyForm, ...row, starts_at: toInputDate(row.starts_at), ends_at: toInputDate(row.ends_at) }); setError('') }} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Edit</button>
                    <button type="button" onClick={() => handleDelete(row.id)} className="text-xs text-red-400">Delete</button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="p-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No placements yet.</p>}
      </div>
    </div>
  )
}
