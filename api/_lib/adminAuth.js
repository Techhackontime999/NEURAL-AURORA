// ---------------------------------------------------------------------------
// Administrator authentication for the store's admin-only endpoints.
//
// Exactly one implementation, so /api/admin-reconcile-order and
// /api/admin-access-link cannot drift apart: a caller is only ever "an admin"
// when the Bearer token resolves to a real Supabase user AND that user's
// profile row says role = 'admin'. The role is read from the database with the
// service role, so nothing a browser sends can claim it.
// ---------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js')

/** The server's Supabase client, or null when the deployment is unconfigured. */
function getServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
}

/**
 * Resolve the caller's account from a Bearer token, then confirm the matching
 * profile is an administrator. Returns the admin user, or null when the caller
 * is not provably an admin.
 */
async function requireAdmin(req, supabase) {
  const header = req.headers?.authorization || req.headers?.Authorization || ''
  if (!header.toLowerCase().startsWith('bearer ')) return null

  const token = header.slice(7).trim()
  if (!token) return null

  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return null

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError || profile?.role !== 'admin') return null
    return data.user
  } catch {
    return null
  }
}

module.exports = { getServiceClient, requireAdmin }
