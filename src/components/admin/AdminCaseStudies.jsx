import { useState, useEffect } from 'react'
import { getCaseStudies, updateCaseStudy, createCaseStudy, deleteCaseStudy } from '../../lib/supabase'
import RichTextEditor from './RichTextEditor'

export default function AdminCaseStudies() {
  const [items, setItems] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ cs_id: '', title: '', slug: '', description: '', outcome: '', content: '', tech: [], display_order: 0 })

  useEffect(() => { load() }, [])

  async function load() { setItems(await getCaseStudies()) }

  async function handleSave(id) {
    try {
      const { id: _id, created_at, updated_at, ...payload } = editForm
      if (typeof payload.tech === 'string') payload.tech = payload.tech.split(',').map(t => t.trim()).filter(Boolean)
      await updateCaseStudy(id, payload)
      setEditingId(null); load()
    } catch (err) { alert('Failed to save: ' + err.message) }
  }

  async function handleCreate() {
    if (!newForm.title.trim()) return
    try {
      const { id: _id, created_at, updated_at, ...payload } = newForm
      if (typeof payload.tech === 'string') payload.tech = payload.tech.split(',').map(t => t.trim()).filter(Boolean)
      await createCaseStudy(payload)
      setShowNew(false)
      setNewForm({ cs_id: '', title: '', slug: '', description: '', outcome: '', content: '', tech: [], display_order: 0 })
      load()
    } catch (err) { alert('Failed to create: ' + err.message) }
  }

  async function handleDelete(id) { if (confirm('Delete?')) { try { await deleteCaseStudy(id); load() } catch (err) { alert('Failed to delete: ' + err.message) } } }

  function startEdit(item) {
    setEditingId(item.id)
    setEditForm({ ...item, tech: item.tech?.join(', ') || '' })
  }

  const fields = [
    { key: 'cs_id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'slug', label: 'Slug' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'tech', label: 'Tech (comma-separated)' },
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
            Case Studies
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Showcase your project case studies
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
        <div
          className="mb-6 rounded-xl border p-4"
          style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
        >
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
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Outcome</label>
              <RichTextEditor
                value={newForm.outcome}
                onChange={(html) => setNewForm({ ...newForm, outcome: html })}
                placeholder="Describe the outcome..."
                minHeight={150}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Content</label>
              <RichTextEditor
                value={newForm.content}
                onChange={(html) => setNewForm({ ...newForm, content: html })}
                placeholder="Write the full case study content..."
                minHeight={300}
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="mt-4 rounded-lg px-4 py-2 text-sm text-white transition-all hover:opacity-90"
            style={{ background: '#10b981' }}
          >
            Create
          </button>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border p-4"
            style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
          >
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
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Outcome</label>
                  <RichTextEditor
                    value={editForm.outcome}
                    onChange={(html) => setEditForm({ ...editForm, outcome: html })}
                    minHeight={150}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Content</label>
                  <RichTextEditor
                    value={editForm.content}
                    onChange={(html) => setEditForm({ ...editForm, content: html })}
                    minHeight={300}
                  />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => handleSave(item.id)} className="rounded px-3 py-1.5 text-xs text-white" style={{ background: '#10b981' }}>Save</button>
                  <button onClick={() => setEditingId(null)} className="rounded px-3 py-1.5 text-xs" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                  <p className="mt-1 text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(item.tech || []).map((t) => (
                      <span key={t} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'var(--hover-bg)', color: 'var(--text-tertiary)' }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => startEdit(item)} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No case studies yet.</p>
        )}
      </div>
    </div>
  )
}
