import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import {
  getAdminSettings, updateAdminSettings,
  getAppointmentTypes, createAppointmentType, updateAppointmentType, deleteAppointmentType,
  getAppointments, updateAppointment, deleteAppointment,
} from '../../lib/supabase'
import { invalidatePortfolioCache } from '../../lib/usePortfolioData'

const DEFAULT_AVAILABILITY = {
  days: [1, 2, 3, 4, 5],
  start: '09:00',
  end: '17:00',
  slot_interval: 30,
  blackout_dates: [],
}

const DEFAULT_SETTINGS = {
  enabled: true,
  heading: 'Book an Appointment',
  subheading: 'Schedule a call or consultation',
  description: 'Choose a service, pick your preferred time, and we’ll confirm your appointment.',
  confirmation_message: 'Your appointment request has been received. We will contact you soon to confirm.',
  timezone_note: 'Times are shown in your local timezone unless noted otherwise.',
  auto_confirm_free: false,
  require_phone: false,
  min_notice_hours: 0,
  max_days_ahead: 60,
  booking_instructions: '',
  default_meeting_provider: 'custom',
  availability: DEFAULT_AVAILABILITY,
}

const emptyType = {
  type_id: '', name: '', description: '', duration_minutes: 30, price_rupees: 0, currency: 'INR',
  meeting_provider: 'custom', meeting_url: '', location_label: 'Online meeting',
  is_active: true, display_order: 0,
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const PROVIDERS = [
  { value: 'custom', label: 'Custom link' },
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'microsoft_teams', label: 'Microsoft Teams' },
  { value: 'phone', label: 'Phone call' },
  { value: 'in_person', label: 'In person' },
]

function toRupees(paise) { const n = Number(paise || 0); return Number.isFinite(n) ? n / 100 : 0 }
function toPaise(rupees) { const n = Number(rupees || 0); return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0 }
function formatPrice(paise, currency = 'INR') {
  const amount = toRupees(paise)
  if (!amount) return 'Free'
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount) } catch { return `${currency} ${amount}` }
}
function fmtDateTime(date, time) { if (!date) return '-'; return `${date}${time ? ` at ${time}` : ''}` }

export default function AdminAppointments() {
  const { toast, confirm } = useToast()
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [types, setTypes] = useState([])
  const [appointments, setAppointments] = useState([])
  const [typeForm, setTypeForm] = useState(emptyType)
  const [editingTypeId, setEditingTypeId] = useState(null)
  const [savingType, setSavingType] = useState(false)
  const [tab, setTab] = useState('bookings')
  const [bookingFilter, setBookingFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [admin, typeRows, bookingRows] = await Promise.all([
        getAdminSettings(),
        getAppointmentTypes().catch(() => []),
        getAppointments().catch(() => []),
      ])
      const loaded = admin?.appointment_settings || {}
      setSettings({ ...DEFAULT_SETTINGS, ...loaded, availability: { ...DEFAULT_AVAILABILITY, ...(loaded.availability || {}) } })
      setTypes(typeRows || [])
      setAppointments(bookingRows || [])
    } catch (err) { toast.error(err.message || 'Failed to load appointments') }
    finally { setLoading(false) }
  }

  async function saveSettings() {
    setSavingSettings(true)
    try {
      await updateAdminSettings({ appointment_settings: settings })
      invalidatePortfolioCache('publicSiteSettings')
      toast.success('Appointment settings saved')
    } catch (err) { toast.error(err.message || 'Failed to save settings') }
    finally { setSavingSettings(false) }
  }

  function editType(t) {
    setEditingTypeId(t.id)
    setTypeForm({
      type_id: t.type_id || '', name: t.name || '', description: t.description || '',
      duration_minutes: t.duration_minutes || 30, price_rupees: toRupees(t.price_paise), currency: t.currency || 'INR',
      meeting_provider: t.meeting_provider || 'custom', meeting_url: t.meeting_url || '', location_label: t.location_label || 'Online meeting',
      is_active: t.is_active !== false, display_order: t.display_order ?? 0,
    })
    setTab('types')
  }

  function duplicateType(t) {
    setEditingTypeId(null)
    setTypeForm({
      type_id: `${t.type_id || 'type'}-copy`, name: `${t.name || 'Appointment'} (Copy)`, description: t.description || '',
      duration_minutes: t.duration_minutes || 30, price_rupees: toRupees(t.price_paise), currency: t.currency || 'INR',
      meeting_provider: t.meeting_provider || 'custom', meeting_url: t.meeting_url || '', location_label: t.location_label || 'Online meeting',
      is_active: false, display_order: (t.display_order ?? 0) + 1,
    })
    setTab('types')
  }

  function resetTypeForm() { setEditingTypeId(null); setTypeForm({ ...emptyType, meeting_provider: settings.default_meeting_provider || 'custom' }) }

  async function saveType(e) {
    e.preventDefault()
    if (!typeForm.name.trim()) return toast.error('Appointment name is required')
    const typeId = (typeForm.type_id || typeForm.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    if (!typeId) return toast.error('Type ID could not be generated')
    setSavingType(true)
    const payload = {
      type_id: typeId, name: typeForm.name.trim(), description: typeForm.description.trim(),
      duration_minutes: Math.max(5, Number(typeForm.duration_minutes) || 30),
      price_paise: toPaise(typeForm.price_rupees), currency: (typeForm.currency || 'INR').toUpperCase(),
      meeting_provider: typeForm.meeting_provider || 'custom', meeting_url: typeForm.meeting_url.trim(),
      location_label: typeForm.location_label.trim() || 'Online meeting',
      is_active: !!typeForm.is_active, display_order: Number(typeForm.display_order) || 0,
    }
    try {
      if (editingTypeId) { await updateAppointmentType(editingTypeId, payload); toast.success('Appointment type updated') }
      else { await createAppointmentType(payload); toast.success('Appointment type created') }
      invalidatePortfolioCache('appointmentTypes')
      resetTypeForm()
      setTypes(await getAppointmentTypes())
    } catch (err) { toast.error(err.message || 'Failed to save appointment type') }
    finally { setSavingType(false) }
  }

  async function removeType(t) {
    const ok = await confirm({ title: 'Delete appointment type?', message: `Delete "${t.name}"? Existing bookings keep their snapshot.`, confirmText: 'Delete', danger: true })
    if (!ok) return
    try { await deleteAppointmentType(t.id); invalidatePortfolioCache('appointmentTypes'); setTypes(await getAppointmentTypes()); toast.success('Appointment type deleted') }
    catch (err) { toast.error(err.message || 'Failed to delete') }
  }

  async function setBookingStatus(booking, status) {
    try {
      const updated = await updateAppointment(booking.id, { status })
      setAppointments(prev => prev.map(a => a.id === booking.id ? updated : a))
      toast.success(`Booking marked ${status}`)
    } catch (err) { toast.error(err.message || 'Failed to update booking') }
  }

  async function saveAdminNote(booking, admin_note) {
    try { const updated = await updateAppointment(booking.id, { admin_note }); setAppointments(prev => prev.map(a => a.id === booking.id ? updated : a)); toast.success('Note saved') }
    catch (err) { toast.error(err.message || 'Failed to save note') }
  }

  async function saveMeeting(booking, meeting_url_snapshot, location_label_snapshot) {
    try {
      const updated = await updateAppointment(booking.id, { meeting_url_snapshot: meeting_url_snapshot.trim(), location_label_snapshot: location_label_snapshot.trim() || booking.location_label_snapshot || 'Online meeting' })
      setAppointments(prev => prev.map(a => a.id === booking.id ? updated : a))
      toast.success('Meeting details saved')
    } catch (err) { toast.error(err.message || 'Failed to save meeting details') }
  }

  async function removeBooking(booking) {
    const ok = await confirm({ title: 'Delete booking?', message: `Delete booking from ${booking.customer_name}?`, confirmText: 'Delete', danger: true })
    if (!ok) return
    try { await deleteAppointment(booking.id); setAppointments(prev => prev.filter(a => a.id !== booking.id)); toast.success('Booking deleted') }
    catch (err) { toast.error(err.message || 'Failed to delete booking') }
  }

  async function copyText(text, label = 'Copied') {
    if (!text) return
    try { await navigator.clipboard.writeText(text); toast.success(label) } catch { toast.error('Could not copy') }
  }

  const filteredAppointments = useMemo(() => {
    const q = search.trim().toLowerCase()
    const today = new Date().toISOString().slice(0, 10)
    return appointments.filter(b => {
      if (bookingFilter !== 'all' && b.status !== bookingFilter) return false
      if (dateFilter === 'today' && b.preferred_date !== today) return false
      if (dateFilter === 'upcoming' && (b.preferred_date || '') < today) return false
      if (!q) return true
      return [b.customer_name, b.customer_email, b.customer_phone, b.type_name_snapshot, b.preferred_date, b.preferred_time, b.status, b.payment_status].join(' ').toLowerCase().includes(q)
    })
  }, [appointments, bookingFilter, dateFilter, search])

  const stats = useMemo(() => ({
    total: appointments.length,
    pending: appointments.filter(b => b.status === 'pending').length,
    confirmed: appointments.filter(b => b.status === 'confirmed').length,
    paid: appointments.filter(b => b.payment_status === 'paid').length,
  }), [appointments])

  const card = { background: 'var(--card-bg)', borderColor: 'var(--border-color)' }
  const input = { background: 'color-mix(in srgb, var(--input-bg) 92%, transparent)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }
  const muted = { color: 'var(--text-secondary)' }

  if (loading) return <p className="text-sm" style={muted}>Loading appointments...</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Appointments</h1>
          <p className="mt-1 text-sm" style={muted}>Premium booking management — types, meeting links, availability rules, and booking requests.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['bookings', 'types', 'settings'].map(t => (
            <button key={t} onClick={() => setTab(t)} className="rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors" style={{ background: tab === t ? 'var(--accent)' : 'var(--hover-bg)', color: tab === t ? '#fff' : 'var(--text-secondary)' }}>{t}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total bookings" value={stats.total} card={card} muted={muted} />
        <StatCard label="Pending" value={stats.pending} card={card} muted={muted} accent="#f59e0b" />
        <StatCard label="Confirmed" value={stats.confirmed} card={card} muted={muted} accent="#10b981" />
        <StatCard label="Paid" value={stats.paid} card={card} muted={muted} accent="#06b6d4" />
      </div>

      {tab === 'settings' && (
        <section className="rounded-xl border p-4 md:p-6 space-y-5" style={card}>
          <SectionHead title="Booking Settings" desc="Control visibility, messaging, and booking rules." muted={muted}>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}><input type="checkbox" checked={!!settings.enabled} onChange={e => setSettings(s => ({ ...s, enabled: e.target.checked }))} /> Enabled</label>
          </SectionHead>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Heading"><input value={settings.heading} onChange={e => setSettings(s => ({ ...s, heading: e.target.value }))} className="input" style={input} /></Field>
            <Field label="Subheading"><input value={settings.subheading} onChange={e => setSettings(s => ({ ...s, subheading: e.target.value }))} className="input" style={input} /></Field>
          </div>
          <Field label="Description"><textarea value={settings.description} onChange={e => setSettings(s => ({ ...s, description: e.target.value }))} rows={3} className="input resize-y" style={input} /></Field>
          <Field label="Confirmation message"><textarea value={settings.confirmation_message} onChange={e => setSettings(s => ({ ...s, confirmation_message: e.target.value }))} rows={2} className="input resize-y" style={input} /></Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Timezone note"><input value={settings.timezone_note} onChange={e => setSettings(s => ({ ...s, timezone_note: e.target.value }))} className="input" style={input} /></Field>
            <Field label="Default meeting provider">
              <select value={settings.default_meeting_provider || 'custom'} onChange={e => setSettings(s => ({ ...s, default_meeting_provider: e.target.value }))} className="input" style={input}>
                {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Min notice (hours)"><input type="number" min="0" value={settings.min_notice_hours ?? 0} onChange={e => setSettings(s => ({ ...s, min_notice_hours: Number(e.target.value || 0) }))} className="input" style={input} /></Field>
            <Field label="Max days ahead"><input type="number" min="1" value={settings.max_days_ahead ?? 60} onChange={e => setSettings(s => ({ ...s, max_days_ahead: Number(e.target.value || 60) }))} className="input" style={input} /></Field>
            <div className="space-y-3 md:pt-7">
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}><input type="checkbox" checked={!!settings.auto_confirm_free} onChange={e => setSettings(s => ({ ...s, auto_confirm_free: e.target.checked }))} /> Auto-confirm free bookings</label>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}><input type="checkbox" checked={!!settings.require_phone} onChange={e => setSettings(s => ({ ...s, require_phone: e.target.checked }))} /> Require phone number</label>
            </div>
          </div>
          <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--border-color)', background: 'var(--glass-bg)' }}>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Availability & slots</h3>
              <p className="text-xs mt-0.5" style={muted}>Control when visitors can book. Slots are generated from these rules and existing bookings.</p>
            </div>
            <div>
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Working days</span>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d, i) => {
                  const active = (settings.availability?.days || []).includes(i)
                  return (
                    <button key={d} type="button" onClick={() => setSettings(s => {
                      const days = new Set(s.availability?.days || [])
                      if (days.has(i)) days.delete(i); else days.add(i)
                      return { ...s, availability: { ...s.availability, days: [...days].sort((a,b)=>a-b) } }
                    })} className="rounded-lg px-3 py-1.5 text-xs font-medium border" style={{ borderColor: active ? 'color-mix(in srgb, var(--accent) 40%, var(--border-color))' : 'var(--border-color)', background: active ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{d}</button>
                  )
                })}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Start time"><input type="time" value={settings.availability?.start || '09:00'} onChange={e => setSettings(s => ({ ...s, availability: { ...s.availability, start: e.target.value } }))} className="input" style={input} /></Field>
              <Field label="End time"><input type="time" value={settings.availability?.end || '17:00'} onChange={e => setSettings(s => ({ ...s, availability: { ...s.availability, end: e.target.value } }))} className="input" style={input} /></Field>
              <Field label="Slot interval (min)"><input type="number" min="5" step="5" value={settings.availability?.slot_interval ?? 30} onChange={e => setSettings(s => ({ ...s, availability: { ...s.availability, slot_interval: Math.max(5, Number(e.target.value || 30)) } }))} className="input" style={input} /></Field>
            </div>
            <Field label="Blackout dates (YYYY-MM-DD, one per line)">
              <textarea value={(settings.availability?.blackout_dates || []).join('\n')} onChange={e => setSettings(s => ({ ...s, availability: { ...s.availability, blackout_dates: e.target.value.split(/[\n,]+/).map(v => v.trim()).filter(v => /^\d{4}-\d{2}-\d{2}$/.test(v)) } }))} rows={3} className="input resize-y font-mono text-xs" style={input} placeholder="2026-12-25&#10;2026-01-01" />
            </Field>
          </div>

          <Field label="Booking instructions (shown to admin / internal)"><textarea value={settings.booking_instructions || ''} onChange={e => setSettings(s => ({ ...s, booking_instructions: e.target.value }))} rows={2} className="input resize-y" style={input} placeholder="Internal notes: e.g. confirm within 24h, send Zoom link manually if needed..." /></Field>
          <button onClick={saveSettings} disabled={savingSettings} className="rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>{savingSettings ? 'Saving...' : 'Save Settings'}</button>
        </section>
      )}

      {tab === 'types' && (
        <section className="rounded-xl border p-4 md:p-6 space-y-5" style={card}>
          <SectionHead title={editingTypeId ? 'Edit Appointment Type' : 'Add Appointment Type'} desc="Configure pricing, duration, meeting platform, and join link for each service." muted={muted} />
          <form onSubmit={saveType} className="grid gap-4 md:grid-cols-2">
            <Field label="Name"><input value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} className="input" style={input} placeholder="Discovery Call" /></Field>
            <Field label="Type ID"><input value={typeForm.type_id} onChange={e => setTypeForm(f => ({ ...f, type_id: e.target.value }))} className="input" style={input} placeholder="discovery-call" /></Field>
            <Field label="Duration (minutes)"><input type="number" min="5" step="5" value={typeForm.duration_minutes} onChange={e => setTypeForm(f => ({ ...f, duration_minutes: e.target.value }))} className="input" style={input} /></Field>
            <Field label="Price (INR, 0 = free)"><input type="number" min="0" step="1" value={typeForm.price_rupees} onChange={e => setTypeForm(f => ({ ...f, price_rupees: e.target.value }))} className="input" style={input} /></Field>
            <Field label="Display order"><input type="number" value={typeForm.display_order} onChange={e => setTypeForm(f => ({ ...f, display_order: e.target.value }))} className="input" style={input} /></Field>
            <label className="flex items-center gap-2 text-sm md:mt-7" style={{ color: 'var(--text-primary)' }}><input type="checkbox" checked={!!typeForm.is_active} onChange={e => setTypeForm(f => ({ ...f, is_active: e.target.checked }))} /> Active</label>
            <Field label="Meeting provider">
              <select value={typeForm.meeting_provider} onChange={e => setTypeForm(f => ({ ...f, meeting_provider: e.target.value }))} className="input" style={input}>
                {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Location / platform label"><input value={typeForm.location_label} onChange={e => setTypeForm(f => ({ ...f, location_label: e.target.value }))} className="input" style={input} placeholder="Google Meet / Zoom / Office" /></Field>
            <div className="md:col-span-2">
              <Field label="Meeting URL / join link"><input value={typeForm.meeting_url} onChange={e => setTypeForm(f => ({ ...f, meeting_url: e.target.value }))} className="input" style={input} placeholder="https://meet.google.com/... or https://zoom.us/j/..." /></Field>
              <p className="mt-1 text-[11px]" style={muted}>Shown to visitors on the confirmation/access page. You can override per booking in Bookings tab.</p>
            </div>
            <div className="md:col-span-2"><Field label="Description"><textarea value={typeForm.description} onChange={e => setTypeForm(f => ({ ...f, description: e.target.value }))} rows={2} className="input resize-y" style={input} /></Field></div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={savingType} className="rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>{savingType ? 'Saving...' : editingTypeId ? 'Update Type' : 'Add Type'}</button>
              {editingTypeId && <button type="button" onClick={resetTypeForm} className="rounded-lg px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)', background: 'var(--hover-bg)' }}>Cancel</button>}
            </div>
          </form>

          <div className="space-y-3 pt-2">
            {types.length === 0 && <p className="text-sm" style={muted}>No appointment types yet.</p>}
            {types.map(t => (
              <div key={t.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-color)', background: 'var(--glass-bg)' }}>
                <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                      <Badge>{formatPrice(t.price_paise, t.currency)}</Badge>
                      <Badge>{t.duration_minutes} min</Badge>
                      <Badge>{PROVIDERS.find(p => p.value === t.meeting_provider)?.label || 'Custom link'}</Badge>
                      {!t.is_active && <span className="text-[11px] rounded-full px-2 py-0.5 bg-amber-500/10 text-amber-400">Inactive</span>}
                    </div>
                    {t.description && <p className="text-xs mt-1.5" style={muted}>{t.description}</p>}
                    {t.meeting_url && <p className="text-[11px] mt-1.5 break-all" style={{ color: 'var(--text-tertiary)' }}>Meeting: <a href={t.meeting_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{t.meeting_url}</a></p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => editType(t)} className="rounded-md px-3 py-1.5 text-xs" style={{ background: 'var(--hover-bg)', color: 'var(--text-primary)' }}>Edit</button>
                    <button onClick={() => duplicateType(t)} className="rounded-md px-3 py-1.5 text-xs" style={{ background: 'var(--hover-bg)', color: 'var(--text-primary)' }}>Duplicate</button>
                    <button onClick={() => removeType(t)} className="rounded-md px-3 py-1.5 text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.08)' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'bookings' && (
        <section className="rounded-xl border p-4 md:p-6 space-y-4" style={card}>
          <SectionHead title="Booking Requests" desc="Manage status, meeting links, and customer access." muted={muted} />
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-wrap gap-2">
                {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
                  <button key={s} onClick={() => setBookingFilter(s)} className="rounded-lg px-3 py-1.5 text-xs capitalize" style={{ background: bookingFilter === s ? 'var(--accent)' : 'var(--hover-bg)', color: bookingFilter === s ? '#fff' : 'var(--text-secondary)' }}>{s}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 lg:ml-auto">
                {[{ id: 'all', label: 'All dates' }, { id: 'today', label: 'Today' }, { id: 'upcoming', label: 'Upcoming' }].map(d => (
                  <button key={d.id} onClick={() => setDateFilter(d.id)} className="rounded-lg px-3 py-1.5 text-xs" style={{ background: dateFilter === d.id ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'var(--hover-bg)', color: dateFilter === d.id ? 'var(--text-primary)' : 'var(--text-secondary)', border: '1px solid', borderColor: dateFilter === d.id ? 'color-mix(in srgb, var(--accent) 35%, var(--border-color))' : 'transparent' }}>{d.label}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, type, date..." className="input sm:max-w-xs !py-2.5 text-sm" style={input} />
              <span className="text-xs" style={muted}>{filteredAppointments.length} booking{filteredAppointments.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="space-y-3">
            {filteredAppointments.length === 0 && <p className="text-sm" style={muted}>No bookings found.</p>}
            {filteredAppointments.map(b => <BookingRow key={b.id} booking={b} onStatus={setBookingStatus} onDelete={removeBooking} onSaveNote={saveAdminNote} onSaveMeeting={saveMeeting} onCopy={copyText} inputStyle={input} muted={muted} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function SectionHead({ title, desc, muted, children }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>{desc && <p className="text-xs mt-0.5" style={muted}>{desc}</p>}</div>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</span>{children}</label>
}

function Badge({ children }) {
  return <span className="text-[11px] rounded-full px-2 py-0.5" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>{children}</span>
}

function StatCard({ label, value, card, muted, accent }) {
  return (
    <div className="rounded-xl border p-4" style={card}>
      <p className="text-xs uppercase tracking-[0.14em]" style={muted}>{label}</p>
      <p className="mt-2 font-display text-2xl font-bold" style={{ color: accent || 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}

function BookingRow({ booking: b, onStatus, onDelete, onSaveNote, onSaveMeeting, onCopy, inputStyle, muted }) {
  const [note, setNote] = useState(b.admin_note || '')
  const [meetingUrl, setMeetingUrl] = useState(b.meeting_url_snapshot || '')
  const [locationLabel, setLocationLabel] = useState(b.location_label_snapshot || 'Online meeting')
  useEffect(() => { setNote(b.admin_note || '') }, [b.admin_note])
  useEffect(() => { setMeetingUrl(b.meeting_url_snapshot || ''); setLocationLabel(b.location_label_snapshot || 'Online meeting') }, [b.meeting_url_snapshot, b.location_label_snapshot])
  const statusColor = { pending: '#f59e0b', confirmed: '#10b981', completed: '#06b6d4', cancelled: '#ef4444' }[b.status] || 'var(--text-secondary)'
  const accessLink = b.access_token ? `${window.location.origin}/book-appointment?booking=${b.id}&token=${b.access_token}` : ''
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border-color)', background: 'var(--glass-bg)' }}>
      <div className="flex flex-col xl:flex-row xl:items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{b.customer_name}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: statusColor, background: 'var(--hover-bg)' }}>{b.status}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: b.payment_status === 'paid' ? '#10b981' : 'var(--text-secondary)', background: 'var(--hover-bg)' }}>{b.payment_status}</span>
          </div>
          <p className="text-xs" style={muted}>{b.customer_email}{b.customer_phone ? ` · ${b.customer_phone}` : ''}</p>
          <p className="text-xs" style={muted}><strong style={{ color: 'var(--text-primary)' }}>{b.type_name_snapshot || 'Appointment'}</strong> · {fmtDateTime(b.preferred_date, b.preferred_time)} · {formatPrice(b.price_paise_snapshot, b.currency)}</p>
          {b.notes && <p className="text-xs whitespace-pre-wrap" style={muted}>Client note: {b.notes}</p>}
          {b.razorpay_payment_id && <p className="text-[11px]" style={muted}>Payment: {b.razorpay_payment_id}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {['pending', 'confirmed', 'completed', 'cancelled'].map(s => (
            <button key={s} onClick={() => onStatus(b, s)} className="rounded-md px-2.5 py-1.5 text-[11px] capitalize" style={{ background: b.status === s ? 'var(--accent)' : 'var(--hover-bg)', color: b.status === s ? '#fff' : 'var(--text-secondary)' }}>{s}</button>
          ))}
          {accessLink && <button onClick={() => onCopy(accessLink, 'Access link copied')} className="rounded-md px-2.5 py-1.5 text-[11px]" style={{ background: 'var(--hover-bg)', color: 'var(--text-primary)' }}>Copy link</button>}
          <button onClick={() => onDelete(b)} className="rounded-md px-2.5 py-1.5 text-[11px] text-red-400" style={{ background: 'rgba(239,68,68,0.08)' }}>Delete</button>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <input value={locationLabel} onChange={e => setLocationLabel(e.target.value)} placeholder="Location / platform label" className="input !py-2 text-xs" style={inputStyle} />
        <input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} placeholder="Meeting URL (Zoom/Meet/Teams/custom)" className="input !py-2 text-xs" style={inputStyle} />
        <button onClick={() => onSaveMeeting(b, meetingUrl, locationLabel)} className="rounded-md px-3 py-2 text-xs" style={{ background: 'var(--hover-bg)', color: 'var(--text-primary)' }}>Save meeting</button>
      </div>
      <div className="flex gap-2">
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Admin note..." className="input flex-1 !py-2 text-xs" style={inputStyle} />
        <button onClick={() => onSaveNote(b, note)} className="rounded-md px-3 py-2 text-xs" style={{ background: 'var(--hover-bg)', color: 'var(--text-primary)' }}>Save note</button>
      </div>
    </div>
  )
}
