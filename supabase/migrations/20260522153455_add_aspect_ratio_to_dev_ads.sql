ALTER TABLE dev_ads ADD COLUMN IF NOT EXISTS aspect_ratio TEXT NOT NULL DEFAULT '16/9' CHECK (aspect_ratio IN ('16/9', '4/3', '21/9', '1/1', '3/2', '16/10'));
