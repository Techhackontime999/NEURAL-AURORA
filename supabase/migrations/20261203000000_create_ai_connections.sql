-- Remote MCP / AI Connections
--
-- Default-deny storage for external AI client authorization. Every row is
-- reachable only by the service-role server functions in api/_lib/mcp-*.js;
-- no anon or authenticated browser policy grants access. Owner identity is
-- re-verified against profiles and admin_settings on every use.

CREATE TABLE IF NOT EXISTS ai_access_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  require_approval_default BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS ai_tool_settings (
  tool_name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  require_approval BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_oauth_clients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id TEXT NOT NULL DEFAULT 'primary',
  client_id TEXT NOT NULL UNIQUE,
  client_secret_hash TEXT,
  client_name TEXT NOT NULL,
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  allowed_tools TEXT[] NOT NULL DEFAULT '{}',
  allowed_scopes TEXT[] NOT NULL DEFAULT '{}',
  token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none'
    CHECK (token_endpoint_auth_method IN ('none', 'client_secret_post')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_oauth_codes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id TEXT NOT NULL DEFAULT 'primary',
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  state_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  allowed_tools TEXT[] NOT NULL DEFAULT '{}',
  resource TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_oauth_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  refresh_token_hash TEXT UNIQUE,
  client_id TEXT NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id TEXT NOT NULL DEFAULT 'primary',
  scopes TEXT[] NOT NULL DEFAULT '{}',
  allowed_tools TEXT[] NOT NULL DEFAULT '{}',
  resource TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_pending_actions (
  id TEXT PRIMARY KEY,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  token_id BIGINT REFERENCES ai_oauth_tokens(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  args JSONB NOT NULL DEFAULT '{}'::jsonb,
  args_hash TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  decision TEXT CHECK (decision IN ('approved', 'rejected')),
  decided_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_connection_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id TEXT,
  token_id BIGINT,
  portfolio_id TEXT NOT NULL DEFAULT 'primary',
  event_type TEXT NOT NULL DEFAULT 'tool_call',
  tool_name TEXT,
  outcome TEXT NOT NULL DEFAULT 'error',
  request_id TEXT,
  summary TEXT NOT NULL DEFAULT '',
  error_code TEXT,
  caller_hash TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS admin_tasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high')),
  due_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_reports (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  period_start TEXT,
  period_end TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_reply_drafts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  inquiry_id BIGINT NOT NULL REFERENCES contact_messages(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'discarded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_content_drafts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'blog' CHECK (kind IN ('blog')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ai_access_settings (id, enabled, require_approval_default)
VALUES (1, FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_ai_oauth_codes_client ON ai_oauth_codes (client_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_oauth_codes_owner ON ai_oauth_codes (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_oauth_tokens_client ON ai_oauth_tokens (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_oauth_tokens_refresh ON ai_oauth_tokens (refresh_token_hash) WHERE refresh_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_pending_actions_owner ON ai_pending_actions (owner_user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_connection_audit_created ON ai_connection_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_connection_audit_client ON ai_connection_audit (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_connection_audit_registration_rate ON ai_connection_audit (caller_hash, created_at) WHERE event_type = 'registration' AND caller_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_tasks_owner ON admin_tasks (owner_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_reports_owner ON admin_reports (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_reply_drafts_owner ON customer_reply_drafts (owner_user_id, inquiry_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_content_drafts_owner ON ai_content_drafts (owner_user_id, published_at, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_content_drafts_slug_owner ON ai_content_drafts (owner_user_id, slug) WHERE published_at IS NULL;

ALTER TABLE ai_access_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_oauth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_pending_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_connection_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reply_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_content_drafts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE ai_access_settings, ai_tool_settings, ai_oauth_clients, ai_oauth_codes,
  ai_oauth_tokens, ai_pending_actions, ai_connection_audit, admin_tasks, admin_reports,
  customer_reply_drafts, ai_content_drafts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE ai_access_settings, ai_tool_settings, ai_oauth_clients, ai_oauth_codes,
  ai_oauth_tokens, ai_pending_actions, ai_connection_audit, admin_tasks, admin_reports,
  customer_reply_drafts, ai_content_drafts TO service_role;
