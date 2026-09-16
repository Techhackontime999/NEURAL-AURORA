-- ============================================================================
-- Migration: Add price_paise to services and secure order pricing
-- ============================================================================

-- 1. Add canonical integer price_paise column to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS price_paise BIGINT DEFAULT 0;

-- 2. Helper function to parse display strings like '2.5k', '5k', '500' to paise
CREATE OR REPLACE FUNCTION parse_price_to_paise(price_str TEXT)
RETURNS BIGINT AS $$
DECLARE
  cleaned TEXT;
  is_k BOOLEAN;
  num NUMERIC;
BEGIN
  IF price_str IS NULL OR TRIM(price_str) = '' THEN
    RETURN 0;
  END IF;

  cleaned := regexp_replace(price_str, '[^0-9.kK]', '', 'g');
  IF cleaned = '' THEN
    RETURN 0;
  END IF;

  is_k := cleaned ~* 'k';
  cleaned := regexp_replace(cleaned, '[kK]', '', 'g');

  BEGIN
    num := cleaned::NUMERIC;
  EXCEPTION WHEN OTHERS THEN
    RETURN 0;
  END;

  IF is_k THEN
    -- e.g. 2.5k -> 2500 rupees -> 250000 paise
    RETURN ROUND(num * 1000 * 100)::BIGINT;
  ELSE
    -- e.g. 500 -> 500 rupees -> 50000 paise
    RETURN ROUND(num * 100)::BIGINT;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Backfill price_paise for existing services if not set
UPDATE services
SET price_paise = parse_price_to_paise(price)
WHERE (price_paise IS NULL OR price_paise = 0) AND price IS NOT NULL AND TRIM(price) <> '';

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
