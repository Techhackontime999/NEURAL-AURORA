import { useState, useRef } from 'react'
import { uploadImage } from '../../lib/supabase'

export default function ImageUpload({ value, onChange, label = 'Image' }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      if (onChange) onChange(url)
    } catch (err) {
      alert('Upload failed: ' + err.message)
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      {value && (
        <div className="mb-2 overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
          <img
            src={value}
            alt="Preview"
            className="max-h-48 w-full object-contain"
            style={{ background: 'var(--input-bg)' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {uploading ? 'Uploading...' : value ? 'Replace Image' : 'Upload Image'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange?.('')}
            className="rounded-lg px-3 py-1.5 text-xs"
            style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
          >
            Remove
          </button>
        )}
      </div>
      <p className="mt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
        {label ? `Upload ${label.toLowerCase()}` : 'Supported: JPG, PNG, GIF, WebP'}
      </p>
    </div>
  )
}
