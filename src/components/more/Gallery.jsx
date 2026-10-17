import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useGallery } from '../../lib/usePortfolioData'
import MorePageShell, { EmptyState } from './MorePageShell'

function GalleryItem({ item, index, onOpen }) {
  return (
    <motion.button
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { delay: index * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      onClick={() => onOpen(item)}
      className="group relative rounded-xl overflow-hidden glass-panel text-left block w-full"
    >
      <div className="aspect-square bg-black/5 dark:bg-white/5 overflow-hidden">
        <img
          src={item.image_url}
          alt={item.title || 'Gallery image'}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {(item.title || item.category) && (
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
          {item.category && (
            <span className="text-[9px] uppercase tracking-widest text-white/60">
              {item.category}
            </span>
          )}
          {item.title && (
            <p className="text-xs font-medium text-white/90 line-clamp-2">{item.title}</p>
          )}
        </div>
      )}
    </motion.button>
  )
}

function GalleryLightbox({ item, onClose }) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={item.title || 'Gallery image'}
    >
      <button
        onClick={onClose}
        aria-label={t('common.close', 'Close')}
        className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full border border-white/15 bg-black/40 flex items-center justify-center text-white/60 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="max-w-4xl w-full"
      >
        <img
          src={item.image_url}
          alt={item.title || 'Gallery image'}
          className="w-full max-h-[80vh] object-contain rounded-xl"
        />

        {(item.title || item.description) && (
          <div className="mt-3 text-center">
            {item.title && (
              <p className="text-sm font-medium text-white/90">{item.title}</p>
            )}
            {item.description && (
              <p className="text-xs text-white/50 mt-1">{item.description}</p>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function Gallery() {
  const { t } = useTranslation()
  const { data: gallery } = useGallery()
  const [lightboxItem, setLightboxItem] = useState(null)

  return (
    <MorePageShell
      eyebrow={t('more.eyebrow')}
      title={t('more.gallery')}
      subtitle={t('more.gallerySubtitle')}
    >
      {gallery.length === 0 ? (
        <EmptyState message={t('more.noGallery')} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {gallery.map((item, i) => (
            <GalleryItem key={item.id} item={item} index={i} onOpen={setLightboxItem} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {lightboxItem && (
          <GalleryLightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
        )}
      </AnimatePresence>
    </MorePageShell>
  )
}
