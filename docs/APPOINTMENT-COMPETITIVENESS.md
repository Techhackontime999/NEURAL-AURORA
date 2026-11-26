# Appointment booking — competitive review and upgrade

**Status after this batch:** a credible **single-host** scheduling product, not yet a Calendly competitor. The invitee experience now covers the fundamentals that Calendly, TidyCal and Zoho Bookings get right; the remaining gap is multi-host/calendar-sync infrastructure, not interface polish.

## 1. What Calendly actually wins on

| Capability | Calendly / peers | This product before | This product now |
|---|---|---|---|
| Instant booking from a shareable page | Yes | Yes, one admin | Yes, one admin |
| Timezone correctness | Automatic invitee conversion | Browser locale only; slots interpreted in server time | Organiser timezone stored in admin settings, slots converted with `Intl`, DST-safe |
| Month availability at a glance | Yes | No — date input, then one-day slot fetch | One request returns the whole month; calendar shows open/full/closed days and “Next available” |
| Slot quality signals | Yes | Open/Full/Blocked, no capacity detail | Capacity, “1 spot left”, grouped morning/afternoon/evening, skeleton and retry states |
| Form quality | Labels, validation, autofill | Placeholder-led, no field errors, no autocomplete | Visible labels, `autocomplete`, `inputmode`, inline errors with focus, character counter, review step |
| Confirmation | Calendar files, join link, manage link | Basic summary, one calendar URL | Google + Outlook + `.ics`, private access link, clear pending/confirmed/cancelled states |
| Reschedule / cancel from invitee link | Yes | Not available | Token-scoped reschedule and cancel with an admin cut-off |
| Meeting links | Auto-generated per event | Admin-provided URL, per-booking override | Same (unchanged) |
| Calendar sync / conflict import | Google, Outlook, iCloud | None | **Still missing** |
| Multiple hosts, round-robin, team pages | Yes | None | **Still missing** |
| Automated email/SMS reminders | Yes | None | **Still missing** |
| Routing forms, buffers per event, workflows | Yes | Global availability only | **Still missing** |
| Embed widget, analytics, no-show handling | Yes | None | **Still missing** |

## 2. What shipped in this upgrade

### Invitee experience (`src/components/BookAppointment.jsx`)
- Four-step flow with a persistent, token-driven summary and a real review before payment.
- Monday-first month calendar with availability dots, closed/full/blackout states, bounds and a “Next available” shortcut.
- Timezone picker (detected zone first, full IANA list where supported). Dates stay in the organiser's calendar; displayed times convert to the invitee's zone with DST handled.
- Slots grouped by time of day, showing organiser time as a secondary line and remaining capacity.
- Accessible form: visible `<label for>`, `autocomplete`, `inputmode`, `aria-invalid`, field-level errors, focus to the first invalid field, status messages and 48px inputs / 44px targets.
- Confirmation with calendar exports (Google, Outlook, `.ics`), booking reference, meeting access, and inline reschedule/cancel.
- One entrance animation, hover/press micro-interactions, reduced-motion support, no scroll-linked motion, no violet in the design.

### Scheduling engine (`api/book-appointment.js`, `api/_lib/appointment-time.js`)
- Replaced server-local `new Date(date + time)` parsing with explicit organiser-timezone conversion. Existing bookings generated in a UTC server no longer shift by the server's timezone.
- Added `action=availability`: one request returns every day and slot for a month, bounded by notice and max-days-ahead rules.
- Added token-scoped `action=reschedule` and `action=cancel`, with conflict checks that exclude the booking being moved and a configurable cut-off window.
- Shared slot validation between creation and rescheduling; cancelled/failed bookings do not hold capacity.
- Admin settings now expose organiser timezone, reschedule/cancel toggles, cut-off hours, and confirmation/reschedule/cancellation messages.

### Verification
- `npm run test:appointment-ux` — 25 checks covering timezone conversion (including DST), month grid, validation, calendar output and source guards.
- `npm run build` — production build passes.
- Visual checks: see the screenshots produced in `.taste-skill/` / `shots/` if present; no visual claim is made without a rendered check.

## 3. Before going live

1. **Set the organiser timezone** in `/admin/appointments → Settings`. The default is `Asia/Kolkata`; an existing installation without this field will use that default. Verify one known slot against the organiser's own calendar.
2. **Decide the management policy.** Reschedule/cancel default to on with a 2-hour cut-off. For paid bookings, define and publish a refund policy — cancellation does not trigger a refund.
3. **Publish at least one appointment type** with a valid meeting URL. Without one the page honestly shows an empty state.
4. **Add confirmation email.** The private access link works, but invitees currently have to save it themselves. This is the highest-value next feature.

## 4. Roadmap to genuine competitor status

**Phase 1 — trust and delivery (1–2 weeks)**
- Transactional email: confirmation, reschedule, cancellation, 24h/1h reminders, admin digest.
- Calendar sync (Google/Outlook OAuth): read busy times, write accepted events, detect external cancellations.
- Refund flow for paid cancellations and an audit trail visible to admin.

**Phase 2 — multiple hosts (3–6 weeks)**
- Host profiles with individual availability, per-event overrides and per-host buffers.
- Round-robin and collective scheduling, with conflict checking across hosts.
- Public `/u/:handle` pages and embeddable widget.

**Phase 3 — routing and operations (6–10 weeks)**
- Routing forms and conditional event assignment.
- Workflows (SMS/WhatsApp reminders, follow-ups, no-show markers), analytics, CSV export.
- API keys/webhooks so customers can connect their own tools.

## 5. Positioning

Do not sell this as "a Calendly clone". The defensible wedge is **scheduling inside an existing portfolio + storefront**: discovery call → paid consultation → downloadable product/receipt, all under one brand and one Supabase dataset. That is a story Calendly cannot tell without integrations, and it is reachable from the architecture already here.
