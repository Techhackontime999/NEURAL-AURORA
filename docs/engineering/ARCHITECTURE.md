# NEURAL AURORA — ARCHITECTURE (as built, verified 2026-11-21)

This document describes the **existing** system at `main` / `fd8281f`. It is a map for safe changes, not a target design.

## 1. System shape

```
Browser (React 18 SPA, Vite 6, BrowserRouter)
 ├── src/App.jsx ── route table, providers, global overlays
 ├── src/components/* ── portfolio, offerings, blog, more, support, Mithi
 ├── src/components/admin/* ── 29 admin panels behind AdminRoute
 ├── src/context/* ── Auth, AutoTraverse, Mood, Toast
 ├── src/lib/* ── Supabase client, data hooks, products/checkout/razorpay, i18n helpers
 └── src/locales/*.json ── 24 languages (en = 459 keys, others = 271)

Vercel
 ├── static dist/ (SPA + PWA service worker)
 └── /api/* serverless functions (CommonJS)
      ├── create-order ── server pricing → Razorpay order
      ├── razorpay-webhook ── raw-body HMAC → fulfilment
      ├── admin-reconcile-order ── admin → gateway lookup → same fulfilment
      ├── download ── auth + entitlement → private signed URL
      ├── order-status ── order ref → minimal status (polled)
      ├── admin-access-link / admin-delete-orders ── requireAdmin()
      ├── customer-signin-link ── paid order → Supabase OTP emailed to buyer
      └── _lib/ ── order-pricing, fulfilment, adminAuth, phone, diag, mithi-ai

Supabase (production state UNVERIFIED from repo)
 ├── Postgres: 30 public app tables, all RLS-enabled in consolidated schema
 ├── Auth: email/password + magic links; first-user admin via handle_new_user()
 ├── Storage: portfolio-images (public), digital-products (private)
 └── 36 ordered migrations (two newest user-reported applied to production on 2026-11-21; verification pending) + hand-maintained supabase-schema.sql
```

## 2. Route table (verified)

All routes are **eagerly imported** (no `React.lazy` except `MithiWidget`); `src/main.jsx:8-12` provides `BrowserRouter`.

### Public routes (`src/App.jsx:293-333`)

| Path | Component | Notes |
|---|---|---|
| `/` | `HomePage` | Only route with `StartingLoader` (`:241,265`) |
| `/more` | `More` | |
| `/more/certificates` · `/more/achievements` · `/more/gallery` | matching components | DB-backed |
| `/offerings` | `Service` | |
| `/offerings/products` | `Products` | static segment before `/offerings/:serviceId` |
| `/offerings/products/:slug` | `ProductDetail` | own not-found state |
| `/offerings/:serviceId` | `ServiceDetail` | |
| `/library` | `Library` | public URL, in-component sign-in gate |
| `/purchase/success` | `PurchaseSuccess` | reads `?ref=`; polls `/api/order-status` |
| `/checkout/:orderId` | `CheckoutAlias` | redirects to `/purchase/success?ref=…`; never authorises |
| `/services` · `/services/*` | legacy redirects | to `/offerings…` |
| `/blog` · `/blog/:slug` | `Blog` · `BlogPost` | |
| `/case-study/:slug` | `CaseStudyDetail` | |
| `/support` | `Support` | |
| `/login` · `/register` · `/forgot-password` | auth components | no guest-only guard |
| `/admin/*` | `AdminRoute` → `AdminDashboard` | **admin only** |
| `*` | `Navigate to="/"` | no 404 screen (finding A-02) |

### Admin sub-routes (`src/components/admin/AdminDashboard.jsx:35-66`)

`/admin` overview; personal-info, skills, projects, education, experience, blog, case-studies, certificates, achievements, gallery, products, orders, services, social-links, reviews, users, messages, payments, ads, crm-config, docs-config, youtube-config, video-hero, store-hero, appearance, ai-automation, payment-settings, data. Unmatched → `/admin`.

## 3. Store data flow (verified)

```
Products.jsx ── getPublishedProducts(filters) ── supabase.from('products').select(...)
ProductDetail.jsx ── getProductBySlug(slug) ── products + FAQs; sanitised HTML
startProductCheckout() ── POST /api/create-order { items:[{slug,quantity}], email, phone }
  ── priceProductOrder(requestedItems, DB products) ── integer paise, published+paid only
  ── razorpay.orders.create({ amount: totalPaise, currency }) ── order persisted with refs
Razorpay Checkout (browser) ── payment
  ── POST /api/razorpay-webhook (HMAC raw body) ── fulfilDigitalOrder()
     or admin POST /api/admin-reconcile-order (gateway lookup) ── fulfilDigitalOrder()
        ── payment_transactions insert (unique payment_id)
        ── guard: payment_status !== 'paid'; amount+currency must match DB
        ── orders → paid; entitlements per order item (unique)
PurchaseSuccess.jsx ── polls /api/order-status?ref=… (server truth, not redirect)
Library.jsx ── auth gate → entitlements → POST /api/download {product_slug}
  ── getUser(token, verified email) → product → entitlement by user_id or verified customer_email
  ── product_files scoped to product → createSignedUrl(private bucket, 600s)
  ── download_grants insert (hash only, rate-limited trigger)
```

**Trust boundary:** the browser supplies slugs, quantities, email, phone and payment confirmation intent. It never supplies price, payment status, entitlement or file path. Those are derived or verified server-side. The former unauthenticated token-mint path (SEC-001) was replaced in source with an emailed OTP; the forward migrations for the remaining database-side findings (including the SEC-006 settings split) have been authored and, per user report, applied directly to production in order on 2026-11-21; agent has not verified the live state.

## 4. Database objects

30 public application tables: achievements, admin_settings, blog_posts, case_studies, certificates, contact_messages, dev_ads, download_grants, education, entitlements, experience, gallery, order_items, orders, payment_transactions, payments, personal_info, product_categories, product_files, products, profiles, projects, purchase_claims, reviews, service_page, services, skills, social_links, test_data_templates, visitor_stats. Public view: `public_site_settings`, an explicit branding/display allowlist over `admin_settings` (SEC-006); anonymous clients never read the private table.

Store constraints of note: `entitlements (product_id, order_item_id)` unique, free-grant uniqueness per product/email/user, `payment_transactions.payment_id` unique, `orders.payment_status` guarded update, download rate-limit trigger (≤30 grants/entitlement/hour, TTL ≤1h), `touch_updated_at()` on products/categories/files/orders.

Storage: `portfolio-images` public (SELECT anon, admin writes); `digital-products` private (admin-only policies, no public SELECT).

Functions/triggers: `handle_new_user`, `ensure_my_profile`, `generate_test_data` (SEC-002), `set_admin_email`, `is_admin`, `admin_delete_user`, `increment_ad_view_count`, `increment_visitor_count`, `admin_can_read_product_file`, `check_download_grant_rate_limit`, `purge_expired_download_records`, `touch_updated_at`, `parse_price_to_paise`, contact/review rate-limit triggers, `current_user_has_verified_email`, `force_unapproved_review`. Authored forward migrations add `SET search_path = public, pg_temp` to known definer functions (SEC-008) — **user-reported applied to production; live `proconfig` not verified by agent**.

Schema drift: `supabase-schema.sql:1047-1051` contains invalid bare banner text; columns `payment_settings`, `docs_url`, `store_hero`, contact-payment context, `site_tagline` and rate-limit functions are inconsistent between migrations, consolidated schema and code. Treat `supabase/migrations/` as canonical. **Production migration state is unverified.**

## 5. Deployment

- `vercel.json:3-8` rewrites everything except `/api` to `/index.html` (correct).
- `public/_redirects:1` has an unguarded catch-all that would break APIs on non-Vercel hosts.
- `vite.config.js`: PWA `generateSW`, `autoUpdate`, a 9-entry / 1,529.70 KiB actual offline-shell precache, and bounded runtime caches for lazy assets, public media, Fonts, Fontshare and Spline. The blanket CRM cache was removed.
- No `.github/` CI workflow. `npm ci` + check/test/build must be run manually or added to CI.

## 6. Change guidance

- Preserve: route paths, commerce engine modules, RLS policies (never disable), private bucket, i18n language list, existing admin CRUD.
- Prefer: small forward migrations over editing history; shared tokens over duplicated utility classes; one head manager; one admin settings resource; one appearance store.
- Avoid: adding a second store/commerce engine, duplicating `requireAdmin`, client-side price logic, disabling RLS to "fix" access, unguarded destructive SQL scripts (`scripts/fix-contact-rls-v2.sql:2` drops `contact_messages` CASCADE).
