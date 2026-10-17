-- ============================================================
-- DIGITAL PRODUCTS — catalogue (Phase A)
-- Adds a first-party digital store to NEURAL AURORA.
-- Additive only: does not touch services, payments or portfolio data.
-- ============================================================

-- ------------------------------------------------------------
-- Configurable product categories.
-- Kept in the database (not hardcoded) so new categories can be
-- added from the admin dashboard without a code change.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon_name TEXT DEFAULT 'Package',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read product_categories" ON product_categories;
CREATE POLICY "Anyone can read product_categories"
  ON product_categories FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admin can insert product_categories" ON product_categories;
CREATE POLICY "Admin can insert product_categories"
  ON product_categories FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admin can update product_categories" ON product_categories;
CREATE POLICY "Admin can update product_categories"
  ON product_categories FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admin can delete product_categories" ON product_categories;
CREATE POLICY "Admin can delete product_categories"
  ON product_categories FOR DELETE USING (is_admin());

GRANT SELECT ON TABLE product_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE product_categories TO authenticated;

-- ------------------------------------------------------------
-- PRODUCTS
-- Money is stored as INTEGER minor units (paise for INR) so no
-- float arithmetic is ever used for an authoritative total.
-- No private storage path lives on this table: the public product
-- representation is safe to expose under the RLS policy below.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  short_description TEXT DEFAULT '',
  description TEXT DEFAULT '',
  category_slug TEXT REFERENCES product_categories(slug) ON DELETE SET NULL,
  format TEXT DEFAULT '',
  price_paise INTEGER NOT NULL DEFAULT 0 CHECK (price_paise >= 0),
  compare_at_paise INTEGER CHECK (compare_at_paise IS NULL OR compare_at_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  -- Derived, so it can never drift from price_paise.
  is_free BOOLEAN GENERATED ALWAYS AS (price_paise = 0) STORED,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  cover_image_url TEXT DEFAULT '',
  gallery_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  includes JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  license_type TEXT DEFAULT '',
  license_summary TEXT DEFAULT '',
  support_policy TEXT DEFAULT '',
  refund_policy TEXT DEFAULT '',
  faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  version TEXT DEFAULT '1.0.0',
  release_notes TEXT DEFAULT '',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT products_currency_supported CHECK (currency IN ('INR', 'USD')),
  CONSTRAINT products_compare_at_gt_price
    CHECK (compare_at_paise IS NULL OR compare_at_paise >= price_paise)
);

-- Only published products are publicly visible/purchasable; admins see all.
CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_slug);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products (featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_published_at ON products (published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price_paise);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN (tags);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published products" ON products;
CREATE POLICY "Public can read published products"
  ON products FOR SELECT
  USING (status = 'published' OR is_admin());

DROP POLICY IF EXISTS "Admin can insert products" ON products;
CREATE POLICY "Admin can insert products"
  ON products FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update products" ON products;
CREATE POLICY "Admin can update products"
  ON products FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete products" ON products;
CREATE POLICY "Admin can delete products"
  ON products FOR DELETE USING (is_admin());

GRANT SELECT ON TABLE products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE products TO authenticated;

-- ------------------------------------------------------------
-- PRODUCT FILES
-- Paid downloads live in a PRIVATE bucket. Deliberately there is
-- NO public SELECT policy here: the public catalogue must never
-- receive a storage path. Only admins and the server (service_role)
-- can read these rows, and delivery always goes through a short
-- lived signed URL minted server-side after entitlement checks.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_files (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  version TEXT NOT NULL DEFAULT '1.0.0',
  is_preview BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_files_product ON product_files (product_id);

ALTER TABLE product_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read product_files" ON product_files;
CREATE POLICY "Admin can read product_files"
  ON product_files FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "Admin can insert product_files" ON product_files;
CREATE POLICY "Admin can insert product_files"
  ON product_files FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admin can update product_files" ON product_files;
CREATE POLICY "Admin can update product_files"
  ON product_files FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Admin can delete product_files" ON product_files;
CREATE POLICY "Admin can delete product_files"
  ON product_files FOR DELETE USING (is_admin());

-- anon gets nothing at all on product_files.
REVOKE ALL ON TABLE product_files FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE product_files TO authenticated;

-- ------------------------------------------------------------
-- Seed the default categories from the product strategy.
-- ON CONFLICT DO NOTHING keeps this reproducible and non
-- destructive: an admin who edits a seeded row keeps their edit.
-- ------------------------------------------------------------
INSERT INTO product_categories (slug, label, description, icon_name, display_order) VALUES
  ('developer-tools',  'Developer Tools & Source Code', 'Reusable source code, scripts and developer utilities.',        'Code',        1),
  ('templates',        'Starter Kits & Templates',      'Website templates and software starter kits.',                  'LayoutGrid',  2),
  ('ui-kits',          'UI Kits & Design Resources',    'Design systems, component libraries and visual assets.',        'Palette',     3),
  ('ebooks',           'Ebooks, PDFs & Guides',         'Technical books, PDFs and in-depth guides.',                    'BookOpen',    4),
  ('ai-resources',     'AI Prompts & Automations',      'Prompt packs, agent resources and automation workflows.',       'Bot',         5),
  ('learning',         'Learning & Roadmaps',           'Roadmaps, cheat sheets and structured learning material.',      'GraduationCap', 6),
  ('free',             'Free Resources',                'Free downloads and open resources.',                            'Gift',        7)
ON CONFLICT (slug) DO NOTHING;
