-- ============================================================
-- DIGITAL PRODUCTS — orders & payments (Phase D foundation)
-- Integer minor units (paise) throughout. Additive only: the
-- legacy `payments` table is left untouched so existing service
-- payment history and its webhook keep working unchanged.
-- ============================================================

-- ------------------------------------------------------------
-- ORDERS
-- One row per checkout attempt. `provider_order_id` ties it to
-- the Razorpay order created server-side. `payment_status` only
-- ever moves to 'paid' via server-side webhook verification.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_ref TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  customer_name TEXT DEFAULT '',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT UNIQUE,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  currency TEXT NOT NULL DEFAULT 'INR',
  subtotal_paise BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_paise >= 0),
  discount_paise BIGINT NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
  total_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_paise >= 0),
  failure_reason TEXT DEFAULT '',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- A paid order can never have paid_at left empty.
  CONSTRAINT orders_paid_requires_timestamp
    CHECK (payment_status <> 'paid' OR paid_at IS NOT NULL),
  CONSTRAINT orders_total_is_consistent
    CHECK (total_paise = subtotal_paise - discount_paise)
);

CREATE INDEX IF NOT EXISTS idx_orders_email ON orders (lower(email));
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Admins see everything. A signed-in customer sees only orders they
-- placed while authenticated. Guests are deliberately NOT granted a
-- read path here: knowing an email or order ref must never reveal a
-- purchase history. Guest recovery goes through the server endpoint
-- with a signed, expiring claim token instead.
DROP POLICY IF EXISTS "Admin can read orders" ON orders;
CREATE POLICY "Admin can read orders"
  ON orders FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Users can read own orders" ON orders;
CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can update orders" ON orders;
CREATE POLICY "Admin can update orders"
  ON orders FOR UPDATE USING (is_admin());

-- Order rows are written exclusively by the serverless functions
-- with the service role, which bypasses RLS. No client insert path.
REVOKE ALL ON TABLE orders FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON TABLE orders TO authenticated;

-- ------------------------------------------------------------
-- ORDER ITEMS
-- Title/price are snapshotted immutably so an admin editing a
-- product later can never rewrite what a customer actually paid.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_paise BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_paise >= 0),
  total_price_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_price_paise >= 0),
  product_title_snapshot TEXT NOT NULL,
  product_slug_snapshot TEXT NOT NULL,
  product_version_snapshot TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT order_items_total_matches
    CHECK (total_price_paise = unit_price_paise * quantity)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (product_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read order_items" ON order_items;
CREATE POLICY "Admin can read order_items"
  ON order_items FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Users can read own order_items" ON order_items;
CREATE POLICY "Users can read own order_items"
  ON order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.user_id = auth.uid()
  ));

REVOKE ALL ON TABLE order_items FROM PUBLIC, anon;
GRANT SELECT ON TABLE order_items TO authenticated;

-- ------------------------------------------------------------
-- PAYMENT TRANSACTIONS
-- One row per gateway payment attempt. `signature_valid` records
-- whether the gateway signature was actually verified, so a
-- recorded transaction can never be mistaken for a verified one.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (amount_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created',
  signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
  event_type TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_order ON payment_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_provider_order ON payment_transactions (provider_order_id);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read payment_transactions" ON payment_transactions;
CREATE POLICY "Admin can read payment_transactions"
  ON payment_transactions FOR SELECT TO authenticated USING (is_admin());

REVOKE ALL ON TABLE payment_transactions FROM PUBLIC, anon;
GRANT SELECT ON TABLE payment_transactions TO authenticated;
