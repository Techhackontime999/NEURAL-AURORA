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
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

-- PERSONAL INFO: anyone can read, only admin can write
CREATE POLICY "Anyone can read personal_info"
  ON personal_info FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can insert personal_info"
  ON personal_info FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update personal_info"
  ON personal_info FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin can delete personal_info"
  ON personal_info FOR DELETE
  USING (is_admin());

-- SOCIAL LINKS: anyone can read, only admin can write
CREATE POLICY "Anyone can read social_links"
  ON social_links FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can insert social_links"
  ON social_links FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update social_links"
  ON social_links FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin can delete social_links"
  ON social_links FOR DELETE
  USING (is_admin());

-- SKILLS: anyone can read, only admin can write
CREATE POLICY "Anyone can read skills"
  ON skills FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can insert skills"
  ON skills FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update skills"
  ON skills FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin can delete skills"
  ON skills FOR DELETE
  USING (is_admin());

-- PROJECTS: anyone can read, only admin can write
CREATE POLICY "Anyone can read projects"
  ON projects FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can insert projects"
  ON projects FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update projects"
  ON projects FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin can delete projects"
  ON projects FOR DELETE
  USING (is_admin());

-- EDUCATION: anyone can read, only admin can write
CREATE POLICY "Anyone can read education"
  ON education FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can insert education"
  ON education FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update education"
  ON education FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin can delete education"
  ON education FOR DELETE
  USING (is_admin());

-- EXPERIENCE: anyone can read, only admin can write
CREATE POLICY "Anyone can read experience"
  ON experience FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can insert experience"
  ON experience FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update experience"
  ON experience FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin can delete experience"
  ON experience FOR DELETE
  USING (is_admin());

-- BLOG POSTS: anyone can read, only admin can write
CREATE POLICY "Anyone can read blog_posts"
  ON blog_posts FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can insert blog_posts"
  ON blog_posts FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update blog_posts"
  ON blog_posts FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin can delete blog_posts"
  ON blog_posts FOR DELETE
  USING (is_admin());

-- CASE STUDIES: anyone can read, only admin can write
CREATE POLICY "Anyone can read case_studies"
  ON case_studies FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can insert case_studies"
  ON case_studies FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update case_studies"
  ON case_studies FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin can delete case_studies"
  ON case_studies FOR DELETE
  USING (is_admin());

-- REVIEWS: anyone can insert, admin can read/update/delete all
CREATE POLICY "Anyone can insert reviews"
  ON reviews FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Anyone can read approved reviews"
  ON reviews FOR SELECT
  USING (approved = TRUE OR is_admin());

CREATE POLICY "Admin can update reviews"
  ON reviews FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin can delete reviews"
  ON reviews FOR DELETE
  USING (is_admin());

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
