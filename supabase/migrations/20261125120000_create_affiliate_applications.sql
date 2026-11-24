-- ============================================================
-- DIGITAL STORE — affiliate partner applications
--
-- Visitors can apply to become an affiliate. Applications are write-only
-- for the public: status, commission and affiliate access remain admin-only.
-- An admin reviews an application and approves it into the existing
-- affiliates table; no new checkout API function is needed.
--
-- Additive only: no existing affiliate, order or commission rows are changed.
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 120),
  email TEXT NOT NULL CHECK (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  proposed_code TEXT NOT NULL CHECK (proposed_code ~ '^[A-Z0-9][A-Z0-9_-]{2,23}$'),
  channels TEXT NOT NULL CHECK (length(trim(channels)) BETWEEN 1 AND 240),
  message TEXT NOT NULL CHECK (length(trim(message)) BETWEEN 10 AND 2000),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes TEXT NOT NULL DEFAULT '',
  affiliate_id BIGINT REFERENCES affiliates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- One live application per email. Someone can reapply after a decision.
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_applications_pending_email
  ON affiliate_applications (lower(email)) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_affiliate_applications_status
  ON affiliate_applications (status, created_at DESC);

ALTER TABLE affiliate_applications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE affiliate_applications FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE affiliate_applications TO anon;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE affiliate_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE affiliate_applications TO service_role;

-- Defence in depth: even a direct INSERT that bypasses the form cannot
-- approve itself, bind an affiliate, or forge a review.
CREATE OR REPLACE FUNCTION public.force_affiliate_application_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.status := 'pending';
  NEW.affiliate_id := NULL;
  NEW.review_notes := '';
  NEW.reviewed_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS affiliate_applications_force_pending ON affiliate_applications;
CREATE TRIGGER affiliate_applications_force_pending
  BEFORE INSERT ON affiliate_applications
  FOR EACH ROW EXECUTE FUNCTION public.force_affiliate_application_pending();

-- Anyone may submit an application, but nobody outside admin can read or
-- change one. Applicants get the outcome by email from the store owner.
DROP POLICY IF EXISTS "Anyone can apply as an affiliate" ON affiliate_applications;
CREATE POLICY "Anyone can apply as an affiliate"
  ON affiliate_applications FOR INSERT TO anon
  WITH CHECK (status = 'pending' AND affiliate_id IS NULL);

DROP POLICY IF EXISTS "Admin can manage affiliate applications" ON affiliate_applications;
CREATE POLICY "Admin can manage affiliate applications"
  ON affiliate_applications FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

NOTIFY pgrst, 'reload schema';
