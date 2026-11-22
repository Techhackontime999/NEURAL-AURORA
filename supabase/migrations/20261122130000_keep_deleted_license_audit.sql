-- ============================================================
-- AUDITED LICENSE DELETION
--
-- Administrators can remove an issued licence (e.g. a test order). The
-- customer's card is driven by the `licenses` row, so deleting it is what
-- actually removes the card. Keep the history row when that happens: the
-- reference is recorded in the event reason, and the now-orphaned event is
-- retained instead of being cascade-deleted.
-- ============================================================

ALTER TABLE license_events ALTER COLUMN license_id DROP NOT NULL;

ALTER TABLE license_events DROP CONSTRAINT IF EXISTS license_events_license_id_fkey;
ALTER TABLE license_events ADD CONSTRAINT license_events_license_id_fkey
  FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE SET NULL;

ALTER TABLE license_events DROP CONSTRAINT IF EXISTS license_events_action_check;
ALTER TABLE license_events ADD CONSTRAINT license_events_action_check
  CHECK (action IN ('issued', 'suspended', 'revoked', 'reinstated', 'reissued', 'expired', 'deleted'));
