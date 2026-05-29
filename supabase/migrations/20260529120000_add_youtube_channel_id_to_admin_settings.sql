ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS youtube_channel_id TEXT DEFAULT '';

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS crm_url TEXT DEFAULT '';
