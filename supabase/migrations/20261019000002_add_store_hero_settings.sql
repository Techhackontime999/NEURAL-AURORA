-- Backs the admin-managed image carousel behind the digital-store hero card
-- (/offerings/products, src/components/offerings/StoreShell.jsx).
-- A single JSONB document keeps the shape flexible so new fields can ship
-- without further migrations:
--
-- {
--   "enabled": true,
--   "intervalSeconds": 6,
--   "images": [ { "url": "https://...", "enabled": true } ]
-- }
--
-- Until an admin uploads replacements, StoreShell renders three curated
-- default images (src/lib/storeHeroDefaults.js).
--
-- RLS already applies: anon/authenticated can SELECT, only admins can UPDATE.
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS store_hero JSONB NOT NULL DEFAULT '{}'::jsonb;
