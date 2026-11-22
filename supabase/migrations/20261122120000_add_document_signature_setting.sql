-- ============================================================================
-- Admin-managed document signature.
--
-- The signature image is uploaded to the public `portfolio-images` bucket by
-- an admin and referenced by URL. The private `admin_settings` table remains
-- admin-only; only this non-secret display document is added to the explicit
-- public allowlist so product pages can show the same trust mark.
-- ============================================================================

BEGIN;

ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS document_signature JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.admin_settings.document_signature IS
  'Admin-managed signature block (enabled, url, name, title) used on licence PDFs and product detail. Never store secrets here.';

DROP VIEW IF EXISTS public.public_site_settings;
CREATE VIEW public.public_site_settings AS
SELECT
  s.id,
  s.site_name,
  s.site_description,
  s.theme,
  s.maintenance_mode,
  s.crm_url,
  s.youtube_channel_id,
  s.docs_url,
  s.video_hero,
  s.store_hero,
  s.appearance,
  s.payment_settings,
  s.document_signature,
  s.created_at,
  s.updated_at
FROM public.admin_settings AS s
WHERE s.id = 1;

ALTER VIEW public.public_site_settings SET (security_barrier = true);

REVOKE ALL ON TABLE public.public_site_settings FROM PUBLIC;
GRANT SELECT ON TABLE public.public_site_settings TO anon, authenticated;

COMMENT ON VIEW public.public_site_settings IS
  'Explicit public allowlist of admin_settings. Never add admin_email or other private columns.';

COMMIT;

NOTIFY pgrst, 'reload schema';
