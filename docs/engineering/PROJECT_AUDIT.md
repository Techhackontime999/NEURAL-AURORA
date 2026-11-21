# NEURAL AURORA — PROJECT AUDIT (PHASE 0 + PHASE 1)

- **Generated:** 2026-11-21
- **Repository:** `Techhackontime999/NEURAL-AURORA`
- **Branch / HEAD:** `main` / `fd8281f17120ff1dfeaf087130410baad2dfb1d8`
- **Working tree:** clean at audit start; `npm ci` installed dependencies without modifying tracked files
- **Method:** direct source inspection, project scripts, package audit, live REA MCP verification, Taste skill guidance. No production access. No browser runtime test yet.
- **Status labels:** `Verified` = confirmed in repository source or local execution; `Suspected` = plausible but unconfirmed; `Not tested` = no evidence gathered; `Requires production access` = live Supabase/Razorpay/Vercel needed.

> This report supersedes the stale root `AUDIT_REPORT.md` (dated 2026-10-18, branch `feat/digital-store`, 8 migrations, 23 tests). That file is historical and must not be used as a readiness verdict.

---

## 1. Executive summary — the 12 required points

1. **Repository status.** `main`, HEAD `fd8281f`, clean tree, tracking `origin/main`. Recent commits are admin appearance/theme fixes (2026-10-20/21). No uncommitted user work was present or touched.
2. **Current architecture.** React 18 + Vite 6 SPA, Tailwind 4, React Router 7, Framer Motion 11, R3F/Three/Spline 3D, Supabase (Postgres/Auth/Storage), Vercel serverless functions in `/api`, Razorpay commerce, i18next (24 locales), vite-plugin-pwa. Pure client-side rendering; no SSR/prerender.
3. **Implemented functionality.** Large existing platform: portfolio, offerings/services, blog, case studies, more/certificates/achievements/gallery, contact/reviews, ~29 admin panels, AI gateway, Neural CMD, Mood Swing, Auto-Traverse, Mithi AI, full digital store (catalogue, detail, checkout, library, admin products/orders), PWA and i18n. **Do not rebuild any of this.**
4. **REA skill status.** Installed at `C:\Users\ADMIN\.agents\skills\reverse-engineer-anything`; complete `SKILL.md` and reference list read. Skill documents investigation workflow and CLI fallback.
5. **REA MCP status.** **Connected and live** — 263+ tools discovered (browser, JS bundle, native, network capture families). Real calls returned valid REA `target_unavailable` errors only because no target is open. No target investigation performed yet; REA is available for live app/browser investigation when useful.
6. **Taste skill status.** Installed at `C:\Users\ADMIN\.agents\skills\design-taste-frontend`; `SKILL.md` (tasteskill 2.5) read in full. Key rules applied in `DESIGN_SYSTEM_AUDIT.md`: one system, one section per screen, equal edges, real assets, real icons, subtle purposeful motion, no violet, no generic template look.
7. **Actual tools available.** Terminal (PowerShell), file read/write/edit, ripgrep, git, Node 26.13.1 / npm 11.20.0, OpenCode v2.0.32, REA MCP (connected), Taste skill, subagents, browser-capable REA tools (not yet exercised). No Playwright/Puppeteer installed locally; no CI workflow (`.github/` absent).
8. **Test and build status.** `npm run check` **PASS** (routes, English i18n keys, 34 migration structural lints). `npm test` **PASS** (23 pricing + 68 API-guard tests = 91). `npm run build` **PASS** with warnings (3.49 MB main chunk, 2.06 MB Spline, 1.99 MB physics, ~20 MB PWA precache, i18next dynamic/static import warning). `npm audit`: 8 vulnerabilities (1 high, 6 moderate, 1 low). Note: these checks are structural/unit only — no DB execution, no E2E, no browser.
9. **Critical technical risks.** (a) Unauthenticated magic-link minting endpoint returns sign-in tokens to any caller who knows an order email — **Critical**. (b) Public `SECURITY DEFINER` test-data RPC can bypass RLS — **Critical if default grants exist in production**. (c) Entitlements matched on unverified email claim. (d) `supabase-schema.sql` has an invalid bare-text banner, so the documented "paste schema" setup fails. (e) Unverified production migration status. (f) 4,324 missing translations in the store/newer features.
10. **Digital Store status.** Commerce engine itself is **well implemented and unit-tested**: integer paise pricing, client price ignored, HMAC webhook on raw body, amount/currency mismatch fails closed, idempotent fulfilment, private bucket, server-authorized downloads, centralized admin auth. Gaps are in discovery (no pagination, tags not searched), product-detail completeness (no file manifest/compatibility), checkout UX, library UX, admin taxonomy/preview, i18n, SEO and legal disclosures.
11. **Visual design and UX assessment.** Strong raw ingredients but inconsistent execution: three competing design languages (neon aurora / editorial tokens / admin glass), violet in customer-facing identity (Taste forbids), admin appearance controls that write unused CSS variables, hardcoded cyan/text colours in store that ignore admin tokens, global hidden native cursor, infinite decorative animations, and no per-route head management. Needs consolidation, not a redesign from scratch.
12. **Prioritized roadmap.** P0 environment/discovery ✅ → P1 audit ✅ → P2 critical engineering fixes (this report's Critical/High items) → P3 design system + storefront (Taste) → P4 commerce/customer experience → P5 platform polish → P6 advanced business → P7 final QA. See §4.

---

## 2. Architecture map (verified)

| Layer | Implementation | Evidence |
|---|---|---|
| Entry | `src/main.jsx` → `BrowserRouter` → `src/App.jsx` | `src/main.jsx:4-12` |
| Routing | ~20 public routes + 29 nested admin routes, all eager imports | `src/App.jsx:293-333`; `src/components/admin/AdminDashboard.jsx:35-66` |
| Auth | Supabase Auth; `AuthContext` + `AdminRoute` (client gate); server `requireAdmin()` for API | `src/context/AuthContext.jsx`; `src/components/admin/ProtectedRoute.jsx`; `api/_lib/adminAuth.js:26-48` |
| Data | Supabase client + `usePortfolioData` cache with static fallback | `src/lib/supabase.js`, `src/lib/usePortfolioData.js` |
| Commerce pricing | Pure `priceProductOrder()` in integer paise | `api/_lib/order-pricing.js:62-138` |
| Payment | Razorpay order create + webhook HMAC + reconciliation | `api/create-order.js`, `api/razorpay-webhook.js`, `api/admin-reconcile-order.js` |
| Fulfilment | Single audited grant path, unique constraints + guarded update | `api/_lib/fulfilment.js:56-161` |
| Delivery | Private `digital-products` bucket, 10-minute signed URLs, grant ledger | `api/download.js:5-6,183-231` |
| DB | 34 ordered migrations + hand-maintained `supabase-schema.sql` | `supabase/migrations/`, `supabase-schema.sql` |
| Deployment | Vercel rewrites preserve `/api/*`; PWA generateSW | `vercel.json:3-8`, `vite.config.js` |

Full route table and component inventory are in `docs/engineering/ARCHITECTURE.md`.

---

## 3. Findings index

Security findings are detailed in `SECURITY_AUDIT.md`; design in `DESIGN_SYSTEM_AUDIT.md`; store in `DIGITAL_STORE_ROADMAP.md`; platform/i18n/PWA/SEO/legal in this section.

Every finding below follows: Finding / Severity / Status / Evidence / Root cause / Impact / Recommended solution / Dependencies / Testing requirements / Verification status.

### [PLAT-01] 23 of 24 locales are missing 188 keys each (4,324 values)

- **Severity:** High
- **Status:** Verified (programmatic comparison)
- **Evidence:** `src/locales/en.json` has 459 leaf keys; every other locale has 271. Missing per locale: `store` 136/136, `videoHero` 23/23, `skills` 14, `more` 13, `services` 2. `src/i18n.js:65` `fallbackLng: 'en'` hides it. `scripts/check-i18n.mjs:1-16` checks only English.
- **Root cause:** Feature work added keys only to `en.json`; no locale-parity gate.
- **Impact:** The entire digital store appears in English for all non-English users despite a 24-language claim.
- **Recommended solution:** Generate a canonical key template from `en.json`, merge missing keys with `TODO` markers into all locales, extend `check:i18n` to compare all locale key sets and scan all components.
- **Dependencies:** Translation resource/time for real copy; English fallback is acceptable interim.
- **Testing requirements:** Inject a missing key and assert `check:i18n` fails; spot-check checkout/library in `es`, `de`, `ar`, `hi`.
- **Verification status:** Key counts verified locally; UI not browser-tested.

### [PLAT-02] Single static head metadata for every route; `og:image` is missing

- **Severity:** High
- **Status:** Verified
- **Evidence:** `index.html:6-21` has one title/description/canonical/OG set for all routes; no `document.title`/Helmet usage in `src/`. `index.html:17` references `/og-image.png`, absent from `public/`. No `twitter:image`.
- **Root cause:** Pure SPA with no head manager.
- **Impact:** Every product/blog/case-study URL shares a canonical root URL and generic preview; social share image 404s.
- **Recommended solution:** Add a small route-level head manager (title, description, canonical, OG/Twitter, JSON-LD); add a real 1200×630 image; build check for referenced static assets.
- **Dependencies:** Decisions on canonical domain and product SEO data.
- **Testing requirements:** Fetch rendered HTML for product/blog routes; validate OG with debugger tools.
- **Verification status:** Source verified; live fetch not performed.

### [PLAT-03] Sitemap stale; no structured data

- **Severity:** Medium
- **Status:** Verified
- **Evidence:** `public/sitemap.xml:1-23` lists only `/`, `/services`, `/more`, `/blog`; `/services` redirects. No `application/ld+json` anywhere.
- **Root cause:** Hand-maintained files predating store and sub-pages.
- **Impact:** Store/content pages undiscoverable; no rich-result eligibility.
- **Recommended solution:** Generate sitemap at build from route table + published slugs; add Person/Organization, ItemList/Product/Offer, BlogPosting JSON-LD truthfully.
- **Testing requirements:** XML validation; sitemap-vs-routes parity test; Rich Results Test.
- **Verification status:** Source verified.

### [PLAT-04] No route-level code splitting; multi-megabyte initial JS

- **Severity:** High
- **Status:** Verified (build output)
- **Evidence:** `src/App.jsx:10-45` static-imports all pages; only lazy import is `MithiWidget.jsx:21`. Fresh build: `index-BLBx8kjy.js` 3,494.54 kB (857.30 kB gzip), `react-spline` 2,057.53 kB, `physics` 1,987.56 kB. `build` warns chunks >500 kB.
- **Root cause:** No `React.lazy`/`manualChunks`.
- **Impact:** Slow TTI/LCP on mobile; large parse/execute cost; poor caching.
- **Recommended solution:** Lazy-load routes (admin as its own chunk), `manualChunks` for three/framer/lucide, remove eager Spline prefetch (`src/App.jsx:243-248`), measure with Lighthouse.
- **Dependencies:** Careful Suspense fallbacks to avoid layout shift.
- **Testing requirements:** Compare chunk sizes and mobile Lighthouse before/after.
- **Verification status:** Build metrics verified locally; Lighthouse not run.

### [PLAT-05] PWA update lifecycle inconsistent; `_redirects` would break APIs off Vercel

- **Severity:** Medium
- **Status:** Verified (config)
- **Evidence:** `vite.config.js:17` `registerType: 'autoUpdate'` with dead `sw-update` listener at `src/components/ui/PwaStatus.jsx:25-40`; no producer dispatches it. `public/_redirects:1` catch-all has no `/api` exclusion, unlike `vercel.json:5`. Screenshot in manifest is a 512px icon (`vite.config.js:46-54`).
- **Root cause:** UI left over from a `prompt` strategy; generic SPA fallback copied.
- **Impact:** Update banner never appears; on non-Vercel hosts all `/api/*` calls would return `index.html`, breaking checkout/webhooks; install prompts show an icon as a screenshot.
- **Recommended solution:** Choose one update strategy and wire it; add `/api` carve-out or delete `_redirects`; add real screenshots and maskable icon.
- **Testing requirements:** Two-version deploy test; POST to `/api/create-order` on a non-Vercel preview.
- **Verification status:** Config verified; runtime not tested.

### [PLAT-06] Ad/visitor counters are unauthenticated and unthrottled

- **Severity:** Low–Medium
- **Status:** Verified in source
- **Evidence:** `supabase-schema.sql:753-758,781-794`; `src/components/ui/LiveVisitorCount.jsx:12-20`; `src/components/StartingLoader.jsx:2525-2528`.
- **Impact:** Inflatable analytics. Must never feed entitlement or pricing logic.
- **Recommended solution:** Treat as approximate; add server-side throttling if figures become commercially meaningful.
- **Verification status:** Source verified.

### [PLAT-07] `AUDIT_REPORT.md` is stale and overstates readiness

- **Severity:** High (decision risk)
- **Status:** Verified
- **Evidence:** Root `AUDIT_REPORT.md:3,7,14,19-30,55,102-111` — old branch, 8 migrations, 23 tests, 99 keys, conclusion "secure, complete". Current: `main`, 34 migrations, 91 tests, 459 keys, and this audit's findings.
- **Recommended solution:** Mark it historical or replace with a link to `docs/engineering/PRODUCTION_READINESS.md`.
- **Verification status:** Verified.

### [PLAT-08] Build/dependency hygiene

- **Severity:** Medium
- **Status:** Verified
- **Evidence:** `npm audit` 8 vulns: `follow-redirects` 1.16.0–1.16.1 (high, credential leakage on cross-origin redirects), `fast-uri`, `glob`/`minimatch`/`workbox-build`/`vite-plugin-pwa` (moderate), `serialize-javascript`, `vite 6.4.4` (moderate). `scripts/check-routes.mjs:6` imports undeclared transitive `react-router`. All deps caret-ranged; no `engines`; no CI workflow.
- **Impact:** Supply-chain and reproducibility risk; checks can break on package-manager layout changes.
- **Recommended solution:** Upgrade patched versions, import `matchRoutes` from `react-router-dom`, add `engines.node` and CI running check/test/build/audit.
- **Verification status:** `npm audit` output captured locally.
- **Remediation status (2026-11-21):** Non-breaking `npm audit fix` cleared the high advisory and three others; production dependency audit is now clean (`npm audit --omit=dev`: 0). Four moderate dev-only advisories remain pending a deliberate `vite-plugin-pwa` decision.

### [PLAT-09] Legal/trust disclosures require professional review

- **Severity:** High (compliance risk)
- **Status:** Verified textual gaps; legal advice not given
- **Evidence:** `LICENSE:12` permits sublicensing while `COMMERCIAL-LICENSE.md:30` prohibits resale redistribution; contributor threshold differs between `README.md:23`, `CONTRIBUTING.md:76-78`, `LICENSE:9`, `docs/LICENSING-FAQ.md`. Refund/licence/support fields are optional and empty by default (`AdminProducts.jsx:45-48`), `TERMS_OF_USE.md:33` only "case-by-case"; no GST/invoice terms; `PRIVACY_POLICY.md` omits voice (`StartingLoader.jsx:174-209`), AI chat transcripts, ad tags; `.env.example:8-10` exposes a browser AI key pattern.
- **Recommended solution:** Counsel/tax adviser to reconcile licensing and produce mandatory sitewide commerce disclosures; route AI calls server-side; do not silently rewrite legal text.
- **Verification status:** Document text verified; no legal determination made.

---

## 4. Prioritized improvement roadmap

| Phase | Goal | Exit criteria | Status |
|---|---|---|---|
| P0 | Environment & discovery | Repo/Git/skills/MCP/scripts verified | **Complete** |
| P1 | Complete audit | 7 engineering reports written with evidence | **Complete (this report set)** |
| P2 | Critical engineering fixes | SEC-001/002/003/005/007, SCHEMA-001 fixed or explicitly waived; tests added | Batch 1 source complete; forward migration authored, not applied or staging-verified |
| P3 | Design system + storefront (Taste) | Tokens consumed; violet removed from identity; store audit fixes applied; browser inspection at 1440/768/390 | Not started |
| P4 | Commerce & customer experience | Pagination, tags, file manifest, checkout form, library search, admin taxonomy; acceptance journey steps 1–13 tested | Not started |
| P5 | Platform polish | i18n parity, head management, sitemap, PWA lifecycle, bundle splitting, accessibility | Not started |
| P6 | Advanced business | Analytics, bundles/coupons, reviews, Mithi shopping assistant — prioritized, not automatic | Not started |
| P7 | Final QA | Regression, build, browser, security verification, production-readiness review | Not started |

**Phase 2 batch 1 — completed in source (2026-11-21):**
1. `api/customer-signin-link.js` now emails a paid-order OTP; no token is returned (SEC-001).
2. Forward migration hardens `generate_test_data()` and drops `get_admin_settings()` (SEC-002/004).
3. `supabase-schema.sql` banner fixed; legacy payment policy drops added (SCHEMA-001/SEC-007).
4. Reviews cannot self-approve (SEC-005).
5. Entitlement email matching requires a verified session email (SEC-003).
6. New API-guard assertions cover the route and migration source; `check`, `test` and `build` pass locally.
7. ST-U13 Razorpay retry poisoning and ST-U09 stale admin bulk selection fixed in source (batch 2).
8. High dependency advisory cleared with a non-breaking `npm audit fix`; production audit clean (batch 3).

**Remaining in P2:** apply/verify the migration on staging, browser-verify ST-U13/ST-U09, decide on the four dev-only advisories, and resolve SEC-006.

No database migration will be applied to any environment without explicit approval. No push, commit or deploy without explicit approval.
