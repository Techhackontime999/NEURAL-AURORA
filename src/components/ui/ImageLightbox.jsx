import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Full-screen image viewer shared by project and product galleries.
 *
 * Rendered through a portal so it is never clipped by a transformed/overflow
 * hidden card. Clicks are stopped at the backdrop because React portals still
 * bubble through the React tree, not the DOM tree.
 */
export default function ImageLightbox({
  images = [],
  startIndex = 0,
  title = '',
  onClose,
}) {
  const shouldReduceMotion = useReducedMotion()
  const [index, setIndex] = useState(startIndex)
  const total = images.length

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'ArrowLeft') {
        setIndex((i) => (i - 1 + total) % total)
      } else if (event.key === 'ArrowRight') {
        setIndex((i) => (i + 1) % total)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [total, onClose])

  if (!total) return null

  const showPrev = () => setIndex((i) => (i - 1 + total) % total)
  const showNext = () => setIndex((i) => (i + 1) % total)

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} image gallery`}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0 }}
      onClick={(event) => {
        event.stopPropagation()
        onClose()
      }}
    >
      <motion.div
        className="relative flex w-full max-w-5xl flex-col gap-3"
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
        transition={shouldReduceMotion ? undefined : { duration: 0.2 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
          <img
            src={images[index]}
            alt={`${title} — view ${index + 1} of ${total}`}
            className="max-h-[70vh] w-full object-contain"
          />

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={showPrev}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-2xl text-white transition-colors hover:bg-black/80"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={showNext}
                aria-label="Next image"
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-2xl text-white transition-colors hover:bg-black/80"
              >
                ›
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close gallery"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-lg text-white transition-colors hover:bg-black/80"
          >
            ×
          </button>

          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
            {index + 1} / {total}
          </span>
        </div>

        {total > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {images.map((url, i) => (
              <button
                type="button"
                key={`${url}-${i}`}
                onClick={() => setIndex(i)}
                aria-label={`Show view ${i + 1}`}
                aria-current={i === index}
                className={`shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                  i === index
                    ? 'border-cyan-400 opacity-100'
                    : 'border-transparent opacity-50 hover:opacity-90'
                }`}
              >
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-14 w-20 object-cover sm:h-16 sm:w-24"
                />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  )
}
