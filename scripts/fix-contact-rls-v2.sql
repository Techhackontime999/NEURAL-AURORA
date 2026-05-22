-- CONTACT MESSAGES - Final fix with cache reload
DROP TABLE IF EXISTS contact_messages CASCADE;

CREATE TABLE contact_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_insert_all" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "contact_select_admin" ON contact_messages FOR SELECT USING (is_admin());
CREATE POLICY "contact_update_admin" ON contact_messages FOR UPDATE USING (is_admin());
CREATE POLICY "contact_delete_admin" ON contact_messages FOR DELETE USING (is_admin());

GRANT INSERT ON TABLE contact_messages TO anon;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE contact_messages TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT tablename, policyname, cmd, with_check FROM pg_policies WHERE tablename = 'contact_messages';
