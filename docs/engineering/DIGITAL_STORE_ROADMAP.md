# NEURAL AURORA — DIGITAL STORE ROADMAP

- **Generated:** 2026-11-22 · **Status:** source-verified through batch 11; store UI and route-head contracts browser-tested with mocked fixtures; no production DB, Razorpay or live payment E2E performed.

## 1. What exists today (preserve)

| Capability | Implementation | Status |
|---|---|---|
| Catalogue route | `/offerings/products` → `Products.jsx` | Verified |
| Discovery | debounced search, category chips, format chips, free-only, sort | Verified |
| Product detail | `/offerings/products/:slug`, gallery + lightbox, sanitised description, includes/requirements/licence/support/refund/FAQ, related | Verified |
| Pricing | server-authoritative integer paise; client price ignored; INR/USD | Verified + 23 tests |
| Checkout | Razorpay Checkout via `checkout.js` / `razorpay.js`; email + phone | Verified |
| Payment proof | raw-body HMAC webhook; gateway lookup reconciliation; mismatch fails closed | Verified + guard tests |
| Fulfilment | exactly one grant path; idempotent via unique constraints + guarded update | Verified |
| Order status | `/purchase/success` polls `/api/order-status`; server truth, not redirect | Verified |
| Library | `/library` with password / magic-link sign-in, entitlements, secure download | Verified (UX gaps below) |
| Delivery | private bucket, 10-min signed URL, entitlement + file ownership checks, rate-limited ledger | Verified in source |
| Admin | products CRUD/status/upload, orders/revenue/revoke/reconcile, payments | Verified |

Commerce engine assessment: **the payment/fulfilment core is sound and should not be rewritten.** Security exceptions are the recovery endpoint (SEC-001), email verification (SEC-003) and signed-URL bearer semantics (STORE-001).

## 2. Gap analysis (store UX / commercial)

| ID | Gap | Severity | Evidence | Fix |
|---|---|---|---|---|
| ST-U01 | Catalogue hard-capped at 200 with no pagination or truncation signal | Medium | `Products.jsx:25,270-274`; `products.js:70` | **Fixed and browser-verified:** 24-row pages, offset `load more` up to 200, honest loaded count and cap notice; live-data query plan still open |
| ST-U02 | Search ignores tags despite GIN index | Medium | `products.js:53-60` vs `supabase-schema.sql:1145` | **Fixed and browser-verified:** sanitised `tags.cs.{...}` alternatives added to the single `or()` search; 17 unit guards; live GIN query plan still open |
| ST-U03 | `featuredOnly` unused; featured free products lose badge | Low | `Products.jsx:19,101,132-137,224-229`; `ProductCard.jsx:60-77` | **Fixed and browser-verified:** featured chip filters 3→2, result count follows filter, both badges render independently |
| ST-U04 | No public file manifest or compatibility field | Medium | `ProductDetail.jsx:286-325` never calls `getProductFiles`; no `compatibility` column | Add public-safe file metadata endpoint + structured compatibility |
| ST-U05 | No ratings/sales-count trust signals | Low | `ProductDetail.jsx:495-498` only secure note | Add verified-purchase reviews/count or stronger policy summary |
| ST-U06 | Checkout is inline with weak validation; no quantity, terms checkbox or itemised summary | Medium | `ProductDetail.jsx:101-114,400-468` | **Fixed and browser-verified:** native required form, quantity 1–10 matching the server cap, terms gate and display-only itemised total; live Razorpay checkout still open |
| ST-U07 | Free-download `window.open` after await can be pop-up-blocked | Low | `ProductDetail.jsx:119-124` | **Fixed and browser-verified:** placeholder tab opens in the submit task, `opener` cleared, same tab navigated to the signed URL; blocked fallback is reported; guest magic-link path unchanged |
| ST-U08 | Library has no search/filter/sort/pagination/file details | Low | `Library.jsx:89-107,511-545,582-597` | **Partially fixed and browser-verified:** client search, newest/title sort, result count and no-results state; per-entitlement file list/pagination still open |
| ST-U09 | Admin bulk selection survives filter changes → hidden products deletable | Medium | `AdminProducts.jsx:99-100,244-259` vs `AdminOrders.jsx:113-115` | **Fixed in source:** visible-scoped `useBulkSelect`, filter-change clearing, visible-only deletes; admin pages now browser-verified, but the filter-change selection flow itself is still untested in-browser |
| ST-U10 | No admin category CRUD, product preview, or consistent price formatting | Medium | `adminProducts.js:125-144` unused; `AdminProducts.jsx:320,386-402,634` | **Fixed and browser-verified:** DB-backed category CRUD form, immutable slug, draft-safe product preview, shared `formatPrice`; live admin CRUD against real RLS still open |
| ST-U11 | Revenue KPI is INR-only despite INR+USD support | Medium | `adminProducts.js:279-310`; `AdminOrders.jsx:325` | Render per-currency KPIs |
| ST-U12 | Entitlements show numeric product id; no export/refund tooling | Low | `AdminOrders.jsx:583-586` | Join product titles; add filters/export; refund endpoint if in scope |
| ST-U13 | Failed Razorpay script load poisons retries | Medium | `razorpay.js:1-30,81-85,113-115` | **Fixed in source with guard:** shared load promise, failed-script cleanup, retry reset, SDK-global check; live script-retry simulation still outstanding |
| ST-U14 | Poll timer scheduled inside state updater | Low | `PurchaseSuccess.jsx:71-79,89-92` | **Fixed and browser-verified:** ref counter, timeout scheduled after the resolved request, no duplicate terminal timers |
| ST-U15 | Hardcoded "views" label; store text ignores theme tokens | Low/Med | `ProductCard.jsx:73-77`; `ProductDetail.jsx:240-244`; `src/locales/en.json:292` | **Fixed and browser-verified:** image count uses `store.imageCount`; semantic theme classes preserved; full design-token pass still open |
| ST-U16 | Store has no per-route metadata/JSON-LD | High | `index.html:6-21`; no head manager | **Fixed and browser-verified:** route-level head manager, canonical/social tags, private-route `noindex` and Product JSON-LD; live rich-result validation still open |

Full i18n, PWA, SEO and design findings are in `PROJECT_AUDIT.md` and `DESIGN_SYSTEM_AUDIT.md`.

## 3. Prioritized implementation order

**Phase 2 — critical engineering (before UX):**

Batch 1 — source complete; migration user-reported applied directly to production on 2026-11-21 (verification pending):
1. SEC-001 customer-signin-link now emails a Supabase OTP to a paid address; no token is returned.
2. SEC-002/004 forward migration hardens `generate_test_data` and drops `get_admin_settings`.
3. SCHEMA-001 invalid banner fixed; SEC-007 legacy payment policy drops added.
4. SEC-005 reviews self-approval blocked; SEC-003 verified-email entitlement matching added.

Batch 2 — source complete, verification outstanding:
5. ST-U13 Razorpay retry poisoning and ST-U09 bulk-selection data-loss risk fixed in source.
6. Apply/verify the forward migration on staging; verify Auth delivery and redirect allowlisting.

Batch 3 — dependency hygiene:
7. Non-breaking `npm audit fix` applied; production audit clean. Four moderate dev-only advisories need a deliberate `vite-plugin-pwa` decision.

**Phase 3 — design system + storefront (Taste):** tokens consumed, violet removed, editorial hierarchy, store cards/detail/catalogue refined, browser inspection at 1440/1024/768/390.

Batch 7 (2026-11-21) completed the first storefront slice: ST-U03, the cap-notice half of ST-U01, the search/sort/no-results half of ST-U08 and the image-count i18n half of ST-U15. Local Edge/CDP verification passed 47/47 checks at 1440×900 and 390×844 against the compiled preview build with mocked Supabase fixtures. Full live-data store E2E and the remaining file-manifest/SEO work stay open.

Batch 8 (2026-11-21) closed the remaining ST-U01 pagination half and ST-U02 tag search: 24-row offset pages up to the 200-item cap, a lookahead-based `Load more products` button with an honest visible count, and sanitised `tags.cs.{...}` alternatives in the single catalogue query. Local Edge/CDP verification passed **62/62** checks at 1440×900 and 390×844 with mocked Supabase/auth fixtures; `npm test` reached **182 tests, 0 failed**. Live Supabase GIN query-plan, RLS and payment/entitlement verification remain open.

Batch 9 (2026-11-21) closed ST-U06: the paid purchase panel is now a native validated form with quantity 1–10, a terms gate and a display-only itemised total. The server still reprices every order and enforces the same cap. Local Edge/CDP verification passed **72/72** checks with mocked fixtures; `npm test` reached **188 tests, 0 failed**. No live Razorpay order was created. ST-U04 was deferred because it needs a new public file-manifest endpoint and a `compatibility` column migration.

Batch 10 (2026-11-21) closed ST-U07 and ST-U14, and added a source guard for ST-U13: free downloads pre-open a safe placeholder tab before the signed request, and the purchase success page schedules its next poll from a ref after each resolved request. Local Edge/CDP verification passed **78/78** checks with mocked download/status endpoints; `npm test` reached **193 tests, 0 failed**. Live Razorpay SDK retry, gateway webhook and storage downloads remain open.

Batch 11 (2026-11-22) closed ST-U16: a dependency-free head manager replaces only marked shell tags, static routes get canonical/social metadata, private routes are `noindex`, and product detail emits `schema.org/Product` JSON-LD with canonical URL, numeric price, currency and availability. Local Edge/CDP verification passed **84/84** checks; `npm test` reached **215 tests, 0 failed**. Live rich-result validation and JavaScript-disabled crawler behaviour remain open.

**Phase 4 — commerce/customer experience:** ST-U01/U02 closed in batch 8, ST-U06 in batch 9, ST-U07/U14 in batch 10; remaining ST-U04, U08, U10, U11; then low-priority UX items.

**Phase 5+:** ST-U16 head/SEO closed in batch 11; i18n parity, PWA lifecycle, bundle splitting, then evaluate analytics/bundles/coupons/reviews/Mithi assistant.

## 4. Store acceptance journey — current testability

| # | Step | Local test status |
|---|---|---|
| 1 | Admin creates product | Admin panel exists; **not browser-tested** |
| 2 | Product published | Status workflow exists; **not tested** |
| 3 | Customer discovers it | **Browser-tested with fixtures** (1440/390): cards, featured filter, tag search, 24-row pages + load more, result count, cap notice |
| 4 | Complete product info viewed | **Browser-tested with fixtures**: image count, gallery, purchase panel; ST-U04 file manifest still open |
| 5 | Order placed | API guards unit-tested; **no live call** |
| 6 | Server authoritative amount | **Verified** (23 unit tests); batch 9 client form sends slug + bounded quantity only, display total is not authoritative |
| 7 | Razorpay test payment | **Not tested** — requires test keys + approval |
| 8 | Server verifies payment | HMAC code verified; **no live webhook** |
| 9 | Entitlement created exactly once | Idempotency design verified; **no live DB test** |
| 10 | Library access | **Browser-tested with a local fixture session**: search, sort, result count, no-results; live RLS/entitlements not tested |
| 11 | Secure download | Code verified; **no live signed-URL test** |
| 12 | Unauthorized download rejected | **Verified** by unit guard test (guest → 401) |
| 13 | Failed/duplicate events correct | Design + unit guards verified; **no live replay test** |

**Do not claim the full journey works until steps 1–13 are executed against a staging environment with test credentials.**

## 5. Business-model guardrail

First-party products only. Keep schema extensible for future multi-vendor (categories, product ownership column exists), but do **not** implement vendor registration, commissions or payouts in this cycle.
