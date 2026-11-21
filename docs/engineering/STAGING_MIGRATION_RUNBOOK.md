# Staging migration runbook — 2026-11-21

**Scope:** staging only. This runbook documents how to apply and verify, in
order:

1. `supabase/migrations/20261121000000_harden_privileged_functions_and_reviews.sql`
2. `supabase/migrations/20261121120000_restrict_admin_settings_exposure.sql`

Neither has been applied by the agent. **Update (2026-11-21):** the user reports
both were applied directly to **production**, in order, without a staging pass.
The verification queries in this runbook are now urgent post-deploy checks and
must be run against production; archive the output. The planned staging-first
gate was bypassed. Rollback files are listed in §4 and §6.

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

## 6. Second migration — SEC-006 settings exposure

Apply only after section 2 passes:

```powershell
supabase db execute --project-ref <STAGING_PROJECT_REF> --file supabase/migrations/20261121120000_restrict_admin_settings_exposure.sql
```

**Read-only verification:**

```sql
-- anon must no longer have table SELECT
select has_table_privilege('anon', 'public.admin_settings', 'SELECT') as anon_table_select;
-- expected: false

-- public view must exist without the private column
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'public_site_settings'
order by ordinal_position;
-- expected: no admin_email row

select * from public.public_site_settings;
-- expected: one row of branding/display columns only

select policyname, roles::text, qual::text
from pg_policies
where tablename = 'admin_settings' and cmd = 'SELECT';
-- expected: Admins can read all settings, using is_admin()
```

**Functional smoke checks:**

- Public site (brand, loader docs link, appearance, store hero, support page,
  contributors) still renders with values from the view.
- Admin settings screens still load and save using an admin session.
- A signed-in non-admin cannot `select * from admin_settings` through PostgREST.

**Rollback (staging only, reintroduces SEC-006):**

```powershell
supabase db execute --project-ref <STAGING_PROJECT_REF> --file supabase/rollback/20261121120000_restrict_admin_settings_exposure.down.sql
```

---

## 7. Batch 8 read-only verification — PLAN ONLY (not executed)

**Scope:** production, because the user reported both migrations were applied
there on 2026-11-21. This section covers the Batch 8 source work (tag-aware
search + 24-row offset pagination) and repeats the urgent post-apply checks by
reference. **No query in this section has been run by the agent.** Run it only
after explicit approval, with a confirmed production project ref and a read-only
SQL Editor session. Archive the output outside the repository.

**Hard limits:** SELECT / catalog queries / `EXPLAIN` without `ANALYZE` only. No
DDL, no DML, no `SET` that affects other sessions, no role switches, no
`scripts/fix-contact-rls-v2.sql`, no rollback, no payment or entitlement writes.

### 7.1 Confirm the two reported migrations

```sql
select version, applied_at
from supabase_migrations.schema_migrations
where version in ('20261121000000', '20261121120000')
order by version;
```

Expected: both versions present if they were applied through CLI migration
tooling. If they were pasted into the SQL Editor, they may be absent here; in
that case rely on the effect checks in §2 and §6, which remain mandatory.

### 7.2 Confirm the tag index exists

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'products'
  and indexname = 'idx_products_tags';
```

Expected: one row whose definition contains `USING GIN (tags)`. This index is
declared at `supabase-schema.sql:1229`.

### 7.3 Confirm the query shape is index-eligible (no execution of the plan)

```sql
explain (costs off, verbose)
select id, title
from public.products
where status = 'published'
  and tags @> array['Playbook']::text[];
```

This is what PostgREST produces for `tags.cs.{"Playbook"}`. A representative
result mentions `idx_products_tags`; on a very small table the planner may
still choose a sequential scan, which is not a failure. Do **not** add
`ANALYZE`, `SET enable_seqscan = off`, or writer data just to force a plan.

### 7.4 Confirm the live filter returns only published, tagged rows

```sql
select id, title, status, tags
from public.products
where status = 'published'
  and tags @> array['Playbook']::text[]
order by published_at desc nulls last
limit 5;
```

Expected: only `status = 'published'` rows, each containing `Playbook` in
`tags`. An empty result is acceptable if no live product carries that tag;
repeat with a real tag from the catalogue before declaring the filter broken.

### 7.5 Confirm RLS and grants were not weakened by Batch 8

```sql
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('products', 'product_files')
order by relname;

select tablename, policyname, cmd, roles::text, qual::text, with_check::text
from pg_policies
where schemaname = 'public'
  and tablename in ('products', 'product_files')
order by tablename, policyname;

select has_table_privilege('anon', 'public.products', 'SELECT') as anon_products_select,
       has_table_privilege('anon', 'public.product_files', 'SELECT') as anon_files_select,
       has_table_privilege('authenticated', 'public.product_files', 'SELECT') as auth_files_select;
```

Expected: `products` and `product_files` have RLS enabled; `anon` can SELECT
`products` but **not** `product_files`; the only public products SELECT policy
is `Public can read published products` using
`status = 'published' or is_admin()`; `product_files` SELECT is admin-only.

### 7.6 PostgREST smoke through the public endpoint (read-only)

Using the production REST base URL with **no service-role key**:

```text
GET /rest/v1/products?select=id,title,tags&status=eq.published&or=(title.ilike.%playbook%,tags.cs.{"Playbook"})&limit=5
```

Expected: HTTP 200 and only published rows. The `or(...)` value must be URL
encoded by the client in a real request. Repeat with a real tag if `Playbook`
is absent. Also confirm anonymous `GET /rest/v1/product_files?select=*` is
denied — never infer this from the browser fixture run.

### 7.7 Still mandatory

Re-run §2 and §6 of this runbook against production and archive the output.
The source-level Batch 8 changes do not replace post-apply verification of
`20261121000000_harden_privileged_functions_and_reviews.sql` or
`20261121120000_restrict_admin_settings_exposure.sql`. Razorpay raw-body/HMAC
test-mode verification and rotation of the password exposed in `dfc452e` remain
separate urgent blockers.
