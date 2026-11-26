-- Add WhatsApp support number to admin settings.
-- Stored as digits (or +/spaces entered by admin, normalized in app) for wa.me links.

ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT '';

-- Refresh public allowlist view to expose whatsapp_number (never admin_email).
CREATE OR REPLACE VIEW public_site_settings AS
SELECT
  id, site_name, site_description, theme, maintenance_mode,
  crm_url, youtube_channel_id, docs_url, video_hero, store_hero,
  appearance, payment_settings, document_signature, whatsapp_number,
  created_at, updated_at
FROM admin_settings
WHERE id = 1;

ALTER VIEW public_site_settings SET (security_barrier = true);
GRANT SELECT ON TABLE public_site_settings TO anon, authenticated;
