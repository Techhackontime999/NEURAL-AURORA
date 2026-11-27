-- Grow monetization coverage to the landing page and the /more hub, and
-- harden the two view-count RPCs. Every statement is idempotent so this file
-- can also be pasted into the Supabase SQL editor.

-- 1. Allow the two new premium slots on an existing ad_placements table.
ALTER TABLE ad_placements DROP CONSTRAINT IF EXISTS ad_placements_slot_check;
ALTER TABLE ad_placements ADD CONSTRAINT ad_placements_slot_check CHECK (slot IN (
  'blog_listing', 'article_footer', 'store_listing',
  'product_detail', 'search_results', 'offerings',
  'home_footer', 'more_hub'
));

-- 2. Gateway ad views: inactive ads must never gain free counters, and the
--    function must not inherit a caller-controlled search path.
CREATE OR REPLACE FUNCTION increment_ad_view_count(ad_id BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE dev_ads
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = ad_id AND active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION increment_ad_view_count(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_ad_view_count(BIGINT) TO anon, authenticated;

-- 3. Placement analytics: same fail-closed rule for impressions and clicks.
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
