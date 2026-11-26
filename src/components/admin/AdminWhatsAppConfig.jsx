import { useState, useEffect } from 'react'
import { getAdminSettings, updateAdminSettings } from '../../lib/supabase'
import { invalidatePortfolioCache } from '../../lib/usePortfolioData'

function normalizeWhatsAppNumber(value) {
  return String(value || '').replace(/[^\d]/g, '')
}

export default function AdminWhatsAppConfig() {
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const settings = await getAdminSettings()
      if (settings?.whatsapp_number) setWhatsappNumber(settings.whatsapp_number)
    } catch {
      // settings table may not have whatsapp_number yet
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const trimmed = whatsappNumber.trim()
    try {
      await updateAdminSettings({ whatsapp_number: trimmed })
      invalidatePortfolioCache('publicSiteSettings')
      setMessage({ type: 'success', text: 'WhatsApp number saved successfully.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save WhatsApp number.' })
    }
    setSaving(false)
  }

  const normalized = normalizeWhatsAppNumber(whatsappNumber)
  const waLink = normalized ? `https://wa.me/${normalized}` : ''

  const sectionStyle = {
    borderColor: 'var(--border-color)',
    background: 'var(--card-bg)',
  }

  const inputStyle = {
    borderColor: 'var(--border-color)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
  }

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          WhatsApp Support
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Add your WhatsApp number so visitors can contact you directly from contact places on the site.
        </p>
      </div>

      <div className="max-w-xl rounded-xl border p-4 md:p-6 space-y-4" style={sectionStyle}>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            WhatsApp Number
          </label>
          <input
            type="text"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="e.g. +91 9876543210"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-cyan-500/50"
            style={inputStyle}
          />
          <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            Include country code. The site will use this to create a WhatsApp chat link.
          </p>
        </div>

        {waLink && (
          <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Preview link: </span>
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="underline break-all" style={{ color: 'var(--accent)' }}>
              {waLink}
            </a>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {saving ? 'Saving...' : 'Save Number'}
          </button>

          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-5 py-2 text-sm font-medium transition-all"
              style={{ color: 'var(--text-secondary)', background: 'var(--hover-bg)' }}
            >
              Test WhatsApp
            </a>
          )}
        </div>

        {message && (
          <p className="text-sm" style={{ color: message.type === 'success' ? '#10b981' : '#ef4444' }}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  )
}
