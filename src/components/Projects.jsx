import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useProjects } from '../lib/usePortfolioData'
import { sanitizeHtml } from '../lib/utils'

function ProjectImage({ src, alt, children, shouldReduceMotion, onClick }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      className={`relative overflow-hidden aspect-[4/3] bg-black/5 dark:bg-white/5${onClick ? ' cursor-zoom-in' : ''}`}
      onClick={onClick}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 dark:via-white/5 to-transparent animate-shimmer" />
      )}
      <motion.img
        layout
        src={src}
        alt={alt}
        width={800}
        height={600}
        loading="lazy"
        decoding="async"
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 1.05 }}
        animate={shouldReduceMotion ? { opacity: loaded ? 1 : 0, scale: 1 } : { opacity: loaded ? 1 : 0, scale: loaded ? 1 : 1.05 }}
        onLoad={() => setLoaded(true)}
        className="w-full h-full object-cover"
      />
      {children}
    </div>
  )
}

function GithubIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ProjectGallery({ images, startIndex = 0, title, onClose }) {
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

function ProjectCard({ project, index, shouldReduceMotion }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(null)
  const technologies = project.technologies || []
  const extraImages = (Array.isArray(project.images) ? project.images : []).filter(Boolean)
  const galleryImages = Array.from(
    new Set([project.image, ...extraImages].filter(Boolean))
  )
  const hasGallery = galleryImages.length > 1

  const openGallery = (event, targetIndex = 0) => {
    event.stopPropagation()
    setGalleryIndex(targetIndex)
  }

  const labelMap = {
    github: t('projects.source'),
    link: t('projects.link'),
    demo: t('projects.demo'),
  }

  return (
    <motion.div
      layout
      initial={shouldReduceMotion ? false : { opacity: 0, y: 40 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={shouldReduceMotion ? undefined : { delay: index * 0.1, type: 'spring', stiffness: 80, damping: 20 }}
      className={`glass-panel rounded-[2rem] overflow-hidden group cursor-pointer transition-all duration-500 ${
        expanded ? 'md:col-span-2 md:row-span-2' : ''
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <ProjectImage
        src={project.image || galleryImages[0] || '/images/project-1.png'}
        alt={project.title}
        shouldReduceMotion={shouldReduceMotion}
        onClick={hasGallery ? (event) => openGallery(event, 0) : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-transparent" />
        <div className="absolute top-4 left-4 flex gap-2">
          {technologies.slice(0, 2).map((tech) => (
            <span
              key={tech}
              className="text-[10px] px-2 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-black/50 dark:text-white/40"
            >
              {tech}
            </span>
          ))}
          {technologies.length > 2 && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-black/40 dark:text-white/30">
              +{technologies.length - 2}
            </span>
          )}
        </div>
        {hasGallery && (
          <button
            type="button"
            onClick={(event) => openGallery(event, 0)}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur transition-colors hover:bg-black/80"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {galleryImages.length} views
          </button>
        )}
      </ProjectImage>

      <div className="p-6 md:p-8 space-y-3">
        <motion.h3 layout className="text-lg font-display font-bold text-black/80 dark:text-white/90 tracking-tight">
          {project.title}
        </motion.h3>

        <motion.div
          layout
          className={`text-sm text-black/50 dark:text-white/40 leading-relaxed ${
            expanded ? '' : 'line-clamp-2'
          }`}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(project.description) }}
        />

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, height: 'auto' }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
              transition={shouldReduceMotion ? undefined : { type: 'spring', stiffness: 80, damping: 20 }}
              className="space-y-4 pt-2"
            >
              {extraImages.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-black/40 dark:text-white/30">
                    {t('projects.gallery', 'Project views')}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {extraImages.map((url, i) => (
                      <button
                        key={`${url}-${i}`}
                        type="button"
                        onClick={(event) => openGallery(event, galleryImages.indexOf(url))}
                        className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
                      >
                        <img
                          src={url}
                          alt={`${project.title} view ${i + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="aspect-video w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {technologies.map((tech) => (
                  <span
                    key={tech}
                    className="text-xs px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <div className="flex gap-4 mt-1">
                {['github', 'link', 'demo'].map((type) => {
                  const url = project[type]
                  const Icon = type === 'github' ? GithubIcon : type === 'link' ? LinkIcon : PlayIcon
                  const label = labelMap[type]

                  return url ? (
                    <a
                      key={type}
                      href={url}
                      target="_self"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="group text-xs text-black/50 dark:text-white/40 hover:text-black/80 dark:hover:text-white/80 transition-colors flex items-center gap-1.5"
                    >
                      <Icon />
                      <span className="relative after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-current after:transition-all after:duration-300 group-hover:after:w-full">
                        {label}
                      </span>
                    </a>
                  ) : (
                    <span
                      key={type}
                      className="text-xs text-black/20 dark:text-white/20 flex items-center gap-1.5 cursor-not-allowed"
                    >
                      <Icon />
                      {label}
                    </span>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {galleryIndex !== null && (
          <ProjectGallery
            images={galleryImages}
            startIndex={galleryIndex}
            title={project.title}
            onClose={() => setGalleryIndex(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Projects() {
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()
  const { data: projects = [], isLoading, error } = useProjects()

  return (
    <section id="projects" className="relative z-10 py-32 md:py-40">
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 30 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={shouldReduceMotion ? undefined : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <span className="eyebrow">{t('projects.eyebrow')}</span>

          <h2 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tighter leading-none">
            {t('projects.titleNeural')}{' '}
            <span className="text-gradient">{t('projects.titleProjects')}</span>
          </h2>

          <p className="mt-4 text-base text-black/50 dark:text-white/40 max-w-[65ch] leading-relaxed">
            {t('projects.subtitle')}
          </p>
        </motion.div>

        {error && (
          <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono">
            <span>⚠️</span>
            <span>{t('projects.offlineNotice')}</span>
          </div>
        )}

        {isLoading && (!projects || projects.length === 0) ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-panel rounded-[2rem] overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-black/10 dark:bg-white/10" />
                <div className="p-6 md:p-8 space-y-4">
                  <div className="h-5 w-3/4 bg-black/10 dark:bg-white/10 rounded" />
                  <div className="h-4 w-full bg-black/5 dark:bg-white/5 rounded" />
                  <div className="h-4 w-2/3 bg-black/5 dark:bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : !isLoading && (!projects || projects.length === 0) ? (
          <div className="glass-panel rounded-[2rem] p-12 text-center max-w-lg mx-auto">
            <p className="text-sm text-black/50 dark:text-white/40 font-mono">
              {t('projects.noData')}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 auto-rows-auto">
            {projects.map((project, i) => (
              <ProjectCard key={project.id || i} project={project} index={i} shouldReduceMotion={shouldReduceMotion} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
