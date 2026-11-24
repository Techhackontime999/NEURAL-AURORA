-- Rollback for 20261124000000_create_coupons.sql
-- The snapshot column is left in place: dropping it would rewrite order
-- history and its presence is harmless to older clients.

DROP TABLE IF EXISTS coupon_redemptions;
DROP TABLE IF EXISTS coupons;
