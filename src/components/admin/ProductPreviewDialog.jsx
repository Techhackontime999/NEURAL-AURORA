import { useEffect } from 'react'
import { formatPrice } from '../../lib/products'

/**
 * Small, honest summary of the customer-facing fields. It deliberately does
 * not reimplement the whole public ProductDetail page — that remains the one
 * source of truth for the live store view.
 */
export default function ProductPreviewDialog({ product, categoryLabel, onClose }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const isPublished = product.status === 'published'
  const tags = Array.isArray(product.tags) ? product.tags.filter(Boolean) : []
  const includes = Array.isArray(product.includes)
    ? product.includes.map((entry) => (typeof entry === 'string' ? entry : entry?.text)).filter(Boolean)
    : []

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-preview-title"
        onClick={(event) => event.stopPropagation()}
        className="my-8 w-full max-w-2xl rounded-xl border p-5 shadow-2xl"
        style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
              {isPublished ? 'Live store preview' : 'Draft preview — not public yet'}
            </p>
            <h2
              id="product-preview-title"
              className="mt-1 font-display text-xl font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {product.title || 'Untitled product'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded px-2 py-1 text-lg leading-none"
            style={{ color: 'var(--text-secondary)', background: 'var(--hover-bg)' }}
          >
            ×
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
          {product.cover_image_url ? (
            <img
              src={product.cover_image_url}
              alt={product.title || 'Product'}
              className="h-40 w-full rounded-lg object-cover"
              style={{ background: 'var(--input-bg)' }}
            />
          ) : (
            <div
              className="flex h-40 items-center justify-center rounded-lg text-xs"
              style={{ background: 'var(--input-bg)', color: 'var(--text-tertiary)' }}
            >
              No cover image
            </div>
          )}

          <div>
            <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {product.price_paise === 0
                ? 'Free'
                : formatPrice(product.price_paise, product.currency || 'INR')}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {[categoryLabel, product.format, product.version && `v${product.version}`]
                .filter(Boolean)
                .join(' · ') || 'Uncategorised'}
            </p>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {product.short_description || 'No short description yet.'}
            </p>

            {tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={String(tag)}
                    className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
                    style={{ background: 'var(--input-bg)', color: 'var(--text-tertiary)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {includes.length > 0 && (
          <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              What customers get
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {includes.map((entry, i) => (
                <li key={`${entry}-${i}`}>{entry}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            /offerings/products/{product.slug}
          </span>
          {isPublished ? (
            <a
              href={`/offerings/products/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
              style={{ background: 'var(--accent)' }}
            >
              Open public page
            </a>
          ) : (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Publish to make this page available.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
