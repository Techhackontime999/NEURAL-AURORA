-- ============================================================
-- RESUMES
-- Multiple role-targeted resumes selectable on the public site.
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
