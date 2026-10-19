-- Backs the admin-managed "Video Hero" showcase section (src/components/VideoHero.jsx).
-- A single JSONB document keeps the shape flexible so new fields (extra copy,
-- quick-link edits) can ship without further migrations:
--
-- {
--   "enabled": true,
--   "darkVideo": "/hero_dark.mp4",
--   "lightVideo": "/hero_light.mp4",
--   "eyebrow": "Inside the portfolio",
--   "titleA": "Watch the work",
--   "titleB": "come alive",
--   "subtitle": "...",
--   "links": [ { "key", "label", "hint", "to", "icon", "enabled" } ]
-- }
--
-- RLS already applies: anon/authenticated can SELECT, only admins can UPDATE.
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS video_hero JSONB NOT NULL DEFAULT '{}'::jsonb;
