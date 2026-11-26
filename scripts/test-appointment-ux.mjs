// Appointment booking UX guards. Pure scheduling logic is tested directly;
// source guards stop a later edit from quietly removing accessibility or
// self-service booking management. Run: npm run test:appointment-ux
import fs from 'node:fs'
import {
  bookingState,
  buildCalendarUrls,
  buildIcs,
  buildMonthGrid,
  formatSlotTime,
  groupSlots,
  nextAvailableDate,
  normalizeWorkingDays,
  validateDetails,
  validateSchedule,
  workingDayLabels,
  workingDaySummary,
  zonedDateTimeToUtc,
} from '../src/lib/appointments.js'

let passed = 0
let failed = 0

function check(name, condition) {
  if (condition) {
    passed += 1
    console.log(`ok    ${name}`)
  } else {
    failed += 1
    console.log(`FAIL  ${name}`)
  }
}

// --- Timezone correctness ---------------------------------------------------
const kolkataMorning = zonedDateTimeToUtc('2026-11-26', '09:00', 'Asia/Kolkata')
check('organiser 09:00 IST becomes 03:30 UTC', kolkataMorning?.toISOString() === '2026-11-26T03:30:00.000Z')

const newYorkSummer = zonedDateTimeToUtc('2026-07-15', '09:00', 'America/New_York')
const newYorkWinter = zonedDateTimeToUtc('2026-01-15', '09:00', 'America/New_York')
check('DST is respected (EDT = 13:00 UTC)', newYorkSummer?.toISOString() === '2026-07-15T13:00:00.000Z')
check('DST is respected (EST = 14:00 UTC)', newYorkWinter?.toISOString() === '2026-01-15T14:00:00.000Z')

check(
  'slot display converts to the invitee zone',
  formatSlotTime('2026-11-26', '09:00', 'Asia/Kolkata', 'America/New_York') !== '09:00',
)

// --- Month grid -------------------------------------------------------------
const weeks = buildMonthGrid(2026, 11, {
  minDate: '2026-11-24',
  maxDate: '2026-11-30',
  workingDays: [1, 2, 3, 4, 5],
  blackoutDates: ['2026-11-26'],
  days: {
    '2026-11-24': { availableCount: 4, status: 'open' },
    '2026-11-25': { availableCount: 0, status: 'full' },
    '2026-11-27': { availableCount: 2, status: 'open' },
  },
})
const cells = weeks.flat()
const findCell = (date) => cells.find((cell) => cell?.date === date)
check('month grid is seven columns and Monday-first', weeks.every((week) => week.length === 7) && weeks[0].filter(Boolean).length === 1)
check('grid marks available days', findCell('2026-11-24')?.available === true)
check('grid disables full, blackout, weekend and out-of-range days', !findCell('2026-11-25')?.available && !findCell('2026-11-26')?.available && !findCell('2026-11-28')?.available && !findCell('2026-11-23')?.available)
check('next available finds the first open date', nextAvailableDate({
  '2026-11-24': { availableCount: 0 },
  '2026-11-27': { availableCount: 2 },
  '2026-11-30': { availableCount: 1 },
}) === '2026-11-27')

// --- Working days -----------------------------------------------------------
check('working days normalize to a Monday-first order', normalizeWorkingDays([0, 5, 1, 6, 9]).join(',') === '1,5,6,0')
check('an empty working-day selection stays empty', normalizeWorkingDays([]).length === 0)
check('working-day labels can be spelled out', workingDayLabels([1, 3, 5], { long: true }).join(', ') === 'Monday, Wednesday, Friday')
check('working-day summaries cover the presets', workingDaySummary([1, 2, 3, 4, 5]) === 'Mon–Fri' && workingDaySummary([0, 1, 2, 3, 4, 5, 6]) === 'Every day' && workingDaySummary([]) === 'No working days selected')

// --- Slot grouping ----------------------------------------------------------
const groups = groupSlots([
  { time: '09:00', available: true },
  { time: '14:30', available: true },
  { time: '18:00', available: false, reason: 'full' },
], '2026-11-26', 'Asia/Kolkata')
check('slots group into morning, afternoon and evening', groups.map((group) => group.id).join(',') === 'morning,afternoon,evening')

// --- Validation -------------------------------------------------------------
const detailErrors = validateDetails(
  { customer_name: 'A', customer_email: 'not-an-email', customer_phone: 'abc', notes: '' },
  { require_phone: true },
)
check('inline validation names each bad field', ['customer_name', 'customer_email', 'customer_phone'].every((key) => detailErrors[key]))
check('valid details pass', Object.keys(validateDetails({ customer_name: 'Ada Lovelace', customer_email: 'ada@example.com', customer_phone: '+91 98765 43210', notes: '' }, { require_phone: true })).length === 0)
check('schedule validation blocks too-soon slots', Boolean(validateSchedule(
  { date: '2020-01-01', time: '09:00', organizerTimeZone: 'Asia/Kolkata' },
  { min_notice_hours: 1 },
).time))

// --- Calendar output --------------------------------------------------------
const booking = {
  id: 42,
  type_name: 'Discovery Call',
  preferred_date: '2026-11-26',
  preferred_time: '09:00',
  duration_minutes: 30,
  meeting: { label: 'Google Meet', url: 'https://meet.google.com/abc-defg-hij' },
}
const ics = buildIcs(booking, 'Asia/Kolkata')
check('ICS uses UTC instants and a real event', ics.includes('DTSTART:20261126T033000Z') && ics.includes('DTEND:20261126T040000Z') && ics.includes('BEGIN:VEVENT'))
check('calendar links are built from the same instant', buildCalendarUrls(booking, 'Asia/Kolkata').google.includes('20261126T033000Z'))
check('booking status copy is honest', bookingState({ status: 'pending', payment_status: 'pending' }).key === 'pending' && bookingState({ status: 'confirmed', payment_status: 'paid' }).key === 'confirmed')

// --- Source guards ----------------------------------------------------------
const api = fs.readFileSync('api/book-appointment.js', 'utf8')
const timeLib = fs.readFileSync('api/_lib/appointment-time.js', 'utf8')
const component = fs.readFileSync('src/components/BookAppointment.jsx', 'utf8')
const css = fs.readFileSync('src/components/book-appointment.css', 'utf8')
const admin = fs.readFileSync('src/components/admin/AdminAppointments.jsx', 'utf8')

check('API has one request per month availability', api.includes("action === 'availability'") && api.includes('handleAvailability'))
check('API returns working days with availability', api.includes('working_days: ctx.days'))
check('API supports token-scoped reschedule and cancel', api.includes("action === 'cancel'") && api.includes("action === 'reschedule'") && api.includes('.eq(\'access_token\', token)'))
check('API never interprets slots in server-local time', !api.includes('new Date(`${date}T${time}:00`)') && timeLib.includes('zonedDateTimeToUtc'))
check('API enforces a management cut-off', api.includes('manage_cutoff_hours'))
check('booking UI exposes visible labels and inline errors', component.includes('<label className="booking-field-label"') && component.includes('aria-invalid={Boolean(errors.') && component.includes('booking-field-error'))
check('booking UI has calendar, timezone and self-service actions', component.includes('action=availability') && component.includes('id="appt-timezone"') && component.includes('commitReschedule') && component.includes('commitCancel'))
check('booking UI shows the selected working days', component.includes('<WorkingDays') && component.includes('data-ui="working-days"'))
check('booking UI offers all three calendar formats', component.includes('buildIcs') && component.includes('calendars.google') && component.includes('calendars.outlook'))
check('form controls meet 48px and tap targets 44px', /\.booking-input[\s\S]*?min-height: 48px/.test(css) && /\.booking-icon-btn[\s\S]*?height: 44px/.test(css))
check('reduced motion is respected', css.includes('@media (prefers-reduced-motion: reduce)'))
check('admin can configure timezone and management policy', admin.includes('Organiser timezone (IANA)') && admin.includes('Allow invitee rescheduling') && admin.includes('Manage cut-off'))
check('admin working-day control has presets and pressed state', admin.includes('WORKING_DAY_PRESETS') && admin.includes('aria-pressed={active}'))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
