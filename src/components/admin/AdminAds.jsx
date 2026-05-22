import { useState, useEffect } from 'react'
import { getAdVideos, addAdVideo, updateAdVideo, deleteAdVideo } from '../../lib/supabase'

export default function AdminAds() {
  const [ads, setAds] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', video_url: '', duration_seconds: 30, active: true })
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ title: '', video_url: '', duration_seconds: 30, active: true })

  useEffect(() => { load() }, [])

  async function load() {
    setAds(await getAdVideos())
  }

  function validateUrl(url) {
    return url && (url.includes('youtube.com') || url.includes('youtu.be'))
  }

  async function handleSave(id) {
    if (!editForm.title.trim() || !validateUrl(editForm.video_url)) return
    await updateAdVideo(id, editForm)
    setEditingId(null)
    load()
  }

  async function handleCreate() {
    if (!newForm.title.trim() || !validateUrl(newForm.video_url)) return
    await addAdVideo(newForm)
    setNewForm({ title: '', video_url: '', duration_seconds: 30, active: true })
    setShowNew(false)
    load()
  }

  async function handleDelete(id) {
    if (confirm('Delete this ad video?')) {
      await deleteAdVideo(id)
      load()
    }
  }

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
            Dev Ads
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage video ads shown in the StartingLoader
          </p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          {showNew ? 'Cancel' : '+ Add Ad'}
        </button>
      </div>

      {showNew && (
        <div
          className="mb-6 rounded-xl border p-4"
          style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <input
              type="text"
              placeholder="Title"
              value={newForm.title}
              onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="YouTube URL"
              value={newForm.video_url}
              onChange={(e) => setNewForm({ ...newForm, video_url: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            <input
              type="number"
              placeholder="Duration (sec)"
              min={1}
              value={newForm.duration_seconds}
              onChange={(e) => setNewForm({ ...newForm, duration_seconds: +e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            <button
              onClick={handleCreate}
              className="rounded-lg px-3 py-2 text-sm text-white transition-all hover:opacity-90"
              style={{ background: '#10b981' }}
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {ads.map((ad, i) => (
          <div
            key={ad.id}
            className="flex items-center gap-4 px-4 py-3"
            style={{
              borderBottom: i < ads.length - 1 ? '1px solid var(--border-color)' : 'none',
              background: 'var(--card-bg)',
            }}
          >
            {editingId === ad.id ? (
              <>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="flex-1 rounded border px-2 py-1 text-sm outline-none"
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={editForm.video_url}
                  onChange={(e) => setEditForm({ ...editForm, video_url: e.target.value })}
                  className="w-48 rounded border px-2 py-1 text-sm outline-none"
                  style={inputStyle}
                />
                <input
                  type="number"
                  value={editForm.duration_seconds}
                  min={1}
                  onChange={(e) => setEditForm({ ...editForm, duration_seconds: +e.target.value })}
                  className="w-16 rounded border px-2 py-1 text-sm outline-none"
                  style={inputStyle}
                />
                <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={editForm.active}
                    onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                  />
                  Active
                </label>
                <button onClick={() => handleSave(ad.id)} className="text-xs text-emerald-400 hover:text-emerald-300">Save</button>
                <button onClick={() => setEditingId(null)} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Cancel</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{ad.title}</span>
                <span className="w-48 truncate text-xs" style={{ color: 'var(--text-tertiary)' }}>{ad.video_url}</span>
                <span className="w-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{ad.duration_seconds}s</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ad.active ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/20 bg-white/5'}`}>
                  {ad.active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Views: {ad.view_count || 0}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(ad.id); setEditForm(ad) }} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Edit</button>
                  <button onClick={() => handleDelete(ad.id)} className="text-xs text-red-400">Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
        {ads.length === 0 && (
          <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No ad videos yet.</p>
        )}
      </div>
    </div>
  )
}
