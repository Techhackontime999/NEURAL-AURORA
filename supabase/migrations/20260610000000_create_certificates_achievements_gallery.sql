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
