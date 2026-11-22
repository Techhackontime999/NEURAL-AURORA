-- ============================================================
-- DIGITAL PRODUCTS — real, server-issued product licenses
--
-- A license is deliberately NOT the order receipt and NOT the
-- entitlement. The entitlement answers "may this customer download?";
-- the license answers "what may they do with what they downloaded?".
--
-- Additive only. Existing products remain valid: a product with no
-- license options issues no license and keeps its current behaviour.
-- ============================================================

-- ------------------------------------------------------------
-- PRODUCT-LEVEL LICENSE OPTIONS
-- The owner chooses which license types a product offers. Codes are
-- stable identifiers used by checkout, never prices or permissions
-- the browser is allowed to define.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_license_options (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label TEXT NOT NULL,
  summary TEXT DEFAULT '',
  terms TEXT DEFAULT '',
  display_order INT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT product_license_options_unique_code UNIQUE (product_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_license_options_one_default
  ON product_license_options (product_id) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_license_options_product
  ON product_license_options (product_id, display_order);

ALTER TABLE product_license_options ENABLE ROW LEVEL SECURITY;

-- Public catalogue may present the options of a published product.
DROP POLICY IF EXISTS "Public can read published license options" ON product_license_options;
CREATE POLICY "Public can read published license options"
  ON product_license_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_id AND p.status = 'published'
    )
  );

-- Admins also need to see options attached to draft/archived products.
DROP POLICY IF EXISTS "Admin can read all license options" ON product_license_options;
CREATE POLICY "Admin can read all license options"
  ON product_license_options FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can insert license options" ON product_license_options;
CREATE POLICY "Admin can insert license options"
  ON product_license_options FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update license options" ON product_license_options;
CREATE POLICY "Admin can update license options"
  ON product_license_options FOR UPDATE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete license options" ON product_license_options;
CREATE POLICY "Admin can delete license options"
  ON product_license_options FOR DELETE TO authenticated USING (is_admin());

GRANT SELECT ON TABLE product_license_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE product_license_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE product_license_options TO service_role;

-- ------------------------------------------------------------
-- ORDER ITEM SNAPSHOTS
-- Once paid, changing an option's wording must never change what the
-- customer actually bought. Both columns are optional for legacy rows.
-- ------------------------------------------------------------
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS license_option_id BIGINT
  REFERENCES product_license_options(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS license_type_snapshot TEXT DEFAULT '';

-- ------------------------------------------------------------
-- ISSUED LICENSES
-- One license per purchased line item. `seats` records the quantity
-- covered by that item. The key is stored so the owner can display and
-- copy it in their library; the hash permits indexed verification
-- without exposing the key in logs or URLs.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS licenses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  license_ref TEXT NOT NULL UNIQUE,
  license_key TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL UNIQUE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id BIGINT NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  entitlement_id BIGINT REFERENCES entitlements(id) ON DELETE SET NULL,
  license_option_id BIGINT REFERENCES product_license_options(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT,
  license_type TEXT NOT NULL DEFAULT 'Standard license',
  terms TEXT DEFAULT '',
  seats INTEGER NOT NULL DEFAULT 1 CHECK (seats > 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT licenses_revocation_has_reason
    CHECK (status <> 'revoked' OR (revoked_at IS NOT NULL AND length(trim(revocation_reason)) > 0))
);

CREATE INDEX IF NOT EXISTS idx_licenses_user ON licenses (user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses (lower(customer_email));
CREATE INDEX IF NOT EXISTS idx_licenses_product ON licenses (product_id);
CREATE INDEX IF NOT EXISTS idx_licenses_order ON licenses (order_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses (status);

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- Customers may READ their own licenses (including a revoked one: hiding it
-- would be misleading). They can never insert, update or reissue one.
DROP POLICY IF EXISTS "Admin can read licenses" ON licenses;
CREATE POLICY "Admin can read licenses"
  ON licenses FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Customers can read own licenses" ON licenses;
CREATE POLICY "Customers can read own licenses"
  ON licenses FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      customer_email IS NOT NULL
      AND lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

REVOKE ALL ON TABLE licenses FROM PUBLIC, anon;
GRANT SELECT ON TABLE licenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE licenses TO service_role;

-- ------------------------------------------------------------
-- LICENSE HISTORY
-- Every status change and reissue is recorded with an actor and reason.
-- Customers cannot see this ledger; admins read it through the audited
-- admin API.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS license_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  license_id BIGINT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('issued', 'suspended', 'revoked', 'reinstated', 'reissued', 'expired')),
  reason TEXT DEFAULT '',
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_events_license ON license_events (license_id, created_at DESC);

ALTER TABLE license_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read license events" ON license_events;
CREATE POLICY "Admin can read license events"
  ON license_events FOR SELECT TO authenticated USING (is_admin());

REVOKE ALL ON TABLE license_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE license_events TO service_role;

-- ------------------------------------------------------------
-- VERIFICATION ABUSE LEDGER
-- Only hashed addresses are stored. A bounded recent-attempt count
-- makes blind key guessing noisy and observable without keeping PII.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS license_verification_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caller_hash TEXT NOT NULL,
  product_slug TEXT DEFAULT '',
  successful BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_verification_attempts_recent
  ON license_verification_attempts (caller_hash, created_at DESC);

ALTER TABLE license_verification_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE license_verification_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE license_verification_attempts TO service_role;

-- ------------------------------------------------------------
-- PUBLIC FILE MANIFEST
-- This fixed view exposes ONLY non-sensitive metadata for published
-- products. No storage_path, bucket name or private credential can be
-- selected from it. Delivery still happens exclusively through
-- /api/download after an entitlement check.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public_product_file_manifest AS
SELECT
  f.id,
  f.product_id,
  f.filename,
  f.mime_type,
  f.size_bytes,
  f.version,
  f.display_order,
  f.is_preview
FROM product_files f
JOIN products p ON p.id = f.product_id
WHERE p.status = 'published';

REVOKE ALL ON public_product_file_manifest FROM PUBLIC;
GRANT SELECT ON public_product_file_manifest TO anon, authenticated;
