import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import {
  getAllProfiles, updateProfileRole, getAdminSettings, updateAdminSettings,
  adminDeleteUser,
} from '../../lib/supabase'

export default function AdminUsers() {
  const [profiles, setProfiles] = useState([])
  const [settings, setSettings] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [adminEmail, setAdminEmail] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [p, s] = await Promise.all([getAllProfiles(), getAdminSettings()])
      setProfiles(p)
      setSettings(s)
      setAdminEmail(s?.admin_email || '')
    } catch (err) {
      console.error(err)
    }
  }

  function showMsg(msg, type = 'success') {
    setMessage(msg); setMessageType(type)
    setTimeout(() => setMessage(''), 3000)
  }

  function updateLocalProfile(userId, updates) {
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, ...updates } : p))
  }

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => prev.size === profiles.length ? new Set() : new Set(profiles.map(p => p.id)))
  }, [profiles])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  async function handleRoleChange(userId, role) {
    try {
      await updateProfileRole(userId, role)
      updateLocalProfile(userId, { role })
      showMsg(`User role updated to ${role}`)
    } catch (err) {
      showMsg('Error: ' + err.message, 'error')
    }
  }

  async function handleApprove(userId) {
    try {
      await updateProfileRole(userId, 'admin')
      updateLocalProfile(userId, { role: 'admin' })
      showMsg('User approved as admin')
    } catch (err) {
      showMsg('Error: ' + err.message, 'error')
    }
  }

  async function handleReject(userId) {
    try {
      await updateProfileRole(userId, 'viewer')
      updateLocalProfile(userId, { role: 'viewer' })
      showMsg('User rejected')
    } catch (err) {
      showMsg('Error: ' + err.message, 'error')
    }
  }

  async function handleDelete(userId) {
    if (!confirm('Delete this user permanently? This cannot be undone.')) return
    try {
      await adminDeleteUser(userId)
      setProfiles(prev => prev.filter(p => p.id !== userId))
      showMsg('User deleted permanently')
    } catch (err) {
      showMsg('Error: ' + err.message, 'error')
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected users permanently? This cannot be undone.`)) return
    setDeleting(true)
    let deleted = 0; let errors = 0
    for (const id of selectedIds) {
      try {
        await adminDeleteUser(id)
        deleted++
      } catch { errors++ }
    }
    setProfiles(prev => prev.filter(p => !selectedIds.has(p.id)))
    setSelectedIds(new Set())
    setDeleting(false)
    showMsg(errors ? `Deleted ${deleted}, ${errors} failed` : `Deleted ${deleted} users permanently`)
  }

  async function handleSaveAdminEmail() {
    try {
      await updateAdminSettings({ admin_email: adminEmail })
      showMsg('Admin email saved. Only this email can register as admin.')
      load()
    } catch (err) {
      showMsg('Error: ' + err.message, 'error')
    }
  }

  const allSelected = profiles.length > 0 && selectedIds.size === profiles.length

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          User Management
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Manage admin access and authorized registration emails
        </p>
      </div>

      {/* Admin Email Setting */}
      <div
        className="mb-8 rounded-xl border p-5"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--card-bg)',
        }}
      >
        <h2 className="mb-1 font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Authorized Admin Email
        </h2>
        <p className="mb-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Only signups from this email will have admin role. Leave empty to allow manual role assignment.
        </p>
        <div className="flex gap-3">
          <input
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="admin@example.com"
            className="flex-1 rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-1"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={handleSaveAdminEmail}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            Save
          </button>
        </div>
      </div>

      {message && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 text-sm ${messageType === 'error' ? 'text-red-400' : 'text-emerald-400'}`}
        >
          {message}
        </motion.p>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
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
            {selectedIds.size} user{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={deleting}
            className="rounded-lg px-4 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: '#ef4444' }}
          >
            {deleting ? 'Deleting...' : 'Delete Selected'}
          </button>
          <button
            onClick={clearSelection}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
          >
            Clear
          </button>
        </motion.div>
      )}

      {/* Users List */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
        {/* Table Header */}
        {profiles.length > 0 && (
          <div
            className="flex items-center gap-3 px-5 py-2.5 border-b text-[11px] font-medium uppercase tracking-wider"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--input-bg)',
              color: 'var(--text-tertiary)',
            }}
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="rounded"
              />
              Select All
            </label>
          </div>
        )}
        <div style={{ background: 'var(--card-bg)' }}>
          {profiles.map((profile, i) => (
            <div
              key={profile.id}
              className="flex items-center justify-between px-5 py-4 transition-colors"
              style={{
                borderBottom: i < profiles.length - 1 ? '1px solid var(--border-color)' : 'none',
                background: selectedIds.has(profile.id) ? 'rgba(239,68,68,0.04)' : 'transparent',
              }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={selectedIds.has(profile.id)}
                  onChange={() => toggleSelect(profile.id)}
                  className="rounded shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {profile.email || 'No email'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {profile.full_name || 'No name'} · Joined {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 flex-wrap justify-end">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                    profile.role === 'admin' ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-amber-400 bg-amber-500/10'
                  }`}
                >
                  {profile.role}
                </span>

                {editingId === profile.id ? (
                  <div className="flex gap-1.5">
                    <button onClick={() => { handleRoleChange(profile.id, 'admin'); setEditingId(null) }}
                      className="rounded px-2 py-1 text-[10px] font-medium text-emerald-400"
                      style={{ background: 'rgba(52,211,153,0.1)' }}>Admin</button>
                    <button onClick={() => { handleRoleChange(profile.id, 'viewer'); setEditingId(null) }}
                      className="rounded px-2 py-1 text-[10px] font-medium text-amber-400"
                      style={{ background: 'rgba(251,191,36,0.1)' }}>Viewer</button>
                    <button onClick={() => setEditingId(null)}
                      className="rounded px-2 py-1 text-[10px]"
                      style={{ color: 'var(--text-tertiary)', background: 'var(--hover-bg)' }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setEditingId(profile.id)}
                    className="rounded px-2 py-1 text-[10px] font-medium"
                    style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>
                    Role
                  </button>
                )}

                {profile.role !== 'admin' ? (
                  <button onClick={() => handleApprove(profile.id)}
                    className="rounded px-2 py-1 text-[10px] font-medium text-emerald-400"
                    style={{ background: 'rgba(52,211,153,0.1)' }}>
                    Approve
                  </button>
                ) : (
                  <button onClick={() => handleReject(profile.id)}
                    className="rounded px-2 py-1 text-[10px] font-medium text-amber-400"
                    style={{ background: 'rgba(251,191,36,0.1)' }}>
                    Reject
                  </button>
                )}

                <button onClick={() => handleDelete(profile.id)}
                  className="rounded px-2 py-1 text-[10px] font-medium text-red-400"
                  style={{ background: 'rgba(239,68,68,0.1)' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        {profiles.length === 0 && (
          <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No users found
          </p>
        )}
      </div>
    </div>
  )
}
