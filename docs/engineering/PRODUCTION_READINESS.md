# NEURAL AURORA — PRODUCTION READINESS

- **Generated:** 2026-11-21 · **Scope:** repository + local verification only.
- **Verdict:** **NOT READY to certify.** Batches 1–4 removed the Critical token-mint path in source, authored both database hardening migrations (including the SEC-006 settings split), and fixed the Razorpay retry and stale bulk-selection bugs. Batch 7 removed a committed database credential from source, made webhook raw-body capture fail closed, and browser-verified the changed store UX with mocked fixtures. The user reports both migrations were applied directly to **production**, in order, on 2026-11-21; the agent has not verified live state, no staging pass occurred, and production verification gates remain outstanding. **The exposed DB password still requires rotation.** This is not a statement that production is currently compromised — readiness cannot be confirmed from repository evidence alone.

## 1. Gate status

| Gate | Status | Evidence |
|---|---|---|
| Git state / branch | PASS (info) | `main`, `fd8281f`, clean at start |
| Dependencies install | PASS | `npm ci` added 494 packages; no tracked-file changes |
| Route ranking check | PASS | `npm run check:routes` |
| i18n checker | PASS **but insufficient** | 141 store keys checked after batch 7 UX copy; 4,324 translations still missing across 23 locales |
| SQL structural lint | PASS **but insufficient** | 36 migrations parsed; **no SQL executed**; SCHEMA-001 invalid banner fixed in source |
| Unit/guard tests | PASS | 23 pricing + 124 API/source guards + 14 store UX = **161**; covers SEC-001, both migrations, SEC-006, Razorpay retry/body safety, credential hygiene, bulk-selection, code-splitting, PWA caching and store UX contracts |
| Production build | PASS with warnings | entry chunk 1.28 MB (378 kB gzip) via route/3D splitting; Spline/physics still ~2 MB but deferred; PWA precache reduced from 79 entries / 20,028.89 KiB to 9 entries / 1,529.70 KiB actual; chunk-size warning only |
| Dependency audit | PASS for production / PARTIAL overall | `npm audit fix` cleared the high (`follow-redirects`) and 3 others; `npm audit --omit=dev` reports **0** vulnerabilities; 4 moderate dev-only advisories remain (`glob`/`minimatch` via `vite-plugin-pwa`/`workbox-build`) and need a breaking downgrade |
| Application security | **PARTIAL — still a blocker** | SEC-001/002/003/004/005/006/007/008 and SCHEMA-001 fixed in source or authored as forward migrations; ST-U13/ST-U09 fixed in source; user reports both migrations applied to production, agent verification pending |
| Browser/UI smoke test | PARTIAL | 14/14 headless-Edge PWA scenarios passed, plus 47/47 batch-7 store UI checks with mocked Supabase fixtures. Full live-data UI/Taste store E2E still NOT TESTED |
| Store E2E (13 steps) | NOT TESTED against live services | Discovery/detail/library rendering and interactions were browser-tested with fixtures; no live DB, Razorpay or signed-URL step was executed. See `DIGITAL_STORE_ROADMAP.md` §4 |
| Production migrations applied | NOT VERIFIED | No DB access; never claim applied |
| Razorpay live/test payments | NOT TESTED | No credentials or approval |
| SEO / metadata | FAIL | Static head for all routes; missing `og:image`; stale sitemap |
| Accessibility / responsive | PARTIAL | No horizontal overflow and no console errors at 1440/390 on the three changed store routes; full Taste/a11y gate not run |
| Legal/trust consistency | REQUIRES REVIEW | Contradictions and missing disclosures (PLAT-09) |

## 1b. PWA caching status (batch 6)

Selective precache is implemented and measured locally; full inventory and evidence are in `PWA_CACHING_REPORT.md`.

- Precache: **9 shell entries**, 1,491.45 KiB build-reported / **1,529.70 KiB actual**, down from 79 / 20,028.89 KiB actual (**−92.36%**). No precache limit was raised.
- Runtime caches: hashed `/assets/*.js|css` → `CacheFirst`, 64 entries / 30 days; public images, hero video and résumé → `CacheFirst`, 12 entries / 30 days. Fonts/Fontshare/Spline policies unchanged. CRM blanket caching removed.
- No Supabase, auth, order, payment, entitlement, private download or admin API response is cached.
- Offline guarantee changed explicitly: the shell is offline-ready after install; large images, video, 3D vendors and **unvisited** route chunks are not. Visiting a page once online caches its chunks/media for later offline use.
- Browser evidence: 14/14 headless-Edge scenarios passed, including offline homepage, offline previously visited `/blog`, honest offline unvisited `/support`, update notice, online deep-link refresh, and failed-chunk recovery.
- Still theoretical: two real deployments with an old tab open, time/entry-based eviction, install prompt and Lighthouse/Core Web Vitals.

## 1c. Batch 7 status (credential, webhook, store UX)

- `npm run check`: PASS — 5 routes, 141 i18n keys, 36 migration lints.
- `npm test`: PASS — 23 pricing + 124 API/source guards + 14 store UX = **161 tests, 0 failed**.
- `npm run build`: PASS with pre-existing warnings — 2,943 modules; entry 1,283.88 kB / 377.80 kB gzip; PWA 9 entries / 1,491.77 KiB build-reported.
- Browser: local Edge 157 + CDP against `vite preview`, **47/47** checks passed at 1440×900 and 390×844 on catalogue, detail and library with mocked Supabase fixtures and a local fixture session. Covered featured chip 3→2, result count, cap notice at 200, translated image count, gallery thumbnails, purchase panel, library search/sort/no-results, responsive overflow and console errors. No rendered FAIL required a source fix.
- **Limit:** mocked data and a local session were used. This is rendered-browser verification of the UI contracts, not a live Supabase/RLS, Razorpay, entitlement or download test.
- **Security:** `scripts/migrate.cjs` and `scripts/seed.cjs` now require `DATABASE_URL`; `api/razorpay-webhook.js` disables Vercel body parsing and fails closed on a pre-parsed body. The old credential remains in pushed Git history (`dfc452e`) and **must be rotated**.

## 2. Release blockers (must clear before any production sign-off)

1. **Rotate the exposed Supabase DB password (urgent).** It was committed in `dfc452e`, which is an ancestor of HEAD and was pushed via `origin/main`. Removing it from current source does not remove it from history. Set `DATABASE_URL` wherever `migrate.cjs`/`seed.cjs` are run, then rotate the credential.
2. **Verify webhook raw-body + HMAC (urgent).** `api/razorpay-webhook.js` now declares `bodyParser: false` and fails closed on a pre-parsed body, but no live or signed test event was sent. Confirm the deployed platform honours the config and that a correctly signed test payload fulfils exactly once.
3. **Post-apply verification (urgent).** User reports both migrations were applied directly to **production**, in order, on 2026-11-21; the planned staging pass was skipped. Run the read-only checks in `STAGING_MIGRATION_RUNBOOK.md` §2/§3 and §6 against production now, archive the output, and keep `supabase/rollback/*.down.sql` ready. Do not infer success from the user's report alone.
4. **SEC-001 verification** — confirm the deployed route emails only, never returns a link, Supabase redirect allowlisting is correct, and buyers still receive mail under the project's mailer limits.
5. **SEC-006** — **fixed in source; migration user-reported applied to production**: verify anon cannot SELECT `admin_settings`, the view excludes `admin_email`, and public branding/admin settings still render. No browser evidence yet.
6. **ST-U13 / ST-U09** — **fixed in source** (Razorpay retry poisoning, stale admin bulk selection); retry/filter browser verification remains outstanding outside the batch-7 store UI scope.
5. **PLAT-01** — 4,324 missing translations on a commercial surface (or an explicit, documented English-only store decision).
6. **PLAT-08 / BUILD-SEC-01** — high and 3 other advisories patched in `package-lock.json`; production audit is clean. Four moderate **dev-only** advisories remain and require a deliberate `vite-plugin-pwa` downgrade decision.
7. **PLAT-09** — legal/tax/privacy review of licensing, refunds, GST/invoicing, voice and AI data processing.

## 3. Required production-access verification (do not infer from repo)

Run and archive (read-only):
```sql
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
SELECT tablename, policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname='public';
SELECT proname, prosecdef, proacl, proconfig FROM pg_proc WHERE pronamespace='public'::regnamespace;
SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace;
SELECT id, name, public FROM storage.buckets;
SELECT * FROM storage.policies;
```
Also verify Supabase Auth signup / email confirmation / redirect allowlist, and that all required environment variables are set **by name only** (never print values).

## 4. Store acceptance gate (staging, Razorpay **test mode**, explicit approval required)

Execute steps 1–13 from `DIGITAL_STORE_ROADMAP.md` §4 and record each result. Specifically confirm: admin creates/publishes → discovery → detail → order → server amount → test payment → verified webhook → **exactly one** entitlement → library → secure download → unauthorized denied → failed/duplicate events correct. Then replay the webhook deliberately and assert no duplicate fulfilment.

## 5. Browser/design gate (Taste)

Run the Taste scripts listed in `DESIGN_SYSTEM_AUDIT.md` §5 at 1440/1024/768/390 (+320 walk), fix all FAILs, and record `GATE: PASS` or `GATE: OPEN` with waivers. Do not claim visual completion from source inspection alone.

## 6. Change-safety constraints (still in force)

- No production migrations without approval; no env-var changes; no Razorpay live mode; no live financial transactions; no data deletion; no RLS disabling; no private-file exposure; no pushes, commits or deployments without explicit approval.
- Work locally and incrementally; preserve unrelated work; explain reason/effects/dependencies/migration+rollback before risky DB, security, payment or storage changes.

## 7. Batch 1 migration — effects, dependencies and rollback

**Forward migration:** `supabase/migrations/20261121000000_harden_privileged_functions_and_reviews.sql` (authored; **user reports applied to production 2026-11-21, agent-unverified**).

- **Effects:** redefines `is_admin`, `generate_test_data`, entitlement/product owner policies and review insert policy; creates `current_user_has_verified_email` and a review trigger; drops `get_admin_settings`; sets safe `search_path` on definer functions; drops two legacy payments policies.
- **Dependencies:** assumes the digital-store tables from `20261018*` exist. The review trigger and policy target `reviews`; policy checks use `auth.users.email_confirmed_at`. Staging must verify that admin test-data generation, review submission/moderation, and library access still work after apply.
- **Rollback:** `supabase/rollback/20261121000000_harden_privileged_functions_and_reviews.down.sql`. It restores the prior function bodies/policies and clears `search_path` overrides. It deliberately does **not** recreate legacy permissive `payments` policies or the invalid schema banner. The unsafe `get_admin_settings()` recreation is present as a commented block only for the case where it demonstrably existed before.
- **Verification after apply:** re-run the read-only SQL inventory in §3; assert anonymous/non-admin `generate_test_data` fails, review inserts with `approved: true` are coerced to false, unpaid/unverified email cannot read entitlements, and no permissive `payments` policies remain.

## 7b. Batch 4 migration — effects, dependencies and rollback

**Forward migration:** `supabase/migrations/20261121120000_restrict_admin_settings_exposure.sql` (authored; **user reports applied to production 2026-11-21 after batch 1, agent-unverified**).

- **Effects:** anon loses SELECT on `admin_settings`; table SELECT becomes admin-only; creates `public.public_site_settings`, a `security_barrier` view with an explicit allowlist of branding/display columns (no `admin_email`); grants anon/authenticated SELECT on the view only.
- **Dependencies:** requires `public.is_admin()` from batch 1 and the settings columns added by the existing `202606*`–`202610*` migrations. Public client reads were switched to `getPublicSettings()` / the view; admin screens keep `getAdminSettings()`.
- **Rollback:** `supabase/rollback/20261121120000_restrict_admin_settings_exposure.down.sql` restores the old public table read and deliberately reintroduces SEC-006; use only to undo a failed rollout.
- **Verification after apply:** anonymous `select=*` on `admin_settings` must be denied; `select * from public_site_settings` must succeed and contain no `admin_email`; public brand/hero/appearance/support pages and admin settings screens must still render.

## 8. Historical document

Root `AUDIT_REPORT.md` (2026-10-18, `feat/digital-store`) is historical and materially stale. Decision-makers should use this report and `PROJECT_AUDIT.md` instead.
