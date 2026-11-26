-- Premium, admin-controlled ad placements.
--
-- One row is one slot on the public site. The site only reads active, scheduled
-- rows, and impressions/clicks are incremented through a SECURITY DEFINER
-- function so anonymous visitors cannot grant themselves revenue.
--
-- Every statement is idempotent, so this file can also be pasted straight into
-- the Supabase SQL editor when the CLI is not linked.

CREATE TABLE IF NOT EXISTS ad_placements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN (
    'blog_listing', 'article_footer', 'store_listing',
    'product_detail', 'search_results', 'offerings'
  )),
  provider TEXT NOT NULL DEFAULT 'adsense'
    CHECK (provider IN ('adsense', 'sponsor', 'affiliate', 'custom')),
  ad_client TEXT DEFAULT '',
  ad_slot TEXT DEFAULT '',
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  target_url TEXT DEFAULT '',
  cta_label TEXT DEFAULT 'Learn more',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  weight INT NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 10),
  max_per_session INT NOT NULL DEFAULT 2 CHECK (max_per_session BETWEEN 1 AND 8),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  impression_count BIGINT NOT NULL DEFAULT 0,
  click_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_placements_slot_active ON ad_placements (slot, active);

ALTER TABLE ad_placements ENABLE ROW LEVEL SECURITY;

-- Public reads are limited to active rows; admins can see everything.
DROP POLICY IF EXISTS "Anyone can read active ad placements" ON ad_placements;
CREATE POLICY "Anyone can read active ad placements"
  ON ad_placements FOR SELECT
  USING (active = TRUE OR is_admin());

DROP POLICY IF EXISTS "Admin can insert ad placements" ON ad_placements;
CREATE POLICY "Admin can insert ad placements"
  ON ad_placements FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update ad placements" ON ad_placements;
CREATE POLICY "Admin can update ad placements"
  ON ad_placements FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete ad placements" ON ad_placements;
CREATE POLICY "Admin can delete ad placements"
  ON ad_placements FOR DELETE USING (is_admin());

GRANT SELECT ON TABLE ad_placements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ad_placements TO authenticated;

-- Analytics counters: callable by visitors, but only advances real, active rows.
CREATE OR REPLACE FUNCTION record_ad_event(placement_id BIGINT, event_type TEXT)
RETURNS VOID AS $$
BEGIN
  IF event_type = 'click' THEN
    UPDATE ad_placements
    SET click_count = COALESCE(click_count, 0) + 1, updated_at = NOW()
    WHERE id = placement_id AND active = TRUE;
  ELSE
    UPDATE ad_placements
    SET impression_count = COALESCE(impression_count, 0) + 1, updated_at = NOW()
    WHERE id = placement_id AND active = TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION record_ad_event(BIGINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_ad_event(BIGINT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
