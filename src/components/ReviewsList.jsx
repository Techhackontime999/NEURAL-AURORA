import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getReviews } from '../lib/supabase'

export default function ReviewsList() {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    getReviews().then(setReviews).catch(() => {})
  }, [])

  if (reviews.length === 0) return null

  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="mb-12 text-center font-display text-3xl font-bold text-white">
          What People Say
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          {reviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel rounded-xl border border-white/5 p-6"
            >
              <div className="mb-3 text-amber-400 text-sm">
                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </div>
              <p className="mb-4 text-sm text-neural-300 leading-relaxed">
                {review.message}
              </p>
              <p className="text-xs font-medium text-neural-500">{review.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
