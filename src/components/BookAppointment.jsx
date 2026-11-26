import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, CheckCircle2, CreditCard, Sparkles, ArrowRight } from 'lucide-react'
import { useAppointmentTypes, usePublicSiteSettings } from '../lib/usePortfolioData'
import { openCheckoutModal } from '../lib/razorpay'

function formatPrice(paise, currency = 'INR') {
  const amount = Number(paise || 0) / 100
  if (!amount) return 'Free'
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount) }
  catch { return `${currency} ${amount}` }
}

const inputStyle = {
  background: 'var(--input-bg)',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
}

export default function BookAppointment() {
  const { data: types = [], loading: typesLoading } = useAppointmentTypes()
  const { data: siteSettings = {}, loading: settingsLoading } = usePublicSiteSettings()
  const settings = { enabled: true, ...(siteSettings?.appointment_settings || {}) }
  const activeTypes = useMemo(() => (types || []).filter(t => t.is_active), [types])

  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    preferred_date: '',
    preferred_time: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedTypeId && activeTypes.length > 0) setSelectedTypeId(activeTypes[0].type_id)
  }, [activeTypes, selectedTypeId])

  const selectedType = activeTypes.find(t => t.type_id === selectedTypeId) || null
  const loading = typesLoading || settingsLoading

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!selectedType) return setError('Please select an appointment type.')
    if (!form.customer_name.trim()) return setError('Your name is required.')
    if (!form.customer_email.trim()) return setError('Your email is required.')
    if (!form.preferred_date) return setError('Please choose a preferred date.')
    if (!form.preferred_time) return setError('Please choose a preferred time.')

    setSubmitting(true)
    try {
      const res = await fetch('/api/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_type_id: selectedType.type_id,
          ...form,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to book appointment.')

      if (!data.paid) {
        setResult({ type: 'free', message: data.message || settings.confirmation_message })
        setForm({ customer_name: '', customer_email: '', customer_phone: '', preferred_date: '', preferred_time: '', notes: '' })
        return
      }

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

      const verifyRes = await fetch('/api/verify-appointment-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: data.booking_id,
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
        }),
      })
      const verifyData = await verifyRes.json().catch(() => ({}))
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment was captured, but verification failed. Please contact support with your payment ID.')

      setResult({ type: 'paid', message: data.message || settings.confirmation_message, paymentId: paymentResponse.razorpay_payment_id })
      setForm({ customer_name: '', customer_email: '', customer_phone: '', preferred_date: '', preferred_time: '', notes: '' })
    } catch (err) {
      if (err?.message === 'Payment cancelled') setError('Payment was cancelled. Your booking is not confirmed yet.')
      else setError(err?.message || 'Could not complete booking.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!loading && settings.enabled === false) {
    return (
      <section className="min-h-screen pt-28 pb-20" style={{ background: 'var(--bg-primary)' }}>
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="font-display text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>Appointments Unavailable</h1>
          <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Booking is currently disabled. Please check back later or contact us directly.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-screen pt-28 pb-20" style={{ background: 'var(--bg-primary)' }}>
      <div className="mx-auto max-w-6xl px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em]" style={{ borderColor: 'var(--border-color)', color: 'var(--accent)', background: 'var(--glass-bg)' }}>
            <Sparkles size={14} /> {settings.subheading || 'Book an appointment'}
          </div>
          <h1 className="mt-5 font-display text-4xl sm:text-5xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {settings.heading || 'Book an Appointment'}
          </h1>
          <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {settings.description || 'Choose a service, pick your preferred time, and we’ll confirm your appointment.'}
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>Select appointment</h2>
            {loading && <div className="rounded-2xl border p-5 text-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-secondary)' }}>Loading appointment types...</div>}
            {!loading && activeTypes.length === 0 && (
              <div className="rounded-2xl border p-5 text-sm" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
                No appointment types are available right now. Please contact us directly.
              </div>
            )}
            {activeTypes.map(type => {
              const selected = type.type_id === selectedTypeId
              const paid = Number(type.price_paise || 0) > 0
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedTypeId(type.type_id)}
                  className="w-full text-left rounded-2xl border p-5 transition-all"
                  style={{
                    borderColor: selected ? 'color-mix(in srgb, var(--accent) 45%, var(--border-color))' : 'var(--border-color)',
                    background: selected ? 'color-mix(in srgb, var(--accent) 8%, var(--card-bg))' : 'var(--card-bg)',
                    boxShadow: selected ? '0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent)' : 'none',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{type.name}</h3>
                        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: paid ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', color: paid ? '#f59e0b' : '#10b981' }}>
                          {paid ? 'Paid' : 'Free'}
                        </span>
                      </div>
                      {type.description && <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{type.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatPrice(type.price_paise, type.currency)}</div>
                      <div className="mt-1 flex items-center justify-end gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}><Clock size={13} /> {type.duration_minutes} min</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }} className="rounded-3xl border p-6 sm:p-7" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
            <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Your details</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {selectedType ? `${selectedType.name} · ${selectedType.duration_minutes} min · ${formatPrice(selectedType.price_paise, selectedType.currency)}` : 'Select an appointment type to continue.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name"><input value={form.customer_name} onChange={e => update('customer_name', e.target.value)} className="input" style={inputStyle} placeholder="Your name" required /></Field>
                <Field label="Email"><input type="email" value={form.customer_email} onChange={e => update('customer_email', e.target.value)} className="input" style={inputStyle} placeholder="you@example.com" required /></Field>
              </div>
              <Field label="Phone (optional)"><input value={form.customer_phone} onChange={e => update('customer_phone', e.target.value)} className="input" style={inputStyle} placeholder="+91..." /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Preferred date"><input type="date" value={form.preferred_date} onChange={e => update('preferred_date', e.target.value)} className="input" style={inputStyle} required /></Field>
                <Field label="Preferred time"><input type="time" value={form.preferred_time} onChange={e => update('preferred_time', e.target.value)} className="input" style={inputStyle} required /></Field>
              </div>
              <Field label="Notes (optional)"><textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={4} className="input resize-y" style={inputStyle} placeholder="What would you like to discuss?" /></Field>

              {settings.timezone_note && <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}><Calendar size={13} /> {settings.timezone_note}</p>}

              {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
              {result && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-300">
                  <div className="flex items-start gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /><div><p className="font-medium">Booking {result.type === 'paid' ? 'confirmed' : 'received'}</p><p className="mt-1 text-emerald-200/80">{result.message}</p>{result.paymentId && <p className="mt-1 text-xs text-emerald-200/60">Payment ID: {result.paymentId}</p>}</div></div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || loading || !selectedType}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                {submitting ? 'Processing...' : selectedType && Number(selectedType.price_paise || 0) > 0 ? (<><CreditCard size={16} /> Pay & Book Appointment</>) : (<><ArrowRight size={16} /> Request Appointment</>)}
              </button>
            </form>
          </motion.div>
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
