import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, CheckCircle2, CreditCard, ArrowRight, ArrowLeft, Video, Link2, Copy, ShieldCheck, MapPin, Sparkles, ExternalLink } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAppointmentTypes, usePublicSiteSettings } from '../lib/usePortfolioData'
import { openCheckoutModal } from '../lib/razorpay'

const PROVIDER_LABELS = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  microsoft_teams: 'Microsoft Teams',
  phone: 'Phone call',
  in_person: 'In person',
  custom: 'Online meeting',
}

function formatPrice(paise, currency = 'INR') {
  const amount = Number(paise || 0) / 100
  if (!amount) return 'Free'
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount) }
  catch { return `${currency} ${amount}` }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = String(timeStr).split(':').map(Number)
  if (!Number.isFinite(h)) return timeStr
  const d = new Date()
  d.setHours(h, Number.isFinite(m) ? m : 0, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function buildCalendarUrl(booking) {
  const title = encodeURIComponent(`${booking.type_name || 'Appointment'} - NEURAL AURORA`)
  const details = encodeURIComponent(`Booking #${booking.id}\n${booking.meeting?.label || ''}\n${booking.meeting?.url || ''}`)
  const location = encodeURIComponent(booking.meeting?.url || booking.meeting?.label || 'Online')
  const start = new Date(`${booking.preferred_date}T${booking.preferred_time || '00:00'}:00`)
  const end = new Date(start.getTime() + (Number(booking.duration_minutes || 30) * 60000))
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`
}

const inputCls = "w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 hover:border-[color:color-mix(in_srgb,var(--accent)_30%,var(--border-color))]"
const inputStyle = { background: 'color-mix(in srgb, var(--input-bg) 92%, transparent)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }

export default function BookAppointment() {
  const [searchParams] = useSearchParams()
  const { data: types = [], loading: typesLoading } = useAppointmentTypes()
  const { data: siteSettings = {}, loading: settingsLoading } = usePublicSiteSettings()
  const settings = { enabled: true, ...(siteSettings?.appointment_settings || {}) }
  const activeTypes = useMemo(() => (types || []).filter(t => t.is_active), [types])

  const [step, setStep] = useState(1)
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [form, setForm] = useState({ customer_name: '', customer_email: '', customer_phone: '', preferred_date: '', preferred_time: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [booking, setBooking] = useState(null)
  const [copied, setCopied] = useState(false)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState('')

  useEffect(() => { if (!selectedTypeId && activeTypes.length > 0) setSelectedTypeId(activeTypes[0].type_id) }, [activeTypes, selectedTypeId])

  useEffect(() => {
    setForm(f => ({ ...f, preferred_time: '' }))
    setSlots([])
    setSlotsError('')
    if (!selectedTypeId || !form.preferred_date) return
    let cancelled = false
    setSlotsLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/book-appointment?action=slots&appointment_type_id=${encodeURIComponent(selectedTypeId)}&date=${encodeURIComponent(form.preferred_date)}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Could not load slots')
        if (!cancelled) setSlots(Array.isArray(data.slots) ? data.slots : [])
      } catch (err) {
        if (!cancelled) { setSlots([]); setSlotsError(err.message || 'Could not load slots') }
      } finally {
        if (!cancelled) setSlotsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedTypeId, form.preferred_date])

  useEffect(() => {
    const bookingId = searchParams.get('booking')
    const token = searchParams.get('token')
    if (!bookingId || !token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/book-appointment?action=get&booking_id=${encodeURIComponent(bookingId)}&token=${encodeURIComponent(token)}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Could not load booking')
        if (!cancelled) { setBooking(data.booking); setStep(4) }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load booking')
      }
    })()
    return () => { cancelled = true }
  }, [searchParams])

  const selectedType = activeTypes.find(t => t.type_id === selectedTypeId) || null
  const loading = typesLoading || settingsLoading
  const meeting = booking?.meeting || (selectedType ? { provider: selectedType.meeting_provider, url: selectedType.meeting_url, label: selectedType.location_label } : null)
  const accessLink = booking?.id && booking?.access_token ? `${window.location.origin}/book-appointment?booking=${booking.id}&token=${booking.access_token}` : (booking?.id && searchParams.get('token') ? `${window.location.origin}/book-appointment?booking=${booking.id}&token=${searchParams.get('token')}` : '')

  const minNoticeHours = Math.max(0, Number(settings.min_notice_hours) || 0)
  const maxDaysAhead = Math.max(0, Number(settings.max_days_ahead) || 0)
  const minDateStr = (() => { const d = new Date(); if (minNoticeHours > 0) d.setHours(d.getHours() + minNoticeHours); return d.toISOString().slice(0, 10) })()
  const maxDateStr = maxDaysAhead > 0 ? (() => { const d = new Date(); d.setDate(d.getDate() + maxDaysAhead); return d.toISOString().slice(0, 10) })() : ''

  function update(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function canContinueTime() {
    if (!selectedType || !form.preferred_date || !form.preferred_time) return false
    if (minDateStr && form.preferred_date < minDateStr) return false
    if (maxDateStr && form.preferred_date > maxDateStr) return false
    return true
  }
  function canContinueDetails() {
    if (!form.customer_name.trim() || !form.customer_email.trim()) return false
    if (settings.require_phone && !form.customer_phone.trim()) return false
    return true
  }

  async function submitBooking() {
    setError('')
    if (!selectedType) return setError('Please select an appointment type.')
    if (!canContinueTime()) return setError('Please choose a date and time.')
    if (!canContinueDetails()) return setError(settings.require_phone ? 'Name, email, and phone are required.' : 'Name and email are required.')
    setSubmitting(true)
    try {
      const res = await fetch('/api/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_type_id: selectedType.type_id, ...form, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to book appointment.')

      let finalBooking = {
        id: data.booking_id,
        access_token: data.access_token,
        type_name: selectedType.name,
        duration_minutes: selectedType.duration_minutes,
        price_paise: selectedType.price_paise,
        currency: selectedType.currency,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        preferred_date: form.preferred_date,
        preferred_time: form.preferred_time,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        status: data.status || 'pending',
        payment_status: data.payment_status || (data.paid ? 'pending' : 'not_required'),
        meeting: data.meeting || { provider: selectedType.meeting_provider, url: selectedType.meeting_url, label: selectedType.location_label },
        message: data.message,
      }

      if (data.paid) {
        const paymentResponse = await openCheckoutModal({
          order_id: data.order?.id,
          amount: data.order?.amount,
          currency: data.order?.currency || 'INR',
          name: 'NEURAL AURORA',
          description: `${selectedType.name} appointment`,
          prefill: { name: form.customer_name, email: form.customer_email, contact: form.customer_phone },
          notes: { item_type: 'appointment', appointment_id: String(data.booking_id) },
          key: data.key,
        })
        const verifyRes = await fetch('/api/book-appointment', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', booking_id: data.booking_id, razorpay_order_id: paymentResponse.razorpay_order_id, razorpay_payment_id: paymentResponse.razorpay_payment_id, razorpay_signature: paymentResponse.razorpay_signature }),
        })
        const verifyData = await verifyRes.json().catch(() => ({}))
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment captured but verification failed. Contact support with your payment ID.')
        finalBooking = { ...finalBooking, status: verifyData.status || 'confirmed', payment_status: verifyData.payment_status || 'paid', payment_id: paymentResponse.razorpay_payment_id }
      }

      setBooking(finalBooking)
      setStep(4)
    } catch (err) {
      if (err?.message === 'Payment cancelled') setError('Payment was cancelled. Your booking is not confirmed yet.')
      else setError(err?.message || 'Could not complete booking.')
    } finally { setSubmitting(false) }
  }

  async function copyAccessLink() {
    const link = accessLink || `${window.location.origin}/book-appointment?booking=${booking?.id}&token=${booking?.access_token || searchParams.get('token') || ''}`
    if (!link || !booking?.id) return
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }

  if (!loading && settings.enabled === false) {
    return <section className="min-h-screen pt-28 pb-20" style={{ background: 'var(--bg-primary)' }}><div className="mx-auto max-w-3xl px-6 text-center"><h1 className="font-display text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>Appointments Unavailable</h1><p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Booking is currently disabled. Please check back later.</p></div></section>
  }

  return (
    <section className="min-h-screen pt-28 pb-20" style={{ background: 'var(--bg-primary)' }}>
      <div className="mx-auto max-w-7xl px-6">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em]" style={{ borderColor: 'var(--border-color)', color: 'var(--accent)', background: 'var(--glass-bg)' }}>
            <Sparkles size={14} /> {settings.subheading || 'Premium scheduling'}
          </div>
          <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{settings.heading || 'Book an Appointment'}</h1>
          <p className="mt-4 text-base leading-relaxed max-w-2xl" style={{ color: 'var(--text-secondary)' }}>{settings.description || 'Choose a service, pick a time, and get your meeting details instantly.'}</p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-3xl border p-6 lg:p-7 h-fit lg:sticky lg:top-24" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
            <p className="text-[11px] uppercase tracking-[0.22em] font-medium" style={{ color: 'var(--text-tertiary)' }}>Booking details</p>
            <h2 className="mt-3 font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedType?.name || 'Select appointment'}</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selectedType?.description || 'Pick an appointment type to see duration, price, and meeting details.'}</p>

            <div className="mt-6 space-y-3">
              <InfoRow icon={Clock} label="Duration" value={selectedType ? `${selectedType.duration_minutes} minutes` : '—'} />
              <InfoRow icon={CreditCard} label="Price" value={selectedType ? formatPrice(selectedType.price_paise, selectedType.currency) : '—'} />
              <InfoRow icon={Video} label="Location" value={selectedType ? (selectedType.location_label || PROVIDER_LABELS[selectedType.meeting_provider] || 'Online meeting') : '—'} />
              <InfoRow icon={Calendar} label="When" value={form.preferred_date ? `${formatDate(form.preferred_date)}${form.preferred_time ? ` at ${formatTime(form.preferred_time)}` : ''}` : 'Choose a date & time'} />
            </div>

            <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: 'var(--border-color)', background: 'var(--glass-bg)' }}>
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}><ShieldCheck size={14} className="text-emerald-400" /> Secure booking</div>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Free bookings are confirmed instantly. Paid bookings use secure Razorpay checkout. You’ll get a private booking access link after scheduling.</p>
            </div>
          </aside>

          <div className="rounded-3xl border p-6 sm:p-8" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
            <div className="flex flex-wrap items-center gap-2 mb-8">
              {['Service', 'Date & time', 'Details', 'Confirmation'].map((label, i) => {
                const n = i + 1
                const active = step === n
                const done = step > n
                return (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`h-8 px-3 rounded-full text-xs font-medium inline-flex items-center gap-2 border ${active ? 'text-white' : ''}`} style={{ borderColor: active || done ? 'color-mix(in srgb, var(--accent) 40%, var(--border-color))' : 'var(--border-color)', background: active ? 'var(--accent)' : done ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent', color: active ? '#fff' : done ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                      <span className="w-4 text-center">{done ? '✓' : n}</span>{label}
                    </div>
                    {i < 3 && <div className="w-6 h-px hidden sm:block" style={{ background: 'var(--border-color)' }} />}
                  </div>
                )
              })}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  <h3 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Choose an appointment</h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Select the service that fits your needs.</p>
                  {loading && <div className="rounded-2xl border p-5 text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Loading appointment types...</div>}
                  {!loading && activeTypes.length === 0 && <div className="rounded-2xl border p-5 text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>No appointment types available right now.</div>}
                  <div className="grid gap-3">
                    {activeTypes.map(type => {
                      const selected = type.type_id === selectedTypeId
                      const paid = Number(type.price_paise || 0) > 0
                      return (
                        <button key={type.id} type="button" onClick={() => setSelectedTypeId(type.type_id)} className="text-left rounded-2xl border p-5 transition-all" style={{ borderColor: selected ? 'color-mix(in srgb, var(--accent) 45%, var(--border-color))' : 'var(--border-color)', background: selected ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent' }}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{type.name}</span>
                                <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: paid ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', color: paid ? '#f59e0b' : '#10b981' }}>{paid ? 'Paid' : 'Free'}</span>
                              </div>
                              {type.description && <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{type.description}</p>}
                              <div className="mt-3 flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                <span className="inline-flex items-center gap-1"><Clock size={13} /> {type.duration_minutes} min</span>
                                <span className="inline-flex items-center gap-1"><MapPin size={13} /> {type.location_label || PROVIDER_LABELS[type.meeting_provider] || 'Online meeting'}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatPrice(type.price_paise, type.currency)}</div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="button" disabled={!selectedType} onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>Continue <ArrowRight size={16} /></button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                  <div>
                    <h3 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Pick date & time</h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Choose your preferred slot. We’ll confirm the meeting details after booking.</p>
                  </div>
                  <Field label="Preferred date">
                    <input type="date" min={minDateStr} max={maxDateStr || undefined} value={form.preferred_date} onChange={e => update('preferred_date', e.target.value)} className={inputCls} style={inputStyle} />
                  </Field>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Available slots</span>
                      {form.preferred_time && <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Selected: {formatTime(form.preferred_time)}</span>}
                    </div>
                    {!form.preferred_date && <div className="rounded-xl border border-dashed px-4 py-8 text-sm text-center" style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}>Pick a date to see available slots.</div>}
                    {form.preferred_date && slotsLoading && <div className="rounded-xl border px-4 py-8 text-sm text-center" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Loading available slots...</div>}
                    {form.preferred_date && !slotsLoading && slotsError && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{slotsError}</div>}
                    {form.preferred_date && !slotsLoading && !slotsError && slots.length === 0 && <div className="rounded-xl border px-4 py-8 text-sm text-center" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>No slots available for this date. Try another day.</div>}
                    {form.preferred_date && !slotsLoading && !slotsError && slots.length > 0 && (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {slots.map(s => {
                            const selected = form.preferred_time === s.time
                            const full = s.reason === 'full'
                            const blocked = s.reason === 'blocked'
                            const statusLabel = blocked ? 'Blocked' : full ? 'Full' : s.available ? (s.remaining <= 1 && (s.capacity || 1) > 1 ? `${s.remaining} left` : 'Open') : 'Unavailable'
                            return (
                              <button key={s.time} type="button" disabled={!s.available} onClick={() => update('preferred_time', s.time)} className="rounded-xl border px-3 py-2.5 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ borderColor: selected ? 'color-mix(in srgb, var(--accent) 55%, var(--border-color))' : blocked ? 'rgba(239,68,68,0.25)' : full ? 'rgba(245,158,11,0.25)' : 'var(--border-color)', background: selected ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'var(--glass-bg)' }}>
                                <div className="text-sm font-medium" style={{ color: selected ? 'var(--text-primary)' : 'var(--text-primary)' }}>{formatTime(s.time)}</div>
                                <div className="text-[10px] mt-0.5" style={{ color: blocked ? '#ef4444' : full ? '#f59e0b' : s.available ? '#10b981' : 'var(--text-tertiary)' }}>{statusLabel}</div>
                              </button>
                            )
                          })}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                          <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5 align-middle" />Open</span>
                          <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5 align-middle" />Full</span>
                          <span><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1.5 align-middle" />Blocked</span>
                        </div>
                      </>
                    )}
                  </div>
                  {settings.timezone_note && <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}><Calendar size={13} /> {settings.timezone_note}</p>}
                  <div className="flex justify-between pt-2">
                    <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)', background: 'var(--hover-bg)' }}><ArrowLeft size={16} /> Back</button>
                    <button type="button" disabled={!canContinueTime()} onClick={() => setStep(3)} className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>Continue <ArrowRight size={16} /></button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                  <div>
                    <h3 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Your details</h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>We’ll use this to confirm your booking and share meeting access.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name"><input value={form.customer_name} onChange={e => update('customer_name', e.target.value)} className={inputCls} style={inputStyle} placeholder="Your name" /></Field>
                    <Field label="Email"><input type="email" value={form.customer_email} onChange={e => update('customer_email', e.target.value)} className={inputCls} style={inputStyle} placeholder="you@example.com" /></Field>
                  </div>
                  <Field label={settings.require_phone ? 'Phone number' : 'Phone (optional)'}><input value={form.customer_phone} onChange={e => update('customer_phone', e.target.value)} className={inputCls} style={inputStyle} placeholder="+91..." required={!!settings.require_phone} /></Field>
                  <Field label="Notes (optional)"><textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={4} className={`${inputCls} resize-y`} style={inputStyle} placeholder="What would you like to discuss?" /></Field>
                  {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
                  <div className="flex justify-between pt-2">
                    <button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)', background: 'var(--hover-bg)' }}><ArrowLeft size={16} /> Back</button>
                    <button type="button" disabled={submitting || !canContinueDetails()} onClick={submitBooking} className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>
                      {submitting ? 'Processing...' : selectedType && Number(selectedType.price_paise || 0) > 0 ? <><CreditCard size={16} /> Pay & book</> : <><CheckCircle2 size={16} /> Confirm booking</>}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 4 && booking && (
                <motion.div key="step4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"><CheckCircle2 size={20} /></div>
                      <div>
                        <h3 className="font-display text-2xl font-semibold text-emerald-300">Booking {booking.status === 'confirmed' || booking.payment_status === 'paid' ? 'confirmed' : 'received'}</h3>
                        <p className="mt-1 text-sm text-emerald-100/80">{booking.message || settings.confirmation_message || 'Your appointment request has been received.'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <SummaryCard label="Appointment" value={booking.type_name} />
                    <SummaryCard label="When" value={`${formatDate(booking.preferred_date)} at ${formatTime(booking.preferred_time)}`} />
                    <SummaryCard label="Duration" value={`${booking.duration_minutes} minutes`} />
                    <SummaryCard label="Status" value={`${booking.status} / ${booking.payment_status}`} />
                  </div>

                  <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--border-color)', background: 'var(--glass-bg)' }}>
                    <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}><Video size={16} className="text-cyan-400" /> Meeting access</div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {booking.meeting?.label || PROVIDER_LABELS[booking.meeting?.provider] || 'Online meeting'}
                    </p>
                    {booking.meeting?.url ? (
                      <a href={booking.meeting.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white" style={{ background: 'var(--accent)' }}>
                        Join meeting <ExternalLink size={15} />
                      </a>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Meeting link will appear here once the admin confirms/adds it. Keep this access page.</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={copyAccessLink} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm" style={{ background: 'var(--hover-bg)', color: 'var(--text-primary)' }}>
                        <Copy size={15} /> {copied ? 'Copied' : 'Copy access link'}
                      </button>
                      <a href={buildCalendarUrl(booking)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm" style={{ background: 'var(--hover-bg)', color: 'var(--text-primary)' }}>
                        <Calendar size={15} /> Add to Google Calendar
                      </a>
                    </div>
                    {accessLink && <p className="text-[11px] break-all" style={{ color: 'var(--text-tertiary)' }}><Link2 size={12} className="inline mr-1" />{accessLink}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && step !== 3 && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
          </div>
        </div>
      </div>
    </section>
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

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}><Icon size={15} /></div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-color)', background: 'var(--glass-bg)' }}>
      <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}
