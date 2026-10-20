-- Extra gallery images for portfolio projects.
-- `image` remains the single main/cover image; `images` holds the additional
-- views shown in the public project gallery.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN projects.images IS
  'Additional project screenshots shown in the public project gallery.';
