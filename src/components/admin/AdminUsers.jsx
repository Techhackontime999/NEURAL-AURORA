import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { getAllProfiles, updateProfileRole, getAdminSettings, updateAdminSettings } from '../../lib/supabase'

export default function AdminUsers() {
  const [profiles, setProfiles] = useState([])
  const [settings, setSettings] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [adminEmail, setAdminEmail] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

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

  async function handleRoleChange(userId, role) {
    try {
      await updateProfileRole(userId, role)
      setMessage(`User role updated to ${role}`)
      setMessageType('success')
      load()
    } catch (err) {
      setMessage('Error: ' + err.message)
      setMessageType('error')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleSaveAdminEmail() {
    try {
      await updateAdminSettings({ admin_email: adminEmail })
      setMessage('Admin email saved. Only this email can register as admin.')
      setMessageType('success')
      load()
    } catch (err) {
      setMessage('Error: ' + err.message)
      setMessageType('error')
    }
    setTimeout(() => setMessage(''), 3000)
  }

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

      {/* Users List */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
        <div style={{ background: 'var(--card-bg)' }}>
          {profiles.map((profile, i) => (
            <div
              key={profile.id}
              className="flex items-center justify-between px-5 py-4"
              style={{
                borderBottom: i < profiles.length - 1 ? '1px solid var(--border-color)' : 'none',
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {profile.email || 'No email'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {profile.full_name || 'No name'} · Joined {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                    profile.role === 'admin' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                  style={{
                    background: profile.role === 'admin' ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)',
                  }}
                >
                  {profile.role}
                </span>
                {editingId === profile.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { handleRoleChange(profile.id, 'admin'); setEditingId(null) }}
                      className="rounded px-2.5 py-1 text-xs font-medium text-emerald-400 transition-colors"
                      style={{ background: 'rgba(52,211,153,0.1)' }}
                    >
                      Make Admin
                    </button>
                    <button
                      onClick={() => { handleRoleChange(profile.id, 'viewer'); setEditingId(null) }}
                      className="rounded px-2.5 py-1 text-xs font-medium text-amber-400 transition-colors"
                      style={{ background: 'rgba(251,191,36,0.1)' }}
                    >
                      Make Viewer
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingId(profile.id)}
                    className="rounded px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      background: 'var(--hover-bg)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Change Role
                  </button>
                )}
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
