// ---------------------------------------------------------------------------
// Structured, secret-free diagnostics for the serverless API.
//
// Every request gets a short correlation id that appears in every log line
// for that request, so a single purchase attempt can be reconstructed from
// the function logs. Environment presence is logged as BOOLEAN flags only —
// never values — so a log tail can answer "is this variable set at all?"
// without ever leaking a credential.
// ---------------------------------------------------------------------------

const crypto = require('crypto')

/** Short, per-request correlation id (not a credential, not an identifier). */
function newRequestId() {
  return crypto.randomBytes(6).toString('hex')
}

/**
 * Boolean presence flags for the named environment variables.
 * Returns `{ NAME: true|false }` — values are never included.
 */
function envPresence(names) {
  return names.reduce((flags, name) => {
    flags[name] = Boolean(process.env[name])
    return flags
  }, {})
}

function log(step, requestId, details = {}) {
  console.log(`[${step}] rid=${requestId}`, JSON.stringify(details))
}

function logError(step, requestId, details = {}) {
  console.error(`[${step}] rid=${requestId}`, JSON.stringify(details))
}

/** The Supabase variables every store endpoint depends on. */
const SUPABASE_ENV_NAMES = [
  'SUPABASE_URL',
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
]

module.exports = {
  newRequestId,
  envPresence,
  log,
  logError,
  SUPABASE_ENV_NAMES,
}
