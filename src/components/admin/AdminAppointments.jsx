import { useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import {
  getAdminSettings,
  updateAdminSettings,
  getAppointmentTypes,
  createAppointmentType,
  updateAppointmentType,
  deleteAppointmentType,
  getAppointments,
  updateAppointment,
  deleteAppointment,
} from '../../lib/supabase'
import { invalidatePortfolioCache } from '../../lib/usePortfolioData'

const DEFAULT_SETTINGS = {
  enabled: true,
  heading: 'Book an Appointment',
  subheading: 'Schedule a call or consultation',
  description: 'Choose a service, pick your preferred time, and we’ll confirm your appointment.',
  confirmation_message: 'Your appointment request has been received. We will contact you soon to confirm.',
  timezone_note: 'Times are shown in your local timezone unless noted otherwise.',
}

const emptyType = {
  type_id: '',
  name: '',
  description: '',
  duration_minutes: 30,
  price_rupees: 0,
  currency: 'INR',
  meeting_provider: 'custom',
  meeting_url: '',
  location_label: 'Online meeting',
  is_active: true,
  display_order: 0,
}

function toRupees(paise) {
  const n = Number(paise || 0)
  return Number.isFinite(n) ? n / 100 : 0
}
function toPaise(rupees) {
  const n = Number(rupees || 0)
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0
}
function formatPrice(paise, currency = 'INR') {
  const amount = toRupees(paise)
  if (!amount) return 'Free'
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${currency} ${amount}`
  }
}
function fmtDateTime(date, time) {
  if (!date) return '-'
  return `${date}${time ? ` at ${time}` : ''}`
}

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

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [admin, typeRows, bookingRows] = await Promise.all([
        getAdminSettings(),
        getAppointmentTypes().catch(() => []),
        getAppointments().catch(() => []),
      ])
      setSettings({ ...DEFAULT_SETTINGS, ...(admin?.appointment_settings || {}) })
      setTypes(typeRows || [])
      setAppointments(bookingRows || [])
    } catch (err) {
      toast.error(err.message || 'Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    setSavingSettings(true)
    try {
      await updateAdminSettings({ appointment_settings: settings })
      invalidatePortfolioCache('publicSiteSettings')
      toast.success('Appointment settings saved')
    } catch (err) {
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  function editType(t) {
    setEditingTypeId(t.id)
    setTypeForm({
      type_id: t.type_id || '',
      name: t.name || '',
      description: t.description || '',
      duration_minutes: t.duration_minutes || 30,
      price_rupees: toRupees(t.price_paise),
      currency: t.currency || 'INR',
      meeting_provider: t.meeting_provider || 'custom',
      meeting_url: t.meeting_url || '',
      location_label: t.location_label || 'Online meeting',
      is_active: t.is_active !== false,
      display_order: t.display_order ?? 0,
    })
  }

  function resetTypeForm() {
    setEditingTypeId(null)
    setTypeForm(emptyType)
  }

  async function saveType(e) {
    e.preventDefault()
    if (!typeForm.name.trim()) return toast.error('Appointment name is required')
    const typeId = (typeForm.type_id || typeForm.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    if (!typeId) return toast.error('Type ID could not be generated')
    setSavingType(true)
    const payload = {
      type_id: typeId,
      name: typeForm.name.trim(),
      description: typeForm.description.trim(),
      duration_minutes: Math.max(5, Number(typeForm.duration_minutes) || 30),
      price_paise: toPaise(typeForm.price_rupees),
      currency: (typeForm.currency || 'INR').toUpperCase(),
      meeting_provider: typeForm.meeting_provider || 'custom',
      meeting_url: typeForm.meeting_url.trim(),
      location_label: typeForm.location_label.trim() || 'Online meeting',
      is_active: !!typeForm.is_active,
      display_order: Number(typeForm.display_order) || 0,
    }
    try {
      if (editingTypeId) {
        await updateAppointmentType(editingTypeId, payload)
        toast.success('Appointment type updated')
      } else {
        await createAppointmentType(payload)
        toast.success('Appointment type created')
      }
      invalidatePortfolioCache('appointmentTypes')
      resetTypeForm()
      setTypes(await getAppointmentTypes())
    } catch (err) {
      toast.error(err.message || 'Failed to save appointment type')
    } finally {
      setSavingType(false)
    }
  }

  async function removeType(t) {
    const ok = await confirm({ title: 'Delete appointment type?', message: `Delete "${t.name}"? Existing bookings will keep their snapshot.`, confirmText: 'Delete', danger: true })
    if (!ok) return
    try {
      await deleteAppointmentType(t.id)
      invalidatePortfolioCache('appointmentTypes')
      setTypes(await getAppointmentTypes())
      toast.success('Appointment type deleted')
    } catch (err) {
      toast.error(err.message || 'Failed to delete')
    }
  }

  async function setBookingStatus(booking, status) {
    try {
      const updated = await updateAppointment(booking.id, { status })
      setAppointments(prev => prev.map(a => a.id === booking.id ? updated : a))
      toast.success(`Booking marked ${status}`)
    } catch (err) {
      toast.error(err.message || 'Failed to update booking')
    }
  }

  async function saveAdminNote(booking, admin_note) {
    try {
      const updated = await updateAppointment(booking.id, { admin_note })
      setAppointments(prev => prev.map(a => a.id === booking.id ? updated : a))
      toast.success('Note saved')
    } catch (err) {
      toast.error(err.message || 'Failed to save note')
    }
  }

  async function saveMeeting(booking, meeting_url_snapshot, location_label_snapshot) {
    try {
      const updated = await updateAppointment(booking.id, {
        meeting_url_snapshot: meeting_url_snapshot.trim(),
        location_label_snapshot: location_label_snapshot.trim() || booking.location_label_snapshot || 'Online meeting',
      })
      setAppointments(prev => prev.map(a => a.id === booking.id ? updated : a))
      toast.success('Meeting details saved')
    } catch (err) {
      toast.error(err.message || 'Failed to save meeting details')
    }
  }

  async function removeBooking(booking) {
    const ok = await confirm({ title: 'Delete booking?', message: `Delete booking from ${booking.customer_name}?`, confirmText: 'Delete', danger: true })
    if (!ok) return
    try {
      await deleteAppointment(booking.id)
      setAppointments(prev => prev.filter(a => a.id !== booking.id))
      toast.success('Booking deleted')
    } catch (err) {
      toast.error(err.message || 'Failed to delete booking')
    }
  }

  const card = { background: 'var(--card-bg)', borderColor: 'var(--border-color)' }
  const input = { background: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }
  const muted = { color: 'var(--text-secondary)' }

  if (loading) return <p className="text-sm" style={muted}>Loading appointments...</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Appointments</h1>
        <p className="mt-1 text-sm" style={muted}>Configure appointment types, pricing (free or paid), and manage booking requests.</p>
      </div>

      <section className="rounded-xl border p-4 md:p-6 space-y-4" style={card}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Booking Settings</h2>
            <p className="text-xs mt-0.5" style={muted}>Public booking section visibility and copy.</p>
          </div>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
            <input type="checkbox" checked={!!settings.enabled} onChange={e => setSettings(s => ({ ...s, enabled: e.target.checked }))} />
            Enabled
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Heading"><input value={settings.heading} onChange={e => setSettings(s => ({ ...s, heading: e.target.value }))} className="input" style={input} /></Field>
          <Field label="Subheading"><input value={settings.subheading} onChange={e => setSettings(s => ({ ...s, subheading: e.target.value }))} className="input" style={input} /></Field>
        </div>
        <Field label="Description"><textarea value={settings.description} onChange={e => setSettings(s => ({ ...s, description: e.target.value }))} rows={3} className="input resize-y" style={input} /></Field>
        <Field label="Confirmation message"><textarea value={settings.confirmation_message} onChange={e => setSettings(s => ({ ...s, confirmation_message: e.target.value }))} rows={2} className="input resize-y" style={input} /></Field>
        <Field label="Timezone note"><input value={settings.timezone_note} onChange={e => setSettings(s => ({ ...s, timezone_note: e.target.value }))} className="input" style={input} /></Field>
        <button onClick={saveSettings} disabled={savingSettings} className="rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>
          {savingSettings ? 'Saving...' : 'Save Settings'}
        </button>
      </section>

      <section className="rounded-xl border p-4 md:p-6 space-y-4" style={card}>
        <div>
          <h2 className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{editingTypeId ? 'Edit Appointment Type' : 'Add Appointment Type'}</h2>
          <p className="text-xs mt-0.5" style={muted}>Set price to 0 for free appointments. Paid appointments use Razorpay.</p>
        </div>
        <form onSubmit={saveType} className="grid gap-4 md:grid-cols-2">
          <Field label="Name"><input value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} className="input" style={input} placeholder="Discovery Call" /></Field>
          <Field label="Type ID"><input value={typeForm.type_id} onChange={e => setTypeForm(f => ({ ...f, type_id: e.target.value }))} className="input" style={input} placeholder="discovery-call" /></Field>
          <Field label="Duration (minutes)"><input type="number" min="5" step="5" value={typeForm.duration_minutes} onChange={e => setTypeForm(f => ({ ...f, duration_minutes: e.target.value }))} className="input" style={input} /></Field>
          <Field label="Price (INR, 0 = free)"><input type="number" min="0" step="1" value={typeForm.price_rupees} onChange={e => setTypeForm(f => ({ ...f, price_rupees: e.target.value }))} className="input" style={input} /></Field>
          <Field label="Display order"><input type="number" value={typeForm.display_order} onChange={e => setTypeForm(f => ({ ...f, display_order: e.target.value }))} className="input" style={input} /></Field>
          <label className="flex items-center gap-2 text-sm md:mt-7" style={{ color: 'var(--text-primary)' }}>
            <input type="checkbox" checked={!!typeForm.is_active} onChange={e => setTypeForm(f => ({ ...f, is_active: e.target.checked }))} /> Active
          </label>
          <Field label="Meeting provider">
            <select value={typeForm.meeting_provider} onChange={e => setTypeForm(f => ({ ...f, meeting_provider: e.target.value }))} className="input" style={input}>
              <option value="custom">Custom link</option>
              <option value="google_meet">Google Meet</option>
              <option value="zoom">Zoom</option>
              <option value="microsoft_teams">Microsoft Teams</option>
              <option value="phone">Phone call</option>
              <option value="in_person">In person</option>
            </select>
          </Field>
          <Field label="Location / platform label"><input value={typeForm.location_label} onChange={e => setTypeForm(f => ({ ...f, location_label: e.target.value }))} className="input" style={input} placeholder="Online meeting / Zoom / Office" /></Field>
          <div className="md:col-span-2">
            <Field label="Meeting URL / join link">
              <input value={typeForm.meeting_url} onChange={e => setTypeForm(f => ({ ...f, meeting_url: e.target.value }))} className="input" style={input} placeholder="https://meet.google.com/... or https://zoom.us/j/..." />
            </Field>
            <p className="mt-1 text-[11px]" style={muted}>This link is shown to the visitor after booking (and in booking access). You can also update per booking below.</p>
          </div>
          <div className="md:col-span-2">
            <Field label="Description"><textarea value={typeForm.description} onChange={e => setTypeForm(f => ({ ...f, description: e.target.value }))} rows={2} className="input resize-y" style={input} /></Field>
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" disabled={savingType} className="rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>{savingType ? 'Saving...' : editingTypeId ? 'Update Type' : 'Add Type'}</button>
            {editingTypeId && <button type="button" onClick={resetTypeForm} className="rounded-lg px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)', background: 'var(--hover-bg)' }}>Cancel</button>}
          </div>
        </form>

        <div className="space-y-2 pt-2">
          {types.length === 0 && <p className="text-sm" style={muted}>No appointment types yet.</p>}
          {types.map(t => (
            <div key={t.id} className="flex flex-col md:flex-row md:items-center gap-3 rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border-color)' }}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                  <span className="text-[11px] rounded-full px-2 py-0.5" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>{formatPrice(t.price_paise, t.currency)}</span>
                  <span className="text-[11px] rounded-full px-2 py-0.5" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>{t.duration_minutes} min</span>
                  {!t.is_active && <span className="text-[11px] rounded-full px-2 py-0.5 bg-amber-500/10 text-amber-400">Inactive</span>}
                </div>
                {t.description && <p className="text-xs mt-1 truncate" style={muted}>{t.description}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => editType(t)} className="rounded-md px-3 py-1.5 text-xs" style={{ background: 'var(--hover-bg)', color: 'var(--text-primary)' }}>Edit</button>
                <button onClick={() => removeType(t)} className="rounded-md px-3 py-1.5 text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.08)' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border p-4 md:p-6 space-y-4" style={card}>
        <div>
          <h2 className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Booking Requests</h2>
          <p className="text-xs mt-0.5" style={muted}>Recent appointment requests. Update status after confirming with the visitor.</p>
        </div>
        <div className="space-y-3">
          {appointments.length === 0 && <p className="text-sm" style={muted}>No bookings yet.</p>}
          {appointments.map(b => <BookingRow key={b.id} booking={b} onStatus={setBookingStatus} onDelete={removeBooking} onSaveNote={saveAdminNote} onSaveMeeting={saveMeeting} inputStyle={input} muted={muted} />)}
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      {children}
    </label>
  )
}

function BookingRow({ booking: b, onStatus, onDelete, onSaveNote, onSaveMeeting, inputStyle, muted }) {
  const [note, setNote] = useState(b.admin_note || '')
  const [meetingUrl, setMeetingUrl] = useState(b.meeting_url_snapshot || '')
  const [locationLabel, setLocationLabel] = useState(b.location_label_snapshot || 'Online meeting')
  useEffect(() => { setNote(b.admin_note || '') }, [b.admin_note])
  useEffect(() => { setMeetingUrl(b.meeting_url_snapshot || ''); setLocationLabel(b.location_label_snapshot || 'Online meeting') }, [b.meeting_url_snapshot, b.location_label_snapshot])
  const statusColor = { pending: '#f59e0b', confirmed: '#10b981', completed: '#06b6d4', cancelled: '#ef4444' }[b.status] || 'var(--text-secondary)'
  const accessLink = b.access_token ? `${window.location.origin}/book-appointment?booking=${b.id}&token=${b.access_token}` : ''
  return (
    <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--border-color)' }}>
      <div className="flex flex-col lg:flex-row lg:items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{b.customer_name}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: statusColor, background: 'var(--hover-bg)' }}>{b.status}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: b.payment_status === 'paid' ? '#10b981' : 'var(--text-secondary)', background: 'var(--hover-bg)' }}>{b.payment_status}</span>
          </div>
          <p className="text-xs" style={muted}>{b.customer_email}{b.customer_phone ? ` · ${b.customer_phone}` : ''}</p>
          <p className="text-xs" style={muted}><strong style={{ color: 'var(--text-primary)' }}>{b.type_name_snapshot || 'Appointment'}</strong> · {fmtDateTime(b.preferred_date, b.preferred_time)} · {formatPrice(b.price_paise_snapshot, b.currency)}</p>
          {b.notes && <p className="text-xs whitespace-pre-wrap" style={muted}>Note: {b.notes}</p>}
          {b.razorpay_payment_id && <p className="text-[11px]" style={muted}>Payment: {b.razorpay_payment_id}</p>}
          {accessLink && <p className="text-[11px] break-all" style={muted}>Access link: <a href={accessLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{accessLink}</a></p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {['pending', 'confirmed', 'completed', 'cancelled'].map(s => (
            <button key={s} onClick={() => onStatus(b, s)} className="rounded-md px-2.5 py-1.5 text-[11px] capitalize" style={{ background: b.status === s ? 'var(--accent)' : 'var(--hover-bg)', color: b.status === s ? '#fff' : 'var(--text-secondary)' }}>{s}</button>
          ))}
          <button onClick={() => onDelete(b)} className="rounded-md px-2.5 py-1.5 text-[11px] text-red-400" style={{ background: 'rgba(239,68,68,0.08)' }}>Delete</button>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <input value={locationLabel} onChange={e => setLocationLabel(e.target.value)} placeholder="Location / platform" className="input !py-2 text-xs" style={inputStyle} />
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
