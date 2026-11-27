# Remote MCP for Neural Aurora

Neural Aurora exposes one standards-based remote MCP server for authorized portfolio administration. It is **MCP-first**: the external client performs all reasoning, and Neural Aurora only exposes a small, owner-controlled set of application capabilities. There is no bundled LLM, no provider key requirement, and no call to the existing billable AI gateway from the MCP path.

> **Verification status:** the protocol handlers, OAuth flow, tenant gates, approval gates, replay protection and audit redaction are covered by `npm run test:mcp`. No third-party client was exercised against a live deployment in this repository, so client-specific setup below is source/standards-based rather than a claim of live certification.

## Endpoints

Set `SITE_URL` to the public HTTPS deployment origin (for example `https://neural-aurora.vercel.app`). It is used for issuer, redirect and resource values; request `Host`/`X-Forwarded-*` headers are never trusted for security decisions.

| Purpose | Public URL |
| --- | --- |
| Streamable HTTP MCP endpoint | `https://<site>/api/mcp` |
| OAuth authorization server metadata | `https://<site>/.well-known/oauth-authorization-server` |
| OAuth protected resource metadata | `https://<site>/.well-known/oauth-protected-resource` |
| Dynamic client registration | `https://<site>/api/mcp/register` |
| Authorization | `https://<site>/api/mcp/authorize` (OAuth endpoint, not a browser page) |
| Token / refresh | `https://<site>/api/mcp/token` |
| Revocation | `https://<site>/api/mcp/revoke` |

All routes are served by the existing `/api/ai` Vercel function through `vercel.json` rewrites. This keeps the project inside the Hobby plan's 12-function budget.

> **Do not open `/api/mcp/authorize` directly or paste it into a client's Connection field.** It only works when the OAuth client supplies `client_id`, `redirect_uri`, `state`, `code_challenge`, `code_challenge_method` and `scope`. It then redirects the owner to `/admin/ai-connections/authorize?request=...&state=...` for consent. Opening it bare returns a `400 invalid_client` JSON error. The PWA service worker explicitly excludes `/api/*` and `/.well-known/*` from its SPA fallback, so an installed app cannot turn these endpoints into a React 404.

### Transport and JSON-RPC

- MCP protocol versions: `2025-06-18` (default), `2025-11-25`, `2025-03-26`.
- Transport: Streamable HTTP with JSON responses. `POST` carries JSON-RPC; `DELETE` acknowledges session teardown; there is no server-side session state or SSE stream.
- Methods: `initialize`, `notifications/initialized`, `ping`, `tools/list`, `tools/call`.
- Batch JSON-RPC requests are rejected.
- If an `Origin` header is present, it must equal `SITE_URL` or an origin explicitly listed in `MCP_ALLOWED_ORIGINS`.
- Data returned by read tools is wrapped as **untrusted context** and must not be treated as instructions by the client.

## Deployment steps

1. Apply `supabase/migrations/20261203000000_create_ai_connections.sql` and `supabase/migrations/20261204000000_add_ai_client_notes.sql` (both appended to `supabase-schema.sql` for fresh installs).
2. Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set server-side, exactly as for the other admin endpoints.
3. Set `SITE_URL` to the public HTTPS origin.
4. Confirm `admin_settings.admin_email` is the current portfolio owner's Supabase auth email and that the matching `profiles.role` is `admin`.
5. Sign in to `/admin/ai-connections`.
6. Register a client or let a compatible client dynamically register, set exact redirect URI(s), allowed tools and scopes, then enable MCP access.
7. When the client redirects you to `/admin/ai-connections/authorize`, review the client, scopes, tools and redirect destination before approving.
8. Monitor clients, sessions, pending actions and the redacted audit log in the same dashboard.

**Access is off by default.** A registered client has no usable token until the current owner completes the consent flow.

## OAuth profile

- Grant types: `authorization_code`, `refresh_token`.
- Response type: `code`.
- PKCE: `S256` is mandatory. The plain method is rejected.
- Token endpoint auth: `none` (public client + PKCE) or `client_secret_post`. Basic auth is not advertised.
- Redirect URIs: exact string match against the registered list. HTTPS is required except for loopback HTTP used by native clients.
- `state`: required, at least 16 characters, hash-bound to the staged request.
- `resource`: required to match the canonical MCP URL `SITE_URL/api/mcp`; both authorize and refresh requests recheck it.
- Access tokens are opaque, hashed at rest, and short-lived. Refresh tokens are hashed, rotated on every use, and replay of an old refresh token fails.
- Revocation accepts an access or refresh token and marks the stored session revoked. The dashboard can revoke one session or every session for a client.
- Client secrets are returned only at registration and stored only as SHA-256 hashes.

## Admin dashboard capabilities

`/admin/ai-connections` provides:

- global enable/disable of external MCP access;
- global approval default for internal write tools;
- per-tool enabled and approval toggles;
- client registration, permission editing, disable and revoke;
- one-time display of an issued client secret;
- session listing, bulk revocation and expired-session cleanup;
- pending action review and approve/reject;
- redacted audit search, filters and CSV export;
- internal, admin-only notes on each registered client;
- per-client tool summaries and setup troubleshooting;
- redacted audit events with client, tool, outcome, error code and request id;
- a live discovery health check that warns when OAuth metadata still points at `localhost` or another origin.

Externally visible and destructive tools are always staged first and require a second explicit confirmation through `mcp_confirm_pending_action` or dashboard approval followed by client confirmation. A staged action is bound to the owner, client, token, tool arguments hash and expiry; it cannot be replayed.

## Tool registry (summary)

| Group | Tools | Notes |
| --- | --- | --- |
| Profile | `mcp_get_profile` | Advertises `openai/profile` metadata; no user id can be supplied. |
| Content read | `mcp_list_projects`, `mcp_get_project`, `mcp_list_services`, `mcp_get_service`, `mcp_list_blog_posts`, `mcp_get_blog_post`, `mcp_list_gallery`, `mcp_list_blog_drafts`, `mcp_search_content`, `mcp_list_case_studies`, `mcp_get_case_study`, `mcp_list_approved_reviews` | Read-only; results are untrusted context. Search is bounded and returns references only. |
| Analytics | `mcp_get_analytics_summary` | Aggregates only; no customer PII or gateway ids. |
| CRM | `mcp_list_crm_inquiries`, `mcp_get_crm_inquiry`, `mcp_draft_customer_reply`, `mcp_mark_inquiry_read`, `mcp_list_appointments`, `mcp_list_reply_drafts`, `mcp_update_reply_draft`, `mcp_set_appointment_note` | Draft editing and appointment notes never send messages, change schedules or expose phone numbers, access tokens, meeting links or gateway ids. Customer text is sanitized as untrusted data. |
| Orders | `mcp_list_order_summaries` | Status and amount only; no payment signatures. |
| Internal work | `mcp_list_tasks`, `mcp_create_task`, `mcp_update_task`, `mcp_create_report`, `mcp_list_admin_reports` | Internal only; approval configurable for writes. Reports expose metadata, not payloads. |
| Content write | `mcp_create_blog_draft`, `mcp_update_blog_post`, `mcp_publish_blog_draft`, `mcp_create_project`, `mcp_update_project`, `mcp_delete_project`, `mcp_create_gallery_item`, `mcp_delete_gallery_item` | Externally visible/destructive tools always require explicit confirmation. |
| Approval | `mcp_confirm_pending_action` | Executes a previously staged action after confirmation. |

The registry, risk labels, JSON Schemas, scope requirements and default-deny checks live in `api/_lib/mcp-policy.js`. Application execution lives in `api/_lib/mcp-store.js`; payment, refund, payout, licence, entitlement, credential, privilege, access-control, raw database, arbitrary HTTP, shell and unrestricted admin operations are not present.

## Client setup

Use the generic HTTP/OAuth setup for any client that supports MCP Streamable HTTP and OAuth 2.1-style authorization with PKCE.

```json
{
  "mcpServers": {
    "neural-aurora": {
      "type": "http",
      "url": "https://<site>/api/mcp"
    }
  }
}
```

When the client asks for OAuth settings, use:

- Discovery: `https://<site>/.well-known/oauth-authorization-server`
- Protected resource: `https://<site>/.well-known/oauth-protected-resource`
- Dynamic registration: `https://<site>/api/mcp/register`
- Resource indicator: `https://<site>/api/mcp`
- PKCE: `S256`
- Token auth: `none` unless you registered a client secret, then `client_secret_post`
- Redirect URI: copy the client's exact callback URL into the dashboard; do not use wildcards.

### Compatibility matrix

| Client family | Setup path | Status |
| --- | --- | --- |
| Generic MCP clients with HTTP transport + OAuth metadata | Enter the MCP URL, allow discovery, complete browser consent | Standards-compatible; not live-verified here |
| Claude remote connectors / Claude Desktop HTTP MCP | Use the remote MCP URL and OAuth flow; alternatively add the HTTP server config above | Source-documented OAuth support; live connector behaviour depends on client version and plan |
| ChatGPT connectors / Developer Mode remote MCP | Add a remote MCP server at `https://<site>/api/mcp`, complete OAuth, then select approved tools | `openai/profile` metadata is provided for profile output; live connector availability is account-dependent and unverified |
| Cursor, VS Code and similar MCP clients | Use HTTP MCP + OAuth if the installed version supports both | Varies by version; unknown clients may only support stdio or SSE and cannot connect |

Clients that require only SSE transport, `client_secret_basic`, static bearer tokens, OAuth 1.0, SAML, or a vendor-specific plugin manifest are not supported. Browser-only clients may require CORS configuration because this server does not currently emit permissive CORS headers.

## WhatsApp boundary

WhatsApp Business remains a customer support channel. There is no MCP tool for sending WhatsApp messages, reading arbitrary chats, or executing portfolio commands from customer messages. Reply drafts are stored internally and never sent by MCP. Any future WhatsApp integration must use the existing customer-support approval path, never an MCP customer message as an administrative command.

## Security notes and limitations

- Every access token use rechecks that its owner still exists, has `profiles.role = 'admin'`, and still matches `admin_settings.admin_email`. Demoting or replacing the owner invalidates existing connections.
- All MCP tables have RLS enabled and no anon/authenticated policies; only service-role server code accesses them.
- Tool arguments are schema-validated, prototype-pollution keys are rejected, text is sanitized, and read results are wrapped as untrusted.
- Audit summaries are redacted before storage; raw tool arguments, tokens, secrets, emails and phone numbers are not written to the audit log.
- Auditing is best-effort: a database failure while writing an audit row is logged by the platform but does not change the tool result. Production alerting should monitor database errors.
- There is no durable rate limit per MCP token beyond short-lived tokens, client revocation and the registration rate guard. Add an edge rate limit if public dynamic registration is enabled at scale.
- There is no audit retention policy; configure one at the database level if required.
- `MCP_ALLOWED_ORIGINS` is optional. Only set it for non-browser clients that legitimately send a browser-style `Origin` header from a different origin.
- The MCP path does not call an LLM and does not require an AI provider key. Client-side model behaviour, including how it interprets untrusted tool output, remains the client operator's responsibility.

## Tests

```bash
npm run test:mcp       # OAuth, replay, revocation, scopes, approval, injection, tenant gates
npm run test:api-guards # includes the 12-function budget and existing API fail-closed guards
npm run check
npm run build
```
