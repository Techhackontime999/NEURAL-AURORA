import { useState, useEffect } from 'react'
import { getSocialLinks, updateSocialLink, createSocialLink, deleteSocialLink } from '../../lib/supabase'

const iconOptions = ['github', 'linkedin', 'code', 'terminal', 'x', 'youtube', 'instagram', 'facebook', 'link', 'globe', 'mail']

export default function AdminSocialLinks() {
  const [links, setLinks] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ label: '', url: '', icon: 'link', display_order: 0 })

  useEffect(() => { load() }, [])

  async function load() { setLinks(await getSocialLinks()) }

  async function handleSave(id) {
    await updateSocialLink(id, editForm)
    setEditingId(null); load()
  }

  async function handleCreate() {
    if (!newForm.label.trim()) return
    await createSocialLink(newForm)
    setShowNew(false)
    setNewForm({ label: '', url: '', icon: 'link', display_order: 0 })
    load()
  }

  async function handleDelete(id) { if (confirm('Delete?')) { await deleteSocialLink(id); load() } }

  const fields = [
    { key: 'label', label: 'Label' },
    { key: 'url', label: 'URL' },
    { key: 'display_order', label: 'Order', type: 'number' },
  ]

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Social Links</h1>
        <button onClick={() => setShowNew(!showNew)} className="rounded-lg bg-neural-500 px-4 py-2 text-sm font-medium text-white hover:bg-neural-400">
          {showNew ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showNew && (
        <div className="mb-6 rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <input type="text" placeholder="Label" value={newForm.label} onChange={(e) => setNewForm({ ...newForm, label: e.target.value })} className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500" />
            <input type="text" placeholder="URL" value={newForm.url} onChange={(e) => setNewForm({ ...newForm, url: e.target.value })} className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500" />
            <select value={newForm.icon} onChange={(e) => setNewForm({ ...newForm, icon: e.target.value })} className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neural-500">
              {iconOptions.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            <button onClick={handleCreate} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500">Create</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {links.map((link) => (
          <div key={link.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            {editingId === link.id ? (
              <div className="flex items-center gap-3">
                <input type="text" value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none" />
                <input type="text" value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none" />
                <select value={editForm.icon} onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })} className="rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none">
                  {iconOptions.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
                <button onClick={() => handleSave(link.id)} className="text-xs text-emerald-400 hover:text-emerald-300">Save</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-neural-500 hover:text-neural-400">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neural-500">{link.icon}</span>
                  <span className="text-sm text-white">{link.label}</span>
                  <span className="text-xs text-neural-600 truncate max-w-[200px]">{link.url}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(link.id); setEditForm(link) }} className="text-xs text-neural-400 hover:text-white">Edit</button>
                  <button onClick={() => handleDelete(link.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
