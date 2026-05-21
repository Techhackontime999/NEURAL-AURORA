import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { submitReview } from '../lib/supabase'

export default function ReviewForm() {
  const [form, setForm] = useState({ name: '', email: '', rating: 5, message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await submitReview(form)
      setDone(true)
      setForm({ name: '', email: '', rating: 5, message: '' })
    } catch (err) {
      setError(err.message || 'Failed to submit review')
    }
    setSubmitting(false)
  }

  return (
    <section id="review" className="py-24">
      <div className="mx-auto max-w-2xl px-4">
        <div className="glass-panel-strong rounded-2xl border border-white/5 p-8 md:p-12">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="mb-4 text-4xl">✓</div>
                <h3 className="mb-2 font-display text-xl font-bold text-white">
                  Thank You!
                </h3>
                <p className="mb-6 text-sm text-neural-400">
                  Your review has been submitted and is pending approval.
                </p>
                <button
                  onClick={() => setDone(false)}
                  className="text-sm text-neural-500 underline underline-offset-2 hover:text-neural-300"
                >
                  Submit another review
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <h2 className="mb-2 font-display text-2xl font-bold text-white">
                  Leave a Review
                </h2>
                <p className="mb-8 text-sm text-neural-400">
                  Share your thoughts about my work
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-neural-300">
                        Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Your name"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-neural-600 outline-none transition-colors focus:border-neural-500 focus:ring-1 focus:ring-neural-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-neural-300">
                        Email
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="optional"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-neural-600 outline-none transition-colors focus:border-neural-500 focus:ring-1 focus:ring-neural-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-neural-300">
                      Rating
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setForm({ ...form, rating: star })}
                          className={`text-2xl transition-colors ${
                            star <= form.rating
                              ? 'text-amber-400'
                              : 'text-white/10'
                          } hover:text-amber-300`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-neural-300">
                      Message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      required
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      rows={4}
                      placeholder="Write your review..."
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-neural-600 outline-none transition-colors focus:border-neural-500 focus:ring-1 focus:ring-neural-500"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-400">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-neural-500 px-6 py-3 font-medium text-white transition-all hover:bg-neural-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
