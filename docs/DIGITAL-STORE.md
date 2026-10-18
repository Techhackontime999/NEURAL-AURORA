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
| `SUPABASE_SERVICE_ROLE_KEY` | `/api/create-order`, `/api/razorpay-webhook`, `/api/download`, `/api/order-status`, `/api/admin-reconcile-order` |
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
npm run test               # server pricing tests + API endpoint guards
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

- **Secret**: **you invent this value** — Razorpay does not generate one. Type any
  long random string into the dashboard's *Secret* field, then set the *same*
  string in the hosting environment as `RAZORPAY_WEBHOOK_SECRET`. If that
  variable is unset, the code falls back to `RAZORPAY_KEY_SECRET` — so either
  set a dedicated secret in both places, or paste your key secret into the
  dashboard field. Live and Test mode keep **separate** webhooks and secrets;
  the mode you configure must match the API keys in the environment.
- **Active events**:
  - `payment.captured` — fulfils the order (required)
  - `order.paid` — fulfils the order (also accepted)
  - `payment.failed` — marks the order failed (recommended)
  - `order.failed`, `order.cancelled` — mark the order cancelled (recommended)

The handler verifies the `X-Razorpay-Signature` header against an HMAC-SHA256 of
the **raw request body** using a constant-time comparison. It writes the legacy
`payments` row exactly as before, then runs the additive digital-store
fulfilment step, which is a no-op for service/support payments.

A correct setup is verifiable without a payment: fire a test event from the
dashboard's webhook page (or use the *Resend* action on a past delivery). The
delivery log shows `200` for a matching secret and `400 Invalid signature` when
the two values differ. Note that Razorpay asks for the default OTP `754081` when
adding or editing a webhook **in Test mode**.

### Service-role key

`/api/download`, `/api/order-status`, `/api/create-order`, the webhook and the
admin reconciliation endpoint all require `SUPABASE_SERVICE_ROLE_KEY`. Without
it they return `503` and log a configuration error rather than falling back to
anything weaker.

### Manual reconciliation (lost webhooks)

Entitlements are granted by the webhook, never by the browser callback. If a
gateway delivery is lost, the capture is still real and the customer must not be
left without access. `/api/admin-reconcile-order` is the recovery path:

- **Admin only.** The caller must present a Supabase access token whose profile
  role is `admin`; the role is read server-side, so it cannot be claimed.
- **Gateway-proven.** The payment is fetched from the Razorpay API with the
  server secret. The browser sends only a reference — never an amount, a status
  or a "paid" flag.
- **Same code path.** It runs the identical `fulfilDigitalOrder` used by the
  webhook (`api/_lib/fulfilment.js`), which refuses to grant unless the captured
  amount and currency match the order we priced.
- **Idempotent.** Re-running it on a paid order is a no-op.

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

- The purchase button shows *Digital store is unavailable right now* →
  `/api/create-order` answered `503`. That message is emitted only when the
  store cannot reach its privileged configuration, before any product lookup
  or gateway call. Probe it without creating an order:

  ```bash
  # an unknown slug fails at lookup, so no order row is ever written
  curl -i -X POST "$SITE/api/create-order" -H 'Content-Type: application/json' \
    -d '{"order_type":"product","items":[{"slug":"no-such-product","quantity":1}],"email":"probe@example.com"}'
  ```

  A `503` with `{"error":"Digital store is unavailable…"}` means the deployment
  is missing `SUPABASE_SERVICE_ROLE_KEY` (or a usable Supabase URL). Set it in
  the hosting provider's **Production** environment and redeploy. The function
  log line `[create-order] rid=… {"stage":"store-env-check",…,"env":{…}}` names
  the variable and reports every related flag as `true`/`false` — values are
  never logged. A `400`/`404` here means the configuration is fine and the
  problem is elsewhere.
- `Payment confirmed` never appears → the webhook is not reaching the
  deployment, or the secret does not match. Check the function logs.
- **Money captured, order still `pending`** (customer paid but no access) → the
  capture never reached us as a webhook. Do **not** hand-edit the database.
  Admin → **Orders** → the pending order → **Verify payment**. The server asks
  the Razorpay API for that order's payments, and only grants access when it
  finds a **captured** payment whose amount and currency match the order we
  priced. It is idempotent, so clicking twice is harmless. The same thing over
  HTTP (admin token required):

  ```bash
  curl -i -X POST "$SITE/api/admin-reconcile-order" \
    -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"order_ref":"NA-xxxxxxxxxxxxxxxx"}'
  ```

  Answers: `{"status":"fulfilled"}` (access granted now), `{"status":"already_paid"}`
  (nothing to do), `409` (authorised-but-not-captured, no capture yet, or an
  amount mismatch — access is *not* granted), `403` (caller is not an admin).
  The audit row in `payment_transactions` is written with `signature_valid = false`
  and `event_type = 'manual.reconcile'`: the payment came from the gateway API,
  not from a signed webhook, and the record says so.

  **`Razorpay has no successful payment attached to gateway order order_…`** →
  the capture is real but the gateway attached it to a *different* order than
  the one our row recorded (typically a payment that completed against an
  earlier checkout attempt). Open that payment in the Razorpay dashboard and use
  the **Verify by payment ID** box with its `pay_…` id:

  ```bash
  curl -i -X POST "$SITE/api/admin-reconcile-order" \
    -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"payment_id":"pay_XXXXXXXXXXXXXX"}'
  ```

  The server proves the payment with the gateway, then matches it to a **single**
  pending order by the payer's email + captured amount + currency. If more than
  one order matches it refuses and lists the references, so send
  `{"order_ref":"…","payment_id":"…"}` to pair them explicitly. Either way the
  amount must still match before access is granted.
- Log shows `PAYMENT MISMATCH` → the gateway reported a different amount or
  currency than the server priced. Do not force it; investigate the order row.
- Download returns `403 You do not have access to this product` → there is no
  active entitlement for the signed-in account. Confirm the webhook created one
  (`/admin/orders` → Entitlements tab) and that you signed in with the **same
  email** used at checkout.
- Download returns `429` → the per-entitlement rate limit (30 links/hour) was
  hit. Intentional.
- **The sign-in email links to `http://localhost:…`** → not a code bug. The app
  requests a redirect to `window.location.origin + '/library'`, and Supabase
  rewrites it to the project's `Site URL` whenever the requested origin is not
  in **Authentication → URL Configuration → Redirect URLs**. Set the `Site URL`
  to the deployed origin and allow-list `https://<domain>/**`.
- **`email rate limit exceeded`** (429) → the project is still on Supabase's
  built-in mailer, which allows **2 auth emails per hour**. Configure custom
  SMTP. Meanwhile, a purchase can still be delivered without any email: create
  the buyer in **Authentication → Users → Add user** (auto-confirm) with a
  password, and they sign in at `/login` — entitlements are matched on the
  session's email, so the library works with no mail delivered.

---

## 6. Production checklist

- [ ] All eight migrations applied.
- [ ] `digital-products` bucket exists and is **private**.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and
      `RAZORPAY_WEBHOOK_SECRET` set in the hosting provider (not in the repo) —
      for the **Production** environment, and for Preview too if you test there.
      The store fails closed with a `503` without the service-role key.
- [ ] Razorpay webhook created, secret matches, events subscribed.
- [ ] **Supabase → Authentication → URL Configuration** points at the deployed
      site: `Site URL` = the production origin, and `Redirect URLs` includes
      `https://<domain>/**` (plus `http://localhost:5173/**` for local work).
      This is what the sign-in/magic link uses: the app asks for
      `window.location.origin + '/library'`, but Supabase silently falls back to
      the `Site URL` when the requested URL is not allow-listed — which is why a
      deployed store can email a `http://localhost:…` link.
- [ ] **Custom SMTP configured** (Authentication → Emails → SMTP Settings).
      Supabase's built-in provider sends only **2 auth emails per hour** per
      project — shared by sign-up confirmations, magic links and password
      resets — and only delivers to pre-authorised team addresses. Every
      customer sign-in therefore needs a real provider; once it is set, raise
      Authentication → Rate Limits → *emails per hour* (default 30).
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
