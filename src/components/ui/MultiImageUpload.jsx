import { useRef, useState } from 'react'
import { uploadImage } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'

const DEFAULT_MAX = 12

/**
 * Upload several gallery images at once and keep them in a controlled string[].
 * The first image is shown first in the public project gallery; the project's
 * main `image` is always shown before these.
 */
export default function MultiImageUpload({
  value = [],
  onChange,
  label = 'Gallery images',
  max = DEFAULT_MAX,
}) {
  const { toast } = useToast()
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const images = (Array.isArray(value) ? value : []).filter(Boolean)

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []).filter((file) =>
      file.type.startsWith('image/')
    )
    if (inputRef.current) inputRef.current.value = ''
    if (!files.length) return

    const room = Math.max(0, max - images.length)
    if (room === 0) {
      toast.error(`You can upload up to ${max} gallery images per project.`)
      return
    }

    const batch = files.slice(0, room)
    if (files.length > room) {
      toast.warning(`Only ${room} more image(s) can be added to this project.`)
    }

    setUploading(true)
    setProgress({ done: 0, total: batch.length })

    const uploaded = []
    for (let i = 0; i < batch.length; i += 1) {
      try {
        uploaded.push(await uploadImage(batch[i]))
      } catch (err) {
        toast.error(`Failed to upload ${batch[i].name}: ${err.message}`)
      }
      setProgress({ done: i + 1, total: batch.length })
    }

    setUploading(false)
    setProgress({ done: 0, total: 0 })

    if (uploaded.length) {
      onChange?.([...images, ...uploaded])
      toast.success(`${uploaded.length} image(s) uploaded`)
    }
  }

  const removeAt = (index) => {
    onChange?.(images.filter((_, i) => i !== index))
  }

  const move = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= images.length) return
    const next = [...images]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange?.(next)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFiles}
      />

      {images.length > 0 && (
        <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {images.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="group relative overflow-hidden rounded-lg border"
              style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}
            >
              <img
                src={url}
                alt={`${label} ${index + 1}`}
                className="h-24 w-full object-cover"
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeAt(index)}
                title="Remove image"
                aria-label={`Remove ${label} ${index + 1}`}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-xs text-white transition-colors hover:bg-red-500"
              >
                ×
              </button>
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  title="Move earlier"
                  aria-label={`Move ${label} ${index + 1} earlier`}
                  className="rounded px-1.5 py-0.5 text-[10px] text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === images.length - 1}
                  title="Move later"
                  aria-label={`Move ${label} ${index + 1} later`}
                  className="rounded px-1.5 py-0.5 text-[10px] text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || images.length >= max}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {uploading
            ? `Uploading ${progress.done}/${progress.total}...`
            : images.length
              ? 'Add Images'
              : 'Upload Images'}
        </button>
        {images.length > 0 && (
          <button
            type="button"
            onClick={() => onChange?.([])}
            disabled={uploading}
            className="rounded-lg px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
          >
            Remove All
          </button>
        )}
      </div>

      <p className="mt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
        {images.length}/{max} images · select multiple files at once · first image appears first in the public gallery
      </p>
    </div>
  )
}
