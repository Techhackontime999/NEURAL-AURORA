import { useState, useEffect } from 'react'
import { getCaseStudies, updateCaseStudy, createCaseStudy, deleteCaseStudy } from '../../lib/supabase'

export default function AdminCaseStudies() {
  const [items, setItems] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ cs_id: '', title: '', description: '', outcome: '', tech: [], display_order: 0 })

  useEffect(() => { load() }, [])

  async function load() { setItems(await getCaseStudies()) }

  async function handleSave(id) {
    const payload = { ...editForm }
    if (typeof payload.tech === 'string') payload.tech = payload.tech.split(',').map(t => t.trim()).filter(Boolean)
    await updateCaseStudy(id, payload)
    setEditingId(null); load()
  }

  async function handleCreate() {
    if (!newForm.title.trim()) return
    const payload = { ...newForm }
    if (typeof payload.tech === 'string') payload.tech = payload.tech.split(',').map(t => t.trim()).filter(Boolean)
    await createCaseStudy(payload)
    setShowNew(false)
    setNewForm({ cs_id: '', title: '', description: '', outcome: '', tech: [], display_order: 0 })
    load()
  }

  async function handleDelete(id) { if (confirm('Delete?')) { await deleteCaseStudy(id); load() } }

  function startEdit(item) {
    setEditingId(item.id)
    setEditForm({ ...item, tech: item.tech?.join(', ') || '' })
  }

  const fields = [
    { key: 'cs_id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'outcome', label: 'Outcome', type: 'textarea' },
    { key: 'tech', label: 'Tech (comma-separated)' },
    { key: 'display_order', label: 'Order', type: 'number' },
  ]

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Case Studies</h1>
        <button onClick={() => setShowNew(!showNew)} className="rounded-lg bg-neural-500 px-4 py-2 text-sm font-medium text-white hover:bg-neural-400">
          {showNew ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showNew && (
        <div className="mb-6 rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(({ key, label, type }) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-neural-500">{label}</label>
                {type === 'textarea' ? (
                  <textarea value={newForm[key]} onChange={(e) => setNewForm({ ...newForm, [key]: e.target.value })} rows={3} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500" />
                ) : (
                  <input type={type || 'text'} value={newForm[key]} onChange={(e) => setNewForm({ ...newForm, [key]: type === 'number' ? +e.target.value : e.target.value })} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500" />
                )}
              </div>
            ))}
          </div>
          <button onClick={handleCreate} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500">Create</button>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            {editingId === item.id ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs text-neural-500">{label}</label>
                    {type === 'textarea' ? (
                      <textarea value={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} rows={3} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500" />
                    ) : (
                      <input type={type || 'text'} value={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: type === 'number' ? +e.target.value : e.target.value })} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500" />
                    )}
                  </div>
                ))}
                <div className="col-span-2 flex gap-2">
                  <button onClick={() => handleSave(item.id)} className="rounded bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500">Save</button>
                  <button onClick={() => setEditingId(null)} className="rounded bg-white/10 px-3 py-1.5 text-xs text-neural-400 hover:bg-white/20">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-white">{item.title}</h3>
                  <p className="mt-1 text-xs text-neural-500 line-clamp-2">{item.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(item.tech || []).map((t) => (
                      <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-neural-400">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => startEdit(item)} className="text-xs text-neural-400 hover:text-white">Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
