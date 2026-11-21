# NEURAL AURORA — PWA CACHING REPORT (Batch 6, 2026-11-21)

## 1. Scope and method

Investigated `vite.config.js`, the generated `dist/sw.js` / `dist/workbox-*.js`, every file in `dist/`, `src/components/ui/PwaStatus.jsx`, SW registration, update handling, offline handling, deep-link routing and all `runtimeCaching` rules.

**Measurement convention.** `vite-plugin-pwa` prints only the size of files matched by `globPatterns`. It omits the web manifest and `includeAssets` icons from its KiB total even though they are precached. This report records both numbers:

- **build-reported** = Vite's `precache N entries (X KiB)` line;
- **actual** = sum of `statSync` sizes for every URL in `precacheAndRoute()` in `dist/sw.js`.

No precache limit was raised. `maximumFileSizeToCacheInBytes` stays at `4,000,000`.

---

## 2. Before: Batch 5 precache inventory

**Build-reported:** 79 entries, **19,990.64 KiB** (~19.51 MiB).
**Actual (all 79 URLs):** **20,028.89 KiB** (~19.56 MiB). The 38.25 KiB difference is the three PWA icons plus `manifest.webmanifest`.
**JavaScript:** 61 entries, **7,900.05 KiB**; entry chunk **1,251.84 KiB** (build: 1,281.88 kB / 377.20 kB gzip).

All 79 URLs, sorted by size. `Shell?` means required for the offline startup shell. `Lazy?` means requested on demand rather than needed before first paint. `Disposition` is the decision made in this batch.

| KiB | File | Type | Shell? | Lazy? | Disposition |
|---:|---|---|:--:|:--:|---|
| 2494.67 | `images/project-5.png` | PNG content image | No | No | Runtime cache |
| 2218.25 | `images/project-4.png` | PNG content image | No | No | Runtime cache |
| 2218.25 | `images/project-3.png` | PNG content image | No | No | Runtime cache |
| 2009.31 | `assets/react-spline-GoAwH3WH.js` | JS 3D vendor | No | Yes | Runtime cache |
| 1940.98 | `assets/physics-ChHD2_fM.js` | JS physics vendor | No | Yes | Runtime cache |
| 1765.81 | `images/profile.jpg` | JPEG content image | No | No | Runtime cache |
| 1429.49 | `images/project-2.png` | PNG content image | No | No | Runtime cache |
| 1411.00 | `images/project-1.png` | PNG content image | No | No | Runtime cache |
| 1251.84 | `assets/index-ByXEO59z.js` | JS entry chunk | **Yes** | No | **Precache (kept)** |
| 857.05 | `assets/lucide-react-YqYRR31R.js` | JS icon vendor | No | Yes | Runtime cache |
| 808.82 | `assets/AuroraBackground-dVJH5gzr.js` | JS WebGL route chunk | No | Yes | Runtime cache |
| 298.54 | `assets/AdminDashboard-D75ZoBCO.js` | JS admin route | No | Yes | Runtime cache |
| 278.07 | `images/project-6.jpg` | JPEG content image | No | No | Runtime cache |
| 184.12 | `assets/index-Bc7pkdlr.css` | CSS entry stylesheet | **Yes** | No | **Precache (kept)** |
| 169.46 | `assets/opentype-U-0Y99ve.js` | JS Spline vendor | No | Yes | Runtime cache |
| 88.27 | `assets/ui-Demr7_pN.js` | JS Spline vendor | No | Yes | Runtime cache |
| 80.62 | `assets/gaussian-splat-compression-Dbnz1wNI.js` | JS Spline vendor | No | Yes | Runtime cache |
| 58.86 | `assets/process-hTw7q_99.js` | JS Spline vendor | No | Yes | Runtime cache |
| 53.80 | `assets/navmesh-B1pUQaZh.js` | JS Spline vendor | No | Yes | Runtime cache |
| 47.36 | `assets/boolean-Do4ge35u.js` | JS Spline vendor | No | Yes | Runtime cache |
| 45.14 | `images/neural_aurora_logo.svg` | SVG logo / favicon | **Yes** | No | **Precache (kept)** |
| 29.54 | `assets/Service-BIzQH0Hg.js` | JS route chunk | No | Yes | Runtime cache |
| 28.55 | `images/pwa-icon-512x512.png` | PNG app icon | Yes | No | Precache once |
| 28.55 | `images/pwa-icon-512x512.png` | PNG app icon (duplicate) | Yes | No | Drop duplicate |
| 26.50 | `assets/howler-BcT83w7y.js` | JS Spline vendor | No | Yes | Runtime cache |
| 25.41 | `assets/Support-DoMnyA05.js` | JS route chunk | No | Yes | Runtime cache |
| 16.63 | `assets/ServiceDetail-Lv1dWX49.js` | JS route chunk | No | Yes | Runtime cache |
| 15.37 | `assets/Library--jN6CeOk.js` | JS store route | No | Yes | Runtime cache |
| 13.84 | `assets/ProductDetail-CANTlE5-.js` | JS store route | No | Yes | Runtime cache |
| 9.36 | `assets/MithiAssistant-XYbJ76Fl.js` | JS chat overlay | No | Yes | Runtime cache |
| 8.49 | `index.html` | HTML app shell | **Yes** | No | **Precache (kept)** |
| 7.79 | `assets/More-CxWg3Wv3.js` | JS route chunk | No | Yes | Runtime cache |
| 7.49 | `assets/Products-jHKWQBFH.js` | JS store route | No | Yes | Runtime cache |
| 6.83 | `images/pwa-icon-192x192.png` | PNG app icon | Yes | No | Precache once |
| 6.83 | `images/pwa-icon-192x192.png` | PNG app icon (duplicate) | Yes | No | Drop duplicate |
| 6.74 | `assets/Login-WGfkiaGE.js` | JS auth route | No | Yes | Runtime cache |
| 5.19 | `assets/razorpay-Cvyl43dO.js` | JS checkout helper | No | Yes | Runtime cache |
| 4.87 | `assets/Register-Dm4x7LY-.js` | JS auth route | No | Yes | Runtime cache |
| 4.72 | `assets/zap-BxcEsOlf.js` | JS icon chunk | No | Yes | Runtime cache |
| 4.52 | `assets/PurchaseSuccess-CyM0Aozc.js` | JS store route | No | Yes | Runtime cache |
| 3.77 | `assets/ProductCard-BPRMIJnD.js` | JS store component | No | Yes | Runtime cache |
| 3.75 | `assets/CaseStudyDetail-BC2d5fOV.js` | JS route chunk | No | Yes | Runtime cache |
| 3.46 | `assets/ServiceNavbar-C1wvMn0S.js` | JS component | No | Yes | Runtime cache |
| 3.44 | `assets/BlogNavbar-D41UnehO.js` | JS component | No | Yes | Runtime cache |
| 3.43 | `assets/StoreShell-DtaaYtgZ.js` | JS component | No | Yes | Runtime cache |
| 3.39 | `assets/MoreNavbar-mdx5mFn9.js` | JS component | No | Yes | Runtime cache |
| 3.35 | `assets/Blog-CbmT8Ewr.js` | JS route chunk | No | Yes | Runtime cache |
| 3.21 | `assets/ForgotPassword-DiEsIFhM.js` | JS auth route | No | Yes | Runtime cache |
| 3.00 | `assets/BlogPost-DLGtMSv2.js` | JS route chunk | No | Yes | Runtime cache |
| 2.80 | `assets/Gallery-q9L-b_yz.js` | JS route chunk | No | Yes | Runtime cache |
| 2.68 | `assets/products-Cmdq8mwI.js` | JS data helper | No | Yes | Runtime cache |
| 2.34 | `assets/checkout-CyO4N2T7.js` | JS helper | No | Yes | Runtime cache |
| 2.13 | `assets/Achievements-D0Xy9u_E.js` | JS route chunk | No | Yes | Runtime cache |
| 2.07 | `assets/Certificates-BeXIO8U0.js` | JS route chunk | No | Yes | Runtime cache |
| 1.86 | `images/pwa-icon.svg` | SVG app icon | Yes | No | Precache once |
| 1.86 | `images/pwa-icon.svg` | SVG app icon (duplicate) | Yes | No | Drop duplicate |
| 1.60 | `assets/mail-check-DgIOTWxH.js` | JS icon chunk | No | Yes | Runtime cache |
| 1.40 | `assets/trash-2-PFsb2Rqz.js` | JS icon chunk | No | Yes | Runtime cache |
| 1.27 | `assets/sliders-horizontal-WFC6_bFK.js` | JS icon chunk | No | Yes | Runtime cache |
| 1.21 | `assets/shield-check-BQNwvWhR.js` | JS icon chunk | No | Yes | Runtime cache |
| 1.04 | `assets/MorePageShell-BbW6POOB.js` | JS component | No | Yes | Runtime cache |
| 1.01 | `manifest.webmanifest` | PWA manifest | **Yes** | No | **Precache (kept)** |
| 0.89 | `assets/storeHeroDefaults-OB1jmkwm.js` | JS store data | No | Yes | Runtime cache |
| 0.77 | `assets/use-in-view-CY5QIQo-.js` | JS helper | No | Yes | Runtime cache |
| 0.75 | `assets/target-T156HxiA.js` | JS icon chunk | No | Yes | Runtime cache |
| 0.67 | `assets/circle-x-C9nxVw4t.js` | JS icon chunk | No | Yes | Runtime cache |
| 0.65 | `assets/phone-BjmM7Fah.js` | JS icon chunk | No | Yes | Runtime cache |
| 0.63 | `assets/trophy-CL23w_nT.js` | JS icon chunk | No | Yes | Runtime cache |
| 0.54 | `assets/file-text-q6AxGv8h.js` | JS icon chunk | No | Yes | Runtime cache |
| 0.49 | `assets/tag-Dyia8OIg.js` | JS icon chunk | No | Yes | Runtime cache |
| 0.43 | `assets/triangle-alert-DMGdmhMF.js` | JS icon chunk | No | Yes | Runtime cache |
| 0.42 | `assets/calendar-B4i551YL.js` | JS icon chunk | No | Yes | Runtime cache |
| 0.40 | `assets/download-CQunLNIQ.js` | JS icon chunk | No | Yes | Runtime cache |
| 0.38 | `assets/briefcase-CZmB7DFK.js` | JS icon chunk | No | Yes | Runtime cache |
| 0.33 | `assets/clock-BqsInofq.js` | JS icon chunk | No | Yes | Runtime cache |
| 0.33 | `assets/arrow-right-D8cYnFyD.js` | JS icon chunk | No | Yes | Runtime cache |
| 0.29 | `assets/chevron-down-BVOLXdUE.js` | JS icon chunk | No | Yes | Runtime cache |
| 0.13 | `registerSW.js` | JS SW registration | **Yes** | No | **Precache (kept)** |
| 0.05 | `googlec6a3c20240cfc9c7.html` | HTML verification file | No | No | Exclude |

### Main contributors

The top eight entries alone were **15,487.76 KiB = 77.3%** of the 20,028.89 KiB precache: six project images, `profile.jpg`, `react-spline`, and `physics`. Adding the entry chunk and `lucide-react` reaches **17,596.65 KiB = 87.9%**.

Crucially, **not all 79 entries were JavaScript**: 61 were JS (7,900.05 KiB), 8 were large content images (~12,817 KiB), 3 were PWA icons, 1 was the logo, 1 was CSS, 1 was HTML shell, 1 was a verification HTML file, and 3 were duplicate icon entries. The largest single category was **content images**, not JS.

---

## 3. Strategy implemented

Smallest safe change: keep an explicit shell allowlist in `workbox.globPatterns`, add two bounded same-origin `CacheFirst` routes for on-demand assets, and remove the unnecessary CRM caching rule. `registerType: 'autoUpdate'`, `skipWaiting()`, `clientsClaim()`, `cleanupOutdatedCaches()` and the `NavigationRoute → index.html` SPA fallback are unchanged.

```js
globPatterns: [
  'index.html',
  'registerSW.js',
  'assets/index-*.js',
  'assets/index-*.css',
  'images/neural_aurora_logo.svg',
]
```

`includeAssets` still contributes the three PWA icons and the plugin still contributes `manifest.webmanifest`; narrowing `globPatterns` also removed three duplicate icon entries and the unused search-console verification file.

---

## 4. After: Batch 6 precache inventory

**Build-reported:** 9 entries, **1,491.45 KiB** (~1.46 MiB).
**Actual (all 9 URLs):** **1,529.70 KiB** (~1.49 MiB). The 38.25 KiB difference remains icons + manifest.
**Reduction:** 79 → 9 entries; actual 20,028.89 → 1,529.70 KiB (**−92.36%**, −18,499.19 KiB). Build-reported reduction: 19,990.64 → 1,491.45 KiB (**−92.54%**).
**Entry JS:** 1,253.50 KiB (build: 1,283.58 kB / 377.71 kB gzip) — unchanged in architecture; small growth comes from the recovery/update code added in this batch.

| KiB | File | Type | Shell? | Lazy? | Disposition |
|---:|---|---|:--:|:--:|---|
| 1253.50 | `assets/index-v4Zom0SW.js` | JS entry chunk | **Yes** | No | Precache |
| 184.19 | `assets/index-CLm3M_ZS.css` | CSS entry stylesheet | **Yes** | No | Precache |
| 45.14 | `images/neural_aurora_logo.svg` | SVG logo / favicon | **Yes** | No | Precache |
| 28.55 | `images/pwa-icon-512x512.png` | PNG app icon | **Yes** | No | Precache |
| 8.49 | `index.html` | HTML app shell | **Yes** | No | Precache |
| 6.83 | `images/pwa-icon-192x192.png` | PNG app icon | **Yes** | No | Precache |
| 1.86 | `images/pwa-icon.svg` | SVG app icon | **Yes** | No | Precache |
| 1.01 | `manifest.webmanifest` | PWA manifest | **Yes** | No | Precache |
| 0.13 | `registerSW.js` | JS SW registration | **Yes** | No | Precache |

No image larger than 45 KiB, no 3D vendor and no unvisited route chunk is downloaded during SW installation.

### Lazy chunk sizes still shipped on demand (new build, KiB)

`react-spline` 2,009.31 · `physics` 1,940.98 · `lucide-react` 857.05 · `AuroraBackground` 808.82 · `AdminDashboard` 298.54 · `opentype` 169.46 · `ui` 88.27 · `gaussian-splat-compression` 80.62 · `process` 58.86 · `navmesh` 53.80 · `boolean` 47.36 · rest < 30 KiB each. Total non-entry JS: **6,648.08 KiB** across 59 files. Spline and physics are loaded only by the deferred Spline scene; the WebGL background is loaded only by its local `Suspense` boundary.

---

## 5. Runtime cache policies in `dist/sw.js`

| # | Match | Strategy | Cache | Bound |
|---|---|---|---|---|
| 0 | Any navigation | precached `index.html` (Workbox `NavigationRoute`) | workbox precache | 9 entries |
| 1 | Same-origin `/assets/*.js` or `*.css` | **CacheFirst** | `neural-aurora-lazy-assets` | 64 entries / 30 days |
| 2 | Same-origin `/images/*.{png,jpg,jpeg,webp,svg}`, `/hero_dark.mp4`, `/hero_light.mp4`, `/resume.pdf` | **CacheFirst** | `neural-aurora-media` | 12 entries / 30 days |
| 3 | Google Fonts / gstatic | CacheFirst (unchanged) | `google-fonts` | 10 / 365 days |
| 4 | `api.fontshare.com` | CacheFirst (unchanged) | `fontshare` | 10 / 365 days |
| 5 | `prod.spline.design` | NetworkFirst, 5 s timeout (unchanged) | `spline-assets` | 20 / 30 days |

**Removed:** the `crm-neural-aurora.vercel.app` NetworkFirst rule. Nothing in the app fetches that host; it only opens links, so caching its GET responses was unnecessary and could have retained admin/CRM data.

**Never cached:** Supabase Auth/REST/Storage, `/api/*` (orders, payments, Razorpay, entitlements, downloads, admin), any opaque private download, or any user-specific response. Rules 1–2 match only same-origin hashed asset paths and a fixed list of public static media paths; rule 5 is a public CDN scene host. The route matchers are scoped to `url.origin === self.location.origin`, so cross-origin private URLs cannot match.

Hashed Vite filenames justify CacheFirst: a changed file gets a new URL, so a cached response can never shadow a new version. Bounded entry counts plus 30-day expiry prevent unbounded growth; no precache limit was increased.

---

## 6. Guarantees preserved and changed

**Preserved**
- Offline startup of the application shell, main navigation, styling, icons and PWA installation after a successful SW install.
- SPA deep-link fallback: all navigations still resolve to precached `index.html`.
- `registerType: 'autoUpdate'`, `skipWaiting()` / `clientsClaim()`, stale-cache cleanup.
- The `sw-update` banner now actually works: `src/lib/swUpdates.js` emits the event that `PwaStatus.jsx` was already listening for. No lifecycle change was made.
- Fonts, Fontshare and Spline runtime policies.

**Explicitly changed**
- Before: all 79 files were downloaded during installation and were therefore offline-available. After: only the 9 shell files are. **Large project images, `profile.jpg`, hero video, 3D vendors and unvisited route chunks are no longer available offline immediately after install.** Visiting a page once while online caches its chunks and public media for later offline use (bounded by the limits above).
- An unvisited route offline now shows an honest "This page isn't available offline yet" message instead of either a blank page or a misleading success.
- A missing/expired chunk while online shows "Could not load this page" with **Reload**, **Clear cached page files** and **Go home** actions. The clear action deletes only `neural-aurora-lazy-assets` / `neural-aurora-media`, never the Workbox precache, fonts or Spline cache.
- Removed CRM response caching (security hardening; no user-visible offline guarantee was documented for it).

---

## 7. Old browser tabs after a new deploy

The new deployment serves a new `index.html` referencing new hashed chunk URLs. Old tabs keep executing the entry chunk they already loaded. If such a tab lazily imports an old chunk that was removed from the server, the request can fail. Because old chunk URLs are immutable and were cached at runtime by rule 1, a previously visited chunk is still served from `neural-aurora-lazy-assets`, letting the old tab finish. If it was evicted/expired, the new honest error UI offers reload / cache-clear recovery. `skipWaiting()` plus `clientsClaim()` means the new worker takes over promptly; the update banner is shown to the old page. **The two-version deploy behaviour is reasoned from the generated SW and observed update event, not from a two-deployment browser test.**

---

## 8. Verification

### Commands (all local, 2026-11-21)

| Command | Result | Detail |
|---|---|---|
| `npm run check` | PASS | routes; 135 i18n keys; 36 migration structural lints |
| `npm test` | PASS | 23 pricing + **118** guards = **141 tests** (6 new PWA assertions) |
| `npm run build` | PASS (warnings) | 2,943 modules; entry 1,283.58 kB / 377.71 kB gzip; PWA **9 entries, 1,491.45 KiB build-reported / 1,529.70 KiB actual** |

**Build warnings:** the pre-existing i18next dynamic/static import warning and the pre-existing >500 kB chunk warning (Spline, physics, entry, WebGL, lucide). **No PWA precache-size warning.** No precache limit was raised.

### Browser tests — actually executed

Method: local `npm run preview` on `http://127.0.0.1:4173`, headless Microsoft Edge 157 via CDP, Service Workers allowed, DevTools offline emulation applied to **both** page and service-worker network targets. Results: **14/14 PASS**.

| # | Scenario | Result | Observed evidence |
|---|---|:--:|---|
| 1 | First online visit | PASS | Home shell rendered; SW registered |
| 2 | SW installation / activation | PASS | `getRegistration()` and `navigator.serviceWorker.controller` both true |
| 3 | Precache contents | PASS | 9 entries; 0 heavy files (Spline/physics/images absent) |
| 4 | Online visit to `/blog` | PASS | 6 runtime entries cached, including `Blog-D2rT9C-i.js`; Blog page rendered |
| 5 | Online route rendering | PASS | Blog headings/content present |
| 6a | Offline emulation sanity | PASS | `fetch(.../robots.txt, {cache:'no-store'})` rejected |
| 6 | Offline homepage reload | PASS | Shell/loader rendered from precache; no error fallback |
| 7 | Offline previously visited route (`/blog`) | PASS | Blog content rendered from `neural-aurora-lazy-assets` |
| 8 | Offline unvisited route (`/support`) | PASS | Exact honest message: "This page isn't available offline yet" |
| 9 | New SW update | PASS | Appending a comment to `dist/sw.js`, calling `registration.update()`, produced `sw-update` **and** the "New version available" banner; original file restored |
| 10 | Online deep-link refresh (`/more/certificates`) | PASS | Certificates page rendered without error |
| 11 | Failed/expired chunk (Blog cache entry deleted + URL blocked) | PASS | "Could not load this page" with Reload / Clear / Go home |
| 12 | Recovery by reloading online | PASS | Blog rendered again; chunk re-entered runtime cache |
| 13 | No sensitive cache namespaces | PASS | Only workbox precache, `fontshare`, `neural-aurora-lazy-assets` present; no Supabase/CRM/order/payment/download cache |

### Theoretical / not browser-tested

- Two consecutive real deployments with an old tab open (§7). The SW code path and update event were tested; the cross-deploy chunk-removal case was simulated by deleting one runtime entry and blocking its URL.
- Cache expiry/eviction after 30 days or 64/12 entries (the Workbox configuration is verified in `dist/sw.js`; time-based eviction was not waited out).
- PWA install prompt, offline install, Lighthouse/Core Web Vitals, and visual/Taste gates.
- Non-Vercel `_redirects` API behaviour (unchanged, tracked separately as PLAT-05).

---

## 9. Files changed in Batch 6

- `vite.config.js` — shell-only `globPatterns`, two bounded runtime caches, CRM rule removed; imports shared cache names.
- `src/lib/pwaCaches.js` (new) — shared cache names and `clearRuntimeCaches()`.
- `src/lib/swUpdates.js` (new) — dispatches the existing `sw-update` event.
- `src/main.jsx` — calls `watchServiceWorkerUpdates()`.
- `src/App.jsx` — offline-aware `RouteErrorFallback` with recovery actions.
- `scripts/test-api-guards.mjs` — 6 source assertions for the new contracts.
- `docs/engineering/IMPLEMENTATION_LOG.md`, `PRODUCTION_READINESS.md`, `PROJECT_AUDIT.md`, this report.

No production database changes, environment-variable changes, deployment, commit or push.
