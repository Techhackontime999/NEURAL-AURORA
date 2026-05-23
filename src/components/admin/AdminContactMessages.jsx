import { useState, useEffect } from 'react'
import { getContactMessages, markContactMessageRead, deleteContactMessage } from '../../lib/supabase'

export default function AdminContactMessages() {
  const [messages, setMessages] = useState([])

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

      <div className="space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="rounded-xl border p-4 transition-all"
            style={{
              borderColor: msg.read ? 'var(--border-color)' : 'rgba(59,130,246,0.2)',
              background: msg.read ? 'var(--card-bg)' : 'rgba(59,130,246,0.03)',
            }}
          >
            <div className="flex items-start justify-between">
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
