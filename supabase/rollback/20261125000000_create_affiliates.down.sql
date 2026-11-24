-- Rollback for 20261125000000_create_affiliates.sql
-- The order snapshot column is intentionally left in place: dropping it
-- would rewrite order history and an unused column is harmless.

DROP TABLE IF EXISTS affiliate_commissions;
DROP TABLE IF EXISTS affiliate_attributions;
DROP TABLE IF EXISTS affiliates;
