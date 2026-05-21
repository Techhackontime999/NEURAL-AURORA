import { useState, useEffect } from 'react'
import { getAllReviews, approveReview, deleteReview } from '../../lib/supabase'

export default function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() { setReviews(await getAllReviews()) }

  async function handleApprove(id) {
    await approveReview(id); load()
  }

  async function handleDelete(id) {
    if (confirm('Delete this review?')) { await deleteReview(id); load() }
  }

  const filtered = filter === 'pending' ? reviews.filter(r => !r.approved)
    : filter === 'approved' ? reviews.filter(r => r.approved)
    : reviews

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Reviews & Feedback</h1>
        <div className="flex gap-2">
          {['all', 'pending', 'approved'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-neural-500/20 text-neural-300'
                  : 'text-neural-500 hover:text-neural-400'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((review) => (
          <div
            key={review.id}
            className={`rounded-lg border bg-white/[0.02] p-4 ${
              review.approved ? 'border-white/5' : 'border-amber-500/20'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-white">{review.name}</h3>
                  {review.email && (
                    <span className="text-xs text-neural-600">{review.email}</span>
                  )}
                  {!review.approved && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">Pending</span>
                  )}
                </div>
                {review.rating && (
                  <div className="mt-1 text-xs text-amber-400">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </div>
                )}
                <p className="mt-2 text-sm text-neural-400">{review.message}</p>
                <p className="mt-2 text-[10px] text-neural-600">
                  {new Date(review.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                {!review.approved && (
                  <button
                    onClick={() => handleApprove(review.id)}
                    className="rounded bg-emerald-600/20 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-600/30"
                  >
                    Approve
                  </button>
                )}
                <button
                  onClick={() => handleDelete(review.id)}
                  className="rounded bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-neural-600">No reviews found.</p>
        )}
      </div>
    </div>
  )
}
