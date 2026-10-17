# Digital Store — setup, deployment and operations

The storefront lives under `/offerings`, so the existing services section, its
navigation, theme toggle and localisation all keep working unchanged.

| Route | Purpose |
| --- | --- |
| `/offerings/products` | Storefront: search, category/format filters, sort, free-only |
| `/offerings/products/:slug` | Product page: media, description, licence, FAQs, purchase panel |
| `/library` | The signed-in customer's purchases and downloads |
| `/purchase/success?ref=NA-…` | Order status (polls the server; never trusts the redirect) |
| `/checkout/:orderId` | Alias that redirects to the status screen above |
| `/admin/products` | Admin: create/edit/publish/archive products, upload paid files |
| `/admin/orders` | Admin: orders, revenue summary, entitlements and revocation |

---

## 1. What the security model guarantees

These are the invariants the code is built around. They are worth reading
before changing anything in `api/` or the migrations.

- **The browser never supplies a price.** `POST /api/create-order` accepts
  product **slugs** and reads the canonical price from `products.price_paise`.
  A `price` field in the request body is ignored. See
  `api/_lib/order-pricing.js`.
- **Purchases fail closed.** Unlike the legacy service-support flow (which
  degrades to static prices when the database is unreachable), the product
  branch refuses to create an order with a `503`. There is no client-side price
  fallback and `openCheckoutModal` in `src/lib/razorpay.js` throws if it is
  handed no verified order id.
- **Only published products are publicly visible or purchasable.** Enforced
  twice: RLS on `products`, and an explicit `status !== 'published'` check in
  the pricing module.
- **Money is integer minor units (paise) end to end.** No float ever touches an
  authoritative total. The database stores `INTEGER`/`BIGINT` paise.
- **Payment is verified server-side, over the raw webhook body.** The HMAC is
  computed on the unparsed body with `timingSafeEqual`. A redirect or callback
  grants nothing.
- **Entitlements are the only thing that unlocks a download.** They are created
  exclusively by the verified webhook (paid) or by `/api/download` for a free
  product owned by a verified account.
- **Paid files live in the private `digital-products` bucket.** There is no
  `anon` or public read policy, and `product_files` has no public `SELECT`, so a
  storage path can never reach the catalogue. Delivery is a short-lived signed
  URL minted after an entitlement check.
- **Knowing an order reference, email, product id or UUID grants nothing.**
  Order status returns no PII and no files; downloads always re-check the
  entitlement against the authenticated principal.
- **A free product is self-granted only while it is published.** The download
  endpoint issues a free entitlement on the spot for a signed-in customer, but
  only for a `published` product — otherwise a draft's files could be pulled by
  anyone who guessed its slug. A pre-existing entitlement always wins, so an
  archived purchase keeps working.
- **Guests prove email ownership.** A guest checkout still works (entitlement is
  keyed to the email on the order), but to *retrieve* it they sign in through a
  Supabase email link for that same address. An email address is never by itself
  proof of ownership.

### Idempotency and reconciliation

Replayed or duplicated webhook deliveries cannot double-grant:

| Guard | Where |
| --- | --- |
| `payments.razorpay_payment_id` unique | legacy table, unchanged |
| `payment_transactions.payment_id` unique | new |
| `entitlements (product_id, order_item_id)` unique partial index | new |
| order update guarded by `.neq('payment_status', 'paid')` | `api/razorpay-webhook.js` |

If fulfilment fails after a payment is recorded, the handler returns a non-2xx
so Razorpay retries. On the retry the payment insert hits the duplicate branch
and **falls through to fulfil again** — that retry is the recovery path.

A payment whose amount or currency does not match what the server priced is
**never** auto-fulfilled. The order is left `pending` and an explicit
`PAYMENT MISMATCH — order left pending for reconciliation` line is logged with
both expected and received values. Reconciling those by hand is intentional: an
automatic grant on a mismatched amount is exactly the bug that costs money.

Failed and cancelled payments are recorded as `failed` / `cancelled` with a
reason. They grant nothing.

---

## 2. Local setup

```bash
npm install
cp .env.example .env      # then fill in the values below
npm run dev               # http://localhost:5173
```

Required variables (see `.env.example` for the annotated list):

| Variable | Used by |
| --- | --- |
| `VITE_SUPABASE_URL` | browser reads |
| `VITE_SUPABASE_ANON_KEY` | browser auth + RLS-scoped reads |
| `SUPABASE_SERVICE_ROLE_KEY` | `/api/create-order`, `/api/razorpay-webhook`, `/api/download`, `/api/order-status` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | server-side order creation |
| `RAZORPAY_WEBHOOK_SECRET` | webhook signature verification |
| `VITE_RAZORPAY_KEY_ID` | opens the Razorpay Checkout modal |

The store introduces **no new secrets**. Because the storefront is server-priced,
any environment where `SUPABASE_SERVICE_ROLE_KEY` is missing will show an honest
error instead of issuing an order.

> Note: `SUPABASE_URL` (no `VITE_` prefix) is used by the serverless functions
> when present, and falls back to `VITE_SUPABASE_URL` otherwise.

### Local commands

```bash
npm run check              # route ranking + i18n keys + SQL structural lint
npm run test               # server pricing / entitlement-decision tests
npm run build              # production build
```

`npm run check:sql` is a **structural** lint. There is no Postgres, Docker or
Supabase CLI in this environment, so migrations are never executed locally —
only parsed for unbalanced parentheses, unterminated strings and policies that
reference tables nothing creates. **Applying the migrations is a step you must
run.**

---

## 3. Applying the migrations

Run these in order in the Supabase SQL editor (or via the Supabase CLI):

```
supabase/migrations/20261018000000_create_digital_products.sql
supabase/migrations/20261018000001_create_digital_orders.sql
supabase/migrations/20261018000002_create_digital_entitlements.sql
supabase/migrations/20261018000003_create_digital_products_storage.sql
supabase/migrations/20261018000004_add_download_rate_limit.sql
supabase/migrations/20261018000005_digital_products_owner_read.sql
supabase/migrations/20261018000006_digital_products_updated_at.sql
supabase/migrations/20261018000007_harden_email_claim_policies.sql
```

`supabase-schema.sql` is the canonical schema and already contains all of the
above, so a fresh project can be created from it in one paste instead.

### Storage configuration

Migration `…00003` creates the private bucket. If your project restricts bucket
creation via SQL, create it by hand instead:

| Setting | Value |
| --- | --- |
| Bucket name | `digital-products` |
| Public | **off** |
| File size limit | your choice (files are streamed via signed URL) |
| Allowed MIME types | leave empty to accept any (PDF, ZIP, etc.) |

Policies on `storage.objects` for this bucket allow admins to read/write/delete.
There is deliberately **no** public or `anon` SELECT policy, and no `anon` grant
— an anonymous fetch of a file in this bucket must fail. Covers and preview
images keep using the existing **public** `portfolio-images` bucket through the
admin image picker.

---

## 4. Razorpay webhook configuration

Add a webhook in the Razorpay dashboard pointing at:

```
https://<your-domain>/api/razorpay-webhook
```

- **Secret**: must equal `RAZORPAY_WEBHOOK_SECRET`. If that is unset, the code
  falls back to `RAZORPAY_KEY_SECRET`.
- **Active events**:
  - `payment.captured` — fulfils the order (required)
  - `order.paid` — fulfils the order (also accepted)
  - `payment.failed` — marks the order failed (recommended)
  - `order.failed`, `order.cancelled` — mark the order cancelled (recommended)

The handler verifies the `X-Razorpay-Signature` header against an HMAC-SHA256 of
the **raw request body** using a constant-time comparison. It writes the legacy
`payments` row exactly as before, then runs the additive digital-store
fulfilment step, which is a no-op for service/support payments.

### Service-role key

`/api/download`, `/api/order-status`, `/api/create-order` and the webhook all
require `SUPABASE_SERVICE_ROLE_KEY`. Without it they return `503` and log a
configuration error rather than falling back to anything weaker.

---

## 5. Testing the flow

**Free product**

1. Admin → Products → create a product with price `0` and status `published`.
2. Upload a file in the product's **Files** section (it goes to the private
   bucket).
3. Sign out, open the product page, enter your email and press *Download free*.
   You get a Supabase sign-in link — this proves the address is yours.
4. Open the link, land on `/library`, download. The link expires in 10 minutes.

**Paid product**

1. Admin → Products → create a product with a non-zero price, publish it, upload
   a file.
2. Open the product page, enter an email, press *Buy for ₹…*.
3. Complete a test payment with a Razorpay test card.
4. You land on `/purchase/success?ref=NA-…`, which shows *Confirming your
   payment* until the webhook arrives, then *Payment confirmed*.
5. Sign in at `/library` with the same email to download.

**What to check when it does not work**

- `Payment confirmed` never appears → the webhook is not reaching the
  deployment, or the secret does not match. Check the function logs.
- Log shows `PAYMENT MISMATCH` → the gateway reported a different amount or
  currency than the server priced. Do not force it; investigate the order row.
- Download returns `403 You do not have access to this product` → there is no
  active entitlement for the signed-in account. Confirm the webhook created one
  (`/admin/orders` → Entitlements tab) and that you signed in with the **same
  email** used at checkout.
- Download returns `429` → the per-entitlement rate limit (30 links/hour) was
  hit. Intentional.

---

## 6. Production checklist

- [ ] All eight migrations applied.
- [ ] `digital-products` bucket exists and is **private**.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and
      `RAZORPAY_WEBHOOK_SECRET` set in the hosting provider (not in the repo).
- [ ] Razorpay webhook created, secret matches, events subscribed.
- [ ] Live Razorpay keys swapped in for `rzp_test_…` when going live.
- [ ] A test purchase verified end to end in the hosted environment.
- [ ] Optional: schedule `purge_expired_download_records()` via `pg_cron` (it is
      `service_role`-only) to clear expired grants and claims.

### Deliberate limits

- `product_files.is_preview` and the `purchase_claims` table exist for future
  guest recovery by emailed token, but the shipped guest flow uses a Supabase
  email sign-in link instead. `purchase_claims` currently has no writer.
- Revenue on `/admin/orders` is aggregated in the browser from the rows the
  admin can see. Move it to a SQL view or RPC if the order count grows.
- The storefront fetches the published catalogue once (capped at 200 rows) and
  filters in the browser. That keeps search-as-you-type instant; switch to
  server-side paging if the catalogue grows beyond that.
