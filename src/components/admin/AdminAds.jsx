import { useState, useEffect } from 'react'
import { getAdVideos, addAdVideo, updateAdVideo, deleteAdVideo } from '../../lib/supabase'

const AD_TYPES = [
  { value: 'google', label: 'Google AdSense', desc: 'Auto-served by Google' },
  { value: 'youtube', label: 'YouTube Video', desc: 'Specific YouTube URL' },
]

const defaultForm = { title: '', ad_type: 'google', video_url: '', duration_seconds: 30, active: true }

export default function AdminAds() {
  const [ads, setAds] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ ...defaultForm })
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ ...defaultForm })
  const [urlError, setUrlError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setAds(await getAdVideos())
  }

  function validateUrl(url) {
    return !url || url.includes('youtube.com') || url.includes('youtu.be')
  }

  function validate(form) {
    if (form.ad_type === 'youtube') {
      if (!form.video_url.trim()) return 'YouTube URL is required'
      if (!validateUrl(form.video_url)) return 'Must be a valid YouTube URL'
    }
    if (!form.title.trim()) return 'Title is required'
    return ''
  }

  async function handleSave(id) {
    const err = validate(editForm)
    if (err) { setUrlError(err); return }
    setUrlError('')
    await updateAdVideo(id, editForm)
    setEditingId(null)
    load()
  }

  async function handleCreate() {
    const err = validate(newForm)
    if (err) { setUrlError(err); return }
    setUrlError('')
    await addAdVideo(newForm)
    setNewForm({ ...defaultForm })
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
            Manage ads shown in the StartingLoader — Google AdSense or custom YouTube videos
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
            <select
              value={newForm.ad_type}
              onChange={(e) => setNewForm({ ...newForm, ad_type: e.target.value, video_url: '' })}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              {AD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {newForm.ad_type === 'youtube' ? (
              <input
                type="text"
                placeholder="YouTube URL"
                value={newForm.video_url}
                onChange={(e) => setNewForm({ ...newForm, video_url: e.target.value })}
                className="rounded-lg border px-3 py-2 text-sm outline-none"
                style={inputStyle}
              />
            ) : (
              <div className="rounded-lg border px-3 py-2 text-xs flex items-center"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)', background: 'var(--input-bg)' }}
              >
                Auto-served by Google AdSense
              </div>
            )}
            <input
              type="number"
              placeholder="Duration (sec)"
              min={1}
              value={newForm.duration_seconds}
              onChange={(e) => setNewForm({ ...newForm, duration_seconds: +e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            {urlError && <p className="text-xs text-red-400 col-span-full">{urlError}</p>}
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
                <select
                  value={editForm.ad_type}
                  onChange={(e) => setEditForm({ ...editForm, ad_type: e.target.value, video_url: '' })}
                  className="rounded border px-2 py-1 text-sm outline-none"
                  style={inputStyle}
                >
                  {AD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {editForm.ad_type === 'youtube' ? (
                  <input
                    type="text"
                    value={editForm.video_url}
                    onChange={(e) => setEditForm({ ...editForm, video_url: e.target.value })}
                    className="w-40 rounded border px-2 py-1 text-sm outline-none"
                    style={inputStyle}
                  />
                ) : (
                  <span className="w-40 text-xs" style={{ color: 'var(--text-tertiary)' }}>Auto-served</span>
                )}
                <input
                  type="number"
                  value={editForm.duration_seconds}
                  min={1}
                  onChange={(e) => setEditForm({ ...editForm, duration_seconds: +e.target.value })}
                  className="w-14 rounded border px-2 py-1 text-sm outline-none"
                  style={inputStyle}
                />
                {urlError && editingId === ad.id && (
                  <span className="text-xs text-red-400">{urlError}</span>
                )}
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
                <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)' }}>{ad.title}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  ad.ad_type === 'google'
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-neural-blue bg-neural-blue/10'
                }`}>
                  {ad.ad_type === 'google' ? 'Google' : 'YouTube'}
                </span>
                <span className="w-36 truncate text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {ad.ad_type === 'youtube' ? ad.video_url : '—'}
                </span>
                <span className="w-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{ad.duration_seconds}s</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ad.active ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/20 bg-white/5'}`}>
                  {ad.active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Views: {ad.view_count || 0}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(ad.id); setEditForm(ad); setUrlError('') }} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Edit</button>
                  <button onClick={() => handleDelete(ad.id)} className="text-xs text-red-400">Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
        {ads.length === 0 && (
          <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No ads yet.</p>
        )}
      </div>
    </div>
  )
}
