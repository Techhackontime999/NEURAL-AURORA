-- ============================================================================
-- Lock Down Payments Table & Secure Webhook Ingestion
-- ============================================================================

-- 1. Ensure table exists with appropriate structure
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_id TEXT NOT NULL,
  service_title TEXT NOT NULL,
  pricing_label TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  customer_email TEXT,
  customer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add unique constraints to prevent duplicates and replay
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments (razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;

-- 3. Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 4. Drop legacy open/insecure policies
DROP POLICY IF EXISTS "Anyone can insert payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON payments;
DROP POLICY IF EXISTS "Admins can view payments" ON payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON payments;
DROP POLICY IF EXISTS "Admins can update payments" ON payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON payments;

-- 5. Strict Admin-Only Policies (Non-admin users and anon cannot read or insert)
CREATE POLICY "Admins can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (is_admin());

-- 6. Restrict Table Grants
REVOKE ALL ON TABLE payments FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE payments TO authenticated, service_role;

-- 7. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
