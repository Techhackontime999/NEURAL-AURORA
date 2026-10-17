import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Calendar, Briefcase, BookOpen, FileText, Award, Trophy, Images, X, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useEducation,
  useExperience,
  useBlogPosts,
  useCaseStudies,
  useCertificates,
  useAchievements,
  useGallery,
} from '../lib/usePortfolioData'
import { sanitizeHtml } from '../lib/utils'
import MoreNavbar from './MoreNavbar'
import AuroraBackground from './AuroraBackground'
import { Footer } from './ui/footer-section'

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
}

function TimelineItem({ item, icon: Icon, index }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0, x: -20 },
        visible: {
          opacity: 1,
          x: 0,
          transition: {
            delay: index * 0.1,
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
      className="relative pl-8 pb-8 border-l border-black/10 dark:border-white/10"
    >
      <motion.div
        className="absolute left-0 top-0 -translate-x-1/2 w-8 h-8 rounded-full bg-[var(--bg-secondary)] border border-black/10 dark:border-white/10 flex items-center justify-center"
        animate={shouldReduceMotion ? {} : { y: [0, -3, 0] }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : {
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: index * 0.3,
              }
        }
      >
        <Icon className="w-3.5 h-3.5 text-black/50 dark:text-white/50" />
      </motion.div>

      <div className="glass-panel rounded-xl p-4">
        <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30 font-medium">
          {item.year}
        </span>

        <h3 className="text-sm font-semibold text-black/80 dark:text-white/80 mt-1">
          {'degree' in item ? item.degree : item.role}
        </h3>

        <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">
          {'school' in item ? item.school : item.company}
        </p>

        <p className="text-xs text-black/40 dark:text-white/40 mt-2 leading-relaxed">
          {item.description}
        </p>
      </div>
    </motion.div>
  )
}

function BlogCard({ post, index }) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            delay: index * 0.1,
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
    >
      <Link
        to={`/blog/${post.slug}`}
        className="glass-panel rounded-xl p-5 block group"
      >
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30 mb-2">
          <Calendar className="w-3 h-3" />
          <span>{post.date}</span>
          <span className="mx-1">·</span>
          <span>{post.readTime}</span>
        </div>

        <h3 className="text-sm font-semibold text-black/80 dark:text-white/80 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 transition-all duration-300">
          {post.title}
        </h3>

        <p className="text-xs text-black/50 dark:text-white/50 mt-2 leading-relaxed line-clamp-2">
          {post.excerpt}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50"
            >
              {tag}
            </span>
          ))}
        </div>
      </Link>
    </motion.div>
  )
}

function CaseStudyCard({ study, index }) {
  const { t } = useTranslation()
  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            delay: index * 0.15,
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
    >
      <Link
        to={`/case-study/${study.slug}`}
        className="glass-panel rounded-xl p-5 block group"
      >
        <h3 className="text-sm font-semibold text-black/80 dark:text-white/80 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 transition-all duration-300">
          {study.title}
        </h3>

        <div
          className="text-xs text-black/50 dark:text-white/50 mt-2 leading-relaxed line-clamp-2"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(study.description) }}
        />

        <div className="mt-3 p-3 rounded-lg bg-black/5 dark:bg-white/5">
          <span className="text-[9px] uppercase tracking-widest text-black/40 dark:text-white/30 font-medium">
            {t('caseStudy.outcome')}
          </span>

          <div
            className="text-xs text-black/60 dark:text-white/60 mt-1 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(study.outcome) }}
          />
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {study.tech.map((t) => (
            <span
              key={t}
              className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50"
            >
              {t}
            </span>
          ))}
        </div>
      </Link>
    </motion.div>
  )
}

function SectionHeading({ icon: Icon, title, index, action }) {
  return (
    <motion.div
      custom={index}
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="flex items-center justify-between gap-3 mb-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
          <Icon className="w-4 h-4 text-black/50 dark:text-white/50" />
        </div>

        <h2 className="text-sm font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">
          {title}
        </h2>
      </div>

      {action}
    </motion.div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="glass-panel rounded-xl p-6 text-center">
      <p className="text-xs text-black/40 dark:text-white/40">{message}</p>
    </div>
  )
}

function CertificateCard({ item, index }) {
  const { t } = useTranslation()
  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
      }}
      className="glass-panel rounded-xl overflow-hidden group flex flex-col"
    >
      {item.image_url && (
        <div className="aspect-[4/3] bg-black/5 dark:bg-white/5 overflow-hidden">
          <img
            src={item.image_url}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-black/80 dark:text-white/80">{item.title}</h3>

        {item.issuer && (
          <p className="text-xs text-black/50 dark:text-white/50 mt-1">{item.issuer}</p>
        )}

        {item.issue_date && (
          <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30">
            <Calendar className="w-3 h-3" />
            {item.issue_date}
          </span>
        )}

        {item.description && (
          <p className="text-xs text-black/50 dark:text-white/50 mt-2 leading-relaxed line-clamp-3">
            {item.description}
          </p>
        )}

        {item.credential_url && (
          <a
            href={item.credential_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors"
          >
            {t('more.verifyCredential')}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </motion.div>
  )
}

function AchievementCard({ item, index }) {
  const shouldReduceMotion = useReducedMotion()
  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0, transition: { delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
      }}
      className="relative pl-8 pb-8 border-l border-black/10 dark:border-white/10 last:pb-0"
    >
      <motion.div
        className="absolute left-0 top-0 -translate-x-1/2 w-8 h-8 rounded-full bg-[var(--bg-secondary)] border border-black/10 dark:border-white/10 flex items-center justify-center"
        animate={shouldReduceMotion ? {} : { y: [0, -3, 0] }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
      >
        <Trophy className="w-3.5 h-3.5 text-black/50 dark:text-white/50" />
      </motion.div>

      <div className="glass-panel rounded-xl p-4">
        {item.achieved_date && (
          <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30 font-medium">
            {item.achieved_date}
          </span>
        )}

        <h3 className="text-sm font-semibold text-black/80 dark:text-white/80 mt-1">{item.title}</h3>

        {item.organization && (
          <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">{item.organization}</p>
        )}

        {item.description && (
          <p className="text-xs text-black/40 dark:text-white/40 mt-2 leading-relaxed">{item.description}</p>
        )}

        {item.link_url && (
          <a
            href={item.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            {item.link_url.replace(/^https?:\/\//, '').slice(0, 40)}
          </a>
        )}
      </div>
    </motion.div>
  )
}

function GalleryItem({ item, index, onOpen }) {
  return (
    <motion.button
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { delay: index * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
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
            <span className="text-[9px] uppercase tracking-widest text-white/60">{item.category}</span>
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
        aria-label="Close"
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
            {item.title && <p className="text-sm font-medium text-white/90">{item.title}</p>}
            {item.description && (
              <p className="text-xs text-white/50 mt-1">{item.description}</p>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function More() {
  const { t } = useTranslation()
  const { data: education } = useEducation()
  const { data: experience } = useExperience()
  const { data: blogPosts } = useBlogPosts()
  const { data: caseStudies } = useCaseStudies()
  const { data: certificates } = useCertificates()
  const { data: achievements } = useAchievements()
  const { data: gallery } = useGallery()
  const [lightboxItem, setLightboxItem] = useState(null)
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuroraBackground />
      <MoreNavbar />

      <main className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <span className="eyebrow">{t('more.eyebrow')}</span>

          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-4">
            {t('more.titlePrefix')} <span className="text-gradient">{t('more.titleSuffix')}</span>
          </h1>

          <p className="text-sm text-black/50 dark:text-white/50 mt-3 max-w-md mx-auto">
            {t('more.subtitle')}
          </p>
        </motion.div>

        <div id="timeline" className="grid md:grid-cols-2 gap-12 mb-16 scroll-mt-28">
          <section>
            <motion.div
              custom={0}
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-black/50 dark:text-white/50" />
              </div>

              <h2 className="text-sm font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">
                {t('more.education')}
              </h2>
            </motion.div>

            <div>
              {education.map((item, i) => (
                <TimelineItem
                  key={item.id}
                  item={item}
                  icon={BookOpen}
                  index={i}
                />
              ))}
            </div>
          </section>

          <section>
            <motion.div
              custom={1}
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-black/50 dark:text-white/50" />
              </div>

              <h2 className="text-sm font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">
                {t('more.experience')}
              </h2>
            </motion.div>

            <div>
              {experience.map((item, i) => (
                <TimelineItem
                  key={item.id}
                  item={item}
                  icon={Briefcase}
                  index={i}
                />
              ))}
            </div>
          </section>
        </div>

        <section id="blog-posts" className="mb-16 scroll-mt-28">
          <motion.div
            custom={2}
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <FileText className="w-4 h-4 text-black/50 dark:text-white/50" />
              </div>

              <h2 className="text-sm font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">
                {t('more.latestPosts')}
              </h2>
            </div>

            <Link
              to="/blog"
              className="text-[10px] uppercase tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors"
            >
              {t('more.viewAll')}
            </Link>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {blogPosts.slice(0, 3).map((post, i) => (
              <BlogCard key={post.id} post={post} index={i} />
            ))}
          </div>
        </section>

        <section id="case-studies" className="scroll-mt-28">
          <motion.div
            custom={3}
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
              <FileText className="w-4 h-4 text-black/50 dark:text-white/50" />
            </div>

            <h2 className="text-sm font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">
              {t('more.caseStudies')}
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {caseStudies.map((study, i) => (
              <CaseStudyCard
                key={study.id}
                study={study}
                index={i}
              />
            ))}
          </div>
        </section>
        <section id="certificates" className="mb-16 scroll-mt-28">
          <SectionHeading icon={Award} title={t('more.certificates')} index={4} />

          {certificates.length === 0 ? (
            <EmptyState message={t('more.noCertificates')} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map((item, i) => (
                <CertificateCard key={item.id} item={item} index={i} />
              ))}
            </div>
          )}
        </section>

        <section id="achievements" className="mb-16 scroll-mt-28">
          <SectionHeading icon={Trophy} title={t('more.achievements')} index={5} />

          {achievements.length === 0 ? (
            <EmptyState message={t('more.noAchievements')} />
          ) : (
            <div className="grid md:grid-cols-2 gap-x-12">
              <div>
                {achievements.map((item, i) => (
                  <AchievementCard key={item.id} item={item} index={i} />
                ))}
              </div>
            </div>
          )}
        </section>

        <section id="gallery" className="scroll-mt-28">
          <SectionHeading icon={Images} title={t('more.gallery')} index={6} />

          {gallery.length === 0 ? (
            <EmptyState message={t('more.noGallery')} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {gallery.map((item, i) => (
                <GalleryItem key={item.id} item={item} index={i} onOpen={setLightboxItem} />
              ))}
            </div>
          )}
        </section>
      </main>

      <AnimatePresence>
        {lightboxItem && (
          <GalleryLightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
        )}
      </AnimatePresence>

      <Footer />
    </div>
  )
}
