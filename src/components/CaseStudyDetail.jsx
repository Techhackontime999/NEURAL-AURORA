import { motion } from 'framer-motion'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Target, BarChart3 } from 'lucide-react'
import { useCaseStudyBySlug } from '../lib/usePortfolioData'
import BlogNavbar from './BlogNavbar'
import AuroraBackground from './AuroraBackground'
import { Footer } from './ui/footer-section'

export default function CaseStudyDetail() {
  const { slug } = useParams()
  const study = useCaseStudyBySlug(slug)

  if (!study) {
    return (
      <div className="relative min-h-[100dvh] overflow-hidden">
        <AuroraBackground />
        <BlogNavbar />
        <main className="relative z-10 max-w-[700px] mx-auto px-6 md:px-12 pt-32 pb-20 text-center">
          <span className="eyebrow">404</span>
          <h1 className="text-2xl font-bold text-black/80 dark:text-white/80 mt-4">Case study not found</h1>
          <Link to="/more#case-studies" className="inline-flex items-center gap-2 text-xs text-cyan-500 hover:text-cyan-400 mt-4 transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Back to case studies
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <AuroraBackground />
      <BlogNavbar />

      <main className="relative z-10 max-w-[800px] mx-auto px-6 md:px-12 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            to="/more#case-studies"
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30 hover:text-cyan-500 transition-colors mb-8"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to case studies
          </Link>

          <span className="eyebrow">Case Study</span>

          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-black/80 dark:text-white/90 mt-4 leading-snug">
            {study.title}
          </h1>

          <p className="text-sm text-black/50 dark:text-white/50 mt-4 leading-relaxed max-w-[65ch]">
            {study.description}
          </p>

          <div className="flex flex-wrap gap-1.5 mt-4">
            {study.tech.map((t) => (
              <span key={t} className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50">
                {t}
              </span>
            ))}
          </div>

          <div className="mt-8 p-6 rounded-xl glass-panel">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-black/40 dark:text-white/40" />
              <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30 font-medium">Outcome</span>
            </div>
            <div
              className="text-sm text-black/60 dark:text-white/60 leading-relaxed prose-headings:text-black/80 dark:prose-headings:text-white/80 prose-headings:text-base prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-2 prose-p:mb-3 prose-strong:text-black/70 dark:prose-strong:text-white/70"
              dangerouslySetInnerHTML={{ __html: study.outcome }}
            />
          </div>

          <div className="mt-8 p-6 rounded-xl glass-panel">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-black/40 dark:text-white/40" />
              <span className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30 font-medium">Full Analysis</span>
            </div>
            <div
              className="text-sm text-black/60 dark:text-white/60 leading-relaxed prose-headings:text-black/80 dark:prose-headings:text-white/80 prose-headings:text-base prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-2 prose-p:mb-3 prose-strong:text-black/70 dark:prose-strong:text-white/70"
              dangerouslySetInnerHTML={{ __html: study.content }}
            />
          </div>

          <div className="mt-8 pt-8 border-t border-black/10 dark:border-white/10">
            <Link
              to="/more#case-studies"
              className="inline-flex items-center gap-2 text-xs text-cyan-500 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              View all case studies
            </Link>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
