CREATE TABLE IF NOT EXISTS visitor_stats (
  id BIGINT PRIMARY KEY DEFAULT 1,
  count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO visitor_stats (id, count) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE visitor_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visitor_stats"
  ON visitor_stats FOR SELECT
  USING (true);

GRANT SELECT ON TABLE visitor_stats TO anon;

CREATE OR REPLACE FUNCTION increment_visitor_count()
RETURNS BIGINT AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE visitor_stats
  SET count = count + 1, updated_at = NOW()
  WHERE id = 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_visitor_count TO anon;
