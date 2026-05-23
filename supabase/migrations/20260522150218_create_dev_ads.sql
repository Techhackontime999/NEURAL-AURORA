CREATE TABLE IF NOT EXISTS dev_ads (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
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
