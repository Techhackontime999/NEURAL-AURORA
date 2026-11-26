-- Rollback for 20261201000000_create_ad_placements.sql

DROP FUNCTION IF EXISTS public.record_ad_event(BIGINT, TEXT);
DROP TABLE IF EXISTS ad_placements;
