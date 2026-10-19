# PRODUCTION RELEASE CHECKLIST

Use this before releasing NEURAL AURORA to production (self-hosted/Vercel).

## 1. Pre-Checks

- [ ] Run full checks: `npm run check` (routes, i18n, SQL lint) – all green
- [ ] Run tests: `npm test` (pricing + API guards) – 46+23 passed
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

### Client-side (Vite)
- [ ] `VITE_SUPABASE_URL` – production Supabase project
- [ ] `VITE_SUPABASE_ANON_KEY` – production anon key
- [ ] `VITE_RAZORPAY_KEY_ID` – matches environment (live/test)
- [ ] `VITE_AI_API_BASE`, `VITE_AI_API_KEY`, `VITE_AI_MODEL` (optional)
- [ ] `VITE_JAMENDO_CLIENT_ID` (optional)
- [ ] `VITE_YOUTUBE_API_KEY` (optional)

## 3. Supabase Configuration

- [ ] **Migrations applied** – all 9 digital-store migrations (or schema up-to-date)
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

- [ ] [LICENSE](../LICENSE) – Source-Available license present
- [ ] [COMMERCIAL-LICENSE.md](../COMMERCIAL-LICENSE.md) – present
- [ ] [TERMS_OF_USE.md](../TERMS_OF_USE.md) – present & up to date
- [ ] [PRIVACY_POLICY.md](../PRIVACY_POLICY.md) – present & up to date
- [ ] [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) – present
- [ ] [SECURITY.md](../SECURITY.md) – present
- [ ] [TRADEMARK.md](../TRADEMARK.md) – present
- [ ] [docs/LICENSING-FAQ.md](LICENSING-FAQ.md) – present
- [ ] README shows Source-Available + commercial terms clearly
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