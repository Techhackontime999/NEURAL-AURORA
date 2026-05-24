import { useState, useEffect } from 'react'
import { getAllReviews, approveReview, deleteReview } from '../../lib/supabase'
import useBulkSelect from '../../lib/useBulkSelect'
import BulkActionsBar from '../ui/BulkActionsBar'

export default function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'pending' ? reviews.filter(r => !r.approved)
    : filter === 'approved' ? reviews.filter(r => r.approved)
    : reviews

  const { selectedIds, toggleSelect, toggleAll, clearSelection, allSelected, handleBulkDelete } = useBulkSelect(filtered)

  useEffect(() => { load() }, [])

  async function load() { setReviews(await getAllReviews()) }

  async function handleApprove(id) {
    try { await approveReview(id); load() } catch (err) { alert('Failed to approve: ' + err.message) }
  }

  async function handleDelete(id) {
    if (confirm('Delete this review?')) { try { await deleteReview(id); load() } catch (err) { alert('Failed to delete: ' + err.message) } }
  }

  async function handleBulkDeleteWrapper() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected reviews permanently?`)) return
    const { deleted, errors } = await handleBulkDelete(deleteReview)
    clearSelection()
    load()
  }

  const filters = ['all', 'pending', 'approved']

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Reviews & Feedback
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Moderate user reviews and testimonials
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border p-0.5" style={{ borderColor: 'var(--border-color)' }}>
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: filter === f ? 'var(--hover-bg)' : 'transparent',
                color: filter === f ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <BulkActionsBar selectedCount={selectedIds.size} onDelete={handleBulkDeleteWrapper} onClear={clearSelection} />
      <div className="space-y-3">
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-t-xl border text-[11px] font-medium uppercase tracking-wider"
            style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-tertiary)' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              Select All
            </label>
          </div>
        )}
        {filtered.map((review) => (
          <div
            key={review.id}
            className="rounded-xl border p-4"
            style={{
              borderColor: selectedIds.has(review.id) ? 'var(--accent)' : (review.approved ? 'var(--border-color)' : 'rgba(251,191,36,0.2)'),
              background: selectedIds.has(review.id) ? 'rgba(99,102,241,0.06)' : 'var(--card-bg)',
            }}
          >
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={selectedIds.has(review.id)} onChange={() => toggleSelect(review.id)} className="rounded shrink-0 mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{review.name}</h3>
                  {review.email && (
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{review.email}</span>
                  )}
                  {!review.approved && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-amber-400" style={{ background: 'rgba(251,191,36,0.1)' }}>
                      Pending
                    </span>
                  )}
                </div>
                {review.rating && (
                  <div className="mt-1 text-xs text-amber-400">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </div>
                )}
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{review.message}</p>
                <p className="mt-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  {new Date(review.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                {!review.approved && (
                  <button
                    onClick={() => handleApprove(review.id)}
                    className="rounded px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors"
                    style={{ background: 'rgba(52,211,153,0.1)' }}
                  >
                    Approve
                  </button>
                )}
                <button
                  onClick={() => handleDelete(review.id)}
                  className="rounded px-3 py-1.5 text-xs font-medium text-red-400 transition-colors"
                  style={{ background: 'rgba(239,68,68,0.1)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No reviews found.</p>
        )}
      </div>
    </div>
  )
}
