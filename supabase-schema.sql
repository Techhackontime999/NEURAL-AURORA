-- ============================================================
-- NEURAL AURORA - Supabase Database Schema
-- Run this in Supabase SQL Editor to set up your database
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE (extends Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup (restricted by configured admin_email)
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Backfill profile row for signed-in user if missing
CREATE OR REPLACE FUNCTION ensure_my_profile()
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  INSERT INTO public.profiles (id, email, role)
  VALUES (v_user_id, v_email, 'viewer')
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION ensure_my_profile TO authenticated;

-- ============================================================
-- PERSONAL INFO
-- ============================================================
CREATE TABLE IF NOT EXISTS personal_info (
  id BIGINT PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'Amit Kumar',
  handle TEXT DEFAULT 'Techhackontime999',
  title TEXT DEFAULT 'Full-Stack Developer & UI/UX Architect',
  tagline TEXT DEFAULT 'Crafting digital experiences where neural networks meet aurora light',
  bio TEXT DEFAULT '',
  avatar TEXT DEFAULT '/images/profile.jpg',
  resume TEXT DEFAULT '/resume.pdf',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default row
INSERT INTO personal_info (id, name, handle, title, tagline, bio, avatar, resume)
VALUES (1, 'Amit Kumar', 'Techhackontime999', 'Full-Stack Developer & UI/UX Architect',
        'Crafting digital experiences where neural networks meet aurora light',
        'A passionate developer who builds immersive digital experiences at the intersection of creative design and engineering.',
        '/images/profile.jpg', '/resume.pdf')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SOCIAL LINKS
-- ============================================================
CREATE TABLE IF NOT EXISTS social_links (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'link',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SKILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS skills (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  level INT NOT NULL DEFAULT 50 CHECK (level >= 0 AND level <= 100),
  category TEXT NOT NULL DEFAULT 'frontend',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  technologies TEXT[] DEFAULT '{}',
  image TEXT DEFAULT '/images/project-placeholder.png',
  images TEXT[] NOT NULL DEFAULT '{}',
  github TEXT,
  link TEXT,
  demo TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EDUCATION
-- ============================================================
CREATE TABLE IF NOT EXISTS education (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  edu_id TEXT NOT NULL UNIQUE,
  degree TEXT NOT NULL,
  school TEXT NOT NULL,
  year TEXT NOT NULL,
  description TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPERIENCE
-- ============================================================
CREATE TABLE IF NOT EXISTS experience (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  exp_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  year TEXT NOT NULL,
  description TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BLOG POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS blog_posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  date TEXT NOT NULL,
  read_time TEXT DEFAULT '5 min read',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CASE STUDIES
-- ============================================================
CREATE TABLE IF NOT EXISTS case_studies (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cs_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  outcome TEXT DEFAULT '',
  content TEXT DEFAULT '',
  tech TEXT[] DEFAULT '{}',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ============================================================
-- CONTACT MESSAGES
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

CREATE POLICY "Anyone can insert contact_messages"
  ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can read contact_messages"
  ON contact_messages FOR SELECT USING (is_admin());
CREATE POLICY "Admin can update contact_messages"
  ON contact_messages FOR UPDATE USING (is_admin());
CREATE POLICY "Admin can delete contact_messages"
  ON contact_messages FOR DELETE USING (is_admin());

GRANT INSERT ON TABLE contact_messages TO anon;
GRANT SELECT, UPDATE, DELETE ON TABLE contact_messages TO authenticated;

-- ============================================================
-- ADMIN SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  site_name TEXT DEFAULT 'Neural Aurora',
  site_description TEXT DEFAULT '',
  admin_email TEXT NOT NULL DEFAULT '',
  theme TEXT DEFAULT 'dark',
  maintenance_mode BOOLEAN DEFAULT FALSE,
  crm_url TEXT DEFAULT '',
  youtube_channel_id TEXT DEFAULT '',
  -- Admin-managed Video Hero showcase (dark/light videos, copy, quick links).
  -- JSONB so new fields can ship without another migration; '{}' means
  -- "use the built-in defaults".
  video_hero JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Admin-managed store hero carousel (src/lib/storeHeroDefaults.js).
  store_hero JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Admin-managed site appearance (colors, fonts, default theme) from
  -- /admin/appearance. '{}' means "use the built-in defaults"
  -- (src/lib/appearanceDefaults.js).
  appearance JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Public support/donation configuration. This is exposed through the
  -- public_site_settings view; never store secrets in this document.
  payment_settings JSONB DEFAULT '{}'::jsonb,
  -- Admin-managed signature block (enabled, url, name, title) used on licence
  -- PDFs and product detail. The image lives in the public portfolio-images
  -- bucket; no secrets belong in this document.
  document_signature JSONB NOT NULL DEFAULT '{}'::jsonb,
  docs_url TEXT DEFAULT '',
  whatsapp_number TEXT DEFAULT '',
  appointment_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
-- SEC-006: the table is admin-only. Public branding columns are exposed
-- through the explicit allowlist view created below.
CREATE POLICY "Admins can read all settings" ON admin_settings FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admin can update settings" ON admin_settings FOR UPDATE USING (is_admin());
GRANT SELECT, UPDATE ON TABLE admin_settings TO authenticated;

-- Public allowlist. Never add admin_email to this view.
CREATE OR REPLACE VIEW public_site_settings AS
SELECT
  id, site_name, site_description, theme, maintenance_mode,
  crm_url, youtube_channel_id, docs_url, video_hero, store_hero,
  appearance, payment_settings, document_signature,
  created_at, updated_at, whatsapp_number, appointment_settings
FROM admin_settings
WHERE id = 1;
ALTER VIEW public_site_settings SET (security_barrier = true);
GRANT SELECT ON TABLE public_site_settings TO anon, authenticated;

INSERT INTO admin_settings (id, site_name, admin_email)
VALUES (1, 'Neural Aurora', '') ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TEST DATA TEMPLATES
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
CREATE POLICY "Anyone can read test_data_templates" ON test_data_templates FOR SELECT USING (true);
CREATE POLICY "Admin can insert test_data_templates" ON test_data_templates FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin can delete test_data_templates" ON test_data_templates FOR DELETE USING (is_admin());
GRANT SELECT ON TABLE test_data_templates TO anon;
GRANT SELECT, INSERT, DELETE ON TABLE test_data_templates TO authenticated;



-- ============================================================
-- TEST DATA GENERATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION generate_test_data(p_category TEXT, p_count INT DEFAULT 3)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  i INT; inserted INT := 0; random_suffix TEXT;
BEGIN
  IF p_count IS NULL OR p_count < 1 OR p_count > 25 THEN
    RAISE EXCEPTION 'p_count must be between 1 and 25';
  END IF;
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can generate test data';
  END IF;

  FOR i IN 1..p_count LOOP
    random_suffix := substr(md5(random()::text), 1, 8);
    CASE p_category
      WHEN 'projects' THEN
        INSERT INTO projects (project_id, title, description, technologies, image, display_order)
        VALUES ('test-' || random_suffix, 'Test Project ' || i, 'Sample project.', ARRAY['React','Node.js'], 'https://picsum.photos/seed/' || random_suffix || '/600/400', (SELECT COALESCE(MAX(display_order),0)+1 FROM projects));
      WHEN 'skills' THEN
        INSERT INTO skills (name, level, category, display_order)
        VALUES ('Test Skill ' || i, 50+(random()*50)::INT, (ARRAY['frontend','backend'])[(random()*2+1)::INT], (SELECT COALESCE(MAX(display_order),0)+1 FROM skills));
      WHEN 'education' THEN
        INSERT INTO education (edu_id, degree, school, year, description, display_order)
        VALUES ('test-'||random_suffix, 'Test Degree', 'Test Uni', '2024', 'Sample.', (SELECT COALESCE(MAX(display_order),0)+1 FROM education));
      WHEN 'experience' THEN
        INSERT INTO experience (exp_id, role, company, year, description, display_order)
        VALUES ('test-'||random_suffix, 'Test Role', 'Test Co', '2024-Present', 'Sample.', (SELECT COALESCE(MAX(display_order),0)+1 FROM experience));
      WHEN 'blog' THEN
        INSERT INTO blog_posts (post_id, title, slug, excerpt, content, date, read_time, tags)
        VALUES ('test-'||random_suffix, 'Test Post', 'test-'||random_suffix, 'Excerpt', 'Content', NOW()::date, '3 min', ARRAY['Test']);
      WHEN 'reviews' THEN
        INSERT INTO reviews (name, email, rating, message, approved)
        VALUES ('Test User', 'test@test.com', 5, 'Great!', FALSE);
      WHEN 'case_studies' THEN
        INSERT INTO case_studies (cs_id, title, slug, description, outcome, content, tech, display_order)
        VALUES ('test-'||random_suffix, 'Test CS', 'test-'||random_suffix, 'Desc', 'Done', 'Content', ARRAY['React'], (SELECT COALESCE(MAX(display_order),0)+1 FROM case_studies));
      WHEN 'services' THEN
        INSERT INTO services (service_id, icon_name, title, tagline, description, features, display_order)
        VALUES (
          'test-'||random_suffix,
          (ARRAY['Globe','Palette','Lightbulb','MessageCircle','Code','Server','Zap','Star'])[(random()*8+1)::INT],
          (ARRAY['Web Development','UI/UX Design','Technical Consulting','Custom Projects','Cloud Architecture','Mobile Development'])[(random()*6+1)::INT] || ' ' || i,
          (ARRAY['Full-stack applications that perform','Interfaces people love to use','Strategic guidance for your stack','Unique problems need unique solutions'])[(random()*4+1)::INT],
          'A sample service offering with professional quality and attention to detail.',
          ARRAY['Feature A','Feature B','Feature C','Feature D'],
          (SELECT COALESCE(MAX(display_order),0)+1 FROM services)
        );
      ELSE RETURN 'Unknown: '||p_category;
    END CASE;
    inserted := inserted + 1;
  END LOOP;
  RETURN 'Inserted '||inserted||' '||p_category;
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_test_data(TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_test_data(TEXT, INT) TO authenticated, service_role;

-- ============================================================
-- ADMIN HELPER FUNCTIONS
-- ============================================================
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

REVOKE EXECUTE ON FUNCTION set_admin_email(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_admin_email(TEXT) TO service_role;

-- ============================================================
-- REVIEWS / FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_data_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Helper: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Email-based entitlement matching is only safe for a confirmed session email.
CREATE OR REPLACE FUNCTION current_user_has_verified_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND coalesce(p_email, '') <> ''
      AND lower(coalesce(u.email, '')) = lower(p_email)
  );
$$;

REVOKE EXECUTE ON FUNCTION current_user_has_verified_email(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION current_user_has_verified_email(TEXT) TO authenticated, service_role;

-- PROFILES: users can read their own, admins can read all
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'viewer');

DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

-- PERSONAL INFO: anyone can read, only admin can write
DROP POLICY IF EXISTS "Anyone can read personal_info" ON personal_info;
CREATE POLICY "Anyone can read personal_info"
  ON personal_info FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admin can insert personal_info" ON personal_info;
CREATE POLICY "Admin can insert personal_info"
  ON personal_info FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update personal_info" ON personal_info;
CREATE POLICY "Admin can update personal_info"
  ON personal_info FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete personal_info" ON personal_info;
CREATE POLICY "Admin can delete personal_info"
  ON personal_info FOR DELETE
  USING (is_admin());

-- SOCIAL LINKS: anyone can read, only admin can write
DROP POLICY IF EXISTS "Anyone can read social_links" ON social_links;
CREATE POLICY "Anyone can read social_links"
  ON social_links FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admin can insert social_links" ON social_links;
CREATE POLICY "Admin can insert social_links"
  ON social_links FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update social_links" ON social_links;
CREATE POLICY "Admin can update social_links"
  ON social_links FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete social_links" ON social_links;
CREATE POLICY "Admin can delete social_links"
  ON social_links FOR DELETE
  USING (is_admin());

-- SKILLS: anyone can read, only admin can write
DROP POLICY IF EXISTS "Anyone can read skills" ON skills;
CREATE POLICY "Anyone can read skills"
  ON skills FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admin can insert skills" ON skills;
CREATE POLICY "Admin can insert skills"
  ON skills FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update skills" ON skills;
CREATE POLICY "Admin can update skills"
  ON skills FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete skills" ON skills;
CREATE POLICY "Admin can delete skills"
  ON skills FOR DELETE
  USING (is_admin());

-- PROJECTS: anyone can read, only admin can write
DROP POLICY IF EXISTS "Anyone can read projects" ON projects;
CREATE POLICY "Anyone can read projects"
  ON projects FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admin can insert projects" ON projects;
CREATE POLICY "Admin can insert projects"
  ON projects FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update projects" ON projects;
CREATE POLICY "Admin can update projects"
  ON projects FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete projects" ON projects;
CREATE POLICY "Admin can delete projects"
  ON projects FOR DELETE
  USING (is_admin());

-- EDUCATION: anyone can read, only admin can write
DROP POLICY IF EXISTS "Anyone can read education" ON education;
CREATE POLICY "Anyone can read education"
  ON education FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admin can insert education" ON education;
CREATE POLICY "Admin can insert education"
  ON education FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update education" ON education;
CREATE POLICY "Admin can update education"
  ON education FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete education" ON education;
CREATE POLICY "Admin can delete education"
  ON education FOR DELETE
  USING (is_admin());

-- EXPERIENCE: anyone can read, only admin can write
DROP POLICY IF EXISTS "Anyone can read experience" ON experience;
CREATE POLICY "Anyone can read experience"
  ON experience FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admin can insert experience" ON experience;
CREATE POLICY "Admin can insert experience"
  ON experience FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update experience" ON experience;
CREATE POLICY "Admin can update experience"
  ON experience FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete experience" ON experience;
CREATE POLICY "Admin can delete experience"
  ON experience FOR DELETE
  USING (is_admin());

-- BLOG POSTS: anyone can read, only admin can write
DROP POLICY IF EXISTS "Anyone can read blog_posts" ON blog_posts;
CREATE POLICY "Anyone can read blog_posts"
  ON blog_posts FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admin can insert blog_posts" ON blog_posts;
CREATE POLICY "Admin can insert blog_posts"
  ON blog_posts FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update blog_posts" ON blog_posts;
CREATE POLICY "Admin can update blog_posts"
  ON blog_posts FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete blog_posts" ON blog_posts;
CREATE POLICY "Admin can delete blog_posts"
  ON blog_posts FOR DELETE
  USING (is_admin());

-- CASE STUDIES: anyone can read, only admin can write
DROP POLICY IF EXISTS "Anyone can read case_studies" ON case_studies;
CREATE POLICY "Anyone can read case_studies"
  ON case_studies FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admin can insert case_studies" ON case_studies;
CREATE POLICY "Admin can insert case_studies"
  ON case_studies FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update case_studies" ON case_studies;
CREATE POLICY "Admin can update case_studies"
  ON case_studies FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete case_studies" ON case_studies;
CREATE POLICY "Admin can delete case_studies"
  ON case_studies FOR DELETE
  USING (is_admin());

-- CONTACT MESSAGES: anyone can insert, admin can manage
DROP POLICY IF EXISTS "Anyone can insert contact_messages" ON contact_messages;
CREATE POLICY "Anyone can insert contact_messages"
  ON contact_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can read contact_messages" ON contact_messages;
CREATE POLICY "Admin can read contact_messages"
  ON contact_messages FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admin can update contact_messages" ON contact_messages;
CREATE POLICY "Admin can update contact_messages"
  ON contact_messages FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete contact_messages" ON contact_messages;
CREATE POLICY "Admin can delete contact_messages"
  ON contact_messages FOR DELETE USING (is_admin());

-- ADMIN SETTINGS: admins read the table; anon reads the public allowlist view
DROP POLICY IF EXISTS "Anyone can read settings" ON admin_settings;
DROP POLICY IF EXISTS "Admins can read all settings" ON admin_settings;
CREATE POLICY "Admins can read all settings"
  ON admin_settings FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admin can update settings" ON admin_settings;
CREATE POLICY "Admin can update settings"
  ON admin_settings FOR UPDATE USING (is_admin());

-- TEST DATA TEMPLATES: anyone can read, admin can write
DROP POLICY IF EXISTS "Anyone can read test_data_templates" ON test_data_templates;
CREATE POLICY "Anyone can read test_data_templates"
  ON test_data_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can insert test_data_templates" ON test_data_templates;
CREATE POLICY "Admin can insert test_data_templates"
  ON test_data_templates FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can delete test_data_templates" ON test_data_templates;
CREATE POLICY "Admin can delete test_data_templates"
  ON test_data_templates FOR DELETE USING (is_admin());

-- REVIEWS: anyone may submit, but nobody outside admin moderation can approve.
CREATE OR REPLACE FUNCTION force_unapproved_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.approved := FALSE;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_force_unapproved ON reviews;
CREATE TRIGGER reviews_force_unapproved
  BEFORE INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION force_unapproved_review();

DROP POLICY IF EXISTS "Anyone can insert reviews" ON reviews;
CREATE POLICY "Anyone can insert reviews"
  ON reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (approved = FALSE);

DROP POLICY IF EXISTS "Anyone can read approved reviews" ON reviews;
CREATE POLICY "Anyone can read approved reviews"
  ON reviews FOR SELECT
  USING (approved = TRUE OR is_admin());

DROP POLICY IF EXISTS "Admin can update reviews" ON reviews;
CREATE POLICY "Admin can update reviews"
  ON reviews FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete reviews" ON reviews;
CREATE POLICY "Admin can delete reviews"
  ON reviews FOR DELETE
  USING (is_admin());

-- ============================================================
-- ROLE PERMISSIONS (required for RLS to work)
-- Without these GRANTs, anon/authenticated roles get
-- "violates row-level security policy" errors
-- ============================================================

-- Public portfolio content: anyone can read
GRANT SELECT ON TABLE personal_info TO anon;
GRANT SELECT ON TABLE social_links TO anon;
GRANT SELECT ON TABLE skills TO anon;
GRANT SELECT ON TABLE projects TO anon;
GRANT SELECT ON TABLE education TO anon;
GRANT SELECT ON TABLE experience TO anon;
GRANT SELECT ON TABLE blog_posts TO anon;
GRANT SELECT ON TABLE case_studies TO anon;

-- Contact messages: anyone can insert
GRANT INSERT ON TABLE contact_messages TO anon;
GRANT INSERT ON TABLE contact_messages TO authenticated;

-- Admin settings: admins read the table; anyone reads the public allowlist view
GRANT SELECT, UPDATE ON TABLE admin_settings TO authenticated;
GRANT SELECT ON TABLE public_site_settings TO anon, authenticated;

-- Test data templates: anyone can read
GRANT SELECT ON TABLE test_data_templates TO anon;
GRANT SELECT, INSERT, DELETE ON TABLE test_data_templates TO authenticated;

-- Reviews: anyone can insert and read approved reviews
GRANT INSERT ON TABLE reviews TO anon;
GRANT INSERT ON TABLE reviews TO authenticated;
GRANT SELECT ON TABLE reviews TO anon;

-- Authenticated users (admin): full CRUD on all portfolio tables
GRANT INSERT, UPDATE, DELETE ON TABLE personal_info TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE social_links TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE skills TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE projects TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE education TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE experience TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE blog_posts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE case_studies TO authenticated;

-- Reviews: authenticated users can approve/delete
GRANT SELECT, UPDATE, DELETE ON TABLE reviews TO authenticated;

-- Contact messages: authenticated users can manage
GRANT SELECT, UPDATE, DELETE ON TABLE contact_messages TO authenticated;

-- Profiles: authenticated users can read, insert and update
GRANT SELECT, INSERT, UPDATE ON TABLE profiles TO authenticated;

-- ============================================================
-- ADMIN DELETE USER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id UUID)
RETURNS void AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DEV ADS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS dev_ads (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  ad_type TEXT NOT NULL DEFAULT 'google' CHECK (ad_type IN ('google', 'youtube')),
  format TEXT NOT NULL DEFAULT 'video' CHECK (format IN ('video', 'short')),
  aspect_ratio TEXT NOT NULL DEFAULT '16/9' CHECK (aspect_ratio IN ('16/9', '4/3', '21/9', '1/1', '3/2', '16/10')),
  video_url TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  duration_seconds INT NOT NULL DEFAULT 30,
  active BOOLEAN DEFAULT TRUE,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dev_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active dev_ads" ON dev_ads;
CREATE POLICY "Anyone can read active dev_ads"
  ON dev_ads FOR SELECT
  USING (active = TRUE OR is_admin());

DROP POLICY IF EXISTS "Admin can insert dev_ads" ON dev_ads;
CREATE POLICY "Admin can insert dev_ads"
  ON dev_ads FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update dev_ads" ON dev_ads;
CREATE POLICY "Admin can update dev_ads"
  ON dev_ads FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete dev_ads" ON dev_ads;
CREATE POLICY "Admin can delete dev_ads"
  ON dev_ads FOR DELETE USING (is_admin());

GRANT SELECT ON TABLE dev_ads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE dev_ads TO authenticated;

CREATE OR REPLACE FUNCTION increment_ad_view_count(ad_id BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE dev_ads SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VISITOR STATS
-- ============================================================
CREATE TABLE IF NOT EXISTS visitor_stats (
  id BIGINT PRIMARY KEY DEFAULT 1,
  count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO visitor_stats (id, count) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE visitor_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visitor_stats"
  ON visitor_stats FOR SELECT
  USING (true);

GRANT SELECT ON TABLE visitor_stats TO anon;

CREATE OR REPLACE FUNCTION increment_visitor_count()
RETURNS BIGINT AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE visitor_stats
  SET count = count + 1, updated_at = NOW()
  WHERE id = 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_visitor_count TO anon;

-- ============================================================
-- STORAGE BUCKET for images
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-images', 'portfolio-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read on storage
CREATE POLICY "Anyone can view images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio-images');

-- Only admin can upload/update/delete images
CREATE POLICY "Admin can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'portfolio-images' AND is_admin());

CREATE POLICY "Admin can update images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'portfolio-images' AND is_admin());

CREATE POLICY "Admin can delete images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'portfolio-images' AND is_admin());

-- ============================================================
-- PAYMENTS TABLE & SECURITY
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_id TEXT NOT NULL,
  service_title TEXT NOT NULL,
  pricing_label TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  customer_email TEXT,
  customer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments (razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Legacy policies from 20260601150000 must not survive a consolidated install.
-- PostgreSQL OR-combines policies, so leaving either open policy defeats RLS.
DROP POLICY IF EXISTS "Anyone can insert payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON payments;
DROP POLICY IF EXISTS "Admins can view payments" ON payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON payments;
DROP POLICY IF EXISTS "Admins can update payments" ON payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON payments;

CREATE POLICY "Admins can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (is_admin());

REVOKE ALL ON TABLE payments FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE payments TO authenticated, service_role;

-- ============================================================
-- SERVICES & SERVICE PAGE TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_id TEXT NOT NULL UNIQUE,
  icon_name TEXT NOT NULL DEFAULT 'Globe',
  title TEXT NOT NULL,
  tagline TEXT DEFAULT '',
  description TEXT DEFAULT '',
  features TEXT[] DEFAULT '{}',
  price TEXT DEFAULT '',
  price_paise BIGINT DEFAULT 0,
  currency TEXT DEFAULT '₹',
  period TEXT DEFAULT '/project',
  delivery TEXT DEFAULT '',
  pricing JSONB DEFAULT '[]'::jsonb,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read services" ON services;
CREATE POLICY "Anyone can read services" ON services FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admin can insert services" ON services;
CREATE POLICY "Admin can insert services" ON services FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admin can update services" ON services;
CREATE POLICY "Admin can update services" ON services FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admin can delete services" ON services;
CREATE POLICY "Admin can delete services" ON services FOR DELETE USING (is_admin());
GRANT SELECT ON TABLE services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE services TO authenticated;

CREATE TABLE IF NOT EXISTS service_page (
  id BIGINT PRIMARY KEY DEFAULT 1,
  hero_title TEXT DEFAULT 'What I Can Do For You',
  hero_description TEXT DEFAULT 'Every project starts with a conversation. Here is how I can help turn your ideas into reality.',
  process_title TEXT DEFAULT 'How I Work',
  process_description TEXT DEFAULT 'A transparent, collaborative process designed to keep you informed and involved at every stage.',
  pricing_title TEXT DEFAULT 'Transparent Pricing',
  pricing_description TEXT DEFAULT 'No hidden fees. Every project is scoped and quoted upfront based on your specific needs.',
  testimonials_title TEXT DEFAULT 'What People Say',
  tech_title TEXT DEFAULT 'Technologies I Use',
  tech_description TEXT DEFAULT 'Modern tools for modern problems.',
  faq_title TEXT DEFAULT 'Frequently Asked Questions',
  stats JSONB DEFAULT '[]'::jsonb,
  process_steps JSONB DEFAULT '[]'::jsonb,
  packages JSONB DEFAULT '[]'::jsonb,
  testimonials JSONB DEFAULT '[]'::jsonb,
  tech_stack JSONB DEFAULT '[]'::jsonb,
  live_feed JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb,
  future_releases JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE service_page ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read service_page" ON service_page;
CREATE POLICY "Anyone can read service_page" ON service_page FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admin can insert service_page" ON service_page;
CREATE POLICY "Admin can insert service_page" ON service_page FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admin can update service_page" ON service_page;
CREATE POLICY "Admin can update service_page" ON service_page FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admin can delete service_page" ON service_page;
CREATE POLICY "Admin can delete service_page" ON service_page FOR DELETE USING (is_admin());
GRANT SELECT ON TABLE service_page TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE service_page TO authenticated;


-- ============================================================
-- CERTIFICATES, ACHIEVEMENTS & GALLERY
-- Public "Beyond the Code" (/more) content sections.
-- ============================================================

-- ============================================================
-- CERTIFICATES
-- ============================================================
CREATE TABLE IF NOT EXISTS certificates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cert_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  issuer TEXT DEFAULT '',
  issue_date TEXT DEFAULT '',
  credential_url TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read certificates" ON certificates;
CREATE POLICY "Anyone can read certificates"
  ON certificates FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admin can insert certificates" ON certificates;
CREATE POLICY "Admin can insert certificates"
  ON certificates FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admin can update certificates" ON certificates;
CREATE POLICY "Admin can update certificates"
  ON certificates FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admin can delete certificates" ON certificates;
CREATE POLICY "Admin can delete certificates"
  ON certificates FOR DELETE USING (is_admin());

GRANT SELECT ON TABLE certificates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE certificates TO authenticated;

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS achievements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  achievement_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  organization TEXT DEFAULT '',
  achieved_date TEXT DEFAULT '',
  description TEXT DEFAULT '',
  link_url TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read achievements" ON achievements;
CREATE POLICY "Anyone can read achievements"
  ON achievements FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admin can insert achievements" ON achievements;
CREATE POLICY "Admin can insert achievements"
  ON achievements FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admin can update achievements" ON achievements;
CREATE POLICY "Admin can update achievements"
  ON achievements FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admin can delete achievements" ON achievements;
CREATE POLICY "Admin can delete achievements"
  ON achievements FOR DELETE USING (is_admin());

GRANT SELECT ON TABLE achievements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE achievements TO authenticated;

-- ============================================================
-- GALLERY
-- ============================================================
CREATE TABLE IF NOT EXISTS gallery (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gallery_id TEXT NOT NULL UNIQUE,
  title TEXT DEFAULT '',
  category TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  description TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read gallery" ON gallery;
CREATE POLICY "Anyone can read gallery"
  ON gallery FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admin can insert gallery" ON gallery;
CREATE POLICY "Admin can insert gallery"
  ON gallery FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admin can update gallery" ON gallery;
CREATE POLICY "Admin can update gallery"
  ON gallery FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admin can delete gallery" ON gallery;
CREATE POLICY "Admin can delete gallery"
  ON gallery FOR DELETE USING (is_admin());

GRANT SELECT ON TABLE gallery TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE gallery TO authenticated;

-- ============================================================
-- RESUMES
-- ============================================================
CREATE TABLE IF NOT EXISTS resumes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  resume_id TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT DEFAULT '',
  description TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read resumes" ON resumes;
CREATE POLICY "Anyone can read resumes"
  ON resumes FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admin can insert resumes" ON resumes;
CREATE POLICY "Admin can insert resumes"
  ON resumes FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admin can update resumes" ON resumes;
CREATE POLICY "Admin can update resumes"
  ON resumes FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admin can delete resumes" ON resumes;
CREATE POLICY "Admin can delete resumes"
  ON resumes FOR DELETE USING (is_admin());

GRANT SELECT ON TABLE resumes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE resumes TO authenticated;


-- ===========================================================================
-- DIGITAL PRODUCTS STORE
-- Catalogue, orders, entitlements and private storage.
-- Appended from supabase/migrations/2026101800000{0,1,2,3}_*.sql
-- ===========================================================================

-- >>> supabase/migrations/20261018000000_create_digital_products.sql

-- ============================================================
-- DIGITAL PRODUCTS — catalogue (Phase A)
-- Adds a first-party digital store to NEURAL AURORA.
-- Additive only: does not touch services, payments or portfolio data.
-- ============================================================

-- ------------------------------------------------------------
-- Configurable product categories.
-- Kept in the database (not hardcoded) so new categories can be
-- added from the admin dashboard without a code change.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon_name TEXT DEFAULT 'Package',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read product_categories" ON product_categories;
CREATE POLICY "Anyone can read product_categories"
  ON product_categories FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admin can insert product_categories" ON product_categories;
CREATE POLICY "Admin can insert product_categories"
  ON product_categories FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admin can update product_categories" ON product_categories;
CREATE POLICY "Admin can update product_categories"
  ON product_categories FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admin can delete product_categories" ON product_categories;
CREATE POLICY "Admin can delete product_categories"
  ON product_categories FOR DELETE USING (is_admin());

GRANT SELECT ON TABLE product_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE product_categories TO authenticated;

-- ------------------------------------------------------------
-- PRODUCTS
-- Money is stored as INTEGER minor units (paise for INR) so no
-- float arithmetic is ever used for an authoritative total.
-- No private storage path lives on this table: the public product
-- representation is safe to expose under the RLS policy below.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  short_description TEXT DEFAULT '',
  description TEXT DEFAULT '',
  category_slug TEXT REFERENCES product_categories(slug) ON DELETE SET NULL,
  format TEXT DEFAULT '',
  price_paise INTEGER NOT NULL DEFAULT 0 CHECK (price_paise >= 0),
  compare_at_paise INTEGER CHECK (compare_at_paise IS NULL OR compare_at_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  -- Derived, so it can never drift from price_paise.
  is_free BOOLEAN GENERATED ALWAYS AS (price_paise = 0) STORED,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  -- Opt-in: only these products may receive an approved contributor grant.
  contributor_access BOOLEAN NOT NULL DEFAULT FALSE,
  cover_image_url TEXT DEFAULT '',
  gallery_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  includes JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  license_type TEXT DEFAULT '',
  license_summary TEXT DEFAULT '',
  document_policy TEXT NOT NULL DEFAULT 'license'
    CHECK (document_policy IN ('license', 'receipt')),
  support_policy TEXT DEFAULT '',
  refund_policy TEXT DEFAULT '',
  faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  version TEXT DEFAULT '1.0.0',
  release_notes TEXT DEFAULT '',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT products_currency_supported CHECK (currency IN ('INR', 'USD')),
  CONSTRAINT products_compare_at_gt_price
    CHECK (compare_at_paise IS NULL OR compare_at_paise >= price_paise)
);

-- Only published products are publicly visible/purchasable; admins see all.
CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_slug);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products (featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_contributor_access ON products (contributor_access) WHERE contributor_access = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_published_at ON products (published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price_paise);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN (tags);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published products" ON products;
CREATE POLICY "Public can read published products"
  ON products FOR SELECT
  USING (status = 'published' OR is_admin());

DROP POLICY IF EXISTS "Admin can insert products" ON products;
CREATE POLICY "Admin can insert products"
  ON products FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update products" ON products;
CREATE POLICY "Admin can update products"
  ON products FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete products" ON products;
CREATE POLICY "Admin can delete products"
  ON products FOR DELETE USING (is_admin());

GRANT SELECT ON TABLE products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE products TO authenticated;

-- ------------------------------------------------------------
-- PRODUCT FILES
-- Paid downloads live in a PRIVATE bucket. Deliberately there is
-- NO public SELECT policy here: the public catalogue must never
-- receive a storage path. Only admins and the server (service_role)
-- can read these rows, and delivery always goes through a short
-- lived signed URL minted server-side after entitlement checks.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_files (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  version TEXT NOT NULL DEFAULT '1.0.0',
  is_preview BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_files_product ON product_files (product_id);

ALTER TABLE product_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read product_files" ON product_files;
CREATE POLICY "Admin can read product_files"
  ON product_files FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "Admin can insert product_files" ON product_files;
CREATE POLICY "Admin can insert product_files"
  ON product_files FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admin can update product_files" ON product_files;
CREATE POLICY "Admin can update product_files"
  ON product_files FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admin can delete product_files" ON product_files;
CREATE POLICY "Admin can delete product_files"
  ON product_files FOR DELETE USING (is_admin());

-- anon gets nothing at all on product_files.
REVOKE ALL ON TABLE product_files FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE product_files TO authenticated;

-- ------------------------------------------------------------
-- Seed the default categories from the product strategy.
-- ON CONFLICT DO NOTHING keeps this reproducible and non
-- destructive: an admin who edits a seeded row keeps their edit.
-- ------------------------------------------------------------
INSERT INTO product_categories (slug, label, description, icon_name, display_order) VALUES
  ('developer-tools',  'Developer Tools & Source Code', 'Reusable source code, scripts and developer utilities.',        'Code',        1),
  ('templates',        'Starter Kits & Templates',      'Website templates and software starter kits.',                  'LayoutGrid',  2),
  ('ui-kits',          'UI Kits & Design Resources',    'Design systems, component libraries and visual assets.',        'Palette',     3),
  ('ebooks',           'Ebooks, PDFs & Guides',         'Technical books, PDFs and in-depth guides.',                    'BookOpen',    4),
  ('ai-resources',     'AI Prompts & Automations',      'Prompt packs, agent resources and automation workflows.',       'Bot',         5),
  ('learning',         'Learning & Roadmaps',           'Roadmaps, cheat sheets and structured learning material.',      'GraduationCap', 6),
  ('free',             'Free Resources',                'Free downloads and open resources.',                            'Gift',        7)
ON CONFLICT (slug) DO NOTHING;

-- >>> supabase/migrations/20261018000001_create_digital_orders.sql

-- ============================================================
-- DIGITAL PRODUCTS — orders & payments (Phase D foundation)
-- Integer minor units (paise) throughout. Additive only: the
-- legacy `payments` table is left untouched so existing service
-- payment history and its webhook keep working unchanged.
-- ============================================================

-- ------------------------------------------------------------
-- ORDERS
-- One row per checkout attempt. `provider_order_id` ties it to
-- the Razorpay order created server-side. `payment_status` only
-- ever moves to 'paid' via server-side webhook verification.
--
-- `customer_phone` is optional and stored digits-only in
-- international form, so the admin can send a sign-in link over
-- WhatsApp when email delivery is unavailable.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_ref TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  customer_name TEXT DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT UNIQUE,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  currency TEXT NOT NULL DEFAULT 'INR',
  subtotal_paise BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_paise >= 0),
  discount_paise BIGINT NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
  total_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_paise >= 0),
  -- Canonical codes applied at checkout (kept if the code is later deleted).
  coupon_code_snapshot TEXT NOT NULL DEFAULT '',
  affiliate_code_snapshot TEXT NOT NULL DEFAULT '',
  failure_reason TEXT DEFAULT '',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- A paid order can never have paid_at left empty.
  CONSTRAINT orders_paid_requires_timestamp
    CHECK (payment_status <> 'paid' OR paid_at IS NOT NULL),
  CONSTRAINT orders_total_is_consistent
    CHECK (total_paise = subtotal_paise - discount_paise)
);

CREATE INDEX IF NOT EXISTS idx_orders_email ON orders (lower(email));
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Admins see everything. A signed-in customer sees only orders they
-- placed while authenticated. Guests are deliberately NOT granted a
-- read path here: knowing an email or order ref must never reveal a
-- purchase history. Guest recovery goes through the server endpoint
-- with a signed, expiring claim token instead.
DROP POLICY IF EXISTS "Admin can read orders" ON orders;
CREATE POLICY "Admin can read orders"
  ON orders FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Users can read own orders" ON orders;
CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can update orders" ON orders;
CREATE POLICY "Admin can update orders"
  ON orders FOR UPDATE USING (is_admin());

-- Order rows are written exclusively by the serverless functions
-- with the service role, which bypasses RLS. No client insert path.
REVOKE ALL ON TABLE orders FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON TABLE orders TO authenticated;

-- ------------------------------------------------------------
-- ORDER ITEMS
-- Title/price are snapshotted immutably so an admin editing a
-- product later can never rewrite what a customer actually paid.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_paise BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_paise >= 0),
  total_price_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_price_paise >= 0),
  product_title_snapshot TEXT NOT NULL,
  product_slug_snapshot TEXT NOT NULL,
  product_version_snapshot TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT order_items_total_matches
    CHECK (total_price_paise = unit_price_paise * quantity)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (product_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read order_items" ON order_items;
CREATE POLICY "Admin can read order_items"
  ON order_items FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Users can read own order_items" ON order_items;
CREATE POLICY "Users can read own order_items"
  ON order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.user_id = auth.uid()
  ));

REVOKE ALL ON TABLE order_items FROM PUBLIC, anon;
GRANT SELECT ON TABLE order_items TO authenticated;

-- ------------------------------------------------------------
-- PAYMENT TRANSACTIONS
-- One row per gateway payment attempt. `signature_valid` records
-- whether the gateway signature was actually verified, so a
-- recorded transaction can never be mistaken for a verified one.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (amount_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created',
  signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
  event_type TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_order ON payment_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_provider_order ON payment_transactions (provider_order_id);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read payment_transactions" ON payment_transactions;
CREATE POLICY "Admin can read payment_transactions"
  ON payment_transactions FOR SELECT TO authenticated USING (is_admin());

REVOKE ALL ON TABLE payment_transactions FROM PUBLIC, anon;
GRANT SELECT ON TABLE payment_transactions TO authenticated;

-- >>> supabase/migrations/20261018000002_create_digital_entitlements.sql

-- ============================================================
-- DIGITAL PRODUCTS — entitlements & secure delivery (Phase E)
-- An entitlement is the single source of truth for "may this
-- customer have this file". Nothing downloads without one.
-- ============================================================

-- ------------------------------------------------------------
-- ENTITLEMENTS
-- `source` distinguishes a paid purchase from a free acquisition.
-- For paid rows the entitlement is keyed to the immutable order
-- item, so replaying a webhook can never mint a second grant.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entitlements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id BIGINT REFERENCES order_items(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT,
  source TEXT NOT NULL DEFAULT 'purchase'
    CHECK (source IN ('purchase', 'free', 'gift', 'comp', 'approved_contributor_personal')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- A revocation must be timestamped; an active grant must not be.
  CONSTRAINT entitlements_revoked_requires_timestamp
    CHECK (status <> 'revoked' OR revoked_at IS NOT NULL)
);

-- One grant per purchased line item — this is the replay guard.
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_per_item
  ON entitlements (product_id, order_item_id)
  WHERE order_item_id IS NOT NULL;

-- One non-purchase grant per product/email/source. Source-aware so
-- approved contributor personal grants do not collide with other grants.
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_nonpurchase_email_source
  ON entitlements (product_id, lower(customer_email), source)
  WHERE order_item_id IS NULL AND customer_email IS NOT NULL;

-- One non-purchase grant per product/user/source when no email is present.
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_nonpurchase_user_source
  ON entitlements (product_id, user_id, source)
  WHERE order_item_id IS NULL AND user_id IS NOT NULL AND customer_email IS NULL;

CREATE INDEX IF NOT EXISTS idx_entitlements_product ON entitlements (product_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_user ON entitlements (user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_email ON entitlements (lower(customer_email));
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON entitlements (status);

ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

-- Admins see all. A signed-in customer sees only their own active
-- grants (matched by user_id, or by the email on their verified
-- session). No anon access: a guest must prove ownership through
-- the server-side claim flow rather than by knowing an address.
DROP POLICY IF EXISTS "Admin can read entitlements" ON entitlements;
CREATE POLICY "Admin can read entitlements"
  ON entitlements FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Users can read own entitlements" ON entitlements;
CREATE POLICY "Users can read own entitlements"
  ON entitlements FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND (
      user_id = auth.uid()
      OR lower(coalesce(customer_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

DROP POLICY IF EXISTS "Admin can update entitlements" ON entitlements;
CREATE POLICY "Admin can update entitlements"
  ON entitlements FOR UPDATE USING (is_admin());

REVOKE ALL ON TABLE entitlements FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON TABLE entitlements TO authenticated;

-- ------------------------------------------------------------
-- DOWNLOAD GRANTS
-- Short-lived, single-purpose tokens issued only after an
-- entitlement check. Only a SHA-256 hash is stored, so a database
-- leak cannot be replayed into downloads. Usage is counted so the
-- server can apply rate limits and abuse protection.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS download_grants (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entitlement_id BIGINT NOT NULL REFERENCES entitlements(id) ON DELETE CASCADE,
  product_file_id BIGINT REFERENCES product_files(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 5 CHECK (max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_download_grants_entitlement
  ON download_grants (entitlement_id);
CREATE INDEX IF NOT EXISTS idx_download_grants_expiry
  ON download_grants (expires_at);

ALTER TABLE download_grants ENABLE ROW LEVEL SECURITY;

-- Server (service_role) only. No client read or write path at all,
-- so a browser can never mint or inspect a grant.
REVOKE ALL ON TABLE download_grants FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- PURCHASE CLAIMS
-- Guest purchase recovery. A signed, expiring token emailed to the
-- buyer. Knowing an order_ref or an email address is never enough
-- to retrieve a purchase.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_claims (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_claims_email ON purchase_claims (lower(email));
CREATE INDEX IF NOT EXISTS idx_purchase_claims_order ON purchase_claims (order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_claims_expiry ON purchase_claims (expires_at);

ALTER TABLE purchase_claims ENABLE ROW LEVEL SECURITY;

-- Server (service_role) only. Same reasoning as download_grants.
REVOKE ALL ON TABLE purchase_claims FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- Explicit service_role grants.
-- The serverless functions (create-order, webhook, download) act
-- with the service role. BYPASSRLS only skips row security, not
-- object privileges, so these are stated outright rather than
-- relying on project default privileges.
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE products            TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE product_categories  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE product_files       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE orders              TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE order_items        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE payment_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE entitlements        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE download_grants     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE purchase_claims     TO service_role;

-- >>> supabase/migrations/20261018000003_create_digital_products_storage.sql

-- ============================================================
-- DIGITAL PRODUCTS — private storage bucket (Phase E)
-- Paid downloads live here. Deliberately NO public read policy:
-- a path in this bucket is never a working URL on its own.
-- Access is only ever granted by the server minting a short lived
-- signed URL after an entitlement check.
-- ============================================================

-- Private bucket (public = false).
INSERT INTO storage.buckets (id, name, public)
VALUES ('digital-products', 'digital-products', false)
ON CONFLICT (id) DO NOTHING;

-- Admins may manage the paid assets they uploaded.
DROP POLICY IF EXISTS "Admin can upload digital products" ON storage.objects;
CREATE POLICY "Admin can upload digital products"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'digital-products' AND is_admin());

DROP POLICY IF EXISTS "Admin can update digital products" ON storage.objects;
CREATE POLICY "Admin can update digital products"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'digital-products' AND is_admin());

DROP POLICY IF EXISTS "Admin can delete digital products" ON storage.objects;
CREATE POLICY "Admin can delete digital products"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'digital-products' AND is_admin());

DROP POLICY IF EXISTS "Admin can read digital products" ON storage.objects;
CREATE POLICY "Admin can read digital products"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'digital-products' AND is_admin());

-- Intentionally NO "Anyone can view" policy for this bucket, and no
-- anon SELECT grant: anonymous fetches of these objects must fail.
-- Customers reach their files only through /api/download, which
-- verifies an active entitlement and then issues a signed URL.

-- ------------------------------------------------------------
-- Public preview bucket.
-- Covers and deliberately-public preview assets only. Never paid
-- source material. Reuses the existing public portfolio bucket so
-- the admin image picker keeps working unchanged.
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-images', 'portfolio-images', true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Optional: an RPC that lets an admin validate a storage path
-- exists for a product before saving metadata. service_role
-- callers only; kept as SECURITY DEFINER so it never leaks paths
-- to a non-admin caller.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_can_read_product_file(p_path TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'digital-products' AND name = p_path
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION admin_can_read_product_file(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_can_read_product_file(TEXT) TO authenticated, service_role;

-- >>> supabase/migrations/20261018000004_add_download_rate_limit.sql

-- ============================================================
-- DIGITAL PRODUCTS — download abuse protection
-- Enforced in the database, not the browser, so a compromised or
-- modified client cannot mint unlimited download links.
-- ============================================================

CREATE OR REPLACE FUNCTION check_download_grant_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- A download grant must be short-lived. This bounds the damage from a bug
  -- that passes an over-long expiry, and keeps the "reauthorize on every new
  -- link" guarantee meaningful.
  IF NEW.expires_at > (NOW() + INTERVAL '1 hour') THEN
    RAISE EXCEPTION 'Download grants must expire within one hour.';
  END IF;

  IF NEW.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Download grant expiry must be in the future.';
  END IF;

  -- Rate limit: at most 30 download links per entitlement per hour.
  SELECT COUNT(*) INTO recent_count
  FROM download_grants
  WHERE entitlement_id = NEW.entitlement_id
    AND created_at > (NOW() - INTERVAL '1 hour');

  IF recent_count >= 30 THEN
    RAISE EXCEPTION 'Too many download requests. Please wait before trying again.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_download_grant_rate_limit ON download_grants;
CREATE TRIGGER trg_download_grant_rate_limit
  BEFORE INSERT ON download_grants
  FOR EACH ROW
  EXECUTE FUNCTION check_download_grant_rate_limit();

-- Housekeeping helper: purge expired grants and claims. Intended to be called
-- by a scheduled job (pg_cron) or manually; written as a plain function so it
-- works on any Supabase plan.
CREATE OR REPLACE FUNCTION purge_expired_download_records()
RETURNS INTEGER AS $$
DECLARE
  removed INTEGER := 0;
  step INTEGER := 0;
BEGIN
  DELETE FROM download_grants WHERE expires_at < (NOW() - INTERVAL '1 day');
  GET DIAGNOSTICS step = ROW_COUNT;
  removed := removed + step;

  DELETE FROM purchase_claims WHERE expires_at < (NOW() - INTERVAL '1 day');
  GET DIAGNOSTICS step = ROW_COUNT;
  removed := removed + step;

  RETURN removed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION purge_expired_download_records() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION purge_expired_download_records() TO service_role;

-- >>> supabase/migrations/20261018000005_digital_products_owner_read.sql

-- ============================================================
-- DIGITAL PRODUCTS — owners can always see what they bought
--
-- The catalogue policy only exposes `status = 'published'`. That is
-- correct for browsing, but it would also hide a product from the
-- customer who already paid for it once it is archived. This adds a
-- narrow, additive read path: an authenticated customer may read a
-- product row IF they hold an active entitlement for it.
--
-- No recursion risk: the subquery reads `entitlements`, whose own
-- policy depends only on auth.uid()/auth.jwt() — it never reads
-- `products`. So the EXISTS sees only the caller's own grants.
-- ============================================================

DROP POLICY IF EXISTS "Owners can read their purchased products" ON products;

CREATE POLICY "Owners can read their purchased products"
  ON products FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM entitlements e
      WHERE e.product_id = products.id
        AND e.status = 'active'
        AND (
          e.user_id = auth.uid()
          OR lower(coalesce(e.customer_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );

-- >>> supabase/migrations/20261018000006_digital_products_updated_at.sql

-- ============================================================
-- DIGITAL PRODUCTS — keep updated_at truthful
--
-- The admin UI shows a product's "last updated" date and the store
-- uses it for the "Newest" sort. Nothing else in this schema
-- maintains updated_at automatically for these new tables, so
-- without this trigger the column would silently stay at the row's
-- creation time and the UI would lie.
-- ============================================================

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_product_categories_updated_at ON product_categories;
CREATE TRIGGER trg_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_product_files_updated_at ON product_files;
CREATE TRIGGER trg_product_files_updated_at
  BEFORE UPDATE ON product_files
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- >>> supabase/migrations/20261018000007_harden_email_claim_policies.sql

-- ============================================================
-- DIGITAL PRODUCTS — require a confirmed session email for email fallback
--
-- Matching `customer_email` to `auth.jwt() ->> 'email'` trusts any claim in
-- the session, including an address registered without confirmation. The
-- current_user_has_verified_email() helper reads auth.users instead and
-- requires email_confirmed_at to be set. user_id ownership remains the primary
-- path; the email match is only a fallback for guest purchases recovered later.
-- ============================================================

DROP POLICY IF EXISTS "Users can read own entitlements" ON entitlements;
CREATE POLICY "Users can read own entitlements"
  ON entitlements FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND (
      user_id = auth.uid()
      OR current_user_has_verified_email(customer_email)
    )
  );

DROP POLICY IF EXISTS "Owners can read their purchased products" ON products;
CREATE POLICY "Owners can read their purchased products"
  ON products FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM entitlements e
      WHERE e.product_id = products.id
        AND e.status = 'active'
        AND (
          e.user_id = auth.uid()
          OR current_user_has_verified_email(e.customer_email)
        )
    )
  );

-- >>> supabase/migrations/20261122000000_create_product_licenses.sql

-- ============================================================
-- DIGITAL PRODUCTS — real, server-issued product licenses
--
-- A license is deliberately NOT the order receipt and NOT the
-- entitlement. The entitlement answers "may this customer download?";
-- the license answers "what may they do with what they downloaded?".
--
-- Additive only. Existing products remain valid: a product with no
-- license options issues no license and keeps its current behaviour.
-- ============================================================

-- ------------------------------------------------------------
-- PRODUCT-LEVEL LICENSE OPTIONS
-- The owner chooses which license types a product offers. Codes are
-- stable identifiers used by checkout, never prices or permissions
-- the browser is allowed to define.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_license_options (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label TEXT NOT NULL,
  summary TEXT DEFAULT '',
  terms TEXT DEFAULT '',
  validity_days INTEGER
    CHECK (validity_days IS NULL OR (validity_days > 0 AND validity_days <= 36500)),
  display_order INT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT product_license_options_unique_code UNIQUE (product_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_license_options_one_default
  ON product_license_options (product_id) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_license_options_product
  ON product_license_options (product_id, display_order);

ALTER TABLE product_license_options ENABLE ROW LEVEL SECURITY;

-- Public catalogue may present the options of a published product.
DROP POLICY IF EXISTS "Public can read published license options" ON product_license_options;
CREATE POLICY "Public can read published license options"
  ON product_license_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_id AND p.status = 'published'
    )
  );

-- Admins also need to see options attached to draft/archived products.
DROP POLICY IF EXISTS "Admin can read all license options" ON product_license_options;
CREATE POLICY "Admin can read all license options"
  ON product_license_options FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can insert license options" ON product_license_options;
CREATE POLICY "Admin can insert license options"
  ON product_license_options FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update license options" ON product_license_options;
CREATE POLICY "Admin can update license options"
  ON product_license_options FOR UPDATE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete license options" ON product_license_options;
CREATE POLICY "Admin can delete license options"
  ON product_license_options FOR DELETE TO authenticated USING (is_admin());

GRANT SELECT ON TABLE product_license_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE product_license_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE product_license_options TO service_role;

-- ------------------------------------------------------------
-- ORDER ITEM SNAPSHOTS
-- Once paid, changing an option's wording must never change what the
-- customer actually bought. Both columns are optional for legacy rows.
-- ------------------------------------------------------------
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS license_option_id BIGINT
  REFERENCES product_license_options(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS license_type_snapshot TEXT DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS license_expires_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- ISSUED LICENSES
-- One license per purchased line item. `seats` records the quantity
-- covered by that item. The key is stored so the owner can display and
-- copy it in their library; the hash permits indexed verification
-- without exposing the key in logs or URLs.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS licenses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  license_ref TEXT NOT NULL UNIQUE,
  license_key TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL UNIQUE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id BIGINT REFERENCES order_items(id) ON DELETE CASCADE,
  entitlement_id BIGINT REFERENCES entitlements(id) ON DELETE SET NULL,
  license_option_id BIGINT REFERENCES product_license_options(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT,
  license_type TEXT NOT NULL DEFAULT 'Standard license',
  terms TEXT DEFAULT '',
  seats INTEGER NOT NULL DEFAULT 1 CHECK (seats > 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT DEFAULT '',
  grant_type TEXT NOT NULL DEFAULT 'purchase'
    CHECK (grant_type IN ('purchase', 'APPROVED_CONTRIBUTOR_PERSONAL')),
  grant_source TEXT NOT NULL DEFAULT 'verified_payment'
    CHECK (grant_source IN ('verified_payment', 'admin_grant')),
  application_id BIGINT,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT licenses_revocation_has_reason
    CHECK (status <> 'revoked' OR (revoked_at IS NOT NULL AND length(trim(revocation_reason)) > 0)),
  CONSTRAINT licenses_purchase_or_grant_shape
    CHECK (
      (grant_type = 'purchase' AND order_id IS NOT NULL AND order_item_id IS NOT NULL)
      OR
      (grant_type = 'APPROVED_CONTRIBUTOR_PERSONAL' AND application_id IS NOT NULL AND grant_source = 'admin_grant')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_licenses_order_item_unique
  ON licenses (order_item_id)
  WHERE order_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_licenses_user ON licenses (user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses (lower(customer_email));
CREATE INDEX IF NOT EXISTS idx_licenses_product ON licenses (product_id);
CREATE INDEX IF NOT EXISTS idx_licenses_order ON licenses (order_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses (status);
CREATE INDEX IF NOT EXISTS idx_licenses_grant_type ON licenses (grant_type, status, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_licenses_application ON licenses (application_id);

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- Customers may READ their own licenses (including a revoked one: hiding it
-- would be misleading). They can never insert, update or reissue one.
DROP POLICY IF EXISTS "Admin can read licenses" ON licenses;
CREATE POLICY "Admin can read licenses"
  ON licenses FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Customers can read own licenses" ON licenses;
CREATE POLICY "Customers can read own licenses"
  ON licenses FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      customer_email IS NOT NULL
      AND lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

REVOKE ALL ON TABLE licenses FROM PUBLIC, anon;
GRANT SELECT ON TABLE licenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE licenses TO service_role;

-- ------------------------------------------------------------
-- LICENSE HISTORY
-- Every status change and reissue is recorded with an actor and reason.
-- Customers cannot see this ledger; admins read it through the audited
-- admin API.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS license_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  license_id BIGINT REFERENCES licenses(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'issued', 'suspended', 'revoked', 'reinstated', 'reissued', 'expired', 'deleted',
    'application_approved', 'grant_issued'
  )),
  reason TEXT DEFAULT '',
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_events_license ON license_events (license_id, created_at DESC);

ALTER TABLE license_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read license events" ON license_events;
CREATE POLICY "Admin can read license events"
  ON license_events FOR SELECT TO authenticated USING (is_admin());

REVOKE ALL ON TABLE license_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE license_events TO service_role;

-- ------------------------------------------------------------
-- VERIFICATION ABUSE LEDGER
-- Only hashed addresses are stored. A bounded recent-attempt count
-- makes blind key guessing noisy and observable without keeping PII.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS license_verification_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caller_hash TEXT NOT NULL,
  product_slug TEXT DEFAULT '',
  successful BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_verification_attempts_recent
  ON license_verification_attempts (caller_hash, created_at DESC);

ALTER TABLE license_verification_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE license_verification_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE license_verification_attempts TO service_role;

-- ------------------------------------------------------------
-- PUBLIC FILE MANIFEST
-- This fixed view exposes ONLY non-sensitive metadata for published
-- products. No storage_path, bucket name or private credential can be
-- selected from it. Delivery still happens exclusively through
-- /api/download after an entitlement check.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public_product_file_manifest AS
SELECT
  f.id,
  f.product_id,
  f.filename,
  f.mime_type,
  f.size_bytes,
  f.version,
  f.display_order,
  f.is_preview
FROM product_files f
JOIN products p ON p.id = f.product_id
WHERE p.status = 'published';

REVOKE ALL ON public_product_file_manifest FROM PUBLIC;
GRANT SELECT ON public_product_file_manifest TO anon, authenticated;

-- ------------------------------------------------------------
-- COUPONS (server-authoritative discounts)
-- No anon read path: a coupon code is a checkout input, not public
-- catalogue data. Only admins manage them and the serverless checkout
-- reads/claims them with the service role.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{2,23}$'),
  description TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  value BIGINT NOT NULL CHECK (value > 0),
  min_subtotal_paise BIGINT NOT NULL DEFAULT 0 CHECK (min_subtotal_paise >= 0),
  max_discount_paise BIGINT CHECK (max_discount_paise IS NULL OR max_discount_paise >= 0),
  product_slugs TEXT[],
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  uses_count INTEGER NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  per_customer_limit INTEGER NOT NULL DEFAULT 1 CHECK (per_customer_limit > 0),
  first_order_only BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coupons_value_matches_type CHECK (
    (discount_type = 'percent' AND value BETWEEN 1 AND 100) OR
    (discount_type = 'fixed' AND value > 0)
  ),
  CONSTRAINT coupons_dates_in_order CHECK (
    starts_at IS NULL OR expires_at IS NULL OR expires_at > starts_at
  )
);

CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (active, expires_at);
CREATE INDEX IF NOT EXISTS idx_coupons_created_at ON coupons (created_at DESC);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE coupons FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE coupons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE coupons TO service_role;

DROP POLICY IF EXISTS "Admin can read coupons" ON coupons;
CREATE POLICY "Admin can read coupons"
  ON coupons FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "Admin can insert coupons" ON coupons;
CREATE POLICY "Admin can insert coupons"
  ON coupons FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admin can update coupons" ON coupons;
CREATE POLICY "Admin can update coupons"
  ON coupons FOR UPDATE TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "Admin can delete coupons" ON coupons;
CREATE POLICY "Admin can delete coupons"
  ON coupons FOR DELETE TO authenticated USING (is_admin());

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  coupon_id BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_ref TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  discount_paise BIGINT NOT NULL CHECK (discount_paise > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon
  ON coupon_redemptions (coupon_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_customer
  ON coupon_redemptions (coupon_id, lower(customer_email));

ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE coupon_redemptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE coupon_redemptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE coupon_redemptions TO service_role;

DROP POLICY IF EXISTS "Admin can read coupon redemptions" ON coupon_redemptions;
CREATE POLICY "Admin can read coupon redemptions"
  ON coupon_redemptions FOR SELECT TO authenticated USING (is_admin());

ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code_snapshot TEXT NOT NULL DEFAULT '';

-- ------------------------------------------------------------
-- Authorised affiliate / reseller partners (see migration
-- 20261125000000_create_affiliates.sql for the full policy set).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS affiliates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{2,23}$'),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 120),
  email TEXT NOT NULL DEFAULT '',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  commission_bps INTEGER NOT NULL CHECK (commission_bps > 0 AND commission_bps <= 10000),
  product_slugs TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'pending')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_email_unique
  ON affiliates (lower(email)) WHERE email <> '';
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates (status, created_at DESC);

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE affiliates FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE affiliates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE affiliates TO service_role;

DROP POLICY IF EXISTS "Admin can manage affiliates" ON affiliates;
CREATE POLICY "Admin can manage affiliates"
  ON affiliates FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Partner can read own affiliate profile" ON affiliates;
CREATE POLICY "Partner can read own affiliate profile"
  ON affiliates FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    (email <> '' AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );

CREATE TABLE IF NOT EXISTS affiliate_attributions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  affiliate_id BIGINT NOT NULL REFERENCES affiliates(id) ON DELETE RESTRICT,
  order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  order_ref TEXT NOT NULL UNIQUE,
  affiliate_code TEXT NOT NULL,
  commission_bps INTEGER NOT NULL CHECK (commission_bps > 0 AND commission_bps <= 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_partner
  ON affiliate_attributions (affiliate_id, created_at DESC);

ALTER TABLE affiliate_attributions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE affiliate_attributions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE affiliate_attributions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE affiliate_attributions TO service_role;

DROP POLICY IF EXISTS "Admin can read affiliate attributions" ON affiliate_attributions;
CREATE POLICY "Admin can read affiliate attributions"
  ON affiliate_attributions FOR SELECT TO authenticated USING (is_admin());

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  affiliate_id BIGINT NOT NULL REFERENCES affiliates(id) ON DELETE RESTRICT,
  order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  order_ref TEXT NOT NULL UNIQUE,
  net_paise BIGINT NOT NULL CHECK (net_paise > 0),
  commission_bps INTEGER NOT NULL CHECK (commission_bps > 0 AND commission_bps <= 10000),
  commission_paise BIGINT NOT NULL CHECK (commission_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'void')),
  payout_reference TEXT NOT NULL DEFAULT '',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_partner
  ON affiliate_commissions (affiliate_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status
  ON affiliate_commissions (status, created_at DESC);

ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE affiliate_commissions FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE affiliate_commissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE affiliate_commissions TO service_role;

DROP POLICY IF EXISTS "Admin can manage affiliate commissions" ON affiliate_commissions;
CREATE POLICY "Admin can manage affiliate commissions"
  ON affiliate_commissions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Partner can read own commissions" ON affiliate_commissions;
CREATE POLICY "Partner can read own commissions"
  ON affiliate_commissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliates a
      WHERE a.id = affiliate_commissions.affiliate_id
        AND (
          a.user_id = auth.uid() OR
          (a.email <> '' AND lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
        )
    )
  );

-- Affiliate applications (mirror of 20261125120000_create_affiliate_applications.sql)
CREATE TABLE IF NOT EXISTS affiliate_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 120),
  email TEXT NOT NULL CHECK (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  proposed_code TEXT NOT NULL CHECK (proposed_code ~ '^[A-Z0-9][A-Z0-9_-]{2,23}$'),
  channels TEXT NOT NULL CHECK (length(trim(channels)) BETWEEN 1 AND 240),
  message TEXT NOT NULL CHECK (length(trim(message)) BETWEEN 10 AND 2000),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes TEXT NOT NULL DEFAULT '',
  affiliate_id BIGINT REFERENCES affiliates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_applications_pending_email
  ON affiliate_applications (lower(email)) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_affiliate_applications_status
  ON affiliate_applications (status, created_at DESC);

ALTER TABLE affiliate_applications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE affiliate_applications FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE affiliate_applications TO anon;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE affiliate_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE affiliate_applications TO service_role;

CREATE OR REPLACE FUNCTION public.force_affiliate_application_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.status := 'pending';
  NEW.affiliate_id := NULL;
  NEW.review_notes := '';
  NEW.reviewed_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS affiliate_applications_force_pending ON affiliate_applications;
CREATE TRIGGER affiliate_applications_force_pending
  BEFORE INSERT ON affiliate_applications
  FOR EACH ROW EXECUTE FUNCTION public.force_affiliate_application_pending();

DROP POLICY IF EXISTS "Anyone can apply as an affiliate" ON affiliate_applications;
CREATE POLICY "Anyone can apply as an affiliate"
  ON affiliate_applications FOR INSERT TO anon
  WITH CHECK (status = 'pending' AND affiliate_id IS NULL);

DROP POLICY IF EXISTS "Admin can manage affiliate applications" ON affiliate_applications;
CREATE POLICY "Admin can manage affiliate applications"
  ON affiliate_applications FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE orders ADD COLUMN IF NOT EXISTS affiliate_code_snapshot TEXT NOT NULL DEFAULT '';

-- ------------------------------------------------------------
-- APPROVED CONTRIBUTOR PERSONAL-USE APPLICATIONS AND GRANTS
-- Additive. No auto-grant. Explicit admin review/approval/issuance only.
-- Personal-use only; no commercial/org/client deployment, resale,
-- redistribution, sublicensing/transfer, or IP ownership transfer.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contributor_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_ref TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL CHECK (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 120),
  github_profile TEXT NOT NULL DEFAULT '',
  contribution_summary TEXT NOT NULL CHECK (length(trim(contribution_summary)) BETWEEN 10 AND 4000),
  intended_use TEXT NOT NULL DEFAULT '',
  -- Optional requested product; contributor access must be enabled on it.
  requested_product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  personal_use_attestation BOOLEAN NOT NULL DEFAULT FALSE,
  no_commercial_use_attestation BOOLEAN NOT NULL DEFAULT FALSE,
  no_redistribution_attestation BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'withdrawn')),
  review_notes TEXT NOT NULL DEFAULT '',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  issued_license_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contributor_applications_reviewed_has_actor
    CHECK (status = 'pending' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
  CONSTRAINT contributor_applications_approved_timestamp
    CHECK (status <> 'approved' OR approved_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_contributor_applications_status
  ON contributor_applications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contributor_applications_user
  ON contributor_applications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contributor_applications_email
  ON contributor_applications (lower(email), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contributor_applications_requested_product
  ON contributor_applications (requested_product_id)
  WHERE requested_product_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contributor_applications_pending_email
  ON contributor_applications (lower(email))
  WHERE status IN ('pending', 'under_review');

ALTER TABLE contributor_applications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE contributor_applications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE contributor_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE contributor_applications TO service_role;

CREATE OR REPLACE FUNCTION public.force_contributor_application_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.status := 'pending';
  NEW.review_notes := '';
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  NEW.approved_at := NULL;
  NEW.issued_license_id := NULL;
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contributor_applications_force_pending ON contributor_applications;
CREATE TRIGGER contributor_applications_force_pending
  BEFORE INSERT ON contributor_applications
  FOR EACH ROW EXECUTE FUNCTION public.force_contributor_application_pending();

DROP POLICY IF EXISTS "Users can submit contributor applications" ON contributor_applications;
CREATE POLICY "Users can submit contributor applications"
  ON contributor_applications FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND issued_license_id IS NULL
  );

DROP POLICY IF EXISTS "Users can read own contributor applications" ON contributor_applications;
CREATE POLICY "Users can read own contributor applications"
  ON contributor_applications FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin()
  );

DROP POLICY IF EXISTS "Admin can manage contributor applications" ON contributor_applications;
CREATE POLICY "Admin can manage contributor applications"
  ON contributor_applications FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS contributor_application_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES contributor_applications(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'submitted', 'under_review', 'approved', 'rejected', 'withdrawn',
    'license_issued', 'license_suspended', 'license_revoked', 'license_reinstated', 'note'
  )),
  old_status TEXT,
  new_status TEXT,
  reason TEXT NOT NULL DEFAULT '',
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributor_application_events_app
  ON contributor_application_events (application_id, created_at DESC);

ALTER TABLE contributor_application_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE contributor_application_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE contributor_application_events TO authenticated;
GRANT SELECT, INSERT ON TABLE contributor_application_events TO service_role;

DROP POLICY IF EXISTS "Admin can read contributor application events" ON contributor_application_events;
CREATE POLICY "Admin can read contributor application events"
  ON contributor_application_events FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Users can read own contributor application events" ON contributor_application_events;
CREATE POLICY "Users can read own contributor application events"
  ON contributor_application_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contributor_applications a
      WHERE a.id = application_id AND a.user_id = auth.uid()
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contributor_applications_issued_license_fk'
  ) THEN
    ALTER TABLE contributor_applications
      ADD CONSTRAINT contributor_applications_issued_license_fk
      FOREIGN KEY (issued_license_id) REFERENCES licenses(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'licenses_application_fk'
  ) THEN
    ALTER TABLE licenses
      ADD CONSTRAINT licenses_application_fk
      FOREIGN KEY (application_id) REFERENCES contributor_applications(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- APPOINTMENTS / BOOKING
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_types (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  duration_minutes INT NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  price_paise INT NOT NULL DEFAULT 0 CHECK (price_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  meeting_provider TEXT NOT NULL DEFAULT 'custom',
  meeting_url TEXT NOT NULL DEFAULT '',
  location_label TEXT NOT NULL DEFAULT 'Online meeting',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active appointment types" ON appointment_types FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY "Admin can insert appointment types" ON appointment_types FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin can update appointment types" ON appointment_types FOR UPDATE USING (is_admin());
CREATE POLICY "Admin can delete appointment types" ON appointment_types FOR DELETE USING (is_admin());
GRANT SELECT ON TABLE appointment_types TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE appointment_types TO authenticated;

CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_type_id BIGINT REFERENCES appointment_types(id) ON DELETE SET NULL,
  type_name_snapshot TEXT NOT NULL DEFAULT '',
  duration_minutes_snapshot INT NOT NULL DEFAULT 30,
  price_paise_snapshot INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  timezone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  meeting_provider_snapshot TEXT NOT NULL DEFAULT 'custom',
  meeting_url_snapshot TEXT NOT NULL DEFAULT '',
  location_label_snapshot TEXT NOT NULL DEFAULT 'Online meeting',
  access_token TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status TEXT NOT NULL DEFAULT 'not_required' CHECK (payment_status IN ('not_required', 'pending', 'paid', 'failed')),
  razorpay_order_id TEXT DEFAULT '',
  razorpay_payment_id TEXT DEFAULT '',
  paid_at TIMESTAMPTZ,
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can read appointments" ON appointments FOR SELECT USING (is_admin());
CREATE POLICY "Admin can insert appointments" ON appointments FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin can update appointments" ON appointments FOR UPDATE USING (is_admin());
CREATE POLICY "Admin can delete appointments" ON appointments FOR DELETE USING (is_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE appointments TO authenticated;
CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS appointments_preferred_date_idx ON appointments(preferred_date, preferred_time);
CREATE INDEX IF NOT EXISTS appointments_razorpay_order_id_idx ON appointments(razorpay_order_id);

NOTIFY pgrst, 'reload schema';
