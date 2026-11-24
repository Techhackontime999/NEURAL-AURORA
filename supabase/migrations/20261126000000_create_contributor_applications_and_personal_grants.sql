-- ============================================================
-- APPROVED CONTRIBUTOR PERSONAL-USE APPLICATIONS AND GRANTS
--
-- Additive migration. Preserves existing purchase/license/entitlement
-- behaviour and all previously granted rights. Nothing in this migration
-- auto-grants access: applications require explicit admin review and an
-- explicit admin issuance action.
--
-- APPROVED_CONTRIBUTOR_PERSONAL grants are personal-use only. They do not
-- grant organisation/company-wide use, commercial/client deployment,
-- resale/redistribution, sublicensing/transfer, paid/enterprise entitlements,
-- or IP ownership. They are auditable and revocable by admin action.
-- ============================================================

-- ------------------------------------------------------------
-- CONTRIBUTOR APPLICATIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contributor_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_ref TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL CHECK (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 120),
  github_profile TEXT NOT NULL DEFAULT '',
  contribution_summary TEXT NOT NULL CHECK (length(trim(contribution_summary)) BETWEEN 10 AND 4000),
  intended_use TEXT NOT NULL DEFAULT '',
  personal_use_attestation BOOLEAN NOT NULL DEFAULT FALSE,
  no_commercial_use_attestation BOOLEAN NOT NULL DEFAULT FALSE,
  no_redistribution_attestation BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'withdrawn')),
  review_notes TEXT NOT NULL DEFAULT '',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  issued_license_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contributor_applications_reviewed_has_actor
    CHECK (status = 'pending' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
  CONSTRAINT contributor_applications_approved_timestamp
    CHECK (status <> 'approved' OR approved_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_contributor_applications_status
  ON contributor_applications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contributor_applications_user
  ON contributor_applications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contributor_applications_email
  ON contributor_applications (lower(email), created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contributor_applications_pending_email
  ON contributor_applications (lower(email))
  WHERE status IN ('pending', 'under_review');

ALTER TABLE contributor_applications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE contributor_applications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE contributor_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE contributor_applications TO service_role;

-- Authenticated users can submit their own application; trigger forces safe defaults.
CREATE OR REPLACE FUNCTION public.force_contributor_application_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.status := 'pending';
  NEW.review_notes := '';
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  NEW.approved_at := NULL;
  NEW.issued_license_id := NULL;
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contributor_applications_force_pending ON contributor_applications;
CREATE TRIGGER contributor_applications_force_pending
  BEFORE INSERT ON contributor_applications
  FOR EACH ROW EXECUTE FUNCTION public.force_contributor_application_pending();

DROP POLICY IF EXISTS "Users can submit contributor applications" ON contributor_applications;
CREATE POLICY "Users can submit contributor applications"
  ON contributor_applications FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND issued_license_id IS NULL
  );

DROP POLICY IF EXISTS "Users can read own contributor applications" ON contributor_applications;
CREATE POLICY "Users can read own contributor applications"
  ON contributor_applications FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin()
  );

DROP POLICY IF EXISTS "Admin can manage contributor applications" ON contributor_applications;
CREATE POLICY "Admin can manage contributor applications"
  ON contributor_applications FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ------------------------------------------------------------
-- APPLICATION AUDIT EVENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contributor_application_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES contributor_applications(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'submitted', 'under_review', 'approved', 'rejected', 'withdrawn',
    'license_issued', 'license_suspended', 'license_revoked', 'license_reinstated', 'note'
  )),
  old_status TEXT,
  new_status TEXT,
  reason TEXT NOT NULL DEFAULT '',
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributor_application_events_app
  ON contributor_application_events (application_id, created_at DESC);

ALTER TABLE contributor_application_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE contributor_application_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE contributor_application_events TO authenticated;
GRANT SELECT, INSERT ON TABLE contributor_application_events TO service_role;

DROP POLICY IF EXISTS "Admin can read contributor application events" ON contributor_application_events;
CREATE POLICY "Admin can read contributor application events"
  ON contributor_application_events FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Users can read own contributor application events" ON contributor_application_events;
CREATE POLICY "Users can read own contributor application events"
  ON contributor_application_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contributor_applications a
      WHERE a.id = application_id AND a.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- ENTITLEMENT SOURCE EXTENSION
-- ------------------------------------------------------------
ALTER TABLE entitlements DROP CONSTRAINT IF EXISTS entitlements_source_check;
ALTER TABLE entitlements ADD CONSTRAINT entitlements_source_check
  CHECK (source IN ('purchase', 'free', 'gift', 'comp', 'approved_contributor_personal'));

-- Existing unique indexes for order_item_id IS NULL grants were named
-- "free_*" but applied to all non-purchase grants. Replace them with
-- source-aware indexes so different grant sources do not collide.
DROP INDEX IF EXISTS idx_entitlements_free_email;
DROP INDEX IF EXISTS idx_entitlements_free_user;

CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_nonpurchase_email_source
  ON entitlements (product_id, lower(customer_email), source)
  WHERE order_item_id IS NULL AND customer_email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_nonpurchase_user_source
  ON entitlements (product_id, user_id, source)
  WHERE order_item_id IS NULL AND user_id IS NOT NULL AND customer_email IS NULL;

-- ------------------------------------------------------------
-- LICENSES: allow admin-issued personal grants
-- ------------------------------------------------------------
-- Existing purchase licenses keep order_id/order_item_id populated.
-- Contributor personal grants are issued by explicit admin action and
-- are not tied to a commerce order item.
ALTER TABLE licenses ALTER COLUMN order_id DROP NOT NULL;

-- order_item_id had an inline UNIQUE constraint; drop it by name lookup.
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c
  FROM pg_constraint
  WHERE conrelid = 'public.licenses'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) LIKE '%order_item_id%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.licenses DROP CONSTRAINT %I', c);
  END IF;
END $$;

ALTER TABLE licenses ALTER COLUMN order_item_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_licenses_order_item_unique
  ON licenses (order_item_id)
  WHERE order_item_id IS NOT NULL;

ALTER TABLE licenses ADD COLUMN IF NOT EXISTS grant_type TEXT NOT NULL DEFAULT 'purchase';
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS grant_source TEXT NOT NULL DEFAULT 'verified_payment';
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS application_id BIGINT REFERENCES contributor_applications(id) ON DELETE SET NULL;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS scope JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE licenses DROP CONSTRAINT IF EXISTS licenses_grant_type_check;
ALTER TABLE licenses ADD CONSTRAINT licenses_grant_type_check
  CHECK (grant_type IN ('purchase', 'APPROVED_CONTRIBUTOR_PERSONAL'));

ALTER TABLE licenses DROP CONSTRAINT IF EXISTS licenses_grant_source_check;
ALTER TABLE licenses ADD CONSTRAINT licenses_grant_source_check
  CHECK (grant_source IN ('verified_payment', 'admin_grant'));

ALTER TABLE licenses DROP CONSTRAINT IF EXISTS licenses_purchase_or_grant_shape;
ALTER TABLE licenses ADD CONSTRAINT licenses_purchase_or_grant_shape
  CHECK (
    (grant_type = 'purchase' AND order_id IS NOT NULL AND order_item_id IS NOT NULL)
    OR
    (grant_type = 'APPROVED_CONTRIBUTOR_PERSONAL' AND application_id IS NOT NULL AND grant_source = 'admin_grant')
  );

CREATE INDEX IF NOT EXISTS idx_licenses_grant_type ON licenses (grant_type, status, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_licenses_application ON licenses (application_id);

-- Link applications to issued license row (added after licenses columns exist).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contributor_applications_issued_license_fk'
  ) THEN
    ALTER TABLE contributor_applications
      ADD CONSTRAINT contributor_applications_issued_license_fk
      FOREIGN KEY (issued_license_id) REFERENCES licenses(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------
-- LICENSE EVENTS: support contributor grant audit actions
-- ------------------------------------------------------------
ALTER TABLE license_events DROP CONSTRAINT IF EXISTS license_events_action_check;
ALTER TABLE license_events ADD CONSTRAINT license_events_action_check
  CHECK (action IN (
    'issued', 'suspended', 'revoked', 'reinstated', 'reissued', 'expired', 'deleted',
    'application_approved', 'grant_issued'
  ));

-- Allow authenticated admins to read applications through RLS; writes go through service role APIs.
GRANT SELECT ON TABLE contributor_application_events TO authenticated;

NOTIFY pgrst, 'reload schema';
