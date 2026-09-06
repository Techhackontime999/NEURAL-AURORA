import { motion } from 'framer-motion'
import { useReviews } from '../lib/usePortfolioData'

export default function ReviewsList() {
  const { data: reviews = [], isLoading, error } = useReviews()

  if (isLoading && (!reviews || reviews.length === 0)) {
    return (
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-4">
          <div className="h-8 w-48 mx-auto mb-12 bg-black/10 dark:bg-white/10 rounded-lg animate-pulse" />
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="glass-panel rounded-xl border border-black/10 dark:border-white/5 p-6 animate-pulse space-y-4"
              >
                <div className="h-4 w-24 bg-amber-400/20 rounded" />
                <div className="h-4 w-full bg-black/10 dark:bg-white/10 rounded" />
                <div className="h-4 w-2/3 bg-black/10 dark:bg-white/10 rounded" />
                <div className="h-3 w-20 bg-black/5 dark:bg-white/5 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!isLoading && (!reviews || reviews.length === 0)) {
    return (
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-8 font-display text-3xl font-bold text-black/80 dark:text-white">
            What People Say
          </h2>
          {error && (
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono">
              <span>⚠️</span>
              <span>Offline mode — unable to fetch reviews</span>
            </div>
          )}
          <div className="glass-panel rounded-xl border border-black/10 dark:border-white/5 p-8 max-w-md mx-auto">
            <p className="text-sm text-black/50 dark:text-white/40 font-mono">
              No reviews available yet. Check back soon!
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="mb-4 text-center font-display text-3xl font-bold text-black/80 dark:text-white">
          What People Say
        </h2>

        {error && (
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono">
              <span>⚠️</span>
              <span>Offline mode — unable to refresh live reviews</span>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {reviews.map((review, i) => (
            <motion.div
              key={review.id || i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel rounded-xl border border-black/10 dark:border-white/5 p-6"
            >
              <div className="mb-3 text-amber-400 text-sm">
                {'★'.repeat(review.rating || 5)}{'☆'.repeat(5 - (review.rating || 5))}
              </div>
              <p className="mb-4 text-sm text-black/60 dark:text-white/70 leading-relaxed">
                {review.message}
              </p>
              <p className="text-xs font-medium text-black/40 dark:text-white/50">{review.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
