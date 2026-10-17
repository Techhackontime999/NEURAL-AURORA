-- ============================================================
-- DIGITAL PRODUCTS — entitlements & secure delivery (Phase E)
-- An entitlement is the single source of truth for "may this
-- customer have this file". Nothing downloads without one.
-- ============================================================

-- ------------------------------------------------------------
-- ENTITLEMENTS
-- `source` distinguishes a paid purchase from a free acquisition.
-- For paid rows the entitlement is keyed to the immutable order
-- item, so replaying a webhook can never mint a second grant.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entitlements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id BIGINT REFERENCES order_items(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT,
  source TEXT NOT NULL DEFAULT 'purchase'
    CHECK (source IN ('purchase', 'free', 'gift', 'comp')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- A revocation must be timestamped; an active grant must not be.
  CONSTRAINT entitlements_revoked_requires_timestamp
    CHECK (status <> 'revoked' OR revoked_at IS NOT NULL)
);

-- One grant per purchased line item — this is the replay guard.
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_per_item
  ON entitlements (product_id, order_item_id)
  WHERE order_item_id IS NOT NULL;

-- One free grant per product per customer email (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_free_email
  ON entitlements (product_id, lower(customer_email))
  WHERE order_item_id IS NULL AND customer_email IS NOT NULL;

-- One free grant per product per authenticated account when there is
-- no email on the row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_free_user
  ON entitlements (product_id, user_id)
  WHERE order_item_id IS NULL AND user_id IS NOT NULL AND customer_email IS NULL;

CREATE INDEX IF NOT EXISTS idx_entitlements_product ON entitlements (product_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_user ON entitlements (user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_email ON entitlements (lower(customer_email));
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON entitlements (status);

ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

-- Admins see all. A signed-in customer sees only their own active
-- grants (matched by user_id, or by the email on their verified
-- session). No anon access: a guest must prove ownership through
-- the server-side claim flow rather than by knowing an address.
DROP POLICY IF EXISTS "Admin can read entitlements" ON entitlements;
CREATE POLICY "Admin can read entitlements"
  ON entitlements FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Users can read own entitlements" ON entitlements;
CREATE POLICY "Users can read own entitlements"
  ON entitlements FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND (
      user_id = auth.uid()
      OR lower(coalesce(customer_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

DROP POLICY IF EXISTS "Admin can update entitlements" ON entitlements;
CREATE POLICY "Admin can update entitlements"
  ON entitlements FOR UPDATE USING (is_admin());

REVOKE ALL ON TABLE entitlements FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON TABLE entitlements TO authenticated;

-- ------------------------------------------------------------
-- DOWNLOAD GRANTS
-- Short-lived, single-purpose tokens issued only after an
-- entitlement check. Only a SHA-256 hash is stored, so a database
-- leak cannot be replayed into downloads. Usage is counted so the
-- server can apply rate limits and abuse protection.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS download_grants (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entitlement_id BIGINT NOT NULL REFERENCES entitlements(id) ON DELETE CASCADE,
  product_file_id BIGINT REFERENCES product_files(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 5 CHECK (max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_download_grants_entitlement
  ON download_grants (entitlement_id);
CREATE INDEX IF NOT EXISTS idx_download_grants_expiry
  ON download_grants (expires_at);

ALTER TABLE download_grants ENABLE ROW LEVEL SECURITY;

-- Server (service_role) only. No client read or write path at all,
-- so a browser can never mint or inspect a grant.
REVOKE ALL ON TABLE download_grants FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- PURCHASE CLAIMS
-- Guest purchase recovery. A signed, expiring token emailed to the
-- buyer. Knowing an order_ref or an email address is never enough
-- to retrieve a purchase.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_claims (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_claims_email ON purchase_claims (lower(email));
CREATE INDEX IF NOT EXISTS idx_purchase_claims_order ON purchase_claims (order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_claims_expiry ON purchase_claims (expires_at);

ALTER TABLE purchase_claims ENABLE ROW LEVEL SECURITY;

-- Server (service_role) only. Same reasoning as download_grants.
REVOKE ALL ON TABLE purchase_claims FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- Explicit service_role grants.
-- The serverless functions (create-order, webhook, download) act
-- with the service role. BYPASSRLS only skips row security, not
-- object privileges, so these are stated outright rather than
-- relying on project default privileges.
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE products            TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE product_categories  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE product_files       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE orders              TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE order_items        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE payment_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE entitlements        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE download_grants     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE purchase_claims     TO service_role;
