ALTER TABLE dev_ads ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'video' CHECK (format IN ('video', 'short'));
