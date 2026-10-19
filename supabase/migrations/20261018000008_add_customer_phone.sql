-- ============================================================
-- DIGITAL PRODUCTS — customer phone on an order
--
-- So the administrator can hand a customer their sign-in link
-- over WhatsApp when email delivery is unavailable (see
-- docs/DIGITAL-STORE.md, "Customer sign-in when email cannot
-- be delivered").
--
-- Stored digits-only in international form (country code first,
-- no '+' and no separators) so the value can go straight into a
-- `tel:` or `https://wa.me/` link. `api/_lib/phone.js` is what
-- guarantees that shape.
--
-- Deliberately optional: an order is never refused because the
-- buyer did not give a number, so the column is NOT NULL DEFAULT
-- '' rather than NOT NULL with no default. Additive and
-- idempotent — safe to re-run.
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_phone TEXT NOT NULL DEFAULT '';
