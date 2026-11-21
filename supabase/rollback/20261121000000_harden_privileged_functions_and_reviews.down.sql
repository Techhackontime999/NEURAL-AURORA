-- ============================================================================
-- ROLLBACK — 20261121000000_harden_privileged_functions_and_reviews.sql
--
-- EMERGENCY / STAGING USE ONLY. This restores the pre-batch behaviour of the
-- functions and policies that batch 1 changed. It intentionally DOES NOT:
--   * recreate the legacy permissive `payments` policies (SEC-007);
--   * restore the invalid bare-text banner in supabase-schema.sql (SCHEMA-001);
--   * recreate `get_admin_settings()` unless you explicitly uncomment the block
--     below, because its prior existence in production was never confirmed.
--
-- This file has NOT been applied. Review and test on staging before any use.
-- ============================================================================

-- 1. Restore the previous is_admin() body/config.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
      FALSE
    )
  );
END;
$$;

-- 2. Restore the previous generate_test_data() body and default grants.
CREATE OR REPLACE FUNCTION public.generate_test_data(p_category TEXT, p_count INT DEFAULT 3)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  i INT; inserted INT := 0; random_suffix TEXT;
BEGIN
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
        INSERT INTO public.reviews (name, email, rating, message, approved)
        VALUES ('Test User', 'test@test.com', 5, 'Great!', random()>0.5);
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
      ELSE RETURN 'Unknown: '||p_category;
    END CASE;
    inserted := inserted + 1;
  END LOOP;
  RETURN 'Inserted '||inserted||' '||p_category;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_test_data(TEXT, INT) FROM anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_test_data(TEXT, INT) TO PUBLIC;

-- 3. Optional: recreate the old settings RPC ONLY if it existed before.
-- CREATE OR REPLACE FUNCTION public.get_admin_settings()
-- RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
-- DECLARE result JSONB;
-- BEGIN
--   SELECT to_jsonb(admin_settings.*) INTO result FROM admin_settings WHERE id = 1;
--   RETURN result;
-- END;
-- $$;

-- 4. Restore permissive review inserts (intentionally insecure).
DROP TRIGGER IF EXISTS reviews_force_unapproved ON public.reviews;
DROP FUNCTION IF EXISTS public.force_unapproved_review();
DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;
CREATE POLICY "Anyone can insert reviews"
  ON public.reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

-- 5. Restore the previous non-empty-email-claim entitlement policies.
DROP POLICY IF EXISTS "Users can read own entitlements" ON public.entitlements;
CREATE POLICY "Users can read own entitlements"
  ON public.entitlements FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND (
      user_id = auth.uid()
      OR (
        coalesce(auth.jwt() ->> 'email', '') <> ''
        AND lower(customer_email) = lower(auth.jwt() ->> 'email')
      )
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
          OR (
            coalesce(auth.jwt() ->> 'email', '') <> ''
            AND lower(e.customer_email) = lower(auth.jwt() ->> 'email')
          )
        )
    )
  );

DROP FUNCTION IF EXISTS public.current_user_has_verified_email(TEXT);

-- 6. Clear search_path overrides set by the forward migration where possible.
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
    'public.generate_test_data(text, integer)'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s RESET search_path', signature);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
