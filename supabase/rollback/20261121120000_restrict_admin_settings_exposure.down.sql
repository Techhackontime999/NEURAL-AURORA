-- ============================================================================
-- ROLLBACK — 20261121120000_restrict_admin_settings_exposure.sql
--
-- EMERGENCY / STAGING USE ONLY. Restores the old public table read so the
-- previous client build keeps working. This deliberately reintroduces SEC-006
-- (anonymous clients can read admin_email); use only to undo a failed rollout.
-- ============================================================================

DROP VIEW IF EXISTS public.public_site_settings;

DROP POLICY IF EXISTS "Admins can read all settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Anyone can read settings" ON public.admin_settings;

CREATE POLICY "Anyone can read settings"
  ON public.admin_settings FOR SELECT TO anon, authenticated
  USING (true);

GRANT SELECT ON TABLE public.admin_settings TO anon;

NOTIFY pgrst, 'reload schema';
