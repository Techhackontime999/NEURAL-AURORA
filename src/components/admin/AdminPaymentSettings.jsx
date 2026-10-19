import { useState, useEffect } from 'react'
import { getAdminSettings, updateAdminSettings } from '../../lib/supabase'

const defaultSettings = {
  razorpay_key: '',
  upi_id: '',
  donation_presets: [
    { amount: 99, label: '₹99', icon: 'Coffee', desc: 'Buy a coffee' },
    { amount: 199, label: '₹199', icon: 'Heart', desc: 'Support a feature' },
    { amount: 499, label: '₹499', icon: 'Zap', desc: 'Speed up dev' },
    { amount: 999, label: '₹999', icon: 'Rocket', desc: 'Launch booster' },
    { amount: 1999, label: '₹1,999', icon: 'Crown', desc: 'Premium backer' },
    { amount: 4999, label: '₹4,999', icon: 'Sparkles', desc: 'Legend tier' },
  ],
  upi_quickpay: [99, 499, 999],
  perks: [
    { title: 'Name in Credits', desc: 'Listed in README & footer.', min: 99 },
    { title: 'Early Access', desc: 'New features before public release.', min: 499 },
    { title: 'Feature Requests', desc: 'Vote on the roadmap.', min: 999 },
    { title: 'Priority Support', desc: 'Direct priority channel.', min: 1999 },
    { title: 'Co-Creator Status', desc: 'Influence on roadmap.', min: 4999 },
  ],
  hero_title: 'NEURAL AURORA',
  hero_subtitle: 'Source-Available & Free for Contributors',
  hero_description: 'NEURAL AURORA is source-available software. Your contribution keeps it alive.',
  faqs: [
    { q: 'Where does my money go?', a: '100% goes toward development costs — hosting, APIs, and contributors.' },
    { q: 'Is NEURAL AURORA really free?', a: 'It is free for contributors, verified students, and evaluation. Running it commercially requires a Commercial License.' },
    { q: 'Can I request a specific feature?', a: 'Contributors at ₹999+ can vote on the roadmap.' },
    { q: 'Is my payment secure?', a: 'All payments are processed securely through Razorpay.' },
  ],
}

const sectionStyle = { borderColor: 'var(--border-color)', background: 'var(--card-bg)' }
const inputStyle = { borderColor: 'var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)' }

function SettingsField({ label, desc, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
      {children}
      {desc && <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{desc}</p>}
    </div>
  )
}

export default function AdminPaymentSettings() {
  const [settings, setSettings] = useState(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const admin = await getAdminSettings()
      if (admin?.payment_settings) {
        setSettings({
          ...defaultSettings,
          ...admin.payment_settings,
          donation_presets: admin.payment_settings.donation_presets?.length ? admin.payment_settings.donation_presets : defaultSettings.donation_presets,
          upi_quickpay: admin.payment_settings.upi_quickpay?.length >= 2 ? admin.payment_settings.upi_quickpay : defaultSettings.upi_quickpay,
          perks: admin.payment_settings.perks?.length ? admin.payment_settings.perks : defaultSettings.perks,
          faqs: admin.payment_settings.faqs?.length ? admin.payment_settings.faqs : defaultSettings.faqs,
        })
      }
    } catch {}
    setLoading(false)
  }

  async function handleSave() {
    if (settings.upi_quickpay?.length < 2) {
      setMessage({ type: 'error', text: 'UPI Quick Pay needs at least 2 amounts.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      await updateAdminSettings({ payment_settings: settings })
      setMessage({ type: 'success', text: 'Payment settings saved.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save.' })
    }
    setSaving(false)
  }

  function update(path, value) {
    const keys = path.split('.')
    setSettings(prev => {
      const next = { ...prev }
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
      obj[keys[keys.length - 1]] = value
      return next
    })
  }

  function updatePreset(idx, field, value) {
    setSettings(prev => {
      const presets = [...prev.donation_presets]
      presets[idx] = { ...presets[idx], [field]: value }
      return { ...prev, donation_presets: presets }
    })
  }

  function updatePerk(idx, field, value) {
    setSettings(prev => {
      const perks = [...prev.perks]
      perks[idx] = { ...perks[idx], [field]: value }
      return { ...prev, perks }
    })
  }

  function updateFAQ(idx, field, value) {
    setSettings(prev => {
      const faqs = [...prev.faqs]
      faqs[idx] = { ...faqs[idx], [field]: value }
      return { ...prev, faqs }
    })
  }

  function addPreset() {
    setSettings(prev => ({ ...prev, donation_presets: [...prev.donation_presets, { amount: 0, label: '', icon: 'Heart', desc: '' }] }))
  }

  function removePreset(idx) {
    setSettings(prev => ({ ...prev, donation_presets: prev.donation_presets.filter((_, i) => i !== idx) }))
  }

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Payment & Support Settings
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Configure donation amounts, UPI presets, perks, and content for the /support page.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Razorpay & UPI */}
        <div className="rounded-xl border p-4 md:p-6 space-y-4" style={sectionStyle}>
          <h2 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>Payment Gateway</h2>
          <SettingsField label="Razorpay Key ID" desc="Client-side key from Razorpay dashboard (overrides .env)">
            <input type="text" value={settings.razorpay_key} onChange={e => update('razorpay_key', e.target.value)}
              placeholder="rzp_test_..." className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-cyan-500/50" style={inputStyle} />
          </SettingsField>
          <SettingsField label="UPI ID" desc="Your UPI ID for direct UPI payments">
            <input type="text" value={settings.upi_id} onChange={e => update('upi_id', e.target.value)}
              placeholder="you@upi" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-cyan-500/50" style={inputStyle} />
          </SettingsField>
          <SettingsField label="UPI Quick Pay Amounts" desc="Comma-separated amounts for quick UPI buttons">
            <input type="text" value={settings.upi_quickpay.join(', ')} onChange={e => update('upi_quickpay', e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)))}
              placeholder="99, 499, 999" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-cyan-500/50" style={inputStyle} />
          </SettingsField>
        </div>

        {/* Hero Section */}
        <div className="rounded-xl border p-4 md:p-6 space-y-4" style={sectionStyle}>
          <h2 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>Hero Section</h2>
          <SettingsField label="Title">
            <input type="text" value={settings.hero_title} onChange={e => update('hero_title', e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-cyan-500/50" style={inputStyle} />
          </SettingsField>
          <SettingsField label="Subtitle Badge">
            <input type="text" value={settings.hero_subtitle} onChange={e => update('hero_subtitle', e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-cyan-500/50" style={inputStyle} />
          </SettingsField>
          <SettingsField label="Description">
            <textarea rows={3} value={settings.hero_description} onChange={e => update('hero_description', e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none focus:border-cyan-500/50" style={inputStyle} />
          </SettingsField>
        </div>

        {/* Donation Presets */}
        <div className="rounded-xl border p-4 md:p-6 space-y-4" style={sectionStyle}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>Donation Presets</h2>
            <button onClick={addPreset} className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90" style={{ background: 'var(--accent)' }}>
              + Add
            </button>
          </div>
          {settings.donation_presets.map((p, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input type="number" value={p.amount} onChange={e => updatePreset(i, 'amount', parseInt(e.target.value) || 0)}
                  placeholder="Amount" className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-cyan-500/50" style={inputStyle} />
                <input type="text" value={p.label} onChange={e => updatePreset(i, 'label', e.target.value)}
                  placeholder="₹99" className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-cyan-500/50" style={inputStyle} />
                <input type="text" value={p.desc} onChange={e => updatePreset(i, 'desc', e.target.value)}
                  placeholder="Description" className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-cyan-500/50" style={inputStyle} />
                <input type="text" value={p.icon} onChange={e => updatePreset(i, 'icon', e.target.value)}
                  placeholder="Icon name" className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-cyan-500/50" style={inputStyle} />
              </div>
              <button onClick={() => removePreset(i)} className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors">✕</button>
            </div>
          ))}
        </div>

        {/* Perks */}
        <div className="rounded-xl border p-4 md:p-6 space-y-4" style={sectionStyle}>
          <h2 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>Perk Tiers</h2>
          {settings.perks.map((p, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex-1 grid grid-cols-3 gap-2">
                <input type="text" value={p.title} onChange={e => updatePerk(i, 'title', e.target.value)}
                  className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-cyan-500/50" style={inputStyle} />
                <input type="text" value={p.desc} onChange={e => updatePerk(i, 'desc', e.target.value)}
                  className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-cyan-500/50" style={inputStyle} />
                <input type="number" value={p.min} onChange={e => updatePerk(i, 'min', parseInt(e.target.value) || 0)}
                  className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-cyan-500/50" style={inputStyle} />
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="rounded-xl border p-4 md:p-6 space-y-4" style={sectionStyle}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>FAQ</h2>
            <button onClick={() => setSettings(prev => ({ ...prev, faqs: [...prev.faqs, { q: '', a: '' }] }))}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90" style={{ background: 'var(--accent)' }}>
              + Add
            </button>
          </div>
          {settings.faqs.map((f, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex-1 space-y-2">
                <input type="text" value={f.q} onChange={e => updateFAQ(i, 'q', e.target.value)}
                  placeholder="Question" className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-cyan-500/50" style={inputStyle} />
                <textarea rows={2} value={f.a} onChange={e => updateFAQ(i, 'a', e.target.value)}
                  placeholder="Answer" className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none resize-none focus:border-cyan-500/50" style={inputStyle} />
              </div>
              <button onClick={() => setSettings(prev => ({ ...prev, faqs: prev.faqs.filter((_, j) => j !== i) }))}
                className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors">✕</button>
            </div>
          ))}
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving}
            className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)' }}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {message && (
            <p className="text-sm" style={{ color: message.type === 'success' ? '#10b981' : '#ef4444' }}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
