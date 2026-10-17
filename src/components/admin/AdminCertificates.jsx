import { useState, useEffect } from 'react'
import { getCertificates, updateCertificate, createCertificate, deleteCertificate } from '../../lib/supabase'
import useBulkSelect from '../../lib/useBulkSelect'
import { useToast } from '../../context/ToastContext'
import BulkActionsBar from '../ui/BulkActionsBar'
import SearchBar from '../ui/SearchBar'
import ImageUpload from '../ui/ImageUpload'

const emptyForm = {
  cert_id: '',
  title: '',
  issuer: '',
  issue_date: '',
  credential_url: '',
  image_url: '',
  description: '',
  display_order: 0,
}

export default function AdminCertificates() {
  const { toast, confirm } = useToast()
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState(emptyForm)

  const filtered = search
    ? items.filter(item =>
        [item.title, item.issuer, item.issue_date, item.description, item.cert_id]
          .some(f => f?.toLowerCase().includes(search.toLowerCase()))
      )
    : items

  const { selectedIds, toggleSelect, toggleAll, clearSelection, allSelected, handleBulkDelete } = useBulkSelect(filtered)

  useEffect(() => { load() }, [])

  async function load() { setItems(await getCertificates()) }

  async function handleSave(id) {
    try {
      const { id: _id, created_at, updated_at, ...payload } = editForm
      await updateCertificate(id, payload)
      setEditingId(null)
      toast.success('Certificate updated')
      load()
    } catch (err) {
      toast.error('Failed to save: ' + err.message)
    }
  }

  async function handleCreate() {
    if (!newForm.title.trim()) return
    try {
      await createCertificate(newForm)
      setShowNew(false)
      setNewForm(emptyForm)
      toast.success('Certificate created')
      load()
    } catch (err) {
      toast.error('Failed to create: ' + err.message)
    }
  }

  async function handleDelete(id) {
    const ok = await confirm({
      title: 'Delete Certificate',
      message: 'Are you sure you want to delete this certificate?',
      confirmText: 'Delete',
      danger: true,
    })
    if (!ok) return

    try {
      await deleteCertificate(id)
      toast.success('Certificate deleted')
      load()
    } catch (err) {
      toast.error('Failed to delete: ' + err.message)
    }
  }

  async function handleBulkDeleteWrapper() {
    if (selectedIds.size === 0) return
    const ok = await confirm({
      title: 'Delete Selected Items',
      message: `Delete ${selectedIds.size} selected item(s) permanently?`,
      confirmText: 'Delete All',
      danger: true,
    })
    if (!ok) return

    const { deleted, errors } = await handleBulkDelete(deleteCertificate)
    if (deleted > 0) toast.success(`Deleted ${deleted} item(s)`)
    if (errors?.length > 0) toast.error(`Failed to delete ${errors.length} item(s)`)
    clearSelection()
    load()
  }

  const fields = [
    { key: 'cert_id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'issuer', label: 'Issuer' },
    { key: 'issue_date', label: 'Issue Date' },
    { key: 'credential_url', label: 'Credential URL' },
    { key: 'display_order', label: 'Order', type: 'number' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'image_url', label: 'Certificate Image', type: 'image' },
  ]

  const inputStyle = {
    borderColor: 'var(--border-color)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
  }

  function renderField({ key, label, type }, value, setValue) {
    return (
      <div key={key} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
        <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
        {type === 'textarea' ? (
          <textarea value={value ?? ''} onChange={(e) => setValue(e.target.value)} rows={3} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} />
        ) : type === 'image' ? (
          <ImageUpload value={value} onChange={setValue} label={label} />
        ) : (
          <input type={type || 'text'} value={value ?? ''} onChange={(e) => setValue(type === 'number' ? +e.target.value : e.target.value)} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} />
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Certificates
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage the certificates shown on the More page
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search certificates..." />
          <button
            onClick={() => setShowNew(!showNew)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            {showNew ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </div>

      {showNew && (
        <div className="mb-6 rounded-xl border p-4" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) =>
              renderField(field, newForm[field.key], (val) => setNewForm({ ...newForm, [field.key]: val }))
            )}
          </div>
          <button onClick={handleCreate} className="mt-4 rounded-lg px-4 py-2 text-sm text-white transition-all hover:opacity-90" style={{ background: '#10b981' }}>Create</button>
        </div>
      )}

      <BulkActionsBar
        selectedCount={selectedIds.size}
        onDelete={handleBulkDeleteWrapper}
        onClear={clearSelection}
      />
      <div className="space-y-3">
        {allSelected !== undefined && filtered.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b text-[11px] font-medium uppercase tracking-wider"
            style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-tertiary)' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              Select All
            </label>
          </div>
        )}
        {filtered.map((item) => (
          <div key={item.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-color)', background: selectedIds.has(item.id) ? 'rgba(239,68,68,0.04)' : 'var(--card-bg)' }}>
            {editingId === item.id ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((field) =>
                  renderField(field, editForm[field.key], (val) => setEditForm({ ...editForm, [field.key]: val }))
                )}
                <div className="col-span-2 flex gap-2">
                  <button onClick={() => handleSave(item.id)} className="rounded px-3 py-1.5 text-xs text-white" style={{ background: '#10b981' }}>Save</button>
                  <button onClick={() => setEditingId(null)} className="rounded px-3 py-1.5 text-xs" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {[item.issuer, item.issue_date].filter(Boolean).join(' — ') || 'No issuer'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { setEditingId(item.id); setEditForm(item) }} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No certificates yet.</p>
        )}
      </div>
    </div>
  )
}
