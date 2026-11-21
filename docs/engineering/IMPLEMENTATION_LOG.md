# NEURAL AURORA — IMPLEMENTATION LOG

## Phase 0 — Environment and discovery (2026-11-21) — COMPLETE

**What changed:** None to application source. Created `docs/engineering/` report set. Installed dependencies locally with `npm ci` (494 packages added; tracked files unchanged).

**Why:** Establish a trustworthy baseline before modifying an existing production product.

**Actions performed:**
- Verified Git: branch `main`, HEAD `fd8281f17120ff1dfeaf087130410baad2dfb1d8`, clean working tree, tracking `origin/main`; recent commits reviewed (admin appearance/theme work, 2026-10-20/21).
- Read installed REA skill (`reverse-engineer-anything`) main instructions and reference inventory; verified REA MCP live with real tool-discovery and calls (connected; `target_unavailable` only because no target open). 263+ tools available, including browser/JS-bundle/network families.
- Read installed Taste skill (`design-taste-frontend`, tasteskill 2.5) main instructions; applied its house rules in `DESIGN_SYSTEM_AUDIT.md`.
- Verified OpenCode v2.0.32, Node v26.13.1, npm 11.20.0, PowerShell terminal; no `.github/` CI; no local Playwright/Puppeteer.
- Mapped 34 migrations, 30 public tables, ~20 public routes, 29 admin routes, 11 API functions + 8 `_lib` helpers, 24 locale files.
- Ran project scripts before dependency install (failed on missing packages) and again after `npm ci` (passed).

**Files modified:** `docs/engineering/PROJECT_AUDIT.md`, `SECURITY_AUDIT.md`, `ARCHITECTURE.md`, `DIGITAL_STORE_ROADMAP.md`, `DESIGN_SYSTEM_AUDIT.md`, `IMPLEMENTATION_LOG.md`, `PRODUCTION_READINESS.md` (new).

**Database changes:** none. **Security implications:** no policies or code changed. **Design improvements:** analysis only. **Build results:** see below. **Remaining issues:** see reports. **Manual actions:** none required yet.

---

## Phase 1 — Complete audit (2026-11-21) — COMPLETE

**Verification evidence (fresh, after `npm ci`):**

| Command | Result | Detail |
|---|---|---|
| `npm run check` | PASS | routes ranked correctly; 137 i18n keys present **in English only**; 34 migration structural lints pass |
| `npm test` | PASS | `test:order-pricing` 23/23; `test:api-guards` 68/68 = **91 tests** |
| `npm run build` | PASS (warnings) | 2,941 modules; `index` 3,494.54 kB (857.30 kB gzip), `react-spline` 2,057.53 kB, `physics` 1,987.56 kB; i18next dynamic/static import warning; PWA 30 precache entries (19,987.65 KiB ≈ 19.5 MB) |
| `npm audit` | 8 vulnerabilities | 1 high (`follow-redirects`), 6 moderate, 1 low |

**Important limitation:** these commands are structural/unit checks. They do not execute SQL, contact Supabase/Razorpay, render pages in a browser, or measure Core Web Vitals. The stale root `AUDIT_REPORT.md` claimed "secure, complete" on this basis; that claim is not supported.

**Audit method:** direct source inspection by primary agent + three parallel read-only specialist audits (database/RLS; frontend/store/design; i18n/PWA/SEO/legal/build), with every high-severity finding re-verified in source by the primary agent before inclusion.

**Key verified outcomes:**
- Commerce core is well engineered (server pricing, HMAC webhook, idempotent fulfilment, private storage, centralized admin auth). Preserve it.
- Two Critical security findings (SEC-001, SEC-002), several High findings (SEC-003/005/006/007, PLAT-01/02/08/09, SCHEMA-001).
- 4,324 missing translation values; no per-route SEO; no route code splitting; design tokens partially inert.
- Production migration/payment state cannot be verified from the repository.

**Files modified:** the seven `docs/engineering/*.md` reports.

**Database changes:** none. **Security implications:** findings documented, nothing exploited. **Design improvements:** Taste-based audit and token contract proposed. **Tests executed:** the four commands above. **Build results:** PASS with warnings. **Remaining issues:** all P2–P7 work. **Manual actions required:** see `PRODUCTION_READINESS.md`.

---

## Phase 2, batch 1 — Critical engineering fixes (2026-11-21) — SOURCE COMPLETE, MIGRATION NOT APPLIED

**Reason:** highest-confidence security/data-integrity findings first, without touching any deployed environment.

**What changed:**

1. **SEC-001 — customer recovery route rewritten.** `api/customer-signin-link.js` keeps its URL and self-service flow, but now:
   - checks for a **paid** digital order before doing anything;
   - calls `supabase.auth.signInWithOtp()` so the link is **emailed only to the address on file**, never returned in JSON, logs, or the browser;
   - creates an account only for that paid address, preserving guest-buyer recovery;
   - returns one generic `200 { ok: true }` for paid, non-purchase and mail-delivery outcomes, preventing buyer enumeration;
   - derives the redirect from `SITE_URL`, `VITE_SITE_URL`, `VERCEL_URL`, a local dev host, or a hardcoded production fallback — never from `x-forwarded-*` headers.
   - `src/components/offerings/Library.jsx` no longer displays/copies the raw token; English copy now says to check email.
2. **SEC-002 / SEC-004 / SEC-008 — privileged functions.** New forward migration `20261121000000_harden_privileged_functions_and_reviews.sql` adds an in-function `is_admin()` check and bounds to `generate_test_data()`, narrows its grants, drops the unsafe `get_admin_settings()` RPC, and sets `search_path = public, pg_temp` on every known `SECURITY DEFINER` function. `supabase-schema.sql` and `scripts/complete-migration.sql` were updated so a fresh/manual install cannot recreate the vulnerable versions.
3. **SEC-005 — review moderation.** Forward migration and consolidated schema force `approved = FALSE` with a `BEFORE INSERT` trigger and `WITH CHECK (approved = FALSE)`. Admin approval remains an UPDATE path.
4. **SEC-003 — verified email.** `api/download.js` now requires `user.email_confirmed_at`; new SQL helper `current_user_has_verified_email()` is used by the entitlements/products owner policies instead of trusting an unverified JWT email claim.
5. **SEC-007 / SCHEMA-001 — consolidated schema drift.** Added legacy payment `DROP POLICY IF EXISTS` statements and converted the invalid bare-text banner in `supabase-schema.sql` to SQL comments. The SQL lint now recognizes `public.`-qualified policy tables.
6. **Regression tests.** New assertions in `scripts/test-api-guards.mjs` cover method/config guards, paid-order gating, server-derived redirects, no token in responses, generic responses for non-purchases and mail failures, preview deployments, and source guarantees for the authored migration.

**Verification evidence (after edits):**

| Command | Result | Detail |
|---|---|---|
| `npm run check` | PASS | routes; 135 store i18n keys; **35** migration structural lints, including the new forward migration |
| `npm test` | PASS | `test:order-pricing` 23/23; `test:api-guards` **95/95** = **118 tests** |
| `npm run build` | PASS (same warnings as baseline) | `index` 3,493.60 kB (857.01 kB gzip); `react-spline` 2,057.53 kB; `physics` 1,987.56 kB; PWA 30 precache entries (19,986.80 KiB) |

**Database changes:** none applied. A migration file was authored only. **Security implications:** removes the unauthenticated token-mint path in source; live exposure remains unverified until deployment. **Design improvements:** none claimed; the store link display was removed for security, not as a Taste pass. **Manual actions required:** review and apply the forward migration to staging, verify Supabase Auth email delivery/redirect allowlisting, then production with explicit approval.

**Still open after batch 1:** ST-U13 Razorpay retry poisoning, ST-U09 stale admin bulk selection, SEC-006 public `admin_settings`, dependency upgrades, localization/SEO/design gates.

## PHASE 2 — Batch 2: client reliability selection fixes

- **ST-U13 — Razorpay loader retry poisoning.** `src/lib/razorpay.js` now shares
  a single module-level `loadPromise` across concurrent callers. A stale,
  errored, or timed-out `<script id="razorpay-checkout-script">` is removed from
  the DOM and `loadPromise` is reset on failure, so a later `loadScript()` call
  genuinely retries instead of resolving against a dead script element. A load
  resolves `true` only when `window.Razorpay` is a function; the existing
  15-second timeout and `onerror` path now resolve `false` after cleanup, which
  keeps the callers' boolean contract intact. Added three source-level
  assertions for this retry contract.
- **ST-U09 — stale admin bulk selection.** `useBulkSelect` now accepts
  `availableIds` and `onInvalidate`, prunes IDs outside the currently visible
  set, refuses to toggle hidden IDs, and filters `handleBulkDelete` inputs
  against the live visible set. `AdminOrders` passes its `filtered` rows and
  additionally filters `handleDeleteSelected` IDs through `visibleIds`.
  `AdminProducts` now clears selection on search/status-filter changes
  (matching `AdminOrders`) and passes both guard props. Added four source-level
  assertions covering the hook and both admin screens.

**Verification evidence (after batch 2 edits):**

| Command | Result | Detail |
|---|---|---|
| `npm run check` | PASS | routes; 135 store i18n keys; 35 migration structural lints |
| `npm test` | PASS | `test:order-pricing` 23/23; `test:api-guards` **102/102** = **125 tests** |
| `npm run build` | PASS (same warnings as baseline) | `index` 3,494.77 kB; `react-spline` 2,057.53 kB; `physics` 1,987.56 kB; PWA precache 19,987.94 KiB |

**Database changes:** none. **Security implications:** prevents a checkout retry against a missing SDK and bulk actions on hidden records. **Design improvements:** none claimed; no visual/browser gate was run. **Manual actions required:** browser verification of a simulated Razorpay script failure and retry, and of admin filter + bulk-selection flows.

## PHASE 2 — Batch 3: non-breaking dependency security updates

- Triaged with `npm audit fix --dry-run` first, then applied `npm audit fix`
  (no `--force`). Only `package-lock.json` changed: `fast-uri` 3.1.8 → 3.1.9,
  `follow-redirects` 1.16.0 → 1.16.3 (high advisory cleared), `minimatch`
  10.2.5 → 10.2.6, `serialize-javascript` 7.0.5 → 7.1.4, `vite` 6.4.4 → 6.4.6.
- `package.json` was not modified; no env vars, secrets, or runtime configuration
  changed. `npm audit --omit=dev` now reports **0** vulnerabilities.
- Four moderate **dev-only** advisories remain (`glob`/`minimatch` via
  `workbox-build`/`vite-plugin-pwa`). Clearing them requires `npm audit fix
  --force`, which downgrades `vite-plugin-pwa` to 1.1.0 (breaking); that change
  was **not** applied. No install-script approvals were granted.
- Re-verified after the update: `npm run check` PASS, `npm test` PASS
  (23 + 102 = 125), `npm run build` PASS with the same baseline warnings.

## PHASE 2 — Batch 4: SEC-006 public settings exposure

- **Authored migration** `20261121120000_restrict_admin_settings_exposure.sql`
  (with emergency rollback in `supabase/rollback/`): revokes anon SELECT on
  `admin_settings`, makes table reads admin-only through `is_admin()`, and
  creates `public.public_site_settings` — a `security_barrier` view with an
  explicit allowlist of branding/display columns. `admin_email` is not in the
  view. Fresh-install SQL (`supabase-schema.sql`, `scripts/complete-migration.sql`)
  was updated with the same policies, view and missing settings columns.
- **Client split:** added `getPublicSettings()` for anonymous surfaces and
  switched all public readers (support, contributors, loader, portfolio hooks,
  theme, brand, docs config, Mithi knowledge) to it or the view.
  `getAdminSettings()` now serves admin screens only and still reads the full
  row with an admin token. A latent query for a non-existent `site_tagline`
  column was replaced with `site_description`, which now reaches the public
  brand and knowledge paths.
- Seven new regression assertions cover the migration, the view allowlist,
  client routing and fresh-install SQL.

**Verification evidence (after batch 4 edits):**

| Command | Result | Detail |
|---|---|---|
| `npm run check` | PASS | 36 migration structural lints, including both new forward migrations |
| `npm test` | PASS | `test:order-pricing` 23/23; `test:api-guards` **109/109** = **132 tests** |
| `npm run build` | PASS (same warnings as baseline) | `index` 3,495.09 kB; PWA precache 19,988.25 KiB |

**Database changes:** none applied. **Security implications:** anonymous clients can no longer read the admin allowlist email from the base table; the allowlist view is the only public path. **Design improvements:** none claimed; no browser/visual gate was run. **Manual actions required:** staging apply and verification per `docs/engineering/STAGING_MIGRATION_RUNBOOK.md`.

**Still open:** four dev-only advisories (breaking upgrade decision — user chose to leave them), localization/SEO/design gates, browser/E2E verification, and both unapplied migrations.

**No migration will be applied to any environment, and no push/deploy will occur, without explicit approval.**

## Change-management record

- No secrets were read, printed or stored. Environment variable **names** only were inspected.
- No destructive Git operations; no branch changes; no stashing; no resets.
- `npm ci` created `node_modules/` (gitignored) and initially left `package-lock.json` unchanged; the later audited `npm audit fix` intentionally changed only `package-lock.json` (16 version/resolution lines).
- With explicit approval, batches 1–3 plus the staging runbook were committed locally as `9387f8b` (`main`). No push or deploy was made.
