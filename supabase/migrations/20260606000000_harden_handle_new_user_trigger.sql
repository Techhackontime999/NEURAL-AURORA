-- ============================================================================
-- Harden handle_new_user Trigger & Remove First-User Auto-Promotion
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  allowed_email TEXT;
BEGIN
  SELECT admin_email INTO allowed_email FROM public.admin_settings WHERE id = 1;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    CASE
      WHEN allowed_email IS NOT NULL AND allowed_email != '' AND LOWER(NEW.email) = LOWER(allowed_email) THEN 'admin'
      ELSE 'viewer'
    END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger to ensure binding
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
