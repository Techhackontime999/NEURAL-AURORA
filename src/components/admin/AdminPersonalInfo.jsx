import { useState, useEffect } from 'react'
import { getPersonalInfo, updatePersonalInfo } from '../../lib/supabase'

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

  const fields = [
    { key: 'name', label: 'Name' },
    { key: 'handle', label: 'Handle' },
    { key: 'title', label: 'Title' },
    { key: 'tagline', label: 'Tagline' },
    { key: 'avatar', label: 'Avatar URL' },
    { key: 'resume', label: 'Resume URL' },
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
          {fields.map(({ key, label }) => (
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
