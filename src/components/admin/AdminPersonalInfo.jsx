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
    return <div className="text-neural-400">Loading...</div>
  }

  return (
    <div>
      <h1 className="mb-8 font-display text-2xl font-bold text-white">Personal Info</h1>

      <form onSubmit={handleSave} className="max-w-2xl space-y-5">
        {[
          { key: 'name', label: 'Name' },
          { key: 'handle', label: 'Handle' },
          { key: 'title', label: 'Title' },
          { key: 'tagline', label: 'Tagline' },
          { key: 'avatar', label: 'Avatar URL' },
          { key: 'resume', label: 'Resume URL' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="mb-1.5 block text-sm font-medium text-neural-300">{label}</label>
            <input
              type="text"
              value={form[key] || ''}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neural-600 outline-none transition-colors focus:border-neural-500 focus:ring-1 focus:ring-neural-500"
            />
          </div>
        ))}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neural-300">Bio</label>
          <textarea
            value={form.bio || ''}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-neural-600 outline-none transition-colors focus:border-neural-500 focus:ring-1 focus:ring-neural-500"
          />
        </div>

        {message && (
          <p className={`text-sm ${message.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-neural-500 px-6 py-2.5 font-medium text-white transition-all hover:bg-neural-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
