-- ============================================================
-- DIGITAL STORE — admin-managed coupons
--
-- Coupons are a server-side pricing input, never a client-side
-- discount. This migration adds the definitions, an immutable
-- redemption ledger and an order snapshot. RLS keeps the whole
-- feature invisible to anonymous visitors; only the serverless
-- checkout functions (service role) may read/claim a live code.
--
-- Additive only: no existing order becomes invalid.
-- ============================================================

CREATE TABLE IF NOT EXISTS coupons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Stored canonically uppercase. The checkout client normalises too, but the
  -- database is the final authority on what a code looks like.
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{2,23}$'),
  description TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  -- Percent: 1..100. Fixed: paise. Never a client-supplied amount.
  value BIGINT NOT NULL CHECK (value > 0),
  min_subtotal_paise BIGINT NOT NULL DEFAULT 0 CHECK (min_subtotal_paise >= 0),
  -- Optional cap for percentage coupons; NULL means uncapped (still bounded
  -- by the order subtotal in application code).
  max_discount_paise BIGINT CHECK (max_discount_paise IS NULL OR max_discount_paise >= 0),
  -- NULL or empty = every product. Otherwise only these slugs are discounted.
  product_slugs TEXT[],
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  uses_count INTEGER NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  per_customer_limit INTEGER NOT NULL DEFAULT 1 CHECK (per_customer_limit > 0),
  first_order_only BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coupons_value_matches_type CHECK (
    (discount_type = 'percent' AND value BETWEEN 1 AND 100) OR
    (discount_type = 'fixed' AND value > 0)
  ),
  CONSTRAINT coupons_dates_in_order CHECK (
    starts_at IS NULL OR expires_at IS NULL OR expires_at > starts_at
  )
);

CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (active, expires_at);
CREATE INDEX IF NOT EXISTS idx_coupons_created_at ON coupons (created_at DESC);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- No public SELECT: exposing coupon rows would disclose unused codes and the
-- exact discount rules. The checkout function reads them with the service role.
REVOKE ALL ON TABLE coupons FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE coupons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE coupons TO service_role;

DROP POLICY IF EXISTS "Admin can read coupons" ON coupons;
CREATE POLICY "Admin can read coupons"
  ON coupons FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admin can insert coupons" ON coupons;
CREATE POLICY "Admin can insert coupons"
  ON coupons FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update coupons" ON coupons;
CREATE POLICY "Admin can update coupons"
  ON coupons FOR UPDATE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete coupons" ON coupons;
CREATE POLICY "Admin can delete coupons"
  ON coupons FOR DELETE TO authenticated USING (is_admin());

-- ------------------------------------------------------------
-- REDEMPTION LEDGER
-- One row per discounted order. It is what makes per-customer and
-- global usage limits auditable rather than merely advisory.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  coupon_id BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_ref TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  discount_paise BIGINT NOT NULL CHECK (discount_paise > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon
  ON coupon_redemptions (coupon_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_customer
  ON coupon_redemptions (coupon_id, lower(customer_email));

ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE coupon_redemptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE coupon_redemptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE coupon_redemptions TO service_role;

DROP POLICY IF EXISTS "Admin can read coupon redemptions" ON coupon_redemptions;
CREATE POLICY "Admin can read coupon redemptions"
  ON coupon_redemptions FOR SELECT TO authenticated USING (is_admin());

-- ------------------------------------------------------------
-- ORDER SNAPSHOT
-- Keeps the applied code visible on the order for receipts, support
-- and reconciliation even if the coupon itself is later deleted.
-- ------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code_snapshot TEXT NOT NULL DEFAULT '';
