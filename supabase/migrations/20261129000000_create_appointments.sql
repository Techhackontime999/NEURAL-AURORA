-- ============================================================
-- APPOINTMENTS / BOOKING
-- Visitors can book free or paid appointments; admin configures types/settings.
-- ============================================================

-- General appointment settings (public-safe config exposed via public_site_settings).
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS appointment_settings JSONB DEFAULT '{}'::jsonb;

CREATE OR REPLACE VIEW public_site_settings AS
SELECT
  id, site_name, site_description, theme, maintenance_mode,
  crm_url, youtube_channel_id, docs_url, video_hero, store_hero,
  appearance, payment_settings, document_signature,
  created_at, updated_at, whatsapp_number, appointment_settings
FROM admin_settings
WHERE id = 1;

ALTER VIEW public_site_settings SET (security_barrier = true);
GRANT SELECT ON TABLE public_site_settings TO anon, authenticated;

-- Appointment types configured by admin.
CREATE TABLE IF NOT EXISTS appointment_types (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  duration_minutes INT NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  price_paise INT NOT NULL DEFAULT 0 CHECK (price_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active appointment types" ON appointment_types;
CREATE POLICY "Anyone can read active appointment types"
  ON appointment_types FOR SELECT USING (is_active = TRUE OR is_admin());

DROP POLICY IF EXISTS "Admin can insert appointment types" ON appointment_types;
CREATE POLICY "Admin can insert appointment types"
  ON appointment_types FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update appointment types" ON appointment_types;
CREATE POLICY "Admin can update appointment types"
  ON appointment_types FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete appointment types" ON appointment_types;
CREATE POLICY "Admin can delete appointment types"
  ON appointment_types FOR DELETE USING (is_admin());

GRANT SELECT ON TABLE appointment_types TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE appointment_types TO authenticated;

-- Appointment bookings.
CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_type_id BIGINT REFERENCES appointment_types(id) ON DELETE SET NULL,
  type_name_snapshot TEXT NOT NULL DEFAULT '',
  duration_minutes_snapshot INT NOT NULL DEFAULT 30,
  price_paise_snapshot INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  timezone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status TEXT NOT NULL DEFAULT 'not_required' CHECK (payment_status IN ('not_required', 'pending', 'paid', 'failed')),
  razorpay_order_id TEXT DEFAULT '',
  razorpay_payment_id TEXT DEFAULT '',
  paid_at TIMESTAMPTZ,
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read appointments" ON appointments;
CREATE POLICY "Admin can read appointments"
  ON appointments FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admin can insert appointments" ON appointments;
CREATE POLICY "Admin can insert appointments"
  ON appointments FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update appointments" ON appointments;
CREATE POLICY "Admin can update appointments"
  ON appointments FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete appointments" ON appointments;
CREATE POLICY "Admin can delete appointments"
  ON appointments FOR DELETE USING (is_admin());

-- Public booking creation goes through server endpoint (service role).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE appointments TO authenticated;

CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS appointments_preferred_date_idx ON appointments(preferred_date, preferred_time);
CREATE INDEX IF NOT EXISTS appointments_razorpay_order_id_idx ON appointments(razorpay_order_id);
