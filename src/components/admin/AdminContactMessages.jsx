import { useState, useEffect } from 'react'
import { getContactMessages, markContactMessageRead, deleteContactMessage } from '../../lib/supabase'
import useBulkSelect from '../../lib/useBulkSelect'
import BulkActionsBar from '../ui/BulkActionsBar'

export default function AdminContactMessages() {
  const [messages, setMessages] = useState([])
  const { selectedIds, toggleSelect, toggleAll, clearSelection, allSelected, handleBulkDelete } = useBulkSelect(messages)

  useEffect(() => { load() }, [])

  async function load() {
    try { setMessages(await getContactMessages()) } catch {}
  }

  async function handleMarkRead(id) {
    try { await markContactMessageRead(id); load() } catch (err) { alert('Failed to mark as read: ' + err.message) }
  }

  async function handleDelete(id) {
    if (confirm('Delete this message?')) { try { await deleteContactMessage(id); load() } catch (err) { alert('Failed to delete: ' + err.message) } }
  }

  async function handleBulkDeleteWrapper() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected messages permanently?`)) return
    const { deleted, errors } = await handleBulkDelete(deleteContactMessage)
    clearSelection()
    load()
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Contact Messages
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Messages submitted via the contact forms
        </p>
      </div>

      <BulkActionsBar selectedCount={selectedIds.size} onDelete={handleBulkDeleteWrapper} onClear={clearSelection} />
      <div className="space-y-3">
        {messages.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-t-xl border text-[11px] font-medium uppercase tracking-wider"
            style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-tertiary)' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              Select All
            </label>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="rounded-xl border p-4 transition-all"
            style={{
              borderColor: selectedIds.has(msg.id) ? 'var(--accent)' : (msg.read ? 'var(--border-color)' : 'rgba(59,130,246,0.2)'),
              background: selectedIds.has(msg.id) ? 'rgba(99,102,241,0.06)' : (msg.read ? 'var(--card-bg)' : 'rgba(59,130,246,0.03)'),
            }}
          >
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={selectedIds.has(msg.id)} onChange={() => toggleSelect(msg.id)} className="rounded shrink-0 mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {msg.name}
                  </h3>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{msg.email}</span>
                  {!msg.read && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-blue-400" style={{ background: 'rgba(59,130,246,0.1)' }}>
                      New
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {msg.message}
                </p>
                <p className="mt-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                {!msg.read && (
                  <button
                    onClick={() => handleMarkRead(msg.id)}
                    className="rounded px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors"
                    style={{ background: 'rgba(59,130,246,0.1)' }}
                  >
                    Mark Read
                  </button>
                )}
                <button
                  onClick={() => handleDelete(msg.id)}
                  className="rounded px-3 py-1.5 text-xs font-medium text-red-400 transition-colors"
                  style={{ background: 'rgba(239,68,68,0.1)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No contact messages yet.
          </p>
        )}
      </div>
    </div>
  )
}
