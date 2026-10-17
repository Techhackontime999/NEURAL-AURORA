-- ============================================================
-- DIGITAL PRODUCTS — owners can always see what they bought
--
-- The catalogue policy only exposes `status = 'published'`. That is
-- correct for browsing, but it would also hide a product from the
-- customer who already paid for it once it is archived. This adds a
-- narrow, additive read path: an authenticated customer may read a
-- product row IF they hold an active entitlement for it.
--
-- No recursion risk: the subquery reads `entitlements`, whose own
-- policy depends only on auth.uid()/auth.jwt() — it never reads
-- `products`. So the EXISTS sees only the caller's own grants.
-- ============================================================

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
          OR lower(coalesce(e.customer_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );

NOTIFY pgrst, 'reload schema';
