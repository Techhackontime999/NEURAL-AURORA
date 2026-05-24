import { motion } from 'framer-motion'

export default function BulkActionsBar({ selectedCount, onDelete, onClear, deleting }) {
  if (selectedCount === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{
        borderColor: 'rgba(239,68,68,0.3)',
        background: 'rgba(239,68,68,0.08)',
      }}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {selectedCount} selected
      </span>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="rounded-lg px-4 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: '#ef4444' }}
      >
        {deleting ? 'Deleting...' : 'Delete Selected'}
      </button>
      <button
        onClick={onClear}
        className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
        style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
      >
        Clear
      </button>
    </motion.div>
  )
}
