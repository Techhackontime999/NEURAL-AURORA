# PRODUCTION RELEASE CHECKLIST

Use this before releasing NEURAL AURORA to production (self-hosted/Vercel).

## 1. Pre-Checks

- [ ] Run full checks: `npm run check` (routes, i18n, SQL lint) – all green
- [ ] Run tests: `npm test` (pricing, API, store, UI, route guards, contributor grants) – all green
- [ ] Production build passes: `npm run build` – no errors/warnings blocking
- [ ] Working tree clean: `git status --porcelain` empty
- [ ] On `main` branch, up to date with remote

## 2. Environment Variables (Production)

### Vercel/Hosting (Server-side)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` – set (required, fails closed with 503)
- [ ] `SUPABASE_URL` (optional, falls back to `VITE_SUPABASE_URL`)
- [ ] `RAZORPAY_KEY_ID` – production/test matches
- [ ] `RAZORPAY_KEY_SECRET` – correct for mode
- [ ] `RAZORPAY_WEBHOOK_SECRET` – dedicated long random string (matches dashboard)
- [ ] AI provider: one of `OPENROUTER_API_KEY` (recommended), `AI_API_KEY`/`OPENAI_API_KEY`, or `GEMINI_API_KEY` – never a `VITE_` prefix
- [ ] Voice (optional): `VOICE_API_BASE`, `VOICE_API_KEY`, `VOICE_MODEL` for `/api/ai` speech

### Client-side (Vite)
- [ ] `VITE_SUPABASE_URL` – production Supabase project
- [ ] `VITE_SUPABASE_ANON_KEY` – production anon key
- [ ] `VITE_RAZORPAY_KEY_ID` – matches environment (live/test)
- [ ] `VITE_JAMENDO_CLIENT_ID` (optional)
- [ ] `VITE_YOUTUBE_API_KEY` (optional)

## 3. Supabase Configuration

- [ ] **Migrations applied** – all digital-store migrations up to date (or schema up-to-date), including `20261126000000_create_contributor_applications_and_personal_grants.sql` if approved contributor personal-use grants are enabled
- [ ] **Storage bucket `digital-products`** – created as **Private**
- [ ] **URL Configuration → Site URL** = `https://your-domain.com/`
- [ ] **Redirect URLs** include `https://your-domain.com/**` and `http://localhost:5173/**`
- [ ] **Auth → Email → Secure password change** = **OFF** (critical for in-app password set)
- [ ] **Auth → Email Templates → Password changed notification** – disabled (recommended)
- [ ] **Custom SMTP configured** (recommended for resilience) or rely on admin "Sign-in link" + password flow
- [ ] RLS verified (prod-safe), no public read on paid files

## 4. Razorpay Setup

- [ ] Webhook created at `https://your-domain.com/api/razorpay-webhook`
- [ ] Webhook secret matches `RAZORPAY_WEBHOOK_SECRET`
- [ ] Events enabled: `payment.captured`, `order.paid`, `payment.failed`, `order.failed`, `order.cancelled`
- [ ] Test mode vs Live keys match environment
- [ ] Test webhook delivery returns `200` (with correct secret), `400` if wrong

## 5. Legal & Documentation

- [ ] [LICENSE](../LICENSE) – draft proprietary transition present; **requires qualified Indian software licensing lawyer review before final adoption**
- [ ] [LICENSE.LEGACY-2026-SOURCE-AVAILABLE.md](../LICENSE.LEGACY-2026-SOURCE-AVAILABLE.md) – legacy rights preserved
- [ ] [COMMERCIAL-LICENSE.md](../COMMERCIAL-LICENSE.md) – present and marked draft/review-required
- [ ] [TERMS_OF_USE.md](../TERMS_OF_USE.md) – present & up to date
- [ ] [PRIVACY_POLICY.md](../PRIVACY_POLICY.md) – present & up to date
- [ ] [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) – present
- [ ] [SECURITY.md](../SECURITY.md) – present
- [ ] [TRADEMARK.md](../TRADEMARK.md) – present
- [ ] [docs/LICENSING-FAQ.md](LICENSING-FAQ.md) – present
- [ ] [docs/LEGAL-POLICY-DRAFTS.md](LEGAL-POLICY-DRAFTS.md) – present
- [ ] [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) – draft reviewed for release dependencies/assets
- [ ] README reflects current licensing transition and no-auto-grant policy
- [ ] No secrets committed (`.env`, keys, service-role)

## 6. Functionality Smoke Test (Prod)

- [ ] Home loads (loader only on `/` as intended)
- [ ] `/library`, `/offerings/products` load directly (no verification gate)
- [ ] Free product checkout → sign-in link flow works (on-screen link or email)
- [ ] Paid product checkout (test) → lands on `/purchase/success`, webhook confirms
- [ ] Library shows entitlements after sign-in
- [ ] Password set/change works (no email required if Secure password change OFF)
- [ ] Admin → Orders → "Sign-in link" generates link (no email sent)
- [ ] Admin reconcile works (gateway-proven)
- [ ] Download returns signed URL, access denied without entitlement
- [ ] Contributor application submits only when authenticated; no PR/GitHub/registration auto-grants access
- [ ] Admin can review/approve/reject contributor application; issuance creates auditable personal-use license/entitlement; revoke/suspend blocks download
- [ ] PWA install works, service worker registers

## 7. SEO & Deployment

- [ ] Sitemap/robots valid (if present)
- [ ] OG/Twitter meta correct (domain points to production)
- [ ] Vercel rewrites correct (`/api/*` preserved, SPA fallback)
- [ ] CDN/cache cleared after deploy (hard refresh PWA)
- [ ] Deploy commit matches expected (`git rev-parse HEAD`)

## 8. Go-Live

- [ ] Switch Razorpay to Live (when ready) + live keys
- [ ] Monitor function logs for first real transactions
- [ ] Keep [SECURITY.md](../SECURITY.md) reporting channel monitored
- [ ] Verify rollback plan (previous deployment on Vercel)

**All checks must pass before production release.**