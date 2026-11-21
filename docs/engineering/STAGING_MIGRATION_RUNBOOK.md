# Staging migration runbook — 20261121000000

**Scope:** staging only. This runbook documents how to apply and verify
`supabase/migrations/20261121000000_harden_privileged_functions_and_reviews.sql`.
It has **not** been applied by the agent. Do not run any of this against
production until staging verification and explicit production approval are
complete.

## 0. Before you start

- Confirm you are connected to the **staging** Supabase project (check the project ref
  in the dashboard URL or CLI target). Do not rely on a saved default.
- Take a database backup / verify point-in-time recovery is available.
- Keep `supabase/rollback/20261121000000_harden_privileged_functions_and_reviews.down.sql`
  open. It is an emergency rollback, not a routine down migration.
- Record the current values from the verification queries below so you can compare
  before/after.

## 1. Apply

**Option A — Supabase SQL Editor (simplest):**

1. Open the staging project → SQL Editor → New query.
2. Paste the entire contents of
   `supabase/migrations/20261121000000_harden_privileged_functions_and_reviews.sql`.
3. Run it. The file ends with `NOTIFY pgrst, 'reload schema';`, so no separate
   PostgREST reload is required.
4. Confirm there are no errors. The script is idempotent (`CREATE OR REPLACE`,
   `DROP ... IF EXISTS`, `to_regclass`/`to_regprocedure` guards).

**Option B — Supabase CLI (only if staging is linked):**

```powershell
supabase db execute --project-ref <STAGING_PROJECT_REF> --file supabase/migrations/20261121000000_harden_privileged_functions_and_reviews.sql
```

Replace `<STAGING_PROJECT_REF>` with the staging ref. Never substitute a production ref.

## 2. Read-only verification

Run these in the staging SQL Editor after applying.

**Migration recorded (if applied via CLI migration tooling):**

```sql
select version, applied_at
from supabase_migrations.schema_migrations
where version = '20261121000000';
```

**Unsafe RPC is gone:**

```sql
select to_regprocedure('public.get_admin_settings()') is null as settings_rpc_dropped;
```
Expected: `true`.

**Definer functions have a locked search path:**

```sql
select p.oid::regprocedure::text as function, p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by 1;
```
Expected: `proconfig` contains `search_path=public, pg_temp` for every function listed
in section 8 of the migration.

**`generate_test_data` grants and inline admin check:**

```sql
select grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public' and routine_name = 'generate_test_data'
order by grantee, privilege_type;

select prosrc like '%public.is_admin()%' as checks_admin_inside,
       prosrc like '%p_count > 25%' as is_bounded
from pg_proc
where oid = 'public.generate_test_data(text, integer)'::regprocedure;
```
Expected grants: `authenticated` and `service_role` only; no `PUBLIC`/`anon`.
Expected booleans: `true`, `true`.

**Review moderation:**

```sql
select tgname from pg_trigger
where tgrelid = 'public.reviews'::regclass and not tgisinternal;
select policyname, with_check from pg_policies
where tablename = 'reviews' and policyname = 'Anyone can insert reviews';
```
Expected trigger `reviews_force_unapproved` and `with_check` containing `approved = false`.

**Verified-email entitlement paths:**

```sql
select tablename, policyname, qual
from pg_policies
where (tablename = 'entitlements' and policyname = 'Users can read own entitlements')
   or (tablename = 'products' and policyname = 'Owners can read their purchased products')
order by tablename;
```
Expected: both reference `public.current_user_has_verified_email(...)` and
`status = 'active'`.

**Legacy payment policies absent:**

```sql
select count(*) as legacy_payment_policies
from pg_policies
where tablename = 'payments'
  and policyname in ('Anyone can insert payments', 'Authenticated users can view payments');
```
Expected: `0`.

## 3. Functional smoke checks (staging)

- As `anon`, call `generate_test_data` through PostgREST: must be denied.
- As an authenticated **non-admin**, call it: must fail with
  `Only admins can generate test data`.
- As an admin, call it with `p_count = 1`: succeeds; with `p_count = 0` or `26`:
  rejected.
- Insert a review with `approved = true` as `anon`: the stored row must be
  `approved = false`.
- For a paid order with an unconfirmed email, confirm no entitlement is visible;
  after confirming the address, confirm the entitlement appears.

## 4. If something fails

1. Stop further checks and capture the exact error/query output.
2. Apply the emergency rollback file only on staging, then re-test:
   ```powershell
   supabase db execute --project-ref <STAGING_PROJECT_REF> --file supabase/rollback/20261121000000_harden_privileged_functions_and_reviews.down.sql
   ```
   Note: the rollback intentionally does **not** restore the legacy permissive
   payments policies or the unsafe settings RPC.
3. Do not proceed to production.

## 5. After staging passes

Production apply still requires explicit approval, a separate production backup,
and a repeat of sections 2–3 against production. No live payment or production
data changes are part of this migration.
