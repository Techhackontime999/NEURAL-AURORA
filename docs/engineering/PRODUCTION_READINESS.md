# NEURAL AURORA — PRODUCTION READINESS

- **Generated:** 2026-11-21 · **Scope:** repository + local verification only.
- **Verdict:** **NOT READY to certify.** Batches 1–4 removed the Critical token-mint path in source, authored both database hardening migrations (including the SEC-006 settings split), and fixed the Razorpay retry and stale bulk-selection bugs. The migrations have still not been applied or tested on staging, and production verification gates are outstanding. This is not a statement that production is currently compromised — readiness cannot be confirmed from repository evidence alone.

## 1. Gate status

| Gate | Status | Evidence |
|---|---|---|
| Git state / branch | PASS (info) | `main`, `fd8281f`, clean at start |
| Dependencies install | PASS | `npm ci` added 494 packages; no tracked-file changes |
| Route ranking check | PASS | `npm run check:routes` |
| i18n checker | PASS **but insufficient** | 135 store keys checked after token-display copy removal; 4,324 translations still missing across 23 locales |
| SQL structural lint | PASS **but insufficient** | 35 migrations parsed; **no SQL executed**; SCHEMA-001 invalid banner fixed in source |
| Unit/guard tests | PASS | 23 pricing + 109 API/source guards = 132; covers SEC-001, both migrations, SEC-006, Razorpay retry and bulk-selection contracts |
| Production build | PASS with warnings | 3.50 MB main chunk; ~20 MB PWA precache; chunk-size warning |
| Dependency audit | PASS for production / PARTIAL overall | `npm audit fix` cleared the high (`follow-redirects`) and 3 others; `npm audit --omit=dev` reports **0** vulnerabilities; 4 moderate dev-only advisories remain (`glob`/`minimatch` via `vite-plugin-pwa`/`workbox-build`) and need a breaking downgrade |
| Application security | **PARTIAL — still a blocker** | SEC-001/002/003/004/005/006/007/008 and SCHEMA-001 fixed in source or authored as forward migrations; ST-U13/ST-U09 fixed in source; migrations unapplied/unverified |
| Browser/UI smoke test | NOT TESTED | No browser automation run |
| Store E2E (13 steps) | NOT TESTED | See `DIGITAL_STORE_ROADMAP.md` §4 |
| Production migrations applied | NOT VERIFIED | No DB access; never claim applied |
| Razorpay live/test payments | NOT TESTED | No credentials or approval |
| SEO / metadata | FAIL | Static head for all routes; missing `og:image`; stale sitemap |
| Accessibility / responsive | NOT TESTED | Taste gate not run |
| Legal/trust consistency | REQUIRES REVIEW | Contradictions and missing disclosures (PLAT-09) |

## 2. Release blockers (must clear before any production sign-off)

1. **Apply and verify both forward migrations on staging, in order:** `20261121000000_harden_privileged_functions_and_reviews.sql` then `20261121120000_restrict_admin_settings_exposure.sql`. Rollback scripts are in `supabase/rollback/`. Review function grants/policies, the public view, and client reads after apply. See `STAGING_MIGRATION_RUNBOOK.md`.
2. **SEC-001 verification** — confirm the deployed route emails only, never returns a link, Supabase redirect allowlisting is correct, and buyers still receive mail under the project's mailer limits.
3. **SEC-006** — **fixed in source / authored migration**: anon loses base-table SELECT and public branding is served by an allowlisted view. Browser check of public branding and admin settings still required after staging apply.
4. **ST-U13 / ST-U09** — **fixed in source** (Razorpay retry poisoning, stale admin bulk selection); browser verification still outstanding.
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

**Forward migration:** `supabase/migrations/20261121000000_harden_privileged_functions_and_reviews.sql` (authored, not applied).

- **Effects:** redefines `is_admin`, `generate_test_data`, entitlement/product owner policies and review insert policy; creates `current_user_has_verified_email` and a review trigger; drops `get_admin_settings`; sets safe `search_path` on definer functions; drops two legacy payments policies.
- **Dependencies:** assumes the digital-store tables from `20261018*` exist. The review trigger and policy target `reviews`; policy checks use `auth.users.email_confirmed_at`. Staging must verify that admin test-data generation, review submission/moderation, and library access still work after apply.
- **Rollback:** `supabase/rollback/20261121000000_harden_privileged_functions_and_reviews.down.sql`. It restores the prior function bodies/policies and clears `search_path` overrides. It deliberately does **not** recreate legacy permissive `payments` policies or the invalid schema banner. The unsafe `get_admin_settings()` recreation is present as a commented block only for the case where it demonstrably existed before.
- **Verification after apply:** re-run the read-only SQL inventory in §3; assert anonymous/non-admin `generate_test_data` fails, review inserts with `approved: true` are coerced to false, unpaid/unverified email cannot read entitlements, and no permissive `payments` policies remain.

## 7b. Batch 4 migration — effects, dependencies and rollback

**Forward migration:** `supabase/migrations/20261121120000_restrict_admin_settings_exposure.sql` (authored, not applied). Apply **after** the batch-1 migration.

- **Effects:** anon loses SELECT on `admin_settings`; table SELECT becomes admin-only; creates `public.public_site_settings`, a `security_barrier` view with an explicit allowlist of branding/display columns (no `admin_email`); grants anon/authenticated SELECT on the view only.
- **Dependencies:** requires `public.is_admin()` from batch 1 and the settings columns added by the existing `202606*`–`202610*` migrations. Public client reads were switched to `getPublicSettings()` / the view; admin screens keep `getAdminSettings()`.
- **Rollback:** `supabase/rollback/20261121120000_restrict_admin_settings_exposure.down.sql` restores the old public table read and deliberately reintroduces SEC-006; use only to undo a failed rollout.
- **Verification after apply:** anonymous `select=*` on `admin_settings` must be denied; `select * from public_site_settings` must succeed and contain no `admin_email`; public brand/hero/appearance/support pages and admin settings screens must still render.

## 8. Historical document

Root `AUDIT_REPORT.md` (2026-10-18, `feat/digital-store`) is historical and materially stale. Decision-makers should use this report and `PROJECT_AUDIT.md` instead.
