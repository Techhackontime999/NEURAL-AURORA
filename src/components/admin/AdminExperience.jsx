import { useState, useEffect } from 'react'
import { getExperience, updateExperience, createExperience, deleteExperience } from '../../lib/supabase'

export default function AdminExperience() {
  const [items, setItems] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ exp_id: '', role: '', company: '', year: '', description: '', display_order: 0 })

  useEffect(() => { load() }, [])

  async function load() {
    setItems(await getExperience())
  }

  async function handleSave(id) {
    await updateExperience(id, editForm)
    setEditingId(null); load()
  }

  async function handleCreate() {
    if (!newForm.role.trim()) return
    await createExperience(newForm)
    setShowNew(false)
    setNewForm({ exp_id: '', role: '', company: '', year: '', description: '', display_order: 0 })
    load()
  }

  async function handleDelete(id) {
    if (confirm('Delete?')) { await deleteExperience(id); load() }
  }

  const fields = [
    { key: 'exp_id', label: 'ID' },
    { key: 'role', label: 'Role' },
    { key: 'company', label: 'Company' },
    { key: 'year', label: 'Year' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'display_order', label: 'Order', type: 'number' },
  ]

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Experience</h1>
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
                <div>
                  <h3 className="text-sm font-medium text-white">{item.role}</h3>
                  <p className="text-xs text-neural-400">{item.company} — {item.year}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(item.id); setEditForm(item) }} className="text-xs text-neural-400 hover:text-white">Edit</button>
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
