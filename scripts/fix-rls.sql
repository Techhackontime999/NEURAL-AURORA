-- ============================================================
-- FIX: Grant table permissions to anon/authenticated roles
-- Run this in Supabase SQL Editor if you get
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

-- Reviews: anyone can insert and read approved reviews
GRANT INSERT, SELECT ON TABLE reviews TO anon;

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

-- Profiles: authenticated users can read and update
GRANT SELECT, UPDATE ON TABLE profiles TO authenticated;
