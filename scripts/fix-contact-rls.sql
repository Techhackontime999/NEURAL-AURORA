-- Fix contact_messages RLS - Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert contact_messages" ON contact_messages;
CREATE POLICY "Anyone can insert contact_messages"
  ON contact_messages FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can read contact_messages" ON contact_messages;
CREATE POLICY "Admin can read contact_messages"
  ON contact_messages FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can update contact_messages" ON contact_messages;
CREATE POLICY "Admin can update contact_messages"
  ON contact_messages FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can delete contact_messages" ON contact_messages;
CREATE POLICY "Admin can delete contact_messages"
  ON contact_messages FOR DELETE
  USING (is_admin());

GRANT INSERT ON TABLE contact_messages TO anon;
GRANT INSERT ON TABLE contact_messages TO authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE contact_messages TO authenticated;
