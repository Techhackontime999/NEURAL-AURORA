import { useState, useEffect } from 'react'
import { getExperience, updateExperience, createExperience, deleteExperience } from '../../lib/supabase'

export default function AdminExperience() {
  const [items, setItems] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ exp_id: '', role: '', company: '', year: '', description: '', display_order: 0 })

  useEffect(() => { load() }, [])

  async function load() { setItems(await getExperience()) }

  async function handleSave(id) {
    try {
      const { id: _id, created_at, updated_at, ...payload } = editForm
      await updateExperience(id, payload)
      setEditingId(null); load()
    } catch (err) { alert('Failed to save: ' + err.message) }
  }

  async function handleCreate() {
    if (!newForm.role.trim()) return
    try {
      await createExperience(newForm)
      setShowNew(false)
      setNewForm({ exp_id: '', role: '', company: '', year: '', description: '', display_order: 0 })
      load()
    } catch (err) { alert('Failed to create: ' + err.message) }
  }

  async function handleDelete(id) { if (confirm('Delete?')) { try { await deleteExperience(id); load() } catch (err) { alert('Failed to delete: ' + err.message) } } }

  const fields = [
    { key: 'exp_id', label: 'ID' },
    { key: 'role', label: 'Role' },
    { key: 'company', label: 'Company' },
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Experience
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage your work experience history
          </p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          {showNew ? 'Cancel' : '+ Add'}
        </button>
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

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
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
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.role}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{item.company} — {item.year}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(item.id); setEditForm(item) }} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No experience entries yet.</p>
        )}
      </div>
    </div>
  )
}
