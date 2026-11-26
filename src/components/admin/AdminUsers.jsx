import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react'
import {
  getAllProfiles, updateProfileRole, getAdminSettings, updateAdminSettings,
  adminDeleteUser,
} from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import SearchBar from '../ui/SearchBar'

const ROLES = ['viewer', 'admin']
const ROLE_FILTERS = ['all', ...ROLES]
const PAGE_SIZE = 10

function formatJoined(value) {
  if (!value) return 'Joined unknown'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Joined unknown' : `Joined ${date.toLocaleDateString()}`
}

export default function AdminUsers() {
  const { user: currentUser, profile: currentProfile } = useAuth()
  const { toast, confirm } = useToast()
  const [profiles, setProfiles] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [adminEmail, setAdminEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [savingEmail, setSavingEmail] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const currentUserId = currentUser?.id || currentProfile?.id

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const [profilesResult, settingsResult] = await Promise.allSettled([
        getAllProfiles(),
        getAdminSettings(),
      ])
      if (!active) return
      if (profilesResult.status === 'rejected') {
        setError(profilesResult.reason?.message || 'Could not load users.')
        setLoading(false)
        return
      }
      setProfiles(profilesResult.value || [])
      if (settingsResult.status === 'fulfilled') {
        setAdminEmail(settingsResult.value?.admin_email || '')
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [reloadKey])

  function showMsg(msg, type = 'success') {
    setMessage(msg)
    setMessageType(type)
    if (type === 'error') toast.error(msg)
    else if (type === 'warning') toast.warning(msg)
    else toast.success(msg)
    setTimeout(() => setMessage(''), 4000)
  }

  const adminCount = useMemo(
    () => profiles.filter((profile) => profile.role === 'admin').length,
    [profiles]
  )

  function protectionReason(profile) {
    if (profile.id === currentUserId) return 'Your own account'
    if (profile.role === 'admin' && adminCount <= 1) return 'Last admin'
    return ''
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return profiles.filter((profile) => {
      if (roleFilter !== 'all' && profile.role !== roleFilter) return false
      if (!term) return true
      return [profile.email, profile.full_name, profile.role]
        .some((field) => field?.toLowerCase().includes(term))
    })
  }, [profiles, search, roleFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageProfiles = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const pageSelectableIds = pageProfiles
    .filter((profile) => !protectionReason(profile))
    .map((profile) => profile.id)
  const allPageSelected = pageSelectableIds.length > 0
    && pageSelectableIds.every((id) => selectedIds.has(id))

  function updateLocalProfile(userId, updates) {
    setProfiles((prev) => prev.map((profile) => (
      profile.id === userId ? { ...profile, ...updates } : profile
    )))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function resetListState() {
    setPage(1)
    clearSelection()
  }

  function toggleSelect(id) {
    const profile = profiles.find((item) => item.id === id)
    if (!profile || protectionReason(profile)) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const shouldSelect = !pageSelectableIds.every((id) => next.has(id))
      pageSelectableIds.forEach((id) => {
        if (shouldSelect) next.add(id)
        else next.delete(id)
      })
      return next
    })
  }

  function goToPage(nextPage) {
    setPage(Math.min(Math.max(nextPage, 1), pageCount))
    clearSelection()
  }

  async function handleRoleChange(profile, nextRole) {
    if (profile.role === nextRole) return
    const reason = protectionReason(profile)
    if (reason) {
      showMsg(`${reason} cannot be changed from this screen.`, 'error')
      return
    }
    const promoting = nextRole === 'admin'
    const ok = await confirm({
      title: promoting ? 'Grant admin access' : 'Remove admin access',
      message: promoting
        ? `Give ${profile.email || 'this user'} full admin access?`
        : `Remove admin access from ${profile.email || 'this user'}? They will become a viewer.`,
      confirmText: promoting ? 'Grant admin' : 'Remove admin',
      danger: !promoting,
    })
    if (!ok) return
    setBusyId(profile.id)
    try {
      await updateProfileRole(profile.id, nextRole)
      updateLocalProfile(profile.id, { role: nextRole })
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(profile.id)
        return next
      })
      showMsg(promoting ? 'Admin access granted.' : 'Admin access removed.')
    } catch (err) {
      showMsg(`Error: ${err.message}`, 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(profile) {
    const reason = protectionReason(profile)
    if (reason) {
      showMsg(`${reason} cannot be deleted from this screen.`, 'error')
      return
    }
    const ok = await confirm({
      title: 'Delete user permanently',
      message: `This permanently deletes ${profile.email || 'this user'} and their auth session. Related orders, licenses, and history may be lost. Type DELETE to confirm.`,
      confirmText: 'Delete permanently',
      requireText: 'DELETE',
      danger: true,
    })
    if (!ok) return
    setBusyId(profile.id)
    try {
      await adminDeleteUser(profile.id)
      setProfiles((prev) => prev.filter((item) => item.id !== profile.id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(profile.id)
        return next
      })
      showMsg('User deleted permanently.')
    } catch (err) {
      showMsg(`Error: ${err.message}`, 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function handleBulkDelete() {
    if (deleting || selectedIds.size === 0) return
    const targets = profiles.filter((profile) => (
      selectedIds.has(profile.id) && !protectionReason(profile)
    ))
    const skipped = selectedIds.size - targets.length
    if (targets.length === 0) {
      showMsg('No selected accounts can be deleted.', 'error')
      return
    }
    const ok = await confirm({
      title: 'Delete selected users permanently',
      message: `This permanently deletes ${targets.length} selected user${targets.length === 1 ? '' : 's'} and their auth sessions. Related orders, licenses, and history may be lost. Type DELETE ALL to confirm.`,
      confirmText: 'Delete all',
      requireText: 'DELETE ALL',
      danger: true,
    })
    if (!ok) return
    setDeleting(true)
    const removedIds = new Set()
    let deleted = 0
    let failures = 0
    for (const profile of targets) {
      try {
        await adminDeleteUser(profile.id)
        removedIds.add(profile.id)
        deleted++
      } catch (err) {
        console.error('[AdminUsers] bulk delete failed:', err)
        failures++
      }
    }
    setProfiles((prev) => prev.filter((profile) => !removedIds.has(profile.id)))
    clearSelection()
    setDeleting(false)
    const skippedNote = skipped ? ` ${skipped} protected account${skipped === 1 ? '' : 's'} were skipped.` : ''
    if (failures) {
      showMsg(`Deleted ${deleted}; ${failures} failed.${skippedNote}`, 'error')
    } else {
      showMsg(`Deleted ${deleted} user${deleted === 1 ? '' : 's'} permanently.${skippedNote}`, 'success')
    }
  }

  async function handleSaveAdminEmail() {
    const email = adminEmail.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMsg('Enter a valid email address or leave the field blank.', 'error')
      return
    }
    setSavingEmail(true)
    try {
      await updateAdminSettings({ admin_email: email })
      showMsg(email ? 'Admin email saved.' : 'Admin email cleared. Manual role assignment remains available.')
      setReloadKey((key) => key + 1)
    } catch (err) {
      showMsg(`Error: ${err.message}`, 'error')
    } finally {
      setSavingEmail(false)
    }
  }

  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            User Management
          </h1>
          <p className="mt-1 max-w-[58ch] text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Review accounts, assign admin access, and manage the authorized signup email. Your own account and the last admin are protected.
          </p>
        </div>
        <SearchBar
          value={search}
          onChange={(value) => { setSearch(value); resetListState() }}
          placeholder="Search name, email, or role..."
          className="w-full sm:w-72"
        />
      </div>

      {message && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-sm ${messageType === 'error' ? 'text-red-400' : messageType === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}
          role="status"
        >
          {message}
        </motion.p>
      )}

      <section
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Authorized Admin Email
            </h2>
            <p className="mt-1 max-w-[62ch] text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Only signups from this email receive admin role automatically. Leave it empty to assign roles manually here.
            </p>
          </div>
          <span
            className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full px-3 text-xs"
            style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
          >
            <ShieldCheck size={14} aria-hidden="true" />
            Admin-only setting
          </span>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="authorized-admin-email">Authorized admin email</label>
          <input
            id="authorized-admin-email"
            type="email"
            value={adminEmail}
            onChange={(event) => setAdminEmail(event.target.value)}
            placeholder="admin@example.com"
            className="min-h-11 flex-1 rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-1"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="button"
            onClick={handleSaveAdminEmail}
            disabled={savingEmail}
            className="min-h-11 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {savingEmail ? 'Saving...' : 'Save'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="User summary">
        {[
          { label: 'Total accounts', value: profiles.length, icon: Users },
          { label: 'Admins', value: adminCount, icon: ShieldCheck },
          { label: 'Viewers', value: profiles.length - adminCount, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border px-5 py-4"
            style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                {label}
              </span>
              <Icon size={16} aria-hidden="true" style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="mt-2 font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {loading ? '—' : value}
            </p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by role">
            {ROLE_FILTERS.map((role) => {
              const active = roleFilter === role
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => { setRoleFilter(role); resetListState() }}
                  aria-pressed={active}
                  className={`inline-flex min-h-11 items-center rounded-full border px-4 text-xs font-medium capitalize transition-colors ${active ? 'text-white' : 'hover:opacity-80'}`}
                  style={{
                    borderColor: 'var(--border-color)',
                    background: active ? 'var(--accent)' : 'var(--card-bg)',
                    color: active ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {role === 'all' ? 'All roles' : role}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-3 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50"
            style={{ color: 'var(--text-secondary)', background: 'var(--hover-bg)' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center"
            style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}
          >
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {selectedIds.size} user{selectedIds.size === 1 ? '' : 's'} selected
            </span>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={deleting}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-xs font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: '#ef4444' }}
              >
                <Trash2 size={14} aria-hidden="true" />
                {deleting ? 'Deleting...' : 'Delete selected'}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="min-h-11 rounded-lg px-3 text-xs font-medium transition-colors"
                style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}

        <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
          {!loading && !error && filtered.length > 0 && (
            <div
              className="hidden grid-cols-[minmax(0,1fr)_150px_320px] gap-4 border-b px-5 py-3 text-[11px] font-medium uppercase tracking-wider sm:grid"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-tertiary)',
              }}
            >
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-3">
                <input type="checkbox" checked={allPageSelected} onChange={toggleAll} className="rounded" />
                Account
              </label>
              <span>Role</span>
              <span>Actions</span>
            </div>
          )}

          <div style={{ background: 'var(--card-bg)' }}>
            {loading && (
              <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading users">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-lg" style={{ background: 'var(--hover-bg)' }} />
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
                <AlertTriangle size={24} style={{ color: '#f87171' }} aria-hidden="true" />
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{error}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((key) => key + 1)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && pageProfiles.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
                <Users size={24} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {profiles.length === 0 ? 'No accounts yet.' : 'No users match these filters.'}
                </p>
                {profiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setRoleFilter('all'); resetListState() }}
                    className="min-h-11 rounded-lg px-4 text-xs font-medium"
                    style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {!loading && !error && pageProfiles.map((profile, index) => {
              const reason = protectionReason(profile)
              const isBusy = busyId === profile.id
              return (
                <div
                  key={profile.id}
                  className="px-5 py-4 transition-colors"
                  style={{
                    borderTop: index === 0 ? 'none' : '1px solid var(--border-color)',
                    background: selectedIds.has(profile.id) ? 'rgba(239,68,68,0.04)' : 'transparent',
                  }}
                >
                  <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_150px_320px] sm:items-center">
                    <label className={`flex min-h-11 min-w-0 items-center gap-3 ${reason ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(profile.id)}
                        onChange={() => toggleSelect(profile.id)}
                        disabled={Boolean(reason)}
                        className="rounded shrink-0"
                        aria-label={`Select ${profile.email || profile.id}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {profile.email || 'No email'}
                        </p>
                        <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {profile.full_name || 'No name'} · {formatJoined(profile.created_at)}
                        </p>
                      </div>
                    </label>

                    <div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${
                          profile.role === 'admin' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                        }`}
                      >
                        {profile.role}
                      </span>
                      {reason && (
                        <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{reason}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`role-${profile.id}`}>
                        Role for {profile.email || profile.id}
                      </label>
                      <select
                        id={`role-${profile.id}`}
                        value={profile.role}
                        onChange={(event) => handleRoleChange(profile, event.target.value)}
                        disabled={Boolean(reason) || isBusy}
                        className="min-h-11 flex-1 rounded-lg border px-3 py-2 text-xs outline-none transition-colors focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                        style={{
                          borderColor: 'var(--border-color)',
                          background: 'var(--input-bg)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>{role === 'admin' ? 'Admin' : 'Viewer'}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDelete(profile)}
                        disabled={Boolean(reason) || isBusy}
                        title={reason || 'Delete user permanently'}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ background: 'rgba(239,68,68,0.08)' }}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {!loading && !error && filtered.length > PAGE_SIZE && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Showing {rangeStart}–{rangeEnd} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage === 1}
                aria-label="Previous page"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <span className="px-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                Page {safePage} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage === pageCount}
                aria-label="Next page"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
