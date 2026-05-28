import { motion } from 'framer-motion'
import { useParams, Link } from 'react-router-dom'
import { Calendar, Clock, ArrowLeft } from 'lucide-react'
import { useBlogPosts } from '../lib/usePortfolioData'
import BlogNavbar from './BlogNavbar'
import AuroraBackground from './AuroraBackground'
import { Footer } from './ui/footer-section'

export default function BlogPost() {
  const { slug } = useParams()
  const blogPosts = useBlogPosts()
  const post = blogPosts.find((p) => p.slug === slug)

  if (!post) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <AuroraBackground />
        <BlogNavbar />
        <main className="relative z-10 max-w-[700px] mx-auto px-6 md:px-12 pt-32 pb-20 text-center">
          <span className="eyebrow">404</span>
          <h1 className="text-2xl font-bold text-black/80 dark:text-white/80 mt-4">Post not found</h1>
          <Link to="/blog" className="inline-flex items-center gap-2 text-xs text-cyan-500 hover:text-cyan-400 mt-4 transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Back to blog
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuroraBackground />
      <BlogNavbar />

      <main className="relative z-10 max-w-[700px] mx-auto px-6 md:px-12 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30 hover:text-cyan-500 transition-colors mb-8"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to blog
          </Link>

          <span className="eyebrow">Blog Post</span>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-black/80 dark:text-white/90 mt-4 leading-snug">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mt-4 text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {post.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.readTime}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-4">
            {post.tags.map((tag) => (
              <span key={tag} className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-8 p-6 rounded-xl glass-panel">
            <div
              className="text-sm text-black/60 dark:text-white/60 leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_li]:mb-1 [&_a]:text-cyan-500 [&_a]:underline [&_a:hover]:text-cyan-400 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>

          <div className="mt-8 pt-8 border-t border-black/10 dark:border-white/10">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-xs text-cyan-500 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Read more posts
            </Link>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
