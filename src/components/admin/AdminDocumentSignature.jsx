import { useEffect, useRef, useState } from 'react'
import { getAdminSettings, updateAdminSettings, uploadImage } from '../../lib/supabase'
import { mergeDocumentSignature } from '../../lib/documentSignatureDefaults'
import { useToast } from '../../context/ToastContext'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg']

export default function AdminDocumentSignature() {
  const { toast } = useToast()
  const inputRef = useRef(null)
  const [form, setForm] = useState(() => mergeDocumentSignature(null))
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const settings = await getAdminSettings()
        if (!cancelled) setForm(mergeDocumentSignature(settings?.document_signature))
      } catch (err) {
        if (!cancelled) {
          setMessage({ type: 'error', text: `Could not load the saved signature: ${err.message || err}` })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  function patch(next) {
    setMessage(null)
    setForm((current) => mergeDocumentSignature({ ...current, ...next }))
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Use a PNG or JPG signature image.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('The signature image must be 2 MB or smaller.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setUploading(true)
    setMessage(null)
    try {
      const url = await uploadImage(file)
      patch({ url, enabled: true })
      toast.success('Signature uploaded. Save to apply it to new PDFs.')
    } catch (err) {
      toast.error('Upload failed: ' + (err.message || err))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleSave() {
    const next = mergeDocumentSignature(form)
    if (next.enabled && !next.url) {
      toast.error('Upload a signature image before enabling it.')
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      await updateAdminSettings({ document_signature: next })
      setForm(next)
      setMessage({ type: 'success', text: 'Signature saved. It will appear on newly generated licence PDFs and product pages.' })
    } catch (err) {
      setMessage({ type: 'error', text: `Could not save: ${err.message || err}` })
    } finally {
      setSaving(false)
    }
  }

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
          Document Signature
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Upload a signature once and use it on licence certificates and product detail pages.
        </p>
      </div>

      <div className="max-w-2xl space-y-5">
        <section className="rounded-xl border p-4 md:p-6 space-y-4" style={sectionStyle}>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => patch({ enabled: event.target.checked })}
              className="mt-0.5 h-4 w-4 accent-cyan-500"
            />
            <span>
              <span className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Use this signature
              </span>
              <span className="mt-0.5 block text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                Turn off to generate clean PDFs without a signature. The uploaded image is kept.
              </span>
            </span>
          </label>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Signature image
            </label>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleFile}
            />
            {form.url && (
              <div
                className="mb-3 flex h-28 items-center justify-center overflow-hidden rounded-lg border"
                style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}
              >
                <img src={form.url} alt="Signature preview" className="max-h-24 max-w-full object-contain" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                {uploading ? 'Uploading...' : form.url ? 'Replace signature' : 'Upload signature'}
              </button>
              {form.url && (
                <button
                  type="button"
                  onClick={() => patch({ url: '' })}
                  className="rounded-lg px-4 py-2 text-sm"
                  style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
                >
                  Remove
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              PNG with a transparent background works best. JPG is also supported. Maximum 2 MB.
              PDFKit embeds PNG/JPG only, so SVG and WebP are rejected.
            </p>
          </div>
        </section>

        <section className="rounded-xl border p-4 md:p-6 space-y-4" style={sectionStyle}>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Signer name
            </label>
            <input
              value={form.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="e.g. Aarav Mehta"
              maxLength={80}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-cyan-500/50"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Signer title
            </label>
            <input
              value={form.title}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder="e.g. Founder, Neural Aurora"
              maxLength={80}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-cyan-500/50"
              style={inputStyle}
            />
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            These fields are public display text. Do not enter private or secret information.
          </p>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {saving ? 'Saving...' : 'Save signature'}
          </button>
          {message && (
            <p
              className="text-xs"
              style={{ color: message.type === 'error' ? 'var(--error-color, #f87171)' : 'var(--text-secondary)' }}
            >
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
