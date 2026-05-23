-- ============================================================
-- SERVICES (Main service cards)
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_id TEXT NOT NULL UNIQUE,
  icon_name TEXT NOT NULL DEFAULT 'Globe',
  title TEXT NOT NULL,
  tagline TEXT DEFAULT '',
  description TEXT DEFAULT '',
  features TEXT[] DEFAULT '{}',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read services"
  ON services FOR SELECT USING (TRUE);
CREATE POLICY "Admin can insert services"
  ON services FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin can update services"
  ON services FOR UPDATE USING (is_admin());
CREATE POLICY "Admin can delete services"
  ON services FOR DELETE USING (is_admin());

GRANT SELECT ON TABLE services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE services TO authenticated;

-- ============================================================
-- SERVICE PAGE (Single-row config for all service page sections)
-- ============================================================
CREATE TABLE IF NOT EXISTS service_page (
  id BIGINT PRIMARY KEY DEFAULT 1,
  hero_title TEXT DEFAULT 'What I Can Do For You',
  hero_description TEXT DEFAULT 'Every project starts with a conversation. Here is how I can help turn your ideas into reality.',
  process_title TEXT DEFAULT 'How I Work',
  process_description TEXT DEFAULT 'A transparent, collaborative process designed to keep you informed and involved at every stage.',
  pricing_title TEXT DEFAULT 'Transparent Pricing',
  pricing_description TEXT DEFAULT 'No hidden fees. Every project is scoped and quoted upfront based on your specific needs.',
  testimonials_title TEXT DEFAULT 'What People Say',
  tech_title TEXT DEFAULT 'Technologies I Use',
  tech_description TEXT DEFAULT 'Modern tools for modern problems.',
  faq_title TEXT DEFAULT 'Frequently Asked Questions',
  stats JSONB DEFAULT '[]'::jsonb,
  process_steps JSONB DEFAULT '[]'::jsonb,
  packages JSONB DEFAULT '[]'::jsonb,
  testimonials JSONB DEFAULT '[]'::jsonb,
  tech_stack JSONB DEFAULT '[]'::jsonb,
  live_feed JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE service_page ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read service_page"
  ON service_page FOR SELECT USING (TRUE);
CREATE POLICY "Admin can insert service_page"
  ON service_page FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin can update service_page"
  ON service_page FOR UPDATE USING (is_admin());
CREATE POLICY "Admin can delete service_page"
  ON service_page FOR DELETE USING (is_admin());

GRANT SELECT ON TABLE service_page TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE service_page TO authenticated;

INSERT INTO service_page (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
