# NEURAL AURORA — SECURITY AUDIT

- **Generated:** 2026-11-21 · **Scope:** repository source at `main` / `fd8281f` · **No production access.**
- **Label key:** Verified = confirmed in source/local execution · Requires production access = live grants/settings unknown · Suspected = needs live confirmation.
- **Secrets policy:** no secret values were read, copied or recorded. Only variable names and presence were inspected.

## 0. Positive controls (verified working — preserve these)

| Control | Evidence | Status |
|---|---|---|
| Server-authoritative integer-paise pricing; browser price ignored | `api/_lib/order-pricing.js:62-138`; 23 passing tests | Verified |
| Razorpay webhook HMAC-SHA256 over **raw body**, `timingSafeEqual` | `api/razorpay-webhook.js:10-77` | Verified |
| Amount/currency mismatch never auto-fulfils; order left pending | `api/_lib/fulfilment.js:97-120` | Verified |
| Idempotent entitlement grant (unique payment id, unique entitlement, guarded update) | `api/_lib/fulfilment.js:41-45,72-90,122-157` | Verified |
| Centralized admin gate reads role from DB, not the browser | `api/_lib/adminAuth.js:26-48`; guard tests | Verified |
| Private `digital-products` bucket; admin-only storage policies; no public read | `supabase/migrations/20261018000003_create_digital_products_storage.sql:9-39` | Verified in source |
| Download requires authenticated user + active entitlement + file ownership; 10-min signed URL; ledger records hash only | `api/download.js:48-231` | Verified in source |
| Guest download returns 401; unconfigured APIs fail closed with JSON, no secret leakage | `scripts/test-api-guards.mjs` (68 passing) | Verified |
| DOMPurify sanitization of admin-authored HTML | `src/lib/utils.js:21-32` (per source review) | Verified |
| Vercel rewrites preserve `/api/*` | `vercel.json:3-8` | Verified |

---

## 1. Critical / High findings

### [SEC-001] Unauthenticated endpoint returns Supabase magic-link tokens for any email with an order

- **Severity:** **Critical**
- **Status:** Verified in source; live exposure depends on deployment of this route.
- **Evidence:** `api/customer-signin-link.js:54-60` accepts any POST with service role; `:69-75` takes only caller-supplied email; `:78-95` checks only that *any* order row exists for that email (including pending); `:103-111` calls `supabase.auth.admin.generateLink({type:'magiclink'})`; `:149-156` returns `link`, `email`, `phone`, `account_created` in JSON. Contrast `api/admin-access-link.js:112-116` which calls `requireAdmin()`. Redirect origin is built from client-controlled `x-forwarded-host`/`x-forwarded-proto` at `:7-18,97-98`.
- **Root cause:** Service-role authentication-token minting guarded only by an attacker-supplied identifier; no mailbox/phone proof, signed claim, or admin authorization.
- **Impact:** Anyone who knows a purchaser's email and that an order exists can sign in as that customer, read their library, and see their phone number. Client-controlled redirect may worsen this if Auth redirect allowlisting is weak.
- **Recommended solution:** Remove the endpoint or require an out-of-band proof. Send the magic link only to the address on file; never return it in the API response. Use signed, expiring, single-use purchase-claim tokens (the `purchase_claims` table already exists but is unused — see STORE-002). Derive redirects from a server allowlist. Require paid order state.
- **Dependencies:** Decision on customer account-recovery UX; Supabase Auth redirect configuration.
- **Testing requirements:** Unauthenticated POST with a known order email must not return a link; pending/failed/nonexistent orders indistinguishable; header manipulation fails closed; admin path rejects non-admins.
- **Verification status:** Source verified; no live request made.
- **Remediation authored (2026-11-21):** route now emails a Supabase OTP only for paid orders and never returns a link; UI no longer renders the token; generic responses prevent enumeration; server allowlist replaces client headers. Regression tests pass locally. **Deployment/Auth delivery not verified.**

### [SEC-002] `generate_test_data()` is a public `SECURITY DEFINER` RLS bypass

- **Severity:** **Critical**
- **Status:** Verified in source; live exploitability **requires production access** to check function grants.
- **Evidence:** `supabase-schema.sql:289-335` defines `SECURITY DEFINER` function inserting into projects/skills/education/experience/blog_posts/reviews/case_studies/services with no `is_admin()` check and no `REVOKE`; `scripts/complete-migration.sql:161-278` same pattern; `src/lib/supabase.js:431-435` calls it from the browser with the anon key (`src/lib/supabase.js:9-10`); UI at `src/components/admin/AdminOverview.jsx:270-275`.
- **Root cause:** Privileged definer function relies on default `PUBLIC EXECUTE` and client-side UI gating.
- **Impact:** If production grants are default, any anonymous/non-admin client can insert rows through PostgREST, bypassing RLS write policies and review moderation.
- **Recommended solution:** New forward migration: `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated;` `GRANT ... TO service_role;` plus `IF NOT is_admin() THEN RAISE ...` and `SET search_path = public, pg_temp`. Prefer server-only generation.
- **Dependencies:** Admin test-data generation flow must be preserved (move it to an authenticated API route or grant only to a server role).
- **Testing requirements:** Anonymous and non-admin RPC calls must fail; admin flow still works; inspect `pg_proc.proacl`.
- **Verification status:** Source verified; production grants not checked.
- **Remediation authored (2026-11-21):** forward migration adds an in-function `is_admin()` check, bounded count, hardened `search_path`, and `REVOKE`/`GRANT`; consolidated and manual install scripts updated. **Migration not applied; live grants not checked.**

### [SEC-003] Entitlements trusted on an unverified email claim

- **Severity:** **High**
- **Status:** Verified in application code; production Auth confirmation setting requires access.
- **Evidence:** `api/download.js:66-68` checks only presence of `user.email`; `:83-116` matches entitlements by `customer_email`; `:127-136` free self-grant uses session email. RLS owner policies compare `auth.jwt() ->> 'email'` (`supabase-schema.sql:1777-1788,1791-1807`). `20261018000007_harden_email_claim_policies.sql:26-45` guards only against empty email. `supabase/config.toml:221` has `enable_confirmations = false` locally.
- **Root cause:** No check of `email_confirmed_at`/verified status even though comments say "verified".
- **Impact:** If production signup is open without confirmation, registering with a purchaser's email can expose entitlements matched by email alone.
- **Recommended solution:** Require verified email for email-based matching; prefer the server-bound `user_id` captured at checkout (`api/create-order.js:262-275`); require signed single-use claim for guest purchases; correct comments.
- **Dependencies:** Production Auth settings; guest-recovery design.
- **Testing requirements:** Verified email allowed; unverified denied; no-email denied; direct PostgREST RLS test.
- **Verification status:** Source verified; live Auth config not checked.
- **Remediation authored (2026-11-21):** `/api/download` requires `email_confirmed_at`; forward migration and consolidated schema use a definer helper that reads `auth.users.email_confirmed_at` for email-based RLS matching. **Migration not applied; live Auth config not checked.**

### [SEC-004] `get_admin_settings()` manual script may expose the full settings row

- **Severity:** High **if the script was run**
- **Status:** Suspected; verified in script source.
- **Evidence:** `scripts/complete-migration.sql:343-351` — `SECURITY DEFINER` function returning `to_jsonb(admin_settings.*)`, no REVOKE. `admin_settings` includes `admin_email` (`supabase-schema.sql:234-254`).
- **Impact:** With default grants, anonymous RPC could read admin email/settings, relevant to the admin bootstrap allowlist at `supabase-schema.sql:28-39`.
- **Recommended solution:** Drop or revoke the function; return an explicit public column allowlist; move `admin_email` out of a publicly readable table (see SEC-006).
- **Testing requirements:** Inspect `proacl`; anonymous/authenticated RPC must fail.
- **Verification status:** Script verified; production presence unknown.
- **Remediation authored (2026-11-21):** forward migration drops the function; the manual install script no longer recreates it. **Production presence still unknown until inspected.**

### [SEC-005] Public reviews INSERT permits self-approval

- **Severity:** **High**
- **Status:** Verified in source.
- **Evidence:** `supabase-schema.sql:628-632` `CREATE POLICY "Anyone can insert reviews" ON reviews FOR INSERT WITH CHECK (TRUE);`; `:359-367` includes client-writable `approved BOOLEAN DEFAULT FALSE`; `:677-680` grants INSERT to anon/authenticated; correct client behaviour at `src/lib/supabase.js:156-174` is not a DB control.
- **Impact:** Anonymous client can insert `approved: true` reviews directly via PostgREST, bypassing moderation and publishing arbitrary content.
- **Recommended solution:** `WITH CHECK (approved = FALSE)` plus a BEFORE INSERT trigger forcing `NEW.approved := FALSE`; keep admin UPDATE as the only approval path.
- **Dependencies:** Existing review rate-limit migration should be present in production.
- **Testing requirements:** Insert with `approved:true` rejected/coerced; public SELECT excludes unapproved; admin approval still works.
- **Verification status:** Source verified.
- **Remediation authored (2026-11-21):** insert policy requires `approved = FALSE` and a `BEFORE INSERT` trigger forces it; admin UPDATE remains the only approval path. **Migration not applied.**

### [SEC-006] Public `admin_settings` SELECT exposes `admin_email` and all settings

- **Severity:** Medium–High
- **Status:** Verified in source.
- **Evidence:** `supabase-schema.sql:256-260` `USING (true)` + `GRANT SELECT ... TO anon`; table holds `admin_email`, `crm_url`, `youtube_channel_id`, `video_hero`, `appearance`, `payment_settings`, `docs_url`, `store_hero` (`:234-254` plus migrations). `handle_new_user()` grants admin when email matches `admin_email` (`:28-39`).
- **Impact:** Anonymous clients can read the admin allowlist email and future sensitive columns; with open signup this may allow pre-registration as admin.
- **Recommended solution:** Split public branding settings from private/admin settings; expose a column-allowlisted view; move `admin_email` to a service-role-only table; do not bootstrap admin from a public value.
- **Testing requirements:** Anonymous `select=*` on the base table must be denied; the public view must not include `admin_email`; public branding still renders.
- **Verification status:** Source verified.
- **Remediation authored (2026-11-21):** forward migration
  `20261121120000_restrict_admin_settings_exposure.sql` revokes anon SELECT on
  `admin_settings`, makes table reads admin-only, and creates
  `public.public_site_settings` with an explicit column allowlist. Public client
  reads now use `getPublicSettings()` / the view; `getAdminSettings()` is reserved
  for admin screens. Consolidated schema and manual install script updated.
  **Migration not applied.**

### [SEC-007] Consolidated schema does not drop legacy permissive payment policies

- **Severity:** High when applied on top of an older database
- **Status:** Verified static drift; production policy state unknown.
- **Evidence:** `20260601150000_create_payments_table.sql:18-26` creates `"Anyone can insert payments"` (`WITH CHECK (true)`) and `"Authenticated users can view payments"` (`USING (true)`). `20260605000000_lock_down_payments_and_webhook.sql:28-35` drops them. `supabase-schema.sql:844-862` creates only admin policies without those drops. PostgreSQL OR-combines policies.
- **Impact:** If only the consolidated schema was applied to a database that had the legacy policies, all authenticated users can read payment rows and anyone can insert them.
- **Recommended solution:** Add the legacy `DROP POLICY IF EXISTS` statements to the consolidated schema; assert their absence in production `pg_policies`.
- **Testing requirements:** Anonymous INSERT denied; non-admin SELECT returns zero rows; webhook insert still works.
- **Verification status:** Source verified; production not checked.
- **Remediation authored (2026-11-21):** consolidated schema and forward migration now drop both legacy policies before recreating admin-only policies; SQL lint recognizes qualified policy tables. **Production policy state still requires inspection.**

---

## 2. Medium / Low findings

### [SEC-008] `SECURITY DEFINER` functions lack `search_path` hardening

- **Severity:** Medium · **Status:** Verified in source.
- **Evidence:** No `SET search_path` in any audited SQL. Affects `is_admin()` (`supabase-schema.sql:393-403`), `handle_new_user()` (`:23-47`), `generate_test_data()` (`:289-335`), `admin_delete_user()` (`:704-712`), `admin_can_read_product_file()` (`:1589-1600`). `config.toml:14-15` includes `public, extensions` in request search path.
- **Solution:** Add `SET search_path = public, pg_temp` to every definer function; fully qualify relations/functions.
- **Verification status:** Source verified; exploitability requires production privilege conditions.
- **Remediation authored (2026-11-21):** forward migration sets `search_path = public, pg_temp` on every known definer function, guarded by `to_regprocedure` for partial installs. **Migration not applied.**

### [SEC-009] Public counter RPCs have no abuse controls

- **Severity:** Low–Medium · **Status:** Verified in source.
- **Evidence:** `supabase-schema.sql:753-758,781-794`; browser callers in `LiveVisitorCount.jsx:12-20` and `StartingLoader.jsx:2525-2528`.
- **Solution:** Treat as approximate; throttle if used for any decision; never use for entitlement/billing/ranking.

### [SEC-010] Product-file validation RPC grant contradicts its documentation

- **Severity:** Low · **Status:** Verified in source.
- **Evidence:** `20261018000003_create_digital_products_storage.sql:51-55` comment says service-role only; `:70-71` grants EXECUTE to `authenticated, service_role`. Internal `is_admin()` check limits disclosure (`supabase-schema.sql:1591-1598`).
- **Solution:** Align comment and grant to the intended contract.

### [STORE-001] Signed URLs are bearer tokens; `max_uses` ledger is not enforced at fetch time

- **Severity:** Medium · **Status:** Verified in source.
- **Evidence:** `api/download.js:183-210` mints a 600-second signed URL and inserts `max_uses:1, used_count:1`; no storage policy or code checks `download_grants` when the object is fetched (`supabase-schema.sql:1568-1571`).
- **Impact:** A leaked URL is reusable until expiry; no immediate revocation.
- **Solution:** Keep TTL short, document bearer semantics, consider an API proxy for true single-use, monitor issuance patterns. Do not rely on `used_count` as enforcement.

### [STORE-002] `purchase_claims` table is unused

- **Severity:** Medium · **Status:** Verified in source.
- **Evidence:** `supabase-schema.sql:1490-1512` defines service-role-only claim tokens; no API references them; `api/customer-signin-link.js:78-95` uses email-only lookup instead.
- **Solution:** Use this table for the secure recovery flow that replaces SEC-001.

### [BUILD-SEC-01] Dependency vulnerabilities

- **Severity:** High (one) · **Status:** Verified by `npm audit`.
- **Evidence:** `follow-redirects` 1.16.0–1.16.1 high (credential exposure on cross-origin redirects), `fast-uri` moderate/low, `glob`/`minimatch`/`workbox-build`/`vite-plugin-pwa` moderate, `serialize-javascript` low, `vite` 6.4.4 moderate (`server.fs.deny` bypass). 8 total.
- **Solution:** Upgrade to patched versions; note that `vite-plugin-pwa` fixes require a major downgrade/upgrade decision — evaluate rather than blindly `audit fix --force`.
- **Remediation status (2026-11-21):** Non-breaking `npm audit fix` applied; `follow-redirects` 1.16.3 clears the high advisory and four other packages were bumped. `npm audit --omit=dev` reports 0 vulnerabilities. Four moderate **dev-only** advisories (`glob`/`minimatch` via `workbox-build`/`vite-plugin-pwa`) remain; `audit fix --force` was deliberately not run because it downgrades `vite-plugin-pwa` to 1.1.0.

### [BUILD-SEC-02] Browser-visible AI key template

- **Severity:** Medium · **Status:** Verified.
- **Evidence:** `.env.example:8-10` sets `VITE_AI_API_KEY`; `docs/mithi.md:33-37` acknowledges old client-side key pattern; `PRIVACY_POLICY.md:42` claims secrets are never in client code.
- **Solution:** Route all AI calls through server endpoints; remove `VITE_AI_API_KEY`; rotate any previously exposed key; correct the privacy statement with counsel.

---

## 3. Outstanding verification (cannot be completed from the repository)

- Applied migration versions and actual `pg_policies`, function `proacl`/`proconfig`, table `relrowsecurity`, storage bucket flags.
- Production Supabase Auth: signup enabled, email confirmations, anonymous sign-ins, redirect allowlist.
- Razorpay webhook endpoint reachability, secret configuration, test-mode fulfilment and replay behaviour.
- Live exploitation checks for SEC-001/002/003/005 (must be authorized and performed on staging).
- Secrets are present in deployment environment (names only verified in code; values never inspected).

## 4. Change-safety notes

Before any P2 fix: explain reason/effects/dependencies, prepare migration + rollback, identify env var names only (never values), obtain approval. Never disable RLS, expose private files, switch Razorpay to live mode, apply production migrations, or deploy without approval.
