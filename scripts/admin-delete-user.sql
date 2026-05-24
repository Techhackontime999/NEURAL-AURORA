-- Run this in Supabase SQL Editor to enable user deletion
-- Approve/Reject work immediately without any schema changes

-- RPC: Admin delete user (deletes from auth.users, cascades to profiles)
CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id UUID)
RETURNS void AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
