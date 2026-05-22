-- ============================================================
-- NEURAL AURORA - Complete Database Migration
-- Run this in Supabase SQL Editor to fix all issues
-- Fixes: RLS for reviews, Auth restrictions, New tables
-- ============================================================

-- ============================================================
-- 1. FIX REVIEWS TABLE RLS (the main issue)
-- ============================================================
-- Ensure RLS is enabled (idempotent)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies cleanly
DROP POLICY IF EXISTS "Anyone can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Anyone can read approved reviews" ON reviews;
DROP POLICY IF EXISTS "Admin can update reviews" ON reviews;
DROP POLICY IF EXISTS "Admin can delete reviews" ON reviews;

-- Recreate with explicit policies
CREATE POLICY "Anyone can insert reviews"
  ON reviews FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read approved reviews"
  ON reviews FOR SELECT
  USING (approved = true OR is_admin());

CREATE POLICY "Admin can update reviews"
  ON reviews FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin can delete reviews"
  ON reviews FOR DELETE
  USING (is_admin());

-- Explicit grants (critical for fixing RLS violations)
GRANT INSERT ON TABLE reviews TO anon;
GRANT INSERT ON TABLE reviews TO authenticated;
GRANT SELECT ON TABLE reviews TO anon;
GRANT SELECT, UPDATE, DELETE ON TABLE reviews TO authenticated;

-- ============================================================
-- 2. ADMIN SETTINGS TABLE (single-row config)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  site_name TEXT DEFAULT 'Neural Aurora',
  site_description TEXT DEFAULT '',
  admin_email TEXT NOT NULL DEFAULT '',
  theme TEXT DEFAULT 'dark',
  maintenance_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read settings" ON admin_settings;
CREATE POLICY "Anyone can read settings"
  ON admin_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin can update settings" ON admin_settings;
CREATE POLICY "Admin can update settings"
  ON admin_settings FOR UPDATE
  USING (is_admin());

INSERT INTO admin_settings (id, site_name, admin_email)
VALUES (1, 'Neural Aurora', '')
ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON TABLE admin_settings TO anon;
GRANT SELECT, UPDATE ON TABLE admin_settings TO authenticated;

-- ============================================================
-- 3. UPDATE PROFILE CREATION TRIGGER (auth restriction)
-- Only the email stored in admin_settings.admin_email can be admin
-- ============================================================
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
      WHEN allowed_email IS NOT NULL AND allowed_email != '' AND NEW.email = allowed_email THEN 'admin'
      ELSE 'viewer'
    END
  );

  -- If no admin exists yet, make the first user admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    UPDATE public.profiles SET role = 'admin' WHERE id = NEW.id;
    UPDATE public.admin_settings SET admin_email = NEW.email WHERE id = 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. TEST DATA TEMPLATES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS test_data_templates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  template_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE test_data_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read test_data_templates" ON test_data_templates;
CREATE POLICY "Anyone can read test_data_templates"
  ON test_data_templates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin can insert test_data_templates" ON test_data_templates;
CREATE POLICY "Admin can insert test_data_templates"
  ON test_data_templates FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can delete test_data_templates" ON test_data_templates;
CREATE POLICY "Admin can delete test_data_templates"
  ON test_data_templates FOR DELETE
  USING (is_admin());

GRANT SELECT ON TABLE test_data_templates TO anon;
GRANT SELECT, INSERT, DELETE ON TABLE test_data_templates TO authenticated;

-- ============================================================
-- 5. TEST DATA GENERATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION generate_test_data(
  p_category TEXT,
  p_count INT DEFAULT 3
)
RETURNS TEXT AS $$
DECLARE
  i INT;
  inserted INT := 0;
  random_suffix TEXT;
BEGIN
  FOR i IN 1..p_count LOOP
    random_suffix := substr(md5(random()::text), 1, 8);

    CASE p_category
      WHEN 'projects' THEN
        INSERT INTO projects (project_id, title, description, technologies, image, display_order)
        VALUES (
          'test-' || random_suffix,
          'Test Project ' || i || ' - ' || random_suffix,
          'A sample project for testing purposes. Built with modern technologies.',
          ARRAY['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
          'https://picsum.photos/seed/' || random_suffix || '/600/400',
          (SELECT COALESCE(MAX(display_order), 0) + 1 FROM projects)
        );
        inserted := inserted + 1;

      WHEN 'skills' THEN
        INSERT INTO skills (name, level, category, display_order)
        VALUES (
          'Test Skill ' || i,
          50 + floor(random() * 50)::INT,
          (ARRAY['frontend', 'backend', 'language', 'devops', 'design'])[floor(random() * 5 + 1)::INT],
          (SELECT COALESCE(MAX(display_order), 0) + 1 FROM skills)
        );
        inserted := inserted + 1;

      WHEN 'education' THEN
        INSERT INTO education (edu_id, degree, school, year, description, display_order)
        VALUES (
          'test-' || random_suffix,
          'Test Degree ' || i,
          'Test University',
          '20' || floor(random() * 24 + 20)::TEXT,
          'Sample education entry for testing.',
          (SELECT COALESCE(MAX(display_order), 0) + 1 FROM education)
        );
        inserted := inserted + 1;

      WHEN 'experience' THEN
        INSERT INTO experience (exp_id, role, company, year, description, display_order)
        VALUES (
          'test-' || random_suffix,
          'Test Role ' || i,
          'Test Company',
          '20' || floor(random() * 24 + 20)::TEXT || '-Present',
          'Sample experience entry for testing.',
          (SELECT COALESCE(MAX(display_order), 0) + 1 FROM experience)
        );
        inserted := inserted + 1;

      WHEN 'blog' THEN
        INSERT INTO blog_posts (post_id, title, slug, excerpt, content, date, read_time, tags)
        VALUES (
          'test-' || random_suffix,
          'Test Blog Post ' || i,
          'test-blog-' || random_suffix,
          'A sample blog post excerpt for testing purposes.',
          '# Test Content\n\nThis is sample blog content for testing.\n\n## Features\n\n- Test feature 1\n- Test feature 2',
          to_char(NOW() - (random() * interval '30 days'), 'YYYY-MM-DD'),
          '3 min read',
          ARRAY['Test', 'Sample', 'Development']
        );
        inserted := inserted + 1;

      WHEN 'reviews' THEN
        INSERT INTO reviews (name, email, rating, message, approved)
        VALUES (
          'Test User ' || i,
          'testuser' || i || '@example.com',
          floor(random() * 3 + 3)::INT,
          'This is a sample review generated for testing purposes. Great work!',
          random() > 0.5
        );
        inserted := inserted + 1;

      WHEN 'case_studies' THEN
        INSERT INTO case_studies (cs_id, title, description, outcome, tech, display_order)
        VALUES (
          'test-' || random_suffix,
          'Test Case Study ' || i,
          'A sample case study description.',
          'Successfully delivered the project on time.',
          ARRAY['React', 'Node.js', 'AWS'],
          (SELECT COALESCE(MAX(display_order), 0) + 1 FROM case_studies)
        );
        inserted := inserted + 1;

      ELSE
        RETURN 'Unknown category: ' || p_category;
    END CASE;
  END LOOP;

  RETURN 'Inserted ' || inserted || ' ' || p_category || ' successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. FUNCTION TO SET ADMIN EMAIL (for auth restriction)
-- ============================================================
CREATE OR REPLACE FUNCTION set_admin_email(p_email TEXT)
RETURNS TEXT AS $$
BEGIN
  UPDATE admin_settings SET admin_email = p_email, updated_at = NOW() WHERE id = 1;

  -- Update existing profile if exists
  UPDATE profiles SET role = 'admin' WHERE email = p_email;

  RETURN 'Admin email set to: ' || p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. CONTACT MESSAGES TABLE (for contact form submissions)
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert contact_messages" ON contact_messages;
CREATE POLICY "Anyone can insert contact_messages"
  ON contact_messages FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can read contact_messages" ON contact_messages;
CREATE POLICY "Admin can read contact_messages"
  ON contact_messages FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can update contact_messages" ON contact_messages;
CREATE POLICY "Admin can update contact_messages"
  ON contact_messages FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete contact_messages" ON contact_messages;
CREATE POLICY "Admin can delete contact_messages"
  ON contact_messages FOR DELETE
  USING (is_admin());

GRANT INSERT ON TABLE contact_messages TO anon;
GRANT INSERT ON TABLE contact_messages TO authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE contact_messages TO authenticated;

-- ============================================================
-- 8. FUNCTION TO GET ADMIN SETTINGS
-- ============================================================
CREATE OR REPLACE FUNCTION get_admin_settings()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT to_jsonb(admin_settings.*) INTO result FROM admin_settings WHERE id = 1;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
