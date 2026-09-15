-- ============================================================================
-- Fix Privilege Escalation Vulnerability in set_admin_email
-- ============================================================================

-- 1. Redefine set_admin_email with is_admin authorization check
CREATE OR REPLACE FUNCTION set_admin_email(p_email TEXT)
RETURNS TEXT AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can set the admin email';
  END IF;

  UPDATE admin_settings SET admin_email = p_email, updated_at = NOW() WHERE id = 1;
  UPDATE profiles SET role = 'admin' WHERE email = p_email;
  RETURN 'Admin email set to: ' || p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Restrict execution to service_role only (block public, anon, authenticated)
REVOKE EXECUTE ON FUNCTION set_admin_email(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_admin_email(TEXT) TO service_role;

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
