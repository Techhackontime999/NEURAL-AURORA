ALTER TABLE dev_ads ADD COLUMN IF NOT EXISTS ad_type TEXT NOT NULL DEFAULT 'google' CHECK (ad_type IN ('google', 'youtube'));
ALTER TABLE dev_ads ALTER COLUMN video_url DROP NOT NULL;
