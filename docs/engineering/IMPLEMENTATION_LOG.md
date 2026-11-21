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

**Still open:** four dev-only advisories (breaking upgrade decision — user chose to leave them), localization/SEO/design gates, browser/E2E verification, and verification of the user-reported production migration apply.

## PHASE 3 — Batch 5: route-level code splitting and deferred 3D

**Reason:** PLAT-04 and DS-05 were the highest-priority verified issues that can be fixed locally without production access. The entry bundle was 3.49 MB because every route and the WebGL aurora were statically imported.

**What changed:**
- `src/App.jsx` now keeps only the shell, navigation, overlays and first-screen chrome in the entry chunk. Store, admin, blog, auth, support and secondary pages are `React.lazy` imports behind one `Suspense` boundary with an accessible `RouteFallback`.
- `AuroraBackground` (R3F/Three/drei) is lazy-loaded behind a **local** `Suspense fallback={null}`, so a slow WebGL chunk never replaces the whole page.
- Removed the app-shell prefetch of `@splinetool/react-spline`; `SplineScene` already lazy-loads on mount, so the 2 MB runtime is no longer requested on every route.
- Added three source assertions in `scripts/test-api-guards.mjs` to prevent regression of the splitting, prefetch removal and local WebGL boundary.

**Verification evidence (after batch 5):**

| Command | Result | Detail |
|---|---|---|
| `npm run check` | PASS | routes; 135 store i18n keys; 36 migration lints |
| `npm test` | PASS | 23 pricing + **112** guards = **135 tests** |
| `npm run build` | PASS (warnings) | entry chunk **1,281.88 kB (377.20 kB gzip)**, down from 3,495.09 kB (857.59 kB gzip); `AuroraBackground` chunk 828.23 kB; `AdminDashboard` 305.70 kB; Spline/physics chunks remain ~2.06/1.99 MB but are no longer in the entry chunk; PWA precache 19,990.64 KiB |

**Database changes:** none. **Security implications:** none; route guards and API behaviour unchanged. **Design improvements:** none claimed — this is a performance/engineering change, not a Taste visual pass. **Manual actions required:** browser smoke of deep links, admin routes and the Razorpay checkout retry after deployment; Lighthouse/Core Web Vitals still not measured.

**No migration will be applied to any environment, and no push/deploy will occur, without explicit approval.**

## PHASE 3 — Batch 6: selective PWA precache and offline reliability

**Reason:** Batch 5 split the routes but Workbox still precached every emitted asset. The local build installed 79 entries / 20,028.89 KiB actual (19,990.64 KiB build-reported) into Cache Storage before the app could start, even though most were lazy route chunks, 3D vendors and large portfolio images.

**Inventory first:** every precached URL in `dist/sw.js` was measured with `statSync` and classified by type, shell necessity and loading mode. Full before/after inventories are in `docs/engineering/PWA_CACHING_REPORT.md`. Only 61 of 79 entries were JS; the largest contributors were six project images plus `profile.jpg`, `react-spline` and `physics` (77.3% of the precache in eight entries). Three icon entries were duplicated.

**What changed (smallest safe configuration change):**
- `workbox.globPatterns` now allows only `index.html`, `registerSW.js`, `assets/index-*.{js,css}` and `images/neural_aurora_logo.svg`. `includeAssets` still supplies the three PWA icons; the plugin still supplies `manifest.webmanifest`. Three duplicate icon entries and the search-console HTML are gone.
- Two bounded same-origin `CacheFirst` routes were added: `/assets/*.js|css` → `neural-aurora-lazy-assets` (64 entries / 30 days), and public `/images/*`, `/hero_*.mp4`, `/resume.pdf` → `neural-aurora-media` (12 entries / 30 days). Hashed filenames make CacheFirst safe; expiry and entry caps keep storage bounded.
- The `crm-neural-aurora.vercel.app` NetworkFirst rule was **removed** — nothing fetches it, and blanket caching of a CRM host could retain admin/private GET responses. No Supabase, `/api/*`, auth, order, payment, entitlement or private-download response is cached.
- `registerType: 'autoUpdate'`, `skipWaiting()`, `clientsClaim()`, `cleanupOutdatedCaches()` and `NavigationRoute → index.html` are unchanged. `maximumFileSizeToCacheInBytes` was **not** increased.
- Fixed a pre-existing dead notification: `src/lib/swUpdates.js` now emits the `sw-update` event that `PwaStatus.jsx` already listens for; `src/main.jsx` calls the watcher. One deduplicated event is emitted on controller change (ignoring first activation), on an already-waiting worker, or on `updatefound` for an installed worker.
- Failed/expired chunks now degrade honestly: `RouteErrorFallback` says "This page isn't available offline yet" when offline, and "Could not load this page" with Reload / Clear cached page files / Go home when online. `clearRuntimeCaches()` deletes only the two optional runtime caches, never the Workbox precache, fonts or Spline cache.

**Verification evidence (after batch 6):**

| Command | Result | Detail |
|---|---|---|
| `npm run check` | PASS | routes; 135 store i18n keys; 36 migration lints |
| `npm test` | PASS | 23 pricing + **118** guards = **141 tests** (6 new PWA assertions) |
| `npm run build` | PASS (warnings) | entry 1,283.58 kB / 377.71 kB gzip; PWA **9 entries, 1,491.45 KiB build-reported / 1,529.70 KiB actual**; −92.36% actual precache; only the pre-existing i18next and >500 kB chunk warnings |
| Browser (Edge 157 + CDP, preview build) | PASS | **14/14** scenarios, including offline home, offline visited route, honest offline unvisited route, update banner, deep-link refresh and missing-chunk recovery |

**Changed guarantee:** after a successful install, the shell is offline-ready but large images, video, 3D vendors and unvisited route chunks are **not** available offline until seen once online. Previously visited routes and public media are cached within the bounded runtime caches; this was browser-tested for `/blog`. An unvisited page is never claimed to be offline-capable.

**Database changes:** none. **Security implications:** removed a blanket CRM response cache; no private response is cached. **Design improvements:** none claimed — this is an engineering change. **Manual actions required:** two-deployment old-tab test, Lighthouse/Core Web Vitals, Taste/visual gate. No commit, push or deployment performed.

---

## Phase 3 — Batch 7: store UX, credential hygiene and webhook body safety (2026-11-21) — SOURCE COMPLETE, BROWSER VERIFIED WITH FIXTURES

**Reason:** complete the first store-experience batch from `DIGITAL_STORE_ROADMAP.md` while closing two source-level security defects found during the platform audit. No payment engine, schema, RLS or navigation rewrite was attempted.

### Changes made

1. **Committed database credential removed (Critical).** `scripts/migrate.cjs` and `scripts/seed.cjs` no longer contain a Supabase Postgres connection string with an embedded password. Both now require `DATABASE_URL`, fail closed with a clear error when it is absent, and pass `connectionString: databaseUrl` to `pg.Client`. The secret value was never printed; only masked file/line references were recorded.
2. **Razorpay raw-body handling hardened (High).** `api/razorpay-webhook.js` now declares `module.exports.config = { api: { bodyParser: false } }` and `readRawBody()` throws when Vercel has already parsed `req.body`, instead of silently falling back to `JSON.stringify(req.body)`. This restores HMAC verification over the exact raw bytes and prevents a body-shape mismatch from disabling signature checks.
3. **Store UX gaps ST-U03/U08/U15 fixed.**
   - `ProductCard.jsx` renders free and featured badges independently and uses the translated `store.imageCount` key.
   - `ProductDetail.jsx` uses the same translated image-count key.
   - `Products.jsx` adds a `Featured only` chip, sends `featuredOnly`, detects active filters including featured, and shows `store.resultCountCapped` when the 200-item cap is reached.
   - `Library.jsx` adds client-side title search, newest/title sort, a visible result count and a no-results state over already-entitled rows. No library API, RLS or download authorisation changed.
   - `src/locales/en.json` gains six store keys.
4. **Regression guards.** `scripts/test-api-guards.mjs` adds webhook config/fail-closed assertions and credential-hygiene assertions for both scripts. New `scripts/test-store-ux.mjs` protects the badge, i18n, featured-filter, cap-notice and library UX contracts. `package.json` wires `test:store-ux` into `npm test`.

### Verification evidence (after all edits)

| Command | Result | Detail |
|---|---|---|
| `npm run check` | PASS | 5 routes ranked; **141** i18n keys (up from 135); **36** migration structural lints |
| `npm test` | PASS | `test:order-pricing` **23/23**; `test:api-guards` **124/124**; `test:store-ux` **14/14** = **161 tests, 0 failed** |
| `npm run build` | PASS (pre-existing warnings only) | 2,943 modules transformed; entry **1,283.88 kB / 377.80 kB gzip**; PWA **9 entries, 1,491.77 KiB** build-reported; no new runtime dependency |
| `npm run preview` + local Edge 157 + CDP | PASS | **47/47** rendered-UI checks across `/offerings/products`, `/offerings/products/:slug` and `/library` at **1440×900** and **390×844** |

**Rendered-UI method:** `vite preview` served the current `dist`; headless Edge was driven through CDP with mocked Supabase REST/auth responses and a local fixture session. This exercised the real compiled React routes in a browser, including a real click of the featured chip and real keyboard-driven library search/sort. It did **not** contact Supabase, Razorpay, a database, or any live payment endpoint. Six screenshots and `report.json` were written under `C:\Users\ADMIN\AppData\Local\Temp\opencode\ui-check\`.

**Browser results:** 3 catalogue cards and independent FREE/FEATURED badges at both widths; translated “2 views”; featured chip filters 3→2 and reports “2 product(s)”; 200-item fixture shows the cap notice; detail route renders the gallery count, two thumbnails and purchase panel; signed-in library renders search + newest/title sort + 2 items, filters to 1, shows the no-results state, and sorts A→Z. No horizontal overflow and no console errors at either width. The only console warnings were the expected local “Supabase credentials missing” fixture warnings. No rendered FAIL was found, so no source fix was needed after inspection.

**Performance impact:** negligible at runtime. The new code is a bounded client-side `useMemo` over entitled library rows, one extra translated chip/notice, and source-only test guards. Build size did not materially change from batch 6.

**Security implications:** no auth, RLS, payment-amount or fulfilment logic was changed. The webhook now fails closed if raw-body capture is misconfigured. Removing the credential from source does **not** remove it from Git history: the already-pushed commit `dfc452e` (ancestor of HEAD and contained in `origin/main`) still exposes it. **The Supabase database password must be rotated.** Live webhook HMAC, raw-body delivery and Razorpay test-mode fulfilment remain unverified.

**Database changes:** none applied. **Manual actions required:** rotate the Supabase DB password; set `DATABASE_URL` in any environment that runs `migrate.cjs`/`seed.cjs`; verify webhook raw-body receipt and HMAC with a signed test event; run the staged DB/payment acceptance journey from `DIGITAL_STORE_ROADMAP.md` §4. No commit, push or deployment was performed.

---

## Change-management record

- No secrets were read, printed or stored. Environment variable **names** only were inspected.
- No destructive Git operations; no branch changes; no stashing; no resets.
- `npm ci` created `node_modules/` (gitignored) and initially left `package-lock.json` unchanged; the later audited `npm audit fix` intentionally changed only `package-lock.json` (16 version/resolution lines).
- With explicit approval, batches 1–3 plus the staging runbook were committed locally as `9387f8b`, and batch 4 as `097304b`. Both were later pushed to `origin/main` on user instruction ("update main").
- **User-reported production state (2026-11-21):** the user manually applied
  `20261121000000_harden_privileged_functions_and_reviews.sql` first, then
  `20261121120000_restrict_admin_settings_exposure.sql`, to the production
  Supabase project. The agent has not executed or verified these migrations and
  no staging pass occurred. Post-apply verification and rollback readiness are
  now urgent; see `docs/engineering/STAGING_MIGRATION_RUNBOOK.md` §2/§3/§6.
