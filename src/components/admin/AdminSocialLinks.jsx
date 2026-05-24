import { useState, useEffect } from 'react'
import { getSocialLinks, updateSocialLink, createSocialLink, deleteSocialLink } from '../../lib/supabase'
import useBulkSelect from '../../lib/useBulkSelect'
import BulkActionsBar from '../ui/BulkActionsBar'
import SearchBar from '../ui/SearchBar'

const iconOptions = ['github', 'linkedin', 'code', 'terminal', 'x', 'youtube', 'instagram', 'facebook', 'link', 'globe', 'mail']

export default function AdminSocialLinks() {
  const [links, setLinks] = useState([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ label: '', url: '', icon: 'link', display_order: 0 })
  const filtered = search
    ? links.filter(l =>
        [l.label, l.url, l.icon]
          .some(f => f?.toLowerCase().includes(search.toLowerCase()))
      )
    : links

  const { selectedIds, toggleSelect, toggleAll, clearSelection, allSelected, handleBulkDelete } = useBulkSelect(filtered)

  useEffect(() => { load() }, [])

  async function load() { setLinks(await getSocialLinks()) }

  async function handleSave(id) {
    try { const { id: _id, created_at, updated_at, ...payload } = editForm; await updateSocialLink(id, payload); setEditingId(null); load() }
    catch (err) { alert('Failed to save: ' + err.message) }
  }

  async function handleCreate() {
    if (!newForm.label.trim()) return
    try {
      await createSocialLink(newForm)
      setShowNew(false)
      setNewForm({ label: '', url: '', icon: 'link', display_order: 0 })
      load()
    } catch (err) { alert('Failed to create: ' + err.message) }
  }

  async function handleDelete(id) { if (confirm('Delete?')) { try { await deleteSocialLink(id); load() } catch (err) { alert('Failed to delete: ' + err.message) } } }

  async function handleBulkDeleteWrapper() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected links permanently?`)) return
    const { deleted, errors } = await handleBulkDelete(deleteSocialLink)
    clearSelection()
    load()
  }

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
            Social Links
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage your social media and external links
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search links..." />
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
          <div className="grid gap-3 sm:grid-cols-4">
            <input type="text" placeholder="Label" value={newForm.label} onChange={(e) => setNewForm({ ...newForm, label: e.target.value })} className="rounded border px-3 py-2 text-sm outline-none" style={inputStyle} />
            <input type="text" placeholder="URL" value={newForm.url} onChange={(e) => setNewForm({ ...newForm, url: e.target.value })} className="rounded border px-3 py-2 text-sm outline-none" style={inputStyle} />
            <select value={newForm.icon} onChange={(e) => setNewForm({ ...newForm, icon: e.target.value })} className="rounded border px-3 py-2 text-sm outline-none" style={inputStyle}>
              {iconOptions.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            <button onClick={handleCreate} className="rounded-lg px-3 py-2 text-sm text-white transition-all hover:opacity-90" style={{ background: '#10b981' }}>Create</button>
          </div>
        </div>
      )}

      <BulkActionsBar selectedCount={selectedIds.size} onDelete={handleBulkDeleteWrapper} onClear={clearSelection} />

      <div className="space-y-2">
        {allSelected !== undefined && filtered.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-t-xl border text-[11px] font-medium uppercase tracking-wider"
            style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-tertiary)' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              Select All
            </label>
          </div>
        )}
        {filtered.map((link) => (
          <div key={link.id} className="rounded-xl border p-3" style={{ borderColor: selectedIds.has(link.id) ? 'var(--accent)' : 'var(--border-color)', background: selectedIds.has(link.id) ? 'color-mix(in srgb, var(--accent) 8%, var(--card-bg))' : 'var(--card-bg)' }}>
            {editingId === link.id ? (
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selectedIds.has(link.id)} onChange={() => toggleSelect(link.id)} className="rounded shrink-0" />
                <input type="text" value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} className="flex-1 rounded border px-2 py-1 text-sm outline-none" style={inputStyle} />
                <input type="text" value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} className="flex-[2] rounded border px-2 py-1 text-sm outline-none" style={inputStyle} />
                <select value={editForm.icon} onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })} className="rounded border px-2 py-1 text-sm outline-none" style={inputStyle}>
                  {iconOptions.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
                <button onClick={() => handleSave(link.id)} className="text-xs text-emerald-400 hover:text-emerald-300">Save</button>
                <button onClick={() => setEditingId(null)} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Cancel</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedIds.has(link.id)} onChange={() => toggleSelect(link.id)} className="rounded shrink-0" />
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{link.icon}</span>
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{link.label}</span>
                  <span className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-tertiary)' }}>{link.url}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(link.id); setEditForm(link) }} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Edit</button>
                  <button onClick={() => handleDelete(link.id)} className="text-xs text-red-400">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No social links yet.</p>
        )}
      </div>
    </div>
  )
}
