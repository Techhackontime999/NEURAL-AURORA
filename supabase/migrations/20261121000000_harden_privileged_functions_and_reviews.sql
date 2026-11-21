-- ============================================================================
-- PHASE 2 — privileged function hardening and authorization fixes
--
-- Forward-only. This file is authored here, NOT applied by this work. It must
-- be reviewed and applied to staging before production. It makes no data
-- changes: it only changes function bodies/grants, RLS policies and triggers.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. is_admin(): deterministic and protected from search_path manipulation.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Verified-email helper.
--
-- Email-based entitlement matching is only safe if the session actually owns
-- a confirmed address. auth.uid() is the session's user; auth.users is read
-- through this definer function so no extra client grant is required.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_has_verified_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND coalesce(p_email, '') <> ''
      AND lower(coalesce(u.email, '')) = lower(p_email)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_has_verified_email(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_has_verified_email(TEXT) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. generate_test_data(): admin-only, bounded, and search_path safe.
--
-- Previously this SECURITY DEFINER function had no authorization check and no
-- explicit REVOKE. The admin UI calls it with the signed-in user's token, so
-- keeping the RPC for authenticated admins preserves that flow. Anon callers
-- and direct PostgREST calls from non-admins now fail inside the function.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_test_data(p_category TEXT, p_count INT DEFAULT 3)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  i INT;
  inserted INT := 0;
  random_suffix TEXT;
BEGIN
  IF p_count IS NULL OR p_count < 1 OR p_count > 25 THEN
    RAISE EXCEPTION 'p_count must be between 1 and 25';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can generate test data';
  END IF;

  FOR i IN 1..p_count LOOP
    random_suffix := substr(md5(random()::text), 1, 8);
    CASE p_category
      WHEN 'projects' THEN
        INSERT INTO public.projects (project_id, title, description, technologies, image, display_order)
        VALUES ('test-' || random_suffix, 'Test Project ' || i, 'Sample project.', ARRAY['React','Node.js'], 'https://picsum.photos/seed/' || random_suffix || '/600/400', (SELECT COALESCE(MAX(display_order),0)+1 FROM public.projects));
      WHEN 'skills' THEN
        INSERT INTO public.skills (name, level, category, display_order)
        VALUES ('Test Skill ' || i, 50+(random()*50)::INT, (ARRAY['frontend','backend'])[(random()*2+1)::INT], (SELECT COALESCE(MAX(display_order),0)+1 FROM public.skills));
      WHEN 'education' THEN
        INSERT INTO public.education (edu_id, degree, school, year, description, display_order)
        VALUES ('test-'||random_suffix, 'Test Degree', 'Test Uni', '2024', 'Sample.', (SELECT COALESCE(MAX(display_order),0)+1 FROM public.education));
      WHEN 'experience' THEN
        INSERT INTO public.experience (exp_id, role, company, year, description, display_order)
        VALUES ('test-'||random_suffix, 'Test Role', 'Test Co', '2024-Present', 'Sample.', (SELECT COALESCE(MAX(display_order),0)+1 FROM public.experience));
      WHEN 'blog' THEN
        INSERT INTO public.blog_posts (post_id, title, slug, excerpt, content, date, read_time, tags)
        VALUES ('test-'||random_suffix, 'Test Post', 'test-'||random_suffix, 'Excerpt', 'Content', NOW()::date, '3 min', ARRAY['Test']);
      WHEN 'reviews' THEN
        -- Never generate an approved review; moderation stays a separate act.
        INSERT INTO public.reviews (name, email, rating, message, approved)
        VALUES ('Test User', 'test@test.com', 5, 'Great!', FALSE);
      WHEN 'case_studies' THEN
        INSERT INTO public.case_studies (cs_id, title, slug, description, outcome, content, tech, display_order)
        VALUES ('test-'||random_suffix, 'Test CS', 'test-'||random_suffix, 'Desc', 'Done', 'Content', ARRAY['React'], (SELECT COALESCE(MAX(display_order),0)+1 FROM public.case_studies));
      WHEN 'services' THEN
        INSERT INTO public.services (service_id, icon_name, title, tagline, description, features, display_order)
        VALUES (
          'test-'||random_suffix,
          (ARRAY['Globe','Palette','Lightbulb','MessageCircle','Code','Server','Zap','Star'])[(random()*8+1)::INT],
          (ARRAY['Web Development','UI/UX Design','Technical Consulting','Custom Projects','Cloud Architecture','Mobile Development'])[(random()*6+1)::INT] || ' ' || i,
          (ARRAY['Full-stack applications that perform','Interfaces people love to use','Strategic guidance for your stack','Unique problems need unique solutions'])[(random()*4+1)::INT],
          'A sample service offering with professional quality and attention to detail.',
          ARRAY['Feature A','Feature B','Feature C','Feature D'],
          (SELECT COALESCE(MAX(display_order),0)+1 FROM public.services)
        );
      ELSE
        RETURN 'Unknown: ' || p_category;
    END CASE;
    inserted := inserted + 1;
  END LOOP;
  RETURN 'Inserted ' || inserted || ' ' || p_category;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_test_data(TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_test_data(TEXT, INT) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. Remove the unsafe manual get_admin_settings() RPC.
--
-- It returned to_jsonb(admin_settings.*), including admin_email, with default
-- grants. No application code calls it. Dropping it is the smallest fix; a
-- future public settings view should use an explicit column allowlist.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_admin_settings();

-- ----------------------------------------------------------------------------
-- 5. Reviews: public inserts are always unapproved.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.force_unapproved_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.approved := FALSE;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_force_unapproved ON public.reviews;
CREATE TRIGGER reviews_force_unapproved
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.force_unapproved_review();

DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;
CREATE POLICY "Anyone can insert reviews"
  ON public.reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (approved = FALSE);

-- ----------------------------------------------------------------------------
-- 6. Entitlements: email fallback requires a verified session address.
--    user_id ownership remains the primary path.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own entitlements" ON public.entitlements;
CREATE POLICY "Users can read own entitlements"
  ON public.entitlements FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND (
      user_id = auth.uid()
      OR public.current_user_has_verified_email(customer_email)
    )
  );

DROP POLICY IF EXISTS "Owners can read their purchased products" ON public.products;
CREATE POLICY "Owners can read their purchased products"
  ON public.products FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.entitlements e
      WHERE e.product_id = products.id
        AND e.status = 'active'
        AND (
          e.user_id = auth.uid()
          OR public.current_user_has_verified_email(e.customer_email)
        )
    )
  );

-- ----------------------------------------------------------------------------
-- 7. Drop the legacy permissive payments policies if this database ever had
--    them. PostgreSQL OR-combines policies, so a single leftover policy undoes
--    the admin-only rules from 20260605000000.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can insert payments" ON public.payments';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 8. Set a safe search_path on every existing SECURITY DEFINER function.
--    to_regprocedure keeps this idempotent across partial installations.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  signature TEXT;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.handle_new_user()',
    'public.ensure_my_profile()',
    'public.is_admin()',
    'public.admin_delete_user(uuid)',
    'public.increment_ad_view_count(bigint)',
    'public.increment_visitor_count()',
    'public.set_admin_email(text)',
    'public.admin_can_read_product_file(text)',
    'public.check_download_grant_rate_limit()',
    'public.purge_expired_download_records()',
    'public.generate_test_data(text, integer)',
    'public.current_user_has_verified_email(text)',
    'public.force_unapproved_review()'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', signature);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
