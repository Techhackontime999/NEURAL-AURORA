-- ============================================================
-- DIGITAL PRODUCTS — require a non-empty email claim
--
-- Two policies compare the session's email claim against
-- `customer_email`, written as
--
--   lower(coalesce(customer_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
--
-- That comparison is TRUE when BOTH sides are empty, so an
-- authenticated session carrying no email claim at all (for
-- example a Supabase anonymous sign-in, which is a project-level
-- setting rather than something this code controls) would match
-- any row whose `customer_email` is NULL or ''.
--
-- Every entitlement written by this codebase carries an email, so
-- this is not exploitable today. But it depends on that remaining
-- true forever, and the failure mode is silent: a future insert
-- path that omits the email would quietly hand one customer's
-- entitlement to every e-mail-less session.
--
-- Adding the explicit `<> ''` guard makes the requirement
-- structural instead of incidental.
-- ============================================================

DROP POLICY IF EXISTS "Users can read own entitlements" ON entitlements;
CREATE POLICY "Users can read own entitlements"
  ON entitlements FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND (
      user_id = auth.uid()
      OR (
        coalesce(auth.jwt() ->> 'email', '') <> ''
        AND lower(customer_email) = lower(auth.jwt() ->> 'email')
      )
    )
  );

DROP POLICY IF EXISTS "Owners can read their purchased products" ON products;
CREATE POLICY "Owners can read their purchased products"
  ON products FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM entitlements e
      WHERE e.product_id = products.id
        AND e.status = 'active'
        AND (
          e.user_id = auth.uid()
          OR (
            coalesce(auth.jwt() ->> 'email', '') <> ''
            AND lower(e.customer_email) = lower(auth.jwt() ->> 'email')
          )
        )
    )
  );

NOTIFY pgrst, 'reload schema';
