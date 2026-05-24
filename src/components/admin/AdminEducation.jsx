import { useState, useEffect } from 'react'
import { getEducation, updateEducation, createEducation, deleteEducation } from '../../lib/supabase'
import useBulkSelect from '../../lib/useBulkSelect'
import BulkActionsBar from '../ui/BulkActionsBar'
import SearchBar from '../ui/SearchBar'

export default function AdminEducation() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ edu_id: '', degree: '', school: '', year: '', description: '', display_order: 0 })

  const filtered = search
    ? items.filter(item =>
        [item.degree, item.school, item.year, item.description, item.edu_id]
          .some(f => f?.toLowerCase().includes(search.toLowerCase()))
      )
    : items

  const { selectedIds, toggleSelect, toggleAll, clearSelection, allSelected, handleBulkDelete } = useBulkSelect(filtered)

  useEffect(() => { load() }, [])

  async function load() { setItems(await getEducation()) }

  async function handleSave(id) {
    try {
      const { id: _id, created_at, updated_at, ...payload } = editForm
      await updateEducation(id, payload)
      setEditingId(null); load()
    } catch (err) { alert('Failed to save: ' + err.message) }
  }

  async function handleCreate() {
    if (!newForm.degree.trim()) return
    try {
      await createEducation(newForm)
      setShowNew(false)
      setNewForm({ edu_id: '', degree: '', school: '', year: '', description: '', display_order: 0 })
      load()
    } catch (err) { alert('Failed to create: ' + err.message) }
  }

  async function handleDelete(id) { if (confirm('Delete?')) { try { await deleteEducation(id); load() } catch (err) { alert('Failed to delete: ' + err.message) } } }

  async function handleBulkDeleteWrapper() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected items permanently?`)) return
    const { deleted, errors } = await handleBulkDelete(deleteEducation)
    clearSelection()
    load()
  }

  const fields = [
    { key: 'edu_id', label: 'ID' },
    { key: 'degree', label: 'Degree' },
    { key: 'school', label: 'School' },
    { key: 'year', label: 'Year' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'display_order', label: 'Order', type: 'number' },
  ]

  const inputStyle = {
    borderColor: 'var(--border-color)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Education
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage your educational background
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search education..." />
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
            {fields.map(({ key, label, type }) => (
              <div key={key} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
                {type === 'textarea' ? (
                  <textarea value={newForm[key]} onChange={(e) => setNewForm({ ...newForm, [key]: e.target.value })} rows={3} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} />
                ) : (
                  <input type={type || 'text'} value={newForm[key]} onChange={(e) => setNewForm({ ...newForm, [key]: type === 'number' ? +e.target.value : e.target.value })} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} />
                )}
              </div>
            ))}
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
                {fields.map(({ key, label, type }) => (
                  <div key={key} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
                    <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
                    {type === 'textarea' ? (
                      <textarea value={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} rows={3} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} />
                    ) : (
                      <input type={type || 'text'} value={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: type === 'number' ? +e.target.value : e.target.value })} className="w-full rounded border px-3 py-2 text-sm outline-none" style={inputStyle} />
                    )}
                  </div>
                ))}
                <div className="col-span-2 flex gap-2">
                  <button onClick={() => handleSave(item.id)} className="rounded px-3 py-1.5 text-xs text-white" style={{ background: '#10b981' }}>Save</button>
                  <button onClick={() => setEditingId(null)} className="rounded px-3 py-1.5 text-xs" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded shrink-0 mt-1" />
                <div>
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.degree}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{item.school} — {item.year}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(item.id); setEditForm(item) }} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No education entries yet.</p>
        )}
      </div>
    </div>
  )
}
