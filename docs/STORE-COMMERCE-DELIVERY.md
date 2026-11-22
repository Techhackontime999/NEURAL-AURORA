# Store Commerce Delivery Report

Status: implementation complete on `feat/premium-store-commerce`; awaiting live integration verification.

## What changed

###第一方结账与授权 (P0)
- Server-authoritative checkout: `/api/create-order` reads price/currency from the database, validates purchasable state and license options, and creates a Razorpay order. It never accepts a client price.
- Verified webhook only: `/api/razorpay-webhook` validates the Razorpay signature before any fulfilment.
- 幂等履约: order transitions are guarded by `status='created'`; an order item becomes entitled only once (`order_items.entitlement_granted_at`); one license is issued per purchased item with `seats = quantity` and a unique `order_item_id`.
- Licenses are stored as a raw key for owner display plus a SHA-256 `key_hash` for indexed verification. Keys are not logged. License documents are owner-only; `/api/license-verify` exposes only status/type/expiry and is rate-limited by hashed caller.
- Buyer downloads remain behind `/api/download`, which checks entitlement and RLS before returning a signed storage URL.

### Storefront discovery / UX (P1)
- Product filtered state is URL-synced (`q`, `category`, `format`, `free`, `featured`, `sort`), so back/forward and shared links preserve the view.
- Product detail: one `h1`, a dedicated purchase panel with license options, a public file manifest from `public_product_file_manifest`, and deterministic recently viewed/related products.
- Preview supports images/PDFs, fullscreen/thumbnails/keyboard navigation, validated `http(s)` media only, safe fallback for each `Product`.
- Real not-found state is used for unknown product URLs; no invented catalogue is shown.
- Library shows issued licenses with masked keys, reveal/copy, and server-generated print-ready PDF certificates (navy / cyan / violet, vector text, no client-rendered HTML).
- Admin: `/admin/licences` manages product license options and issued licenses.
- Admin `/admin/document-signature` uploads a PNG/JPG signature, signer name and title into `admin_settings.document_signature`; the signed URL is allowlisted in `public_site_settings`.
- Licence PDFs embed the signature after strict origin/bucket/MIME/size checks; product detail pages show the same trust mark. Stored product PDFs are not rewritten.
- Storefront colors were normalized to design tokens; no raw hex values remain in the storefront components.

### Security invariants
- No client-controlled price, entitlement, role, license status or storage path.
- Owner-only RLS on `licenses`; admin-only on `product_license_options`; public metadata limited to a fixed view.
- Checkout fails closed with 503 when `product_license_options` is unavailable.
- Unknown or malformed license codes fail checkout; no option, price or licence is invented by the browser.
- No fabricated reviews, ratings, popularity, sales counts, or live integration success.

### Tests and docs
- `supabase/migrations/20261122000000_create_product_licenses.sql`; consolidated in `supabase-schema.sql`.
- `scripts/test-licensing.mjs`, `scripts/test-store-ux.mjs`, plus API guard tests for `license-document`, `license-verify`, and `admin-license`.
- `docs/DIGITAL-STORE.md` and `docs/engineering/DIGITAL_STORE_ROADMAP.md` updated with licensing, endpoints, UI, operations and deployment caveats.

## Verification performed

| Check | Result |
|---|---|
| `npm test --silent` | 360 passed, 0 failed |
| `npm run check --silent` | routes, i18n (186 keys) and all migrations passed |
| `npm run build --silent` | succeeded; PWA output generated |
| `git diff --check` | clean |

Build warnings remain only for pre-existing oversized chunks and are not failures.

Local visual verification was run in headless Microsoft Edge against the compiled preview build with mocked Supabase fixtures at **1440×900, 1024×768, 768×1024, 390×844 and 320×720**, covering `/offerings/products`, a product detail page, an unknown product slug and `/library` (20 route/viewport combinations). Screenshots and raw metrics are in `C:\Users\ADMIN\AppData\Local\Temp\opencode\neural-aurora-visual` (`results.json`). Assertions passed for one `h1` per route, six catalogue cards, purchase panel with two licence radios, two manifest rows, preview region, zero broken images and **zero horizontal overflow** at every width. The only console messages were the deliberate `406`/`No rows found` log on the unknown-product route, which is the real not-found path. This verifies layout and fixture-driven UI, **not** live Supabase data or integrations.

Live payment, webhook, download, RLS and licence verification were not runnable without configured Supabase/Razorpay credentials and a live app/database. They remain required before production launch.

## Deployment requirements

1. Apply `supabase/migrations/20261122000000_create_product_licenses.sql` before deploying checkout.
2. Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SITE_URL`/`PUBLIC_SITE_URL`, and storage bucket policies.
3. Verify Razorpay order creation, webhook signature, retry/replay, license issuance, owner access, admin access, download authorization, and i18n in a staging environment.
4. Repeat visual verification at 1440/1024/768/390/320px against the deployed origin with real catalogue data, confirming zero unexpected console errors and correct mobile layouts.

## Branch status

Work is on `main` with all implementation changes local and uncommitted. The pre-existing `docs/PRODUCT-VISION-ARCHITECTURE.md` proposal remains untracked and untouched; existing `README.md` work was preserved while its stale test/env notes were synchronized.
