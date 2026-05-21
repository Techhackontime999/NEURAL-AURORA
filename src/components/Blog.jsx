import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, Tag, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBlogPosts } from '../lib/usePortfolioData'
import BlogNavbar from './BlogNavbar'
import AuroraBackground from './AuroraBackground'
import { Footer } from './ui/footer-section'

export default function Blog() {
  const blogPosts = useBlogPosts()
  const [search, setSearch] = useState('')

  const filtered = blogPosts.filter((post) =>
    post.title.toLowerCase().includes(search.toLowerCase()) ||
    post.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuroraBackground />
      <BlogNavbar />

      <main className="relative z-10 max-w-[1000px] mx-auto px-6 md:px-12 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <span className="eyebrow">Blog</span>
          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-black/80 dark:text-white/90 mt-4">
            Thoughts & <span className="text-gradient">Ideas</span>
          </h1>
          <p className="text-sm text-black/50 dark:text-white/50 mt-3 max-w-md mx-auto">
            Sharing what I learn, build, and think about.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative max-w-md mx-auto mb-12"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30" />
          <input
            type="text"
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-black/10 dark:border-white/10 bg-[var(--bg-secondary)] text-black/80 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
          />
        </motion.div>

        {filtered.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-black/40 dark:text-white/40"
          >
            No posts found. Try a different search.
          </motion.p>
        ) : (
          <div className="space-y-4">
            {filtered.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  to={`/blog/${post.slug}`}
                  className="glass-panel rounded-xl p-5 block group"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-widest text-black/40 dark:text-white/30 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-black/80 dark:text-white/80 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 transition-all duration-300">
                    {post.title}
                  </h2>
                  <p className="text-xs text-black/50 dark:text-white/50 mt-1.5 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
