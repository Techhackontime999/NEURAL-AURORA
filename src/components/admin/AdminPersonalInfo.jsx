import { useState, useEffect, useRef } from 'react'
import { getPersonalInfo, updatePersonalInfo, uploadImage } from '../../lib/supabase'
import ImageUpload from '../ui/ImageUpload'

function ResumeUpload({ value, onChange }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file, 'portfolio-images')
      if (onChange) onChange(url)
    } catch (err) {
      alert('Upload failed: ' + err.message)
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleFile} />
      <div className="flex gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {uploading ? 'Uploading...' : value ? 'Replace Resume' : 'Upload Resume'}
        </button>
        {value && (
          <>
            <a href={value} target="_blank" rel="noopener noreferrer"
              className="rounded-lg px-3 py-1.5 text-xs"
              style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
            >View</a>
            <button type="button" onClick={() => onChange?.('')}
              className="rounded-lg px-3 py-1.5 text-xs"
              style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
            >Remove</button>
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminPersonalInfo() {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getPersonalInfo().then(setForm).catch(console.error)
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await updatePersonalInfo(form)
      setMessage('Saved successfully')
    } catch (err) {
      setMessage('Error: ' + err.message)
    }
    setSaving(false)
  }

  if (!form) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
  }

  const textFields = [
    { key: 'name', label: 'Name' },
    { key: 'handle', label: 'Handle' },
    { key: 'title', label: 'Title' },
    { key: 'tagline', label: 'Tagline' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Personal Info
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Edit your portfolio profile details
        </p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-5">
        <div
          className="rounded-xl border p-5 space-y-5"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--card-bg)',
          }}
        >
          {textFields.map(({ key, label }) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {label}
              </label>
              <input
                type="text"
                value={form[key] || ''}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-1"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          ))}

          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Resume
            </label>
            <ResumeUpload
              value={form.resume || ''}
              onChange={(url) => setForm({ ...form, resume: url })}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Avatar
            </label>
            <ImageUpload
              value={form.avatar || ''}
              onChange={(url) => setForm({ ...form, avatar: url })}
              label="Avatar"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Bio
            </label>
            <textarea
              value={form.bio || ''}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={4}
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-1"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {message && (
          <p className={`text-sm ${message.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg px-6 py-2.5 font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
