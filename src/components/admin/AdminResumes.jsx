import { useState, useEffect, useRef } from 'react'
import { getResumes, updateResume, createResume, deleteResume } from '../../lib/supabase'
import { uploadImage } from '../../lib/supabase'
import { invalidatePortfolioCache } from '../../lib/usePortfolioData'
import useBulkSelect from '../../lib/useBulkSelect'
import { useToast } from '../../context/ToastContext'
import BulkActionsBar from '../ui/BulkActionsBar'
import SearchBar from '../ui/SearchBar'

const emptyForm = {
  resume_id: '',
  label: '',
  file_url: '',
  file_name: '',
  description: '',
  display_order: 0,
  is_default: false,
}

function ResumeFileUpload({ value, fileName, onChange, onFileNameChange }) {
  const { toast } = useToast()
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file, 'portfolio-images')
      onChange(url)
      if (!fileName) onFileNameChange?.(file.name)
      toast.success('Resume file uploaded')
    } catch (err) {
      toast.error('Upload failed: ' + err.message)
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {uploading ? 'Uploading...' : value ? 'Replace File' : 'Upload File'}
        </button>
        {value && (
          <>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-3 py-1.5 text-xs"
              style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
            >
              View
            </a>
            <button
              type="button"
              onClick={() => { onChange(''); onFileNameChange?.('') }}
              className="rounded-lg px-3 py-1.5 text-xs"
              style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
            >
              Remove
            </button>
          </>
        )}
      </div>
      {value && (
        <p className="text-[11px] break-all" style={{ color: 'var(--text-tertiary)' }}>
          {fileName || value}
        </p>
      )}
    </div>
  )
}

export default function AdminResumes() {
  const { toast, confirm } = useToast()
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState(emptyForm)

  const filtered = search
    ? items.filter((item) =>
        [item.label, item.resume_id, item.file_name, item.description]
          .some((f) => f?.toLowerCase().includes(search.toLowerCase()))
      )
    : items

  const { selectedIds, toggleSelect, toggleAll, clearSelection, allSelected, handleBulkDelete } = useBulkSelect(filtered)

  useEffect(() => { load() }, [])

  async function load() {
    setItems(await getResumes())
  }

  async function syncDefault(itemsList, defaultId) {
    const updates = itemsList
      .filter((item) => item.is_default && item.id !== defaultId)
      .map((item) => updateResume(item.id, { is_default: false }))
    if (updates.length) await Promise.all(updates)
  }

  function ensureResumeId(form) {
    const explicit = form.resume_id?.trim()
    if (explicit) return explicit
    const base = (form.label || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'resume'
    return `${base}-${Date.now().toString(36)}`
  }

  async function handleSave(id) {
    try {
      const { id: _id, created_at, updated_at, ...payload } = editForm
      if (!payload.label?.trim()) return toast.error('Role/label is required')
      if (!payload.file_url?.trim()) return toast.error('Resume file is required')
      payload.resume_id = ensureResumeId(payload)
      await updateResume(id, payload)
      if (payload.is_default) await syncDefault(items, id)
      setEditingId(null)
      toast.success('Resume updated')
      invalidatePortfolioCache('resumes')
      load()
    } catch (err) {
      toast.error('Failed to save: ' + err.message)
    }
  }

  async function handleCreate() {
    if (!newForm.label.trim()) return toast.error('Role/label is required')
    if (!newForm.file_url.trim()) return toast.error('Resume file is required')
    try {
      const payload = { ...newForm, resume_id: ensureResumeId(newForm) }
      const created = await createResume(payload)
      if (payload.is_default) await syncDefault(items, created.id)
      setShowNew(false)
      setNewForm(emptyForm)
      toast.success('Resume created')
      invalidatePortfolioCache('resumes')
      load()
    } catch (err) {
      toast.error('Failed to create: ' + err.message)
    }
  }

  async function handleDelete(id) {
    const ok = await confirm({
      title: 'Delete Resume',
      message: 'Are you sure you want to delete this resume?',
      confirmText: 'Delete',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteResume(id)
      toast.success('Resume deleted')
      invalidatePortfolioCache('resumes')
      load()
    } catch (err) {
      toast.error('Failed to delete: ' + err.message)
    }
  }

  async function handleBulkDeleteWrapper() {
    if (selectedIds.size === 0) return
    const ok = await confirm({
      title: 'Delete Selected Resumes',
      message: `Delete ${selectedIds.size} selected resume(s) permanently?`,
      confirmText: 'Delete All',
      danger: true,
    })
    if (!ok) return
    const { deleted, errors } = await handleBulkDelete(deleteResume)
    if (deleted > 0) toast.success(`Deleted ${deleted} resume(s)`)
    if (errors?.length > 0) toast.error(`Failed to delete ${errors.length} resume(s)`)
    clearSelection()
    invalidatePortfolioCache('resumes')
    load()
  }

  const inputStyle = {
    borderColor: 'var(--border-color)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
  }

  function renderFields(value, setValue) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Resume ID</label>
          <input type="text" value={value.resume_id ?? ''} onChange={(e) => setValue({ ...value, resume_id: e.target.value })} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} placeholder="e.g. frontend-dev" />
        </div>
        <div>
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Target Role / Label</label>
          <input type="text" value={value.label ?? ''} onChange={(e) => setValue({ ...value, label: e.target.value })} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} placeholder="e.g. Frontend Developer" />
        </div>
        <div>
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>File Name</label>
          <input type="text" value={value.file_name ?? ''} onChange={(e) => setValue({ ...value, file_name: e.target.value })} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} placeholder="e.g. Amit-Frontend-Resume.pdf" />
        </div>
        <div>
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Display Order</label>
          <input type="number" value={value.display_order ?? 0} onChange={(e) => setValue({ ...value, display_order: +e.target.value })} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Description</label>
          <textarea value={value.description ?? ''} onChange={(e) => setValue({ ...value, description: e.target.value })} rows={2} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} placeholder="Short note about this resume variant" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Resume File (PDF/DOC/DOCX)</label>
          <ResumeFileUpload
            value={value.file_url || ''}
            fileName={value.file_name || ''}
            onChange={(url) => setValue({ ...value, file_url: url })}
            onFileNameChange={(file_name) => setValue({ ...value, file_name })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={!!value.is_default} onChange={(e) => setValue({ ...value, is_default: e.target.checked })} className="rounded" />
          Default resume (shown first on client side)
        </label>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Resumes
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Upload multiple resumes for different job roles. Visitors can choose which one to view or download.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search resumes..." />
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
          {renderFields(newForm, setNewForm)}
          <button onClick={handleCreate} className="mt-4 rounded-lg px-4 py-2 text-sm text-white transition-all hover:opacity-90" style={{ background: '#10b981' }}>Create</button>
        </div>
      )}

      <BulkActionsBar selectedCount={selectedIds.size} onDelete={handleBulkDeleteWrapper} onClear={clearSelection} />

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
              <div>
                {renderFields(editForm, setEditForm)}
                <div className="mt-4 flex gap-2">
                  <button onClick={() => handleSave(item.id)} className="rounded px-3 py-1.5 text-xs text-white" style={{ background: '#10b981' }}>Save</button>
                  <button onClick={() => setEditingId(null)} className="rounded px-3 py-1.5 text-xs" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label || 'Untitled resume'}</h3>
                    {item.is_default && (
                      <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-400">Default</span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {[item.resume_id, item.file_name].filter(Boolean).join(' — ') || 'No file name'}
                  </p>
                  {item.description && <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{item.description}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {item.file_url && <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: 'var(--text-secondary)' }}>View</a>}
                  <button onClick={() => { setEditingId(item.id); setEditForm(item) }} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {search ? 'No resumes match your search.' : 'No resumes yet. Add role-based resumes for visitors to choose from.'}
          </p>
        )}
      </div>
    </div>
  )
}