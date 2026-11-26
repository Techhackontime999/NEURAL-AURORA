-- Meeting/provider configuration for appointments and secure public booking access.

ALTER TABLE appointment_types
  ADD COLUMN IF NOT EXISTS meeting_provider TEXT NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS meeting_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS location_label TEXT NOT NULL DEFAULT 'Online meeting';

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS meeting_provider_snapshot TEXT NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS meeting_url_snapshot TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS location_label_snapshot TEXT NOT NULL DEFAULT 'Online meeting',
  ADD COLUMN IF NOT EXISTS access_token TEXT NOT NULL DEFAULT '';

-- Backfill access tokens for existing bookings.
UPDATE appointments
SET access_token = md5(random()::text || clock_timestamp()::text || id::text || customer_email)
WHERE access_token = '' OR access_token IS NULL;

CREATE INDEX IF NOT EXISTS appointments_access_token_idx ON appointments(access_token);
