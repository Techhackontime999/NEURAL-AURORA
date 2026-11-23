# Digital Store — setup, deployment and operations

The storefront lives under `/offerings`, so the existing services section, its
navigation, theme toggle and localisation all keep working unchanged.

| Route | Purpose |
| --- | --- |
| `/offerings/products` | Storefront: search, category/format/featured/free filters, sort; filter state is URL-synced |
| `/offerings/products/:slug` | Product page: validated preview, public file manifest, description, licence options or receipt-only notice, FAQs, purchase panel |
| `/library` | The signed-in customer's purchases, masked licence keys, licence documents, receipts and downloads |
| `/purchase/success?ref=NA-…` | Order status (polls the server; never trusts the redirect) |
| `/checkout/:orderId` | Alias that redirects to the status screen above |
| `/admin/products` | Admin: create/edit/publish/archive products, upload paid files |
| `/admin/licences` | Admin: configure product licence options (perpetual or timed); suspend/revoke/reinstate/reissue licences |
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
  handed no verified order id. If `product_license_options` cannot be read,
  checkout also returns `503` rather than guessing which licence to sell.
- **The browser may name a licence option, but may not define one.** Only
  configured `product_license_options` codes are accepted. An unknown or
  malformed code is a `400`, never a silent downgrade to the default, and
  option terms/prices are never taken from the request. Licence options carry
  no price delta; the product price remains authoritative.
- **Only published products are publicly visible or purchasable.** Enforced
  twice: RLS on `products`, and an explicit `status !== 'published'` check in
  the pricing module.
- **Money is integer minor units (paise) end to end.** No float ever touches an
  authoritative total. The database stores `INTEGER`/`BIGINT` paise.
- **Payment is verified server-side, over the raw webhook body.** The HMAC is
  computed on the unparsed body with `timingSafeEqual`. A redirect or callback
  grants nothing.
- **Entitlements are the only thing that unlocks a download.** They are created
  exclusively by `fulfilDigitalOrder` in `api/_lib/fulfilment.js`, which runs
  only after a payment has been proven — either by the webhook's HMAC signature
  or by fetching the capture from the Razorpay API in
  `/api/admin-reconcile-order` — and only when the paid amount matches the total
  the server priced. `/api/download` separately self-grants a free product to a
  verified account.
- **A licence is not an entitlement and not a receipt.** The entitlement answers
  "may this customer download?"; the licence answers "what may they do with it?".
  Licences are issued only after verified payment and an active entitlement, one
  per purchased order item, with `seats = quantity`. The selected option and its
  type are snapshotted on the order item so later edits cannot change what was
  bought.
- **Licence keys are owner-only.** The raw key is stored so its owner can show
  and copy it in `/library`; a SHA-256 `key_hash` supports indexed verification.
  Keys are never logged or returned by verification. `/api/license-document`
  rechecks ownership server-side and returns `404` for missing/foreign ids.
- **Public file metadata is allowlisted.** The catalogue reads
  `public_product_file_manifest`, a fixed view that exposes filename, MIME type,
  size, version, order and preview flag for published products only — never
  `storage_path`, bucket or credentials. Actual files still require
  `/api/download` and an entitlement.
- **Paid files live in the private `digital-products` bucket.** There is no
  `anon` or public read policy, and `product_files` has no public `SELECT`, so a
  storage path can never reach the catalogue. Delivery is a short-lived signed
  URL minted after an entitlement check.
- **Knowing an order reference, email, product id or UUID grants nothing.**
  Order status returns no PII and no files; downloads always re-check the
  entitlement against the authenticated principal.
- **A phone number is contact data, never proof.** `orders.customer_phone` is
  collected at checkout only so an administrator can deliver a sign-in link over
  WhatsApp. It is optional, normalised to digits-only international form, and
  grants nothing by itself — it is never used to authenticate anyone or to match
  an entitlement.
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
| `licenses.order_item_id` unique | licensing migration |
| order update guarded by `.neq('payment_status', 'paid')` | `api/razorpay-webhook.js` |

If fulfilment fails after a payment is recorded, the handler returns a non-2xx
so Razorpay retries. On the retry the payment insert hits the duplicate branch
and **falls through to fulfil again** — that retry is the recovery path. The same
replay also recovers a missing licence: `licenses.order_item_id` is unique, so a
second key cannot be issued if the licence was already created.

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
npm run test               # pricing, API, store, UI and route guards
npm run test:licensing     # licence options/keys/verification + preview + recommendation guards
npm run test:document-policy # licence vs receipt policy, validity snapshots and receipt PDF
npm run test:store-ux      # storefront URL filters, manifest, preview and licence UI guards
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
supabase/migrations/20261018000008_add_customer_phone.sql
supabase/migrations/20261122000000_create_product_licenses.sql
```

`…00008` is additive (`ALTER TABLE … ADD COLUMN IF NOT EXISTS`) and safe to
re-run. A checkout does **not** depend on it: the phone number is an optional
contact detail, so orders still sell if it has not been applied yet — only the
WhatsApp shortcut in the admin panel stays empty.

`…20261122000000` is also additive: products without configured licence options
keep selling and downloading exactly as before. It must be applied before
licence options are used: `/api/create-order` deliberately returns `503` if
`product_license_options` cannot be read, so a missing migration is visible as a
store outage rather than an incorrectly licensed sale. If only the two
`order_items` licence columns are missing, checkout still completes without
issuing a licence, which keeps legacy deployments sellable.

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

## 5. Product licences

A licence is a separate first-party record, not a receipt and not a download
grant. The entitlement still controls access to files; the licence records what
the buyer is allowed to do with them.

### Configuration

Admin → **Licences** (`/admin/licences`) manages per-product options. Each option
has a stable lowercase `code`, label, summary, terms, display order and an
optional default flag; only one option per product can be default (partial unique
index). Codes are identifiers, not prices or permissions defined by the browser.

On the product page, configured options appear as a radio group in the purchase
panel. The browser submits only `license_code` alongside the product slug and
quantity. `/api/create-order` reads the options from the database, resolves the
code, snapshots `license_option_id` and `license_type_snapshot` onto the order
item, and keeps the price unchanged. There are **no licence price deltas**.

Licence options do not modify existing products. A product with no options keeps
the existing download-only behaviour and issues no licence. Option CRUD is gated
by RLS (`is_admin()`); issued-licence status changes go through the audited admin
endpoint below.

### Issuance and ownership

`api/_lib/fulfilment.js` issues a licence only after the payment is proven and
the same order item has an active entitlement. One licence is created per paid
item; `seats` equals the purchased quantity. A generated key is stored for owner
display plus a SHA-256 hash for indexed verification; keys are never logged.

Replayed webhooks cannot issue a second licence because `licenses.order_item_id`
is unique. If the first fulfilment created the entitlement but failed before the
licence, the retry fills the gap.

Signed-in owners see their licences in `/library` with masked keys, reveal/copy
controls, status/seats/expiry and a downloadable server-generated document. A
non-owner cannot enumerate ids: `/api/license-document` returns the same `404`
for a missing id and someone else's licence.

Admins can upload a signature under `/admin/document-signature`. The image is
stored in the public `portfolio-images` bucket; only its URL, signer name and
title are saved in `admin_settings.document_signature` and exposed through
`public_site_settings`. The licence endpoint re-validates the URL against the
configured Supabase origin and public bucket before fetching the PNG/JPG image,
and falls back to an unsigned certificate if the image cannot be loaded. The
same trust mark is shown on product detail pages. Stored product PDFs are not
rewritten.

### Document policy: licence certificate or receipt

Every product declares `products.document_policy`:

- `license` (the default) issues a licence certificate. Each
  `product_license_options` row can be **perpetual** (`validity_days = NULL`, the
  "always use" option) or **timed** (`validity_days = N`). At checkout the server
  snapshots the resulting `order_items.license_expires_at`, so a later admin edit
  cannot shorten a licence the customer already paid for. The expiry is shown in
  the library and on the certificate.
- `receipt` issues **no licence and no licence selector**. The purchase produces
  a server-generated PDF receipt instead. This is the right choice for ebooks,
  artwork and one-off files. Entitlements and downloads are unchanged — both
  document types unlock the buyer's files.

Migration `20261123000000_add_product_document_policy.sql` adds the three
columns (`products.document_policy`, `product_license_options.validity_days`,
`order_items.license_expires_at`). It is additive: existing products keep the
licence behaviour, and the server falls back to the legacy column set if the
migration has not yet been applied.

Receipts are listed in `/library` for paid orders and offered on the purchase
success screen, including to guests. Access is keyed by the unguessable order
reference (the same capability used by `/api/order-status`), and every amount,
item and date in the PDF comes from the stored order and its item snapshots —
never from the browser. A receipt is only available once the order is paid.

### Endpoints

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /api/order-receipt?ref=<order-ref>` | Order reference capability | Generate a print-ready PDF receipt from the stored paid order; `Cache-Control: no-store` |
| `GET /api/license-document?id=<numeric-id>` | Bearer session token | Generate a print-ready PDF certificate from the stored licence row; ownership checked server-side, `Cache-Control: no-store` |
| `POST /api/license-verify` | None, rate-limited by hashed caller | Check whether a key is active for a product slug; looks up `key_hash`, returns only validity/status/type/expiry and never PII or the key |
| `GET /api/admin-license?search=&status=` | Admin bearer token | List licences with product/order data and recent events |
| `POST /api/admin-license` | Admin bearer token | `suspend`, `revoke`, `reinstate` or `reissue`; writes `license_events` with actor and reason |

`revoke` and `suspend` require a reason. `reissue` rotates the key and hash and
records an audit event. Administrative reads/writes are gated by the shared
`api/_lib/adminAuth.js`; browser state cannot claim an admin role.

`POST /api/license-verify` validates input shape before lookup and records only a
hashed caller address, product slug and success boolean in
`license_verification_attempts` (20 attempts per 60 seconds per hashed caller).
It is a narrow status check, not a signed-token evaluator or a licensing secret
exchange.

### Storefront discovery and previews

Catalogue filter state is stored in the URL (`q`, `category`, `format`, `free`,
`featured`, `sort`), so browser back/forward and shared links restore the same
view. Product detail has one `h1`, a dedicated `#purchase-panel`, deterministic
related/recently viewed products and a public file manifest from
`public_product_file_manifest`.

Preview URLs are validated by `src/lib/previewMedia.js`: only `http(s)` image or
PDF URLs are rendered. `ProductPreview.jsx` provides fullscreen, thumbnails,
PDF fallback and keyboard navigation scoped to the preview region. Unknown
product slugs use the real 404 route; no invented catalogue is displayed.
No ratings, review counts, popularity or sales counts are fabricated.

---

## 6. Testing the flow

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
2. Open the product page, enter an email and a phone number, press *Buy for ₹…*.
   The phone field is required in the form and is stored digits-only
   (`98765 43210` → `919876543210`).
3. Complete a test payment with a Razorpay test card.
4. You land on `/purchase/success?ref=NA-…`, which shows *Confirming your
   payment* until the webhook arrives, then *Payment confirmed*.
5. Sign in at `/library` with the same email to download.
6. Admin → **Orders** → the order → *Sign-in link* → *Share on WhatsApp*. With a
   number on the order, WhatsApp opens that buyer's chat with the link already
   typed; the panel says which number it will use.

**Licensed product**

1. Admin → **Licences** → choose the product → add at least one option with a
   lowercase code (for example `personal`) and mark it default.
2. Open the product page and confirm the option appears in the purchase panel.
   Select a non-default option, set quantity to 2 and complete a test payment.
3. `/library` shows one licence for that item with `seats = 2`, a masked key and
   a document download. Reveal/copy the key, then POST it to
   `/api/license-verify` with the product slug: expect `valid: true`.
4. In `/admin/licences`, suspend the licence with a reason and confirm
   verification reports `valid: false`; reinstate it and confirm it becomes
   active again. Each action appears in the event list with its actor.
5. Resend the captured webhook from Razorpay. No duplicate licence or key should
   appear; the event history should remain unchanged.

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
- Checkout returns `Could not verify the license options for this order` →
  `product_license_options` is missing or unreadable. Apply
  `20261122000000_create_product_licenses.sql`. This is intentionally a `503`,
  not a silent fallback, so the store cannot sell an undefined licence.
- Checkout rejects `Invalid license option code` / `Unknown license option`
  → the browser sent a malformed or unconfigured code. Confirm the option
  exists for that product and its code uses lowercase letters, digits and
  single hyphens. Do not add a price delta to work around it.
- `Payment confirmed` but `/library` shows no licence → the product had no
  configured option at purchase time, or the licensing migration was applied
  only to the `order_items` columns. Check the order item's snapshot columns;
  do not fabricate a licence from the client.
- `/api/license-verify` returns `429` → the 20-attempt/60-second hashed-caller
  limit was hit. Wait and retry; no key material is logged.
- `/api/license-document` returns `404` → the id is missing or belongs to
  another account. Both cases intentionally return the same response.
- `Payment confirmed` never appears → the webhook is not reaching the
  deployment, or the secret does not match. Check the function logs.
- **An order shows no phone number** → it was placed before migration `…00008`
  was applied, or the buyer's number could not be parsed. Nothing is broken: the
  link panel falls back to WhatsApp's contact picker, and the order still sells.
  Apply the migration (it is additive, see §3) to capture numbers from then on.
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
  SMTP. Meanwhile no purchase has to wait for an email: use
  **Admin → Orders → “Sign-in link”** (see *Customer sign-in when email cannot be
  delivered*) and hand the buyer the link yourself. Once the customer is inside,
  have them **set a password** in the library — password sign-in sends no email,
  so this limit stops mattering for every later visit. Creating the buyer in
  **Authentication → Users → Add user** (auto-confirm) with a password and
  having them sign in at `/login` also works — entitlements are matched on the
  session's email either way.

---

### Customer sign-in when email cannot be delivered

A customer proves a purchase by signing in with the email they used at checkout.
That normally means a Supabase email sign-in link — which cannot be sent while
the project is still on the built-in mailer (2 emails per hour; see the
checklist below).

`POST /api/admin-access-link` closes that gap. It asks Supabase to **generate** a
sign-in link without sending any message, so the mail rate limit is not involved
at all, and returns it to the administrator, who delivers it however they like.

From the admin UI: **Admin → Orders → the order → “Sign-in link”**. A panel opens
with the link, a *Copy link* button, *Open in my mail app* (a pre-filled
`mailto:` to the buyer, sent from the admin's own mailbox) and *Share on
WhatsApp*.

Or from a shell:

```bash
curl -s -X POST "$SITE/api/admin-access-link" \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"order_ref":"NA-0123456789abcdef"}'
```

```json
{
  "ok": true,
  "email": "buyer@example.com",
  "link": "https://<project>.supabase.co/auth/v1/verify?token=…",
  "redirect_to": "https://<domain>/library",
  "account_created": true,
  "orders": 1,
  "active_entitlements": 1,
  "latest_order_ref": "NA-0123456789abcdef"
}
```

- POST only, and the caller must be an admin — the same gate as reconciliation
  (`api/_lib/adminAuth.js`, one shared implementation).
- A link is only minted for an address that **already has a digital-store
  order**, so this cannot be used to create accounts for strangers (`404`
  otherwise).
- The account is created with the address already confirmed, because the
  administrator is choosing to send the link to it.
- `active_entitlements: 0` means the link will work but the library will be
  empty — no grant exists yet for that address. Check `/admin/orders`.
- No secret is returned. The link is the same one Supabase would have emailed,
  so treat it like a password: whoever opens it is signed in as that customer.
- The link expires (one hour by default, `Authentication → Email OTP
  Expiry`). Generate a fresh one if it lapses.
- `phone` echoes the customer's latest order number (digits only, e.g.
  `"919876543210"`), or `null`. It is what makes the admin UI's *Share on
  WhatsApp* open that buyer's chat directly; with `null` WhatsApp asks the admin
  to pick a contact, and the link still works.

#### Where the phone number comes from

The storefront's purchase panel asks for a number alongside the email and
validates it with `src/lib/phone.js`. It is normalised to digits-only
international form (`api/_lib/phone.js`; `98765 43210` → `919876543210`, a
leading `+`/`00` country code is preserved, an Indian trunk `0` is dropped) and
stored in `orders.customer_phone` by `/api/create-order`. The admin order list
shows it as a `tel:` and WhatsApp link, and it is included in the Razorpay
`prefill.contact` so the checkout form arrives pre-filled.

The number is **never required by the server**: an unusable value is stored as
`''` and the order still goes through, because losing a sale over an optional
contact detail would be far worse than losing a WhatsApp shortcut. Applying
migration `…00008` is what makes the value persist at all.

#### Passwords: access the library with no email at all

The sign-in link above is deliberate, but it is still a link somebody has to
deliver. Once a customer is inside the library they can **set a password**, and
from then on they open their library whenever they want with **email +
password** — a path that generates no email at all, so the mailer's hourly
limit can never be in their way.

- `/library` shows two sign-in tabs: **Email + password** (default) and
  **Email me a link** (the original one-time link).
- Signed in, a panel above the library offers **Set a password** (or
  *Change password*). It calls `supabase.auth.updateUser({ password })` on the
  live session and records `user_metadata.has_password`, which is only ever
  used to word the panel — never to gate access.
- The session is persisted by supabase-js in the browser, so a returning
  customer is usually still signed in and goes straight to the library.
- The admin's *Open in my mail app* / *Share on WhatsApp* messages now tell the
  customer to set a password, so one delivery per customer is enough.

Password sign-in hits Supabase's token endpoint, which is limited per IP
(150 requests / 5 minutes) and **not** by mail — so the practical ceiling that
caused `email rate limit exceeded` disappears for every returning customer.

Two project settings matter:

- **Authentication → Email → “Secure password change”** must stay **off**. With
  it on, changing a password requires a re-authentication email first — which
  puts the rate limit back in the way. The UI recognises that error and tells
  the customer to use a link once instead.
- **Authentication → Email Templates → Security notifications → “Password
  changed”** is optional; switch it off if you want password changes to send
  nothing at all.

Email is now needed only for an address's **first** sign-in (or a forgotten
password), and the admin "Sign-in link" covers even that without the mailer.

---

## 7. Production checklist

- [ ] All ten digital-store migrations applied, including
      `20261122000000_create_product_licenses.sql`.
- [ ] `digital-products` bucket exists and is **private**.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and
      `RAZORPAY_WEBHOOK_SECRET` set in the hosting provider (not in the repo) —
      for the **Production** environment, and for Preview too if you test there.
      The store fails closed with a `503` without the service-role key.
- [ ] Razorpay webhook created, secret matches, events subscribed.
- [ ] Licence options configured in `/admin/licences` for products that need
      them; each has a unique lowercase code and an explicit default where
      appropriate. Checkout with an unknown code fails instead of defaulting.
- [ ] A staged paid purchase confirmed: one licence issued per item, `seats`
      matches quantity, owner sees it in `/library`, document download works,
      and a replayed webhook issues no duplicate key.
- [ ] Authorisation probes confirmed: non-owner gets `404` from
      `/api/license-document`, non-admin gets `403` from `/api/admin-license`,
      and blind/invalid keys return `valid: false` from `/api/license-verify`.
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
      Authentication → Rate Limits → *emails per hour* (default 30). Until then,
      a customer who cannot receive mail can still be let in with
      **Admin → Orders → “Sign-in link”**.
- [ ] **Authentication → Email → “Secure password change” left OFF**, so a
      signed-in customer can set a password from their library without a
      re-authentication email (see *Passwords: access the library with no email
      at all*). With SMTP configured this is a convenience; without it, it is
      what lets a delivered link become email-free access forever.
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
- Licence verification is a narrow status lookup, not a signed entitlement
  token. It deliberately returns no customer or order data; a product that needs
  offline cryptographic licensing needs a separate design.
- Licence options have no price deltas in this release. Adding paid tiers would
  require server-side price resolution and explicit tests; the browser must not
  be allowed to attach prices to options.
