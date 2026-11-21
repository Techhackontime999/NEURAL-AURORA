-- ============================================================================
-- SEC-006 — stop exposing the whole admin_settings row to anonymous clients.
--
-- Forward-only. Authored here, NOT applied by this work. Requires
-- 20261121000000_harden_privileged_functions_and_reviews.sql (for is_admin()).
--
-- Strategy: keep the private table readable only by admins, and expose a
-- separate, explicitly allowlisted public view for branding/display columns.
-- The view is intentionally a definer view: anon has no SELECT privilege on the
-- base table, so it cannot reach admin_email through RLS or column inference.
-- ============================================================================

BEGIN;

-- 1. Table reads become admin-only. UPDATE was already admin-only.
DROP POLICY IF EXISTS "Anyone can read settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Public can read public settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can read all settings" ON public.admin_settings;

CREATE POLICY "Admins can read all settings"
  ON public.admin_settings FOR SELECT TO authenticated
  USING (public.is_admin());

REVOKE SELECT ON TABLE public.admin_settings FROM anon;
GRANT SELECT ON TABLE public.admin_settings TO authenticated;

-- 2. Public allowlist. Add columns here deliberately; never add admin_email.
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
