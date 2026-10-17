-- ============================================================
-- DIGITAL PRODUCTS — download abuse protection
-- Enforced in the database, not the browser, so a compromised
-- or modified client cannot mint unlimited download links.
-- Follows the same trigger-based pattern as the existing
-- contact-message and review rate limits.
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

NOTIFY pgrst, 'reload schema';
