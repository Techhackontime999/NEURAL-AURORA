-- ============================================================
-- CONTRIBUTOR PRODUCT ACCESS
-- Not every product in the digital store is available under an
-- APPROVED_CONTRIBUTOR_PERSONAL grant. Products opt in explicitly from the
-- product form, and a license is still issued only by an administrator after
-- an application has been approved.
-- ============================================================

-- Opt-in flag for the store catalogue. Defaults to FALSE so existing and new
-- products stay paid-only until an admin deliberately enables contributor access.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS contributor_access BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_products_contributor_access
  ON products (contributor_access) WHERE contributor_access = TRUE;

-- Optional product an applicant is asking about. This is a request only: the
-- product must be contributor-eligible, and approval/issuance remain admin-only.
ALTER TABLE contributor_applications
  ADD COLUMN IF NOT EXISTS requested_product_id BIGINT REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contributor_applications_requested_product
  ON contributor_applications (requested_product_id)
  WHERE requested_product_id IS NOT NULL;
