-- ============================================================================
-- Rate Limiting, Spam Protection, and Input Validation Safeguards
-- ============================================================================

-- 1. Helper Function: Validate Email Format
CREATE OR REPLACE FUNCTION is_valid_email(text) RETURNS BOOLEAN AS $$
BEGIN
  RETURN $1 ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Contact Messages Throttling Trigger & Validation
CREATE OR REPLACE FUNCTION check_contact_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Input validations
  IF LENGTH(TRIM(NEW.name)) < 1 OR LENGTH(NEW.name) > 150 THEN
    RAISE EXCEPTION 'Name must be between 1 and 150 characters.';
  END IF;

  IF LENGTH(TRIM(NEW.email)) < 3 OR LENGTH(NEW.email) > 255 OR NOT is_valid_email(NEW.email) THEN
    RAISE EXCEPTION 'Please provide a valid email address.';
  END IF;

  IF LENGTH(TRIM(NEW.message)) < 1 OR LENGTH(NEW.message) > 4000 THEN
    RAISE EXCEPTION 'Message must be between 1 and 4000 characters.';
  END IF;

  -- Rate limit check: Maximum 3 messages per email per 10 minutes
  SELECT COUNT(*) INTO recent_count
  FROM contact_messages
  WHERE LOWER(email) = LOWER(NEW.email)
    AND created_at > (NOW() - INTERVAL '10 minutes');

  IF recent_count >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait a few minutes before submitting another message.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contact_message_rate_limit ON contact_messages;
CREATE TRIGGER trg_contact_message_rate_limit
  BEFORE INSERT ON contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION check_contact_message_rate_limit();

-- 3. Reviews Throttling Trigger & Validation
CREATE OR REPLACE FUNCTION check_review_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Input validations
  IF LENGTH(TRIM(NEW.name)) < 1 OR LENGTH(NEW.name) > 150 THEN
    RAISE EXCEPTION 'Name must be between 1 and 150 characters.';
  END IF;

  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be an integer between 1 and 5.';
  END IF;

  IF LENGTH(TRIM(NEW.message)) < 1 OR LENGTH(NEW.message) > 2500 THEN
    RAISE EXCEPTION 'Review message must be between 1 and 2500 characters.';
  END IF;

  -- If email provided, validate and rate limit
  IF NEW.email IS NOT NULL AND LENGTH(TRIM(NEW.email)) > 0 THEN
    IF NOT is_valid_email(NEW.email) THEN
      RAISE EXCEPTION 'Please provide a valid email address.';
    END IF;

    SELECT COUNT(*) INTO recent_count
    FROM reviews
    WHERE LOWER(email) = LOWER(NEW.email)
      AND created_at > (NOW() - INTERVAL '15 minutes');

    IF recent_count >= 2 THEN
      RAISE EXCEPTION 'Rate limit exceeded. You have recently submitted a review.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_review_rate_limit ON reviews;
CREATE TRIGGER trg_review_rate_limit
  BEFORE INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION check_review_rate_limit();

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
