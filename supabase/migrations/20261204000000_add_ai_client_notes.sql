-- Admin-only notes for registered MCP clients.
--
-- Notes are internal portfolio-admin metadata. They are never returned to
-- OAuth clients, never placed in tokens, and never written to the audit log.

ALTER TABLE ai_oauth_clients
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  ALTER TABLE ai_oauth_clients
    ADD CONSTRAINT ai_oauth_clients_notes_length CHECK (char_length(notes) <= 500);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
