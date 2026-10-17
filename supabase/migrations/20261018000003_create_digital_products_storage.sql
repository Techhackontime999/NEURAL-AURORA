-- ============================================================
-- DIGITAL PRODUCTS — private storage bucket (Phase E)
-- Paid downloads live here. Deliberately NO public read policy:
-- a path in this bucket is never a working URL on its own.
-- Access is only ever granted by the server minting a short lived
-- signed URL after an entitlement check.
-- ============================================================

-- Private bucket (public = false).
INSERT INTO storage.buckets (id, name, public)
VALUES ('digital-products', 'digital-products', false)
ON CONFLICT (id) DO NOTHING;

-- Admins may manage the paid assets they uploaded.
DROP POLICY IF EXISTS "Admin can upload digital products" ON storage.objects;
CREATE POLICY "Admin can upload digital products"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'digital-products' AND is_admin());

DROP POLICY IF EXISTS "Admin can update digital products" ON storage.objects;
CREATE POLICY "Admin can update digital products"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'digital-products' AND is_admin());

DROP POLICY IF EXISTS "Admin can delete digital products" ON storage.objects;
CREATE POLICY "Admin can delete digital products"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'digital-products' AND is_admin());

DROP POLICY IF EXISTS "Admin can read digital products" ON storage.objects;
CREATE POLICY "Admin can read digital products"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'digital-products' AND is_admin());

-- Intentionally NO "Anyone can view" policy for this bucket, and no
-- anon SELECT grant: anonymous fetches of these objects must fail.
-- Customers reach their files only through /api/download, which
-- verifies an active entitlement and then issues a signed URL.

-- ------------------------------------------------------------
-- Public preview bucket.
-- Covers and deliberately-public preview assets only. Never paid
-- source material. Reuses the existing public portfolio bucket so
-- the admin image picker keeps working unchanged.
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-images', 'portfolio-images', true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Optional: an RPC that lets an admin validate a storage path
-- exists for a product before saving metadata. service_role
-- callers only; kept as SECURITY DEFINER so it never leaks paths
-- to a non-admin caller.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_can_read_product_file(p_path TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'digital-products' AND name = p_path
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION admin_can_read_product_file(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_can_read_product_file(TEXT) TO authenticated, service_role;
