import { motion } from 'framer-motion'
import { Calendar, Briefcase, BookOpen, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { education, experience, blogPosts, caseStudies } from '../data/portfolio'
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
      className="relative pl-8 pb-8 border-l border-black/10 dark:border-white/10"
    >
      <div className="absolute left-0 top-0 -translate-x-1/2 w-8 h-8 rounded-full bg-[var(--bg-secondary)] border border-black/10 dark:border-white/10 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-black/50 dark:text-white/50" />
      </div>
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
        visible: { opacity: 1, y: 0, transition: { delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
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
            <span key={tag} className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50">
              {tag}
            </span>
          ))}
        </div>
      </Link>
    </motion.div>
  )
}

function CaseStudyCard({ study, index }) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { delay: index * 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
      }}
      className="glass-panel rounded-xl p-5"
    >
      <h3 className="text-sm font-semibold text-black/80 dark:text-white/80">
        {study.title}
      </h3>
      <p className="text-xs text-black/50 dark:text-white/50 mt-2 leading-relaxed">
        {study.description}
      </p>
      <div className="mt-3 p-3 rounded-lg bg-black/5 dark:bg-white/5">
        <span className="text-[9px] uppercase tracking-widest text-black/40 dark:text-white/30 font-medium">Outcome</span>
        <p className="text-xs text-black/60 dark:text-white/60 mt-1">{study.outcome}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {study.tech.map((t) => (
          <span key={t} className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50">
            {t}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

export default function More() {
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
          <span className="eyebrow">More</span>
          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-4">
            Beyond the <span className="text-gradient">Code</span>
          </h1>
          <p className="text-sm text-black/50 dark:text-white/50 mt-3 max-w-md mx-auto">
            My journey through education, experience, ideas, and insights.
          </p>
        </motion.div>

        <div id="timeline" className="grid md:grid-cols-2 gap-12 mb-16">
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
                Education
              </h2>
            </motion.div>
            <div>
              {education.map((item, i) => (
                <TimelineItem key={item.id} item={item} icon={BookOpen} index={i} />
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
                Work Experience
              </h2>
            </motion.div>
            <div>
              {experience.map((item, i) => (
                <TimelineItem key={item.id} item={item} icon={Briefcase} index={i} />
              ))}
            </div>
          </section>
        </div>

        <section className="mb-16">
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
                Latest Blog Posts
              </h2>
            </div>
            <Link
              to="/blog"
              className="text-[10px] uppercase tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors"
            >
              View all
            </Link>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-4">
            {blogPosts.slice(0, 3).map((post, i) => (
              <BlogCard key={post.id} post={post} index={i} />
            ))}
          </div>
        </section>

        <section id="case-studies">
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
              Case Studies
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-4">
            {caseStudies.map((study, i) => (
              <CaseStudyCard key={study.id} study={study} index={i} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
