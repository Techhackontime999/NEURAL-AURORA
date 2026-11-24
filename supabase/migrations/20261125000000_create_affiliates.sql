-- ============================================================
-- DIGITAL STORE — authorised affiliate / reseller partners
--
-- An admin invites a partner with a unique code and a commission rate.
-- A buyer submits only the code; the server resolves it, snapshots the
-- rate onto the order, and creates a payout row ONLY after a verified
-- paid webhook. Manual payouts are recorded by an admin in the ledger.
--
-- Additive only: no existing order or price changes.
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Canonical code: the same shape as coupons so links are predictable.
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{2,23}$'),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 120),
  -- Sign-in email binds the account to its own dashboard. Empty means the
  -- partner has not been given access yet.
  email TEXT NOT NULL DEFAULT '',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Basis points: 1250 = 12.5%. Integer math prevents float drift.
  commission_bps INTEGER NOT NULL CHECK (commission_bps > 0 AND commission_bps <= 10000),
  -- NULL / empty = all products; otherwise only these slugs earn commission.
  product_slugs TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'pending')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_email_unique
  ON affiliates (lower(email)) WHERE email <> '';
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates (status, created_at DESC);

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE affiliates FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE affiliates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE affiliates TO service_role;

-- Admins manage everything. A signed-in partner may see only their own row,
-- matched by the verified Supabase auth email (never a client-supplied value).
DROP POLICY IF EXISTS "Admin can manage affiliates" ON affiliates;
CREATE POLICY "Admin can manage affiliates"
  ON affiliates FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Partner can read own affiliate profile" ON affiliates;
CREATE POLICY "Partner can read own affiliate profile"
  ON affiliates FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    (email <> '' AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );

-- ------------------------------------------------------------
-- ATTRIBUTION
-- One immutable row per referred order. Created at order time so pausing a
-- partner later cannot erase a sale they already generated.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS affiliate_attributions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  affiliate_id BIGINT NOT NULL REFERENCES affiliates(id) ON DELETE RESTRICT,
  order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  order_ref TEXT NOT NULL UNIQUE,
  affiliate_code TEXT NOT NULL,
  commission_bps INTEGER NOT NULL CHECK (commission_bps > 0 AND commission_bps <= 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_partner
  ON affiliate_attributions (affiliate_id, created_at DESC);

ALTER TABLE affiliate_attributions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE affiliate_attributions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE affiliate_attributions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE affiliate_attributions TO service_role;

DROP POLICY IF EXISTS "Admin can read affiliate attributions" ON affiliate_attributions;
CREATE POLICY "Admin can read affiliate attributions"
  ON affiliate_attributions FOR SELECT TO authenticated USING (is_admin());

-- ------------------------------------------------------------
-- COMMISSION LEDGER
-- Created only from a verified paid order. Admin moves a row from pending
-- to approved/paid/void with an external payment reference.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  affiliate_id BIGINT NOT NULL REFERENCES affiliates(id) ON DELETE RESTRICT,
  order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  order_ref TEXT NOT NULL UNIQUE,
  net_paise BIGINT NOT NULL CHECK (net_paise > 0),
  commission_bps INTEGER NOT NULL CHECK (commission_bps > 0 AND commission_bps <= 10000),
  commission_paise BIGINT NOT NULL CHECK (commission_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'void')),
  payout_reference TEXT NOT NULL DEFAULT '',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_partner
  ON affiliate_commissions (affiliate_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status
  ON affiliate_commissions (status, created_at DESC);

ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE affiliate_commissions FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE affiliate_commissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE affiliate_commissions TO service_role;

DROP POLICY IF EXISTS "Admin can manage affiliate commissions" ON affiliate_commissions;
CREATE POLICY "Admin can manage affiliate commissions"
  ON affiliate_commissions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Partner can read own commissions" ON affiliate_commissions;
CREATE POLICY "Partner can read own commissions"
  ON affiliate_commissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliates a
      WHERE a.id = affiliate_commissions.affiliate_id
        AND (
          a.user_id = auth.uid() OR
          (a.email <> '' AND lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
        )
    )
  );

-- ------------------------------------------------------------
-- ORDER SNAPSHOT
-- Keeps the code visible on the order for support and reconciliation
-- even if an affiliate record is later edited.
-- ------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS affiliate_code_snapshot TEXT NOT NULL DEFAULT '';
