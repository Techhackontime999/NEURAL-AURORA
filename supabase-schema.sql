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

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

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
  description TEXT DEFAULT '',
  outcome TEXT DEFAULT '',
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON admin_settings FOR SELECT USING (true);
CREATE POLICY "Admin can update settings" ON admin_settings FOR UPDATE USING (is_admin());
GRANT SELECT ON TABLE admin_settings TO anon;
GRANT SELECT, UPDATE ON TABLE admin_settings TO authenticated;

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
-- UPDATED PROFILE TRIGGER (auth restriction)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  allowed_email TEXT;
BEGIN
  SELECT admin_email INTO allowed_email FROM public.admin_settings WHERE id = 1;
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name',
    CASE WHEN allowed_email IS NOT NULL AND allowed_email != '' AND NEW.email = allowed_email THEN 'admin' ELSE 'viewer' END
  );
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    UPDATE public.profiles SET role = 'admin' WHERE id = NEW.id;
    UPDATE public.admin_settings SET admin_email = NEW.email WHERE id = 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TEST DATA GENERATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION generate_test_data(p_category TEXT, p_count INT DEFAULT 3)
RETURNS TEXT AS $$
DECLARE
  i INT; inserted INT := 0; random_suffix TEXT;
BEGIN
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
        VALUES ('Test User', 'test@test.com', 5, 'Great!', random()>0.5);
      WHEN 'case_studies' THEN
        INSERT INTO case_studies (cs_id, title, description, outcome, tech, display_order)
        VALUES ('test-'||random_suffix, 'Test CS', 'Desc', 'Done', ARRAY['React'], (SELECT COALESCE(MAX(display_order),0)+1 FROM case_studies));
      ELSE RETURN 'Unknown: '||p_category;
    END CASE;
    inserted := inserted + 1;
  END LOOP;
  RETURN 'Inserted '||inserted||' '||p_category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ADMIN HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION set_admin_email(p_email TEXT)
RETURNS TEXT AS $$
BEGIN
  UPDATE admin_settings SET admin_email = p_email, updated_at = NOW() WHERE id = 1;
  UPDATE profiles SET role = 'admin' WHERE email = p_email;
  RETURN 'Admin email set to: ' || p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
      FALSE
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES: users can read their own, admins can read all
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

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

-- ADMIN SETTINGS: anyone can read, admin can update
DROP POLICY IF EXISTS "Anyone can read settings" ON admin_settings;
CREATE POLICY "Anyone can read settings"
  ON admin_settings FOR SELECT USING (true);

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

-- REVIEWS: anyone can insert, admin can read/update/delete all
DROP POLICY IF EXISTS "Anyone can insert reviews" ON reviews;
CREATE POLICY "Anyone can insert reviews"
  ON reviews FOR INSERT
  WITH CHECK (TRUE);

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

-- Admin settings: anyone can read
GRANT SELECT ON TABLE admin_settings TO anon;
GRANT SELECT, UPDATE ON TABLE admin_settings TO authenticated;

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

-- Profiles: authenticated users can read and update
GRANT SELECT, UPDATE ON TABLE profiles TO authenticated;

-- ============================================================
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
