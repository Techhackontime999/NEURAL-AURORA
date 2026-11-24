-- Rollback for 20261125120000_create_affiliate_applications.sql

DROP TRIGGER IF EXISTS affiliate_applications_force_pending ON affiliate_applications;
DROP FUNCTION IF EXISTS public.force_affiliate_application_pending();
DROP TABLE IF EXISTS affiliate_applications;
