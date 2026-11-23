-- ============================================================
-- DIGITAL PRODUCTS — one document policy per product
--
-- 'license' (default): the existing behaviour. A paid order issues a
--   license certificate, with a key and an optional expiry date.
-- 'receipt': no license is issued. The buyer receives a purchase
--   receipt PDF instead (ebooks, artwork, one-off downloads, ...).
--
-- Entitlements and file downloads are UNCHANGED for both policies:
-- this migration only decides which document the purchase produces.
-- Additive only — existing products keep their 'license' behaviour.
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS document_policy TEXT NOT NULL DEFAULT 'license'
    CHECK (document_policy IN ('license', 'receipt'));

COMMENT ON COLUMN products.document_policy IS 'license issues a certificate, receipt issues a purchase receipt only';

-- NULL validity_days means a perpetual ("always use") license.
-- A positive value is the number of days from the PAID order's date.
ALTER TABLE product_license_options
  ADD COLUMN IF NOT EXISTS validity_days INTEGER
    CHECK (validity_days IS NULL OR (validity_days > 0 AND validity_days <= 36500));

COMMENT ON COLUMN product_license_options.validity_days IS 'NULL means perpetual, otherwise days counted from payment';

-- The expiry is captured at checkout, not at fulfilment: a later admin edit
-- to the option must never change what the customer actually bought.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS license_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN order_items.license_expires_at IS
  'Expiry snapshot for the issued license. NULL = perpetual. Only used for products with the license document policy.';
