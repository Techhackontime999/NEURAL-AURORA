import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Maximize2,
  ZoomIn,
} from 'lucide-react'
import { isSafePreviewUrl, splitPreviewMedia } from '../../lib/previewMedia'

/**
 * Product media preview. Only validated public image/PDF URLs reach a
 * renderer; unknown formats get an honest fallback. Preview media is public
 * gallery material — never a paid asset.
 */

export default function ProductPreview({ product, images = [], onOpen }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState({})
  const touchStart = useRef(null)
  const regionRef = useRef(null)

  const { pdfs, unsupported } = splitPreviewMedia(images)
  const safeImages = images.filter((url) => isSafePreviewUrl(url, 'image'))
  const media = [
    ...safeImages.map((url) => ({ type: 'image', url })),
    ...pdfs.map((url) => ({ type: 'pdf', url })),
  ]
  const total = media.length
  const active = media[Math.min(index, Math.max(0, total - 1))] || null

  useEffect(() => {
    setIndex(0)
    setFailed({})
  }, [product?.id])

  useEffect(() => {
    if (total < 2) return undefined
    const onKeyDown = (event) => {
      // Only drive the gallery when focus is inside the preview region, and
      // never hijack arrow keys while someone is editing a form field.
      if (!regionRef.current?.contains(document.activeElement)) return
      const tag = event.target?.tagName?.toLowerCase()
      if (['input', 'textarea', 'select'].includes(tag) || event.target?.isContentEditable) return
      if (event.key === 'ArrowLeft') setIndex((i) => (i - 1 + total) % total)
      if (event.key === 'ArrowRight') setIndex((i) => (i + 1) % total)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [total])

  const move = (direction) => {
    if (total < 2) return
    setIndex((i) => (i + direction + total) % total)
  }

  const onTouchEnd = (event) => {
    if (touchStart.current === null) return
    const delta = event.changedTouches[0]?.clientX - touchStart.current
    if (Math.abs(delta) > 45) move(delta < 0 ? 1 : -1)
    touchStart.current = null
  }

  const show = (next) => {
    if (next.type === 'image' && onOpen) onOpen(safeImages.indexOf(next.url))
  }

  if (!total) {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.02]">
        <div className="flex flex-col items-center gap-2 text-center">
          <FileText className="h-10 w-10 text-[var(--text-tertiary)]" aria-hidden="true" />
          <p className="max-w-xs px-4 text-xs text-[var(--text-secondary)]">
            {t('store.previewUnavailable', { format: product?.format || t('store.digitalProduct') })}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={regionRef}
      tabIndex={0}
      className="overflow-hidden rounded-xl border border-black/10 bg-black/[0.02] outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/50 dark:border-white/10 dark:bg-white/[0.02]"
    >
      <div
        className="relative aspect-[16/10] w-full overflow-hidden"
        onTouchStart={(event) => {
          touchStart.current = event.touches[0]?.clientX ?? null
        }}
        onTouchEnd={onTouchEnd}
      >
        {active?.type === 'image' && !failed[active.url] && (
          <button
            type="button"
            onClick={() => show(active)}
            className="group relative block h-full w-full cursor-zoom-in"
            aria-label={t('store.openFullscreen')}
          >
            <img
              src={active.url}
              alt={`${product?.title || t('store.digitalProduct')} — ${t('store.previewImage', { index: index + 1 })}`}
              className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
              decoding="async"
              onError={() => setFailed((prev) => ({ ...prev, [active.url]: true }))}
            />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[10px] font-medium text-white">
              <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
              {t('store.imageCount', { count: total })}
            </span>
          </button>
        )}

        {active?.type === 'pdf' && (
          <object
            data={`${active.url}#toolbar=0&navpanes=0`}
            type="application/pdf"
            title={`${product?.title || t('store.digitalProduct')} — ${t('store.pdfPreview')}`}
            className="h-full w-full"
          >
            <div className="flex h-full items-center justify-center px-6 text-center text-xs text-[var(--text-secondary)]">
              {t('store.pdfPreviewUnavailable')}
            </div>
          </object>
        )}

        {active && failed[active.url] && (
          <div className="flex h-full items-center justify-center text-xs text-[var(--text-secondary)]">
            {t('store.previewLoadFailed')}
          </div>
        )}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label={t('store.previousPreview')}
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label={t('store.nextPreview')}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}

        {active?.type === 'image' && onOpen && (
          <button
            type="button"
            onClick={() => show(active)}
            aria-label={t('store.openFullscreen')}
            className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition-colors hover:bg-black/80"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {active?.type === 'pdf' && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white">
            {t('store.previewOnly')}
          </span>
        )}
      </div>

      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3" role="tablist" aria-label={t('store.previewGallery')}>
          {media.map((item, i) => (
            <button
              key={`${item.url}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={t('store.previewImage', { index: i + 1 })}
              onClick={() => setIndex(i)}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                i === index
                  ? 'border-cyan-500/70'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {item.type === 'image' ? (
                <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                  PDF
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {unsupported.length > 0 && (
        <p className="px-3 pb-3 text-[10px] text-[var(--text-tertiary)]">
          {t('store.unsupportedPreviews', { count: unsupported.length })}
        </p>
      )}
    </div>
  )
}
