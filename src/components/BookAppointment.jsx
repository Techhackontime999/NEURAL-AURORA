import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Globe2,
  Info,
  Link2,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Video,
  X,
} from 'lucide-react'
import { useAppointmentTypes, usePublicSiteSettings } from '../lib/usePortfolioData'
import { openCheckoutModal } from '../lib/razorpay'
import {
  DEFAULT_TIME_ZONE,
  PROVIDER_LABELS,
  STEPS,
  bookingState,
  buildCalendarUrls,
  buildIcs,
  buildMonthGrid,
  formatDate,
  formatDuration,
  formatPrice,
  formatSlotDate,
  formatSlotTime,
  formatTime,
  getBrowserTimeZone,
  getTimezoneOptions,
  groupSlots,
  nextAvailableDate,
  normalizeTimeZone,
  normalizeWorkingDays,
  validateDetails,
  validateSchedule,
  workingDayLabels,
  zonedDateKey,
} from '../lib/appointments'
import './book-appointment.css'

const DEFAULT_SETTINGS = {
  enabled: true,
  heading: 'Book an appointment',
  subheading: 'Premium scheduling',
  description: 'Choose a service, pick a time, and get your meeting details instantly.',
  timezone: DEFAULT_TIME_ZONE,
  confirmation_message: 'Your appointment request has been received.',
  cancellation_message: 'Your appointment has been cancelled.',
  reschedule_message: 'Your appointment has been rescheduled.',
  timezone_note: 'Slot times follow your selected timezone.',
  require_phone: false,
  auto_confirm_free: false,
  min_notice_hours: 0,
  max_days_ahead: 60,
  allow_reschedule: true,
  allow_cancel: true,
  manage_cutoff_hours: 2,
  availability: { days: [1, 2, 3, 4, 5], blackout_dates: [] },
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function monthLabel(year, month) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  }
}

export default function BookAppointment() {
  const [searchParams] = useSearchParams()
  const { data: types = [], loading: typesLoading } = useAppointmentTypes()
  const { data: siteSettings = {}, loading: settingsLoading } = usePublicSiteSettings()

  const settings = useMemo(() => ({
    ...DEFAULT_SETTINGS,
    ...(siteSettings?.appointment_settings || {}),
    availability: {
      ...DEFAULT_SETTINGS.availability,
      ...(siteSettings?.appointment_settings?.availability || {}),
    },
  }), [siteSettings])

  const activeTypes = useMemo(
    () => [...(types || [])].filter((type) => type.is_active).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [types],
  )

  const [step, setStep] = useState(1)
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    preferred_date: '',
    preferred_time: '',
    notes: '',
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState(null)
  const [copiedKey, setCopiedKey] = useState('')

  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [monthData, setMonthData] = useState({})
  const [monthLoading, setMonthLoading] = useState(false)
  const [monthError, setMonthError] = useState('')
  const monthCacheRef = useRef({})
  const inFlightRef = useRef(new Set())

  const [displayZone, setDisplayZone] = useState(getBrowserTimeZone)
  const [organizerZone, setOrganizerZone] = useState(() => normalizeTimeZone(settings.timezone, DEFAULT_TIME_ZONE))
  const [manageMode, setManageMode] = useState('')
  const [manageLoading, setManageLoading] = useState(false)
  const [manageMessage, setManageMessage] = useState('')
  const headingRef = useRef(null)

  const detectedZone = useMemo(() => getBrowserTimeZone(), [])
  const timezoneOptions = useMemo(() => getTimezoneOptions(detectedZone), [detectedZone])
  const loading = typesLoading || settingsLoading
  const selectedType = activeTypes.find((type) => type.type_id === selectedTypeId) || null

  const currentMonthKey = `${viewMonth.year}-${String(viewMonth.month).padStart(2, '0')}`
  const cacheKey = `${selectedTypeId}|${currentMonthKey}`
  const monthInfo = monthData[cacheKey] || null
  const pickerDays = monthInfo?.days || {}

  const minNoticeHours = Math.max(0, Number(settings.min_notice_hours) || 0)
  const maxDaysAhead = Math.max(0, Number(settings.max_days_ahead) || 0)
  const localMinDate = zonedDateKey(new Date(Date.now() + minNoticeHours * 3600000), organizerZone)
  const localMaxDate = maxDaysAhead > 0
    ? zonedDateKey(new Date(Date.now() + maxDaysAhead * 86400000), organizerZone)
    : '9999-12-31'
  const minDate = monthInfo?.meta?.min_date || localMinDate
  const maxDate = monthInfo?.meta?.max_date || localMaxDate
  const configuredWorkingDays = Array.isArray(settings.availability?.days) ? settings.availability.days : [1, 2, 3, 4, 5]
  const workingDays = normalizeWorkingDays(monthInfo?.meta?.working_days ?? configuredWorkingDays)
  const blackoutDates = Array.isArray(settings.availability?.blackout_dates) ? settings.availability.blackout_dates : []

  const accessToken = booking?.access_token || searchParams.get('token') || ''
  const accessLink = booking?.id && accessToken
    ? `${window.location.origin}/book-appointment?booking=${booking.id}&token=${accessToken}`
    : ''

  useEffect(() => {
    if (!selectedTypeId && activeTypes.length > 0) setSelectedTypeId(activeTypes[0].type_id)
  }, [activeTypes, selectedTypeId])

  const fetchMonth = useCallback(async (typeId, year, month, force = false) => {
    if (!typeId) return null
    const key = `${typeId}|${year}-${String(month).padStart(2, '0')}`
    if (!force && monthCacheRef.current[key]) return monthCacheRef.current[key]
    if (inFlightRef.current.has(key)) return null
    inFlightRef.current.add(key)
    setMonthLoading(true)
    setMonthError('')
    try {
      const response = await fetch(
        `/api/book-appointment?action=availability&appointment_type_id=${encodeURIComponent(typeId)}&month=${year}-${String(month).padStart(2, '0')}`,
      )
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not load availability.')
      monthCacheRef.current[key] = data
      setMonthData((current) => ({ ...current, [key]: data }))
      if (data.timezone) setOrganizerZone(normalizeTimeZone(data.timezone, DEFAULT_TIME_ZONE))
      return data
    } catch (err) {
      setMonthError(err.message || 'Could not load availability.')
      return null
    } finally {
      inFlightRef.current.delete(key)
      setMonthLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedTypeId) return
    fetchMonth(selectedTypeId, viewMonth.year, viewMonth.month)
  }, [selectedTypeId, viewMonth.year, viewMonth.month, fetchMonth])

  useEffect(() => {
    const bookingId = searchParams.get('booking')
    const token = searchParams.get('token')
    if (!bookingId || !token) return
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch(
          `/api/book-appointment?action=get&booking_id=${encodeURIComponent(bookingId)}&token=${encodeURIComponent(token)}`,
        )
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Could not load booking.')
        if (cancelled) return
        const loaded = data.booking
        setBooking({ ...loaded, access_token: token })
        setStep(4)
        if (loaded.timezone) setDisplayZone(normalizeTimeZone(loaded.timezone, detectedZone))
        if (loaded.organizer_timezone) setOrganizerZone(normalizeTimeZone(loaded.organizer_timezone, DEFAULT_TIME_ZONE))
        setForm((current) => ({
          ...current,
          preferred_date: loaded.preferred_date || current.preferred_date,
          preferred_time: String(loaded.preferred_time || '').slice(0, 5),
        }))
        if (loaded.preferred_date) {
          const [year, month] = loaded.preferred_date.split('-').map(Number)
          setViewMonth({ year, month })
        }
        const match = activeTypes.find((type) => type.name === loaded.type_name)
        if (match) setSelectedTypeId(match.type_id)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load booking.')
      }
    })()
    return () => { cancelled = true }
  }, [searchParams, activeTypes, detectedZone])

  const focusHeading = useCallback(() => {
    window.requestAnimationFrame(() => headingRef.current?.focus())
  }, [])

  const focusBookingSteps = useCallback(() => {
    const target = document.getElementById('booking-steps')
    if (!target) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }))
  }, [])

  function goTo(nextStep) {
    setError('')
    setManageMode('')
    setManageMessage('')
    setStep(nextStep)
    focusHeading()
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function canContinueTime() {
    return Boolean(selectedType && form.preferred_date && form.preferred_time)
  }

  function selectDate(date) {
    setForm((current) => ({ ...current, preferred_date: date, preferred_time: '' }))
    setErrors((current) => ({ ...current, time: undefined }))
    setMonthError('')
  }

  function changeMonth(delta) {
    setViewMonth((current) => {
      const date = new Date(Date.UTC(current.year, current.month - 1 + delta, 1))
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
    })
  }

  function jumpToNextAvailable() {
    const date = nextAvailableDate(pickerDays)
    if (!date) return
    const [year, month] = date.split('-').map(Number)
    setViewMonth({ year, month })
    selectDate(date)
  }

  async function submitBooking() {
    setError('')
    const detailErrors = validateDetails(form, settings)
    const scheduleErrors = validateSchedule(
      { date: form.preferred_date, time: form.preferred_time, organizerTimeZone: organizerZone },
      settings,
    )
    const allErrors = { ...detailErrors, ...scheduleErrors }
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      setError('Check the highlighted fields before continuing.')
      const firstField = ['customer_name', 'customer_email', 'customer_phone', 'notes', 'time'].find((key) => allErrors[key])
      window.requestAnimationFrame(() => document.getElementById(`appt-${firstField}`)?.focus())
      return
    }
    if (!selectedType) {
      setError('Choose an appointment type first.')
      return
    }

    setErrors({})
    setSubmitting(true)
    let createdBooking = null
    try {
      const response = await fetch('/api/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_type_id: selectedType.type_id,
          ...form,
          timezone: displayZone,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not complete booking.')

      createdBooking = {
        id: data.booking_id,
        access_token: data.access_token,
        type_id: selectedType.type_id,
        type_name: selectedType.name,
        duration_minutes: selectedType.duration_minutes,
        price_paise: selectedType.price_paise,
        currency: selectedType.currency,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        preferred_date: form.preferred_date,
        preferred_time: String(form.preferred_time).slice(0, 5),
        timezone: displayZone,
        organizer_timezone: data.organizer_timezone || organizerZone,
        status: data.status || 'pending',
        payment_status: data.payment_status || (data.paid ? 'pending' : 'not_required'),
        meeting: data.meeting || {
          provider: selectedType.meeting_provider,
          url: selectedType.meeting_url,
          label: selectedType.location_label,
        },
        message: data.message,
        manage: {
          allow_reschedule: settings.allow_reschedule !== false,
          allow_cancel: settings.allow_cancel !== false,
          cutoff_hours: Math.max(0, Number(settings.manage_cutoff_hours) || 0),
        },
      }

      if (data.paid) {
        const payment = await openCheckoutModal({
          order_id: data.order?.id,
          amount: data.order?.amount,
          currency: data.order?.currency || 'INR',
          name: 'NEURAL AURORA',
          description: `${selectedType.name} appointment`,
          prefill: { name: form.customer_name, email: form.customer_email, contact: form.customer_phone },
          notes: { item_type: 'appointment', appointment_id: String(data.booking_id) },
          key: data.key,
        })
        const verifyResponse = await fetch('/api/book-appointment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify',
            booking_id: data.booking_id,
            razorpay_order_id: payment.razorpay_order_id,
            razorpay_payment_id: payment.razorpay_payment_id,
            razorpay_signature: payment.razorpay_signature,
          }),
        })
        const verifyData = await verifyResponse.json().catch(() => ({}))
        if (!verifyResponse.ok) throw new Error(verifyData.error || 'Payment captured but verification failed. Contact support with your payment ID.')
        createdBooking = {
          ...createdBooking,
          status: verifyData.status || 'confirmed',
          payment_status: verifyData.payment_status || 'paid',
        }
      }

      setBooking(createdBooking)
      setManageMessage('')
      setManageMode('')
      goTo(4)
    } catch (err) {
      if (createdBooking?.id) {
        setBooking(createdBooking)
        setManageMessage(err?.message === 'Payment cancelled'
          ? 'Payment was cancelled. Your slot is held while we wait for payment.'
          : '')
        setStep(4)
      }
      setError(err?.message === 'Payment cancelled'
        ? 'Payment was cancelled. Your booking is not confirmed yet.'
        : err?.message || 'Could not complete booking.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopy(key, text) {
    const ok = await copyToClipboard(text)
    setCopiedKey(ok ? key : '')
    window.setTimeout(() => setCopiedKey(''), 1800)
  }

  function downloadIcs() {
    if (!booking) return
    const blob = new Blob([buildIcs(booking, booking.organizer_timezone || organizerZone)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `appointment-${booking.id}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function beginReschedule() {
    setManageMode('reschedule')
    setManageMessage('')
    setError('')
    setForm((current) => ({
      ...current,
      preferred_date: booking.preferred_date || current.preferred_date,
      preferred_time: String(booking.preferred_time || '').slice(0, 5),
    }))
    if (booking.preferred_date) {
      const [year, month] = booking.preferred_date.split('-').map(Number)
      setViewMonth({ year, month })
      fetchMonth(selectedTypeId, year, month)
    }
  }

  async function commitReschedule() {
    if (!booking || !form.preferred_date || !form.preferred_time || !accessToken) return
    setManageLoading(true)
    setManageMessage('')
    setError('')
    try {
      const response = await fetch('/api/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          booking_id: booking.id,
          token: accessToken,
          preferred_date: form.preferred_date,
          preferred_time: form.preferred_time,
          timezone: displayZone,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not reschedule.')
      setBooking((current) => ({
        ...current,
        ...data.booking,
        access_token: accessToken,
        message: data.message || current.message,
      }))
      setManageMode('')
      setManageMessage(data.message || 'Your appointment has been rescheduled.')
    } catch (err) {
      setError(err.message || 'Could not reschedule.')
    } finally {
      setManageLoading(false)
    }
  }

  async function commitCancel() {
    if (!booking || !accessToken) return
    setManageLoading(true)
    setManageMessage('')
    setError('')
    try {
      const response = await fetch('/api/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', booking_id: booking.id, token: accessToken }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not cancel.')
      setBooking((current) => ({ ...current, status: 'cancelled', message: data.message || current.message }))
      setManageMode('')
      setManageMessage(data.message || 'Your appointment has been cancelled.')
    } catch (err) {
      setError(err.message || 'Could not cancel.')
    } finally {
      setManageLoading(false)
    }
  }

  if (!loading && settings.enabled === false) {
    return (
      <main className="booking-page">
        <div className="booking-shell">
          <div className="booking-empty">
            <CalendarDays size={28} />
            <strong>Appointments are unavailable</strong>
            <span>Booking is closed right now. Please check back later.</span>
          </div>
        </div>
      </main>
    )
  }

  const state = booking ? bookingState(booking) : null
  const calendars = booking ? buildCalendarUrls(booking, booking.organizer_timezone || organizerZone) : { google: '', outlook: '' }
  const confirmedTime = booking ? formatSlotTime(booking.preferred_date, booking.preferred_time, booking.organizer_timezone || organizerZone, displayZone) : ''

  return (
    <main className="booking-page">
      <div className="booking-shell">
        <header className="booking-header" style={{ animation: 'booking-in 520ms cubic-bezier(.2,.7,.2,1) both' }}>
          <span className="booking-eyebrow"><Sparkles size={14} /> {settings.subheading || 'Premium scheduling'}</span>
          <h1 className="booking-title font-display">{settings.heading || 'Book an appointment'}</h1>
          <p className="booking-lead">{settings.description || DEFAULT_SETTINGS.description}</p>
          <div className="booking-trust">
            <span><ShieldCheck size={15} /> Private booking link</span>
            <span><CalendarDays size={15} /> Calendar invite included</span>
            <span><Globe2 size={15} /> Times in your timezone</span>
          </div>
          <div className="booking-hero-actions">
            <button type="button" className="booking-btn" data-variant="primary" onClick={focusBookingSteps}>
              Book an appointment <ArrowRight size={16} />
            </button>
            <span>Four short steps · about two minutes</span>
          </div>
        </header>

        {error && step !== 3 && (
          <div className="booking-alert" role="alert">
            <Info size={15} /> <span>{error}</span>
          </div>
        )}

        <div className="booking-grid">
          <aside className="booking-card booking-summary" aria-label="Booking summary">
            <Stepper current={step} />

            <p className="booking-summary-label">Your booking</p>
            <p className="booking-summary-title font-display">{selectedType?.name || 'Choose a service'}</p>
            <p className="booking-summary-copy">{selectedType?.description || 'Pick the appointment that fits what you need.'}</p>

            <dl className="booking-facts" data-ui="booking-summary">
              <SummaryFact icon={Clock} label="Duration" value={selectedType ? formatDuration(selectedType.duration_minutes) : '—'} />
              <SummaryFact icon={CreditCard} label="Price" value={selectedType ? formatPrice(selectedType.price_paise, selectedType.currency) : '—'} />
              <SummaryFact
                icon={MapPin}
                label="Location"
                value={selectedType ? (selectedType.location_label || PROVIDER_LABELS[selectedType.meeting_provider] || 'Online meeting') : '—'}
              />
              <SummaryFact
                icon={CalendarDays}
                label="When"
                value={form.preferred_date
                  ? `${formatSlotDate(form.preferred_date, organizerZone, displayZone)}${form.preferred_time ? ` · ${formatSlotTime(form.preferred_date, form.preferred_time, organizerZone, displayZone)}` : ''}`
                  : 'Choose a date & time'}
              />
              <SummaryFact icon={Globe2} label="Your timezone" value={displayZone} />
            </dl>

            <div className="booking-note">
              <strong><ShieldCheck size={15} /> Secure by design</strong>
              Free bookings confirm instantly when enabled. Paid bookings use Razorpay checkout. Your private access link never exposes other bookings.
            </div>
          </aside>

          <section className="booking-card booking-main" id="booking-steps" aria-label="Booking steps">
            {loading && (
              <div className="booking-empty" role="status">
                <Loader2 size={22} className="animate-spin" />
                <span>Loading available appointments…</span>
              </div>
            )}

            {!loading && step === 1 && (
              <div>
                <div className="booking-steps-head">
                  <div>
                    <h2 className="booking-section-title font-display" ref={headingRef} tabIndex={-1}>Choose an appointment</h2>
                    <p className="booking-section-copy">Every option shows its length, price, and where the meeting happens.</p>
                  </div>
                  <span className="booking-step-count">Step 1 of 4</span>
                </div>

                {activeTypes.length === 0 ? (
                  <div className="booking-empty" data-ui="booking-empty-state">
                    <strong>No appointment types yet</strong>
                    <span>An administrator needs to publish a service before booking opens.</span>
                  </div>
                ) : (
                  <div className="booking-options" role="radiogroup" aria-label="Appointment type" data-ui="appointment-types">
                    {activeTypes.map((type) => {
                      const selected = type.type_id === selectedTypeId
                      const paid = Number(type.price_paise || 0) > 0
                      return (
                        <button
                          key={type.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          className="booking-option"
                          onClick={() => {
                            setSelectedTypeId(type.type_id)
                            setForm((current) => ({ ...current, preferred_date: '', preferred_time: '' }))
                            setMonthError('')
                            setError('')
                          }}
                        >
                          <span>
                            <span className="booking-option-name">
                              {type.name}
                              <span className="booking-chip" data-tone={paid ? 'paid' : 'free'}>{paid ? 'Paid' : 'Free'}</span>
                            </span>
                            {type.description && <span className="booking-option-desc">{type.description}</span>}
                            <span className="booking-option-meta">
                              <span><Clock size={13} /> {formatDuration(type.duration_minutes)}</span>
                              <span><MapPin size={13} /> {type.location_label || PROVIDER_LABELS[type.meeting_provider] || 'Online meeting'}</span>
                            </span>
                          </span>
                          <span className="booking-option-price">{formatPrice(type.price_paise, type.currency)}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="booking-actions">
                  <span className="booking-field-hint">You can review everything before confirming.</span>
                  <button type="button" className="booking-btn" data-variant="primary" disabled={!selectedType} onClick={() => goTo(2)}>
                    Choose date &amp; time <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {!loading && step === 2 && (
              <div>
                <div className="booking-steps-head">
                  <div>
                    <h2 className="booking-section-title font-display" ref={headingRef} tabIndex={-1}>Pick date &amp; time</h2>
                    <p className="booking-section-copy">
                      Dates follow the organiser’s calendar ({organizerZone}); slot times are shown in your timezone.
                    </p>
                  </div>
                  <span className="booking-step-count">Step 2 of 4</span>
                </div>

                <div className="booking-field" style={{ marginBottom: '0.5rem' }}>
                  <label className="booking-field-label" htmlFor="appt-timezone">Show times in</label>
                  <select
                    id="appt-timezone"
                    className="booking-select"
                    value={displayZone}
                    onChange={(event) => setDisplayZone(normalizeTimeZone(event.target.value, detectedZone))}
                  >
                    {timezoneOptions.map((zone) => (
                      <option key={zone} value={zone}>{zone.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <span className="booking-field-hint">
                    Detected: {detectedZone.replace(/_/g, ' ')} · Organiser: {organizerZone.replace(/_/g, ' ')}
                  </span>
                </div>

                <WorkingDays days={workingDays} idPrefix="booking" />

                <div className="booking-toolbar">
                  <div className="booking-month-nav">
                    <button type="button" className="booking-icon-btn" aria-label="Previous month" onClick={() => changeMonth(-1)}>
                      <ChevronLeft size={18} />
                    </button>
                    <span className="booking-month-label">{monthLabel(viewMonth.year, viewMonth.month)}</span>
                    <button type="button" className="booking-icon-btn" aria-label="Next month" onClick={() => changeMonth(1)}>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  <button type="button" className="booking-btn" data-variant="secondary" onClick={jumpToNextAvailable} disabled={!nextAvailableDate(pickerDays)}>
                    Next available
                  </button>
                </div>

                <MonthCalendar
                  weeks={buildMonthGrid(viewMonth.year, viewMonth.month, {
                    minDate,
                    maxDate,
                    today: zonedDateKey(new Date(), organizerZone),
                    blackoutDates,
                    workingDays,
                    days: pickerDays,
                  })}
                  selectedDate={form.preferred_date}
                  onSelect={selectDate}
                />

                <div className="booking-help">
                  <span><i className="booking-day-dot" style={{ display: 'inline-block' }} /> Slots available</span>
                  <span>Faded dates are closed, full, or outside the booking window</span>
                  {settings.timezone_note && <span>{settings.timezone_note}</span>}
                </div>

                <SlotPicker
                  date={form.preferred_date}
                  slots={pickerDays[form.preferred_date]?.slots || []}
                  loading={monthLoading}
                  error={monthError}
                  selectedTime={form.preferred_time}
                  organizerZone={organizerZone}
                  displayZone={displayZone}
                  onSelect={(time) => update('preferred_time', time)}
                  onRetry={() => fetchMonth(selectedTypeId, viewMonth.year, viewMonth.month, true)}
                />
                {errors.time && <p className="booking-field-error" id="appt-time-error"><Info size={13} /> {errors.time}</p>}

                <div className="booking-actions">
                  <button type="button" className="booking-btn" data-variant="quiet" onClick={() => goTo(1)}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button type="button" className="booking-btn" data-variant="primary" disabled={!canContinueTime()} onClick={() => goTo(3)}>
                    Choose your details <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {!loading && step === 3 && (
              <div>
                <div className="booking-steps-head">
                  <div>
                    <h2 className="booking-section-title font-display" ref={headingRef} tabIndex={-1}>Your details</h2>
                    <p className="booking-section-copy">We use these only to confirm this appointment and share meeting access.</p>
                  </div>
                  <span className="booking-step-count">Step 3 of 4</span>
                </div>

                <div className="booking-fields">
                  <div className="booking-field-row">
                    <Field
                      id="appt-customer_name"
                      label="Full name"
                      error={errors.customer_name}
                    >
                      <input
                        id="appt-customer_name"
                        className="booking-input"
                        type="text"
                        autoComplete="name"
                        value={form.customer_name}
                        onChange={(event) => update('customer_name', event.target.value)}
                        placeholder="Your name"
                        aria-invalid={Boolean(errors.customer_name)}
                        aria-describedby={errors.customer_name ? 'appt-customer_name-error' : undefined}
                      />
                    </Field>
                    <Field
                      id="appt-customer_email"
                      label="Email address"
                      error={errors.customer_email}
                    >
                      <input
                        id="appt-customer_email"
                        className="booking-input"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={form.customer_email}
                        onChange={(event) => update('customer_email', event.target.value)}
                        placeholder="you@example.com"
                        aria-invalid={Boolean(errors.customer_email)}
                        aria-describedby={errors.customer_email ? 'appt-customer_email-error' : undefined}
                      />
                    </Field>
                  </div>

                  <Field
                    id="appt-customer_phone"
                    label={settings.require_phone ? 'Phone number' : 'Phone number (optional)'}
                    hint={settings.require_phone ? undefined : 'Useful if the meeting details change at short notice.'}
                    error={errors.customer_phone}
                  >
                    <input
                      id="appt-customer_phone"
                      className="booking-input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={form.customer_phone}
                      onChange={(event) => update('customer_phone', event.target.value)}
                      placeholder="+91 98765 43210"
                      required={Boolean(settings.require_phone)}
                      aria-invalid={Boolean(errors.customer_phone)}
                      aria-describedby={errors.customer_phone ? 'appt-customer_phone-error' : undefined}
                    />
                  </Field>

                  <Field
                    id="appt-notes"
                    label="Anything we should know? (optional)"
                    hint={`${form.notes.length}/2000 characters`}
                    error={errors.notes}
                  >
                    <textarea
                      id="appt-notes"
                      className="booking-textarea"
                      value={form.notes}
                      onChange={(event) => update('notes', event.target.value.slice(0, 2000))}
                      placeholder="A sentence or two about what you'd like to discuss."
                      maxLength={2000}
                      aria-invalid={Boolean(errors.notes)}
                      aria-describedby={errors.notes ? 'appt-notes-error' : undefined}
                    />
                  </Field>
                </div>

                <div className="booking-review">
                  <div className="booking-review-head">
                    <h4>Review your appointment</h4>
                    <button type="button" className="booking-btn" data-variant="quiet" onClick={() => goTo(2)}>Edit time</button>
                  </div>
                  <dl>
                    <div><dt>Service</dt><dd>{selectedType?.name}</dd></div>
                    <div>
                      <dt>When</dt>
                      <dd>
                        {formatDate(form.preferred_date)} · {formatSlotTime(form.preferred_date, form.preferred_time, organizerZone, displayZone)} ({displayZone})
                      </dd>
                    </div>
                    <div><dt>Duration</dt><dd>{formatDuration(selectedType?.duration_minutes)}</dd></div>
                    <div><dt>Price</dt><dd>{formatPrice(selectedType?.price_paise, selectedType?.currency)}</dd></div>
                  </dl>
                </div>

                {error && (
                  <div className="booking-alert" role="alert">
                    <Info size={15} /> <span>{error}</span>
                  </div>
                )}

                <div className="booking-actions">
                  <button type="button" className="booking-btn" data-variant="quiet" onClick={() => goTo(2)}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button type="button" className="booking-btn" data-variant="primary" disabled={submitting} onClick={submitBooking}>
                    {submitting ? <><Loader2 size={16} className="animate-spin" /> Working…</> : Number(selectedType?.price_paise || 0) > 0
                      ? <><CreditCard size={16} /> Pay {formatPrice(selectedType.price_paise, selectedType.currency)} & book</>
                      : <><CheckCircle2 size={16} /> Confirm booking</>}
                  </button>
                </div>
              </div>
            )}

            {!loading && step === 4 && booking && (
              <div>
                <div className="booking-steps-head">
                  <div>
                    <h2 className="booking-section-title font-display" ref={headingRef} tabIndex={-1}>Appointment details</h2>
                    <p className="booking-section-copy">Save this page or add the event to your calendar.</p>
                  </div>
                  <span className="booking-step-count">Step 4 of 4</span>
                </div>

                <div className="booking-banner" data-tone={state.tone}>
                  <span className="booking-banner-icon"><CheckCircle2 size={21} /></span>
                  <div>
                    <h3>{state.title}</h3>
                    <p>{manageMessage || booking.message || state.message}</p>
                  </div>
                </div>

                <dl className="booking-confirm-grid" data-ui="appointment-summary">
                  <ConfirmFact label="Appointment" value={booking.type_name || selectedType?.name} />
                  <ConfirmFact
                    label="When"
                    value={`${formatDate(booking.preferred_date)} · ${confirmedTime}`}
                  />
                  <ConfirmFact label="Your timezone" value={displayZone} />
                  <ConfirmFact
                    label="Organiser timezone"
                    value={`${booking.organizer_timezone || organizerZone} · ${formatTime(String(booking.preferred_time).slice(0, 5))} organiser time`}
                  />
                  <ConfirmFact label="Duration" value={formatDuration(booking.duration_minutes || selectedType?.duration_minutes)} />
                  <ConfirmFact label="Status" value={`${booking.status || 'pending'} · ${booking.payment_status || 'not_required'}`} />
                </dl>

                <div className="booking-reference">
                  <Link2 size={15} /> <span>Reference</span> <code>#{booking.id}</code>
                  <button type="button" className="booking-btn" data-variant="quiet" onClick={() => handleCopy('reference', String(booking.id))}>
                    {copiedKey === 'reference' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>

                <div className="booking-review" style={{ marginTop: '1rem' }}>
                  <div className="booking-review-head"><h4>Meeting access</h4><Video size={17} /></div>
                  <p className="booking-summary-copy" style={{ marginTop: '0.6rem' }}>
                    {booking.meeting?.label || PROVIDER_LABELS[booking.meeting?.provider] || 'Online meeting'}
                  </p>
                  {booking.meeting?.url ? (
                    <a className="booking-btn" data-variant="primary" href={booking.meeting.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: '0.9rem' }}>
                      Join meeting <ExternalLink size={15} />
                    </a>
                  ) : (
                    <p className="booking-field-hint" style={{ marginTop: '0.6rem' }}>
                      The meeting link appears here once it is added. Keep this page — your access link will show it.
                    </p>
                  )}
                </div>

                <div className="booking-actions" style={{ justifyContent: 'flex-start' }}>
                  <a className="booking-btn" data-variant="secondary" href={calendars.google} target="_blank" rel="noopener noreferrer">
                    <CalendarDays size={15} /> Google Calendar
                  </a>
                  <a className="booking-btn" data-variant="secondary" href={calendars.outlook} target="_blank" rel="noopener noreferrer">
                    <CalendarDays size={15} /> Outlook
                  </a>
                  <button type="button" className="booking-btn" data-variant="secondary" onClick={downloadIcs}>
                    <Download size={15} /> Download .ics
                  </button>
                  <button type="button" className="booking-btn" data-variant="secondary" onClick={() => handleCopy('access', accessLink)}>
                    {copiedKey === 'access' ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy access link</>}
                  </button>
                </div>

                <ul className="booking-next-steps">
                  <li><Check size={15} /> <span><b>Save your access link.</b> It opens this page without signing in.</span></li>
                  <li><Check size={15} /> <span><b>Add it to your calendar.</b> The invite uses the correct UTC time even across timezones.</span></li>
                  <li><Check size={15} /> <span><b>Need a change?</b> {booking.manage?.allow_reschedule === false && booking.manage?.allow_cancel === false ? 'Contact the organiser.' : 'Use the options below up to the cut-off time.'}</span></li>
                </ul>

                {(booking.manage?.allow_reschedule !== false || booking.manage?.allow_cancel !== false) && (
                  <div className="booking-manage">
                    <h4>Manage this appointment</h4>
                    <p>
                      Changes are open until {Math.max(0, Number(booking.manage?.cutoff_hours) || 0)} hour(s) before the meeting.
                      Your access link stays the same after a reschedule.
                    </p>
                    <div className="booking-manage-grid">
                      {booking.manage?.allow_reschedule !== false && booking.status !== 'cancelled' && (
                        <button type="button" className="booking-btn" data-variant="secondary" onClick={beginReschedule}>
                          <RefreshCw size={15} /> Reschedule
                        </button>
                      )}
                      {booking.manage?.allow_cancel !== false && booking.status !== 'cancelled' && (
                        <button type="button" className="booking-btn" data-variant="secondary" onClick={() => { setManageMode(manageMode === 'cancel' ? '' : 'cancel'); setManageMessage('') }}>
                          <X size={15} /> Cancel appointment
                        </button>
                      )}
                    </div>

                    {manageMode === 'reschedule' && (
                      <div className="booking-reschedule-panel">
                        <p className="booking-summary-label">Choose a new time</p>
                        <div className="booking-toolbar" style={{ marginTop: '0.75rem' }}>
                          <div className="booking-month-nav">
                            <button type="button" className="booking-icon-btn" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button>
                            <span className="booking-month-label">{monthLabel(viewMonth.year, viewMonth.month)}</span>
                            <button type="button" className="booking-icon-btn" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button>
                          </div>
                        </div>
                        <WorkingDays days={workingDays} idPrefix="reschedule" />
                        <MonthCalendar
                          weeks={buildMonthGrid(viewMonth.year, viewMonth.month, {
                            minDate,
                            maxDate,
                            today: zonedDateKey(new Date(), organizerZone),
                            blackoutDates,
                            workingDays,
                            days: pickerDays,
                          })}
                          selectedDate={form.preferred_date}
                          onSelect={selectDate}
                          idPrefix="reschedule"
                        />
                        <SlotPicker
                          date={form.preferred_date}
                          slots={pickerDays[form.preferred_date]?.slots || []}
                          loading={monthLoading}
                          error={monthError}
                          selectedTime={form.preferred_time}
                          organizerZone={organizerZone}
                          displayZone={displayZone}
                          onSelect={(time) => update('preferred_time', time)}
                          onRetry={() => fetchMonth(selectedTypeId, viewMonth.year, viewMonth.month, true)}
                          idPrefix="reschedule"
                        />
                        <div className="booking-actions">
                          <button type="button" className="booking-btn" data-variant="quiet" onClick={() => setManageMode('')}>Keep current time</button>
                          <button type="button" className="booking-btn" data-variant="primary" disabled={manageLoading || !form.preferred_date || !form.preferred_time} onClick={commitReschedule}>
                            {manageLoading ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><RefreshCw size={15} /> Save new time</>}
                          </button>
                        </div>
                      </div>
                    )}

                    {manageMode === 'cancel' && (
                      <div className="booking-reschedule-panel">
                        <p className="booking-summary-copy">This releases the slot immediately. This action cannot be undone from this page.</p>
                        <div className="booking-actions">
                          <button type="button" className="booking-btn" data-variant="secondary" onClick={() => setManageMode('')}>Keep appointment</button>
                          <button type="button" className="booking-btn" data-variant="primary" disabled={manageLoading} onClick={commitCancel}>
                            {manageLoading ? <><Loader2 size={15} className="animate-spin" /> Cancelling…</> : <><X size={15} /> Yes, cancel it</>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="booking-alert" role="alert">
                    <Info size={15} /> <span>{error}</span>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function WorkingDays({ days, idPrefix }) {
  const shortLabels = workingDayLabels(days)
  const longLabels = workingDayLabels(days, { long: true })
  const labelId = `${idPrefix}-working-days-label`

  if (shortLabels.length === 0) {
    return (
      <p className="booking-working-days" data-ui="working-days">
        No working days are open yet. Please contact the organiser.
      </p>
    )
  }

  return (
    <div className="booking-working-days" data-ui="working-days">
      <span className="booking-working-days-label" id={labelId}>Bookable days</span>
      <ul aria-labelledby={labelId}>
        {shortLabels.map((day, index) => (
          <li key={longLabels[index]} aria-label={longLabels[index]}>{day}</li>
        ))}
      </ul>
    </div>
  )
}

function Stepper({ current }) {
  return (
    <nav className="booking-stepper" aria-label="Booking progress" style={{ marginBottom: '1.75rem' }}>
      {STEPS.map((item) => {
        const state = item.id === current ? 'active' : item.id < current ? 'done' : 'upcoming'
        return (
          <div key={item.id} className="booking-step" data-state={state} aria-current={state === 'active' ? 'step' : undefined}>
            <span className="booking-step-index">{state === 'done' ? <Check size={13} /> : item.id}</span>
            <span>{item.label}</span>
          </div>
        )
      })}
    </nav>
  )
}

function SummaryFact({ icon: Icon, label, value }) {
  return (
    <div className="booking-fact">
      <Icon size={15} />
      <div>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    </div>
  )
}

function ConfirmFact({ label, value }) {
  return (
    <div className="booking-confirm-fact">
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}

function Field({ id, label, hint, error, children }) {
  return (
    <div className="booking-field">
      <label className="booking-field-label" htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="booking-field-hint">{hint}</span>}
      {error && <span className="booking-field-error" id={`${id}-error`}><Info size={13} /> {error}</span>}
    </div>
  )
}

function MonthCalendar({ weeks, selectedDate, onSelect, idPrefix = 'appt' }) {
  return (
    <div className="booking-month" data-ui="availability-calendar">
      <div className="booking-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>
      {weeks.map((week, weekIndex) => (
        <div className="booking-week" key={weekIndex} role="row">
          {week.map((cell, dayIndex) => {
            if (!cell) return <span key={`empty-${weekIndex}-${dayIndex}`} />
            const label = `${formatDate(cell.date)}${cell.available ? `, ${cell.availableCount} slot${cell.availableCount === 1 ? '' : 's'} available` : ', unavailable'}`
            return (
              <button
                key={cell.date}
                id={`${idPrefix}-day-${cell.date}`}
                type="button"
                className="booking-day"
                disabled={!cell.available}
                data-selected={selectedDate === cell.date}
                data-today={cell.isToday}
                aria-label={label}
                aria-pressed={selectedDate === cell.date}
                onClick={() => onSelect(cell.date)}
              >
                {cell.day}
                {cell.available && <span className="booking-day-dot" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function SlotPicker({ date, slots, loading, error, selectedTime, organizerZone, displayZone, onSelect, onRetry, idPrefix = 'appt' }) {
  const groups = useMemo(() => groupSlots(slots, date, organizerZone), [slots, date, organizerZone])

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div className="booking-steps-head" style={{ marginBottom: '0.75rem' }}>
        <div>
          <h4 className="booking-summary-label">Available times</h4>
          <p className="booking-field-hint">{date ? formatDate(date) : 'Select a date to see slots.'}</p>
        </div>
        {selectedTime && <span className="booking-chip" data-tone="free">Selected {formatSlotTime(date, selectedTime, organizerZone, displayZone)}</span>}
      </div>

      {!date && (
        <div className="booking-empty">
          <CalendarDays size={22} />
          <span>Pick a date on the calendar to see available times.</span>
        </div>
      )}

      {date && loading && (
        <div className="booking-slot-grid" aria-busy="true" aria-label="Loading available times">
          {Array.from({ length: 8 }, (_, index) => <div className="booking-skeleton" key={index} />)}
        </div>
      )}

      {date && !loading && error && (
        <div className="booking-alert" role="alert">
          <Info size={15} /> <span>{error}</span>
          <button type="button" className="booking-btn" data-variant="quiet" onClick={onRetry}><RefreshCw size={14} /> Retry</button>
        </div>
      )}

      {date && !loading && !error && groups.length === 0 && (
        <div className="booking-empty">
          <strong>No slots on this date</strong>
          <span>Try the next available date above, or choose another day.</span>
        </div>
      )}

      {date && !loading && !error && groups.length > 0 && (
        <div className="booking-slot-groups" role="radiogroup" aria-label="Available times" data-ui="available-slots">
          {groups.map((group) => (
            <div key={group.id}>
              <h5 className="booking-slot-group-title">{group.label} <small>{group.hint}</small></h5>
              <div className="booking-slot-grid">
                {group.slots.map((slot) => {
                  const selected = selectedTime === slot.time
                  const status = slot.reason === 'full' ? 'Full'
                    : slot.reason === 'blocked' ? 'Blocked'
                      : slot.available ? (slot.remaining <= 1 && slot.capacity > 1 ? '1 spot left' : 'Open')
                        : 'Unavailable'
                  return (
                    <button
                      key={slot.time}
                      id={`${idPrefix}-time-${slot.time}`}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!slot.available}
                      className="booking-slot"
                      onClick={() => onSelect(slot.time)}
                    >
                      <span className="booking-slot-time">{formatSlotTime(date, slot.time, organizerZone, displayZone)}</span>
                      <span className="booking-slot-meta">{status} · {formatTime(slot.time)} organiser</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
