> **Historical snapshot:** This document reflects an earlier audit/delivery point in time. For current release status, see README.md, docs/DIGITAL-STORE.md, docs/PRODUCTION-RELEASE-CHECKLIST.md, and docs/LEGAL-POLICY-DRAFTS.md.\n\n# NEURAL AURORA — DESIGN SYSTEM AUDIT (Taste skill)

- **Generated:** 2026-11-21 · **Method:** applied the installed `design-taste-frontend` (tasteskill 2.5) house rules to existing source. **No browser inspection yet** — visual conclusions are source-based and labelled accordingly.
- **Site kind (Taste):** the product is a developer/software studio portfolio + first-party digital store → `software` / `site-kind: software`. Effects and WebGL are permitted on this kind, but only purposefully.
- **Goal:** converge three competing visual languages into one restrained, premium editorial system. Preserve the Neural Aurora identity (aurora/neural motif, cyan signal, dark/light themes) while removing generic-template signals.

## 1. Taste principles actually applied

From the installed skill: one system and one section per screen; equal left/right content edges; real product UI/assets rather than decorative fragments; real full-colour icons; hover micro-animations (2px lift, step/press) with a single hero entrance and one or two dealt moments; subtle purposeful motion; **no violet/lavender in the page's own design**; no generic AI/template look; check the rendered result at 1440/1024/768/390. The skill's gate scripts (`copy-lint.mjs`, `consistency.mjs`, `check.mjs`, `shoot.mjs`, `perf.mjs`, `gate.mjs`) are available at `C:\Users\ADMIN\.agents\skills\design-taste-frontend\scripts\` and require Node 22+ and Chrome/Edge — **not yet run**.

## 2. Current state — three systems in conflict

| System | Evidence | Character |
|---|---|---|
| Neon aurora (original) | `src/index.css:272` gradient `#00f0ff → #b829dd → #f0c040`; `tailwind.config.js:12-25` `neural.cyan/purple/pink`; `App.jsx:141` `via-[#b829dd]` scroll bar | Saturated, decorative, generic "AI neon" |
| Editorial tokens (newer) | `src/index.css:119-140` neutral surfaces `#faf8f5`, ink `#3a3a5c`; `--text-primary/secondary/tertiary` at `:175-177` | Restrained, premium, promising |
| Admin glass | `src/index.css:217-251` `.glass-panel` blur 20/32/28px; `AdminAppearance.jsx` live colour/blur controls | Glassmorphic, configurable |

These coexist without a rule for which to use where. The storefront mixes hardcoded black/white and cyan utilities with token-based admin surfaces.

## 3. Findings

Every finding: Finding / Severity / Status / Evidence / Root cause / Impact / Recommendation / Testing.

### [DS-01] Admin appearance controls for font scale, radius and blur are no-ops

- **Severity:** Medium · **Status:** Verified (source grep)
- **Evidence:** `src/lib/appearanceDefaults.js:244-247` writes `--app-font-scale`, `--app-radius-scale`, `--app-blur`; `index.html:121-124` mirrors them; `src/index.css:116-118` only declares them. Actual consumers hardcode values: `.glass-panel` blur 20px at `index.css:219` (32px/28px at 237/260). Admin sliders at `AdminAppearance.jsx:691-711`, preset at `:95`.
- **Root cause:** Tokens emitted but never consumed.
- **Impact:** Admin sees a preview change; public site does not. Broken promise and dead UI.
- **Recommendation:** Consume the tokens in semantic rules (`--app-font-size`, `border-radius: calc(Npx * var(--app-radius-scale))`, `blur(var(--app-blur))`) **or** remove the controls. Do not leave both.
- **Testing:** Change each slider, save, reload public site in a clean tab; assert visible change or removed control.

### [DS-02] Store text and accent ignore design tokens

- **Severity:** Medium · **Status:** Verified
- **Evidence:** `Products.jsx:153`, `ProductCard.jsx:86`, `ProductDetail.jsx:353`, `Library.jsx:232` use `text-black/80 dark:text-white/80`; store uses `accent-cyan-500`/`border-cyan-500` (`Products.jsx:179,240,326-327`; `ProductCard.jsx:86`; `StoreShell.jsx:111`) while admin uses `var(--accent)` (`AdminProducts.jsx:497-500`).
- **Impact:** Admin theme changes do not apply to the commercial surface; two-accent system; contrast risk.
- **Recommendation:** Add semantic utilities `.text-primary/.text-secondary/.text-tertiary`, `.accent-text`, `.accent-ring`, `.accent-chip` mapped to CSS variables; replace hardcoded pairs across `src/components/offerings/`.
- **Testing:** Set non-cyan accent + custom text colour; verify store in light/dark.

### [DS-03] Violet/magenta in customer-facing identity (Taste: never violet)

- **Severity:** Medium · **Status:** Verified
- **Evidence:** `index.css:272` default gradient includes `#b829dd`; `tailwind.config.js:22` `neural.purple`; `App.jsx:141` scroll progress `via-[#b829dd]`; `StoreShell.jsx:112` `from-purple-500/20`; `AdminAppearance.jsx:44-57` violet preset; `AdminOrders.jsx:27` `refunded: '#8b5cf6'`.
- **Impact:** Reads as generic neon/AI template rather than a restrained premium brand.
- **Recommendation:** Replace violet in the default identity with ink/neutral plus one restrained signal colour; keep any third-party brand colours (e.g. real product icons) untouched. Keep status colours semantic and out of the public identity.
- **Testing:** Grep after migration for `#b829dd|#8b5cf6|purple-`; visual review of `/`, `/offerings/products`, `/library`, `/admin/orders`.

### [DS-04] Pervasive glass, layered gradients and infinite decorative motion

- **Severity:** Medium · **Status:** Verified
- **Evidence:** `.glass-panel*` at `index.css:217-251`; `StoreShell.jsx:110-114` three radial-gradient layers; `index.css:5-16` `animate-float/pulse-subtle/shimmer`; `tailwind.config.js:27-33` infinite `aurora/float/shimmer/pulse-slow`.
- **Impact:** Conflicts with "subtle purposeful motion"; reduced readability and paint cost.
- **Recommendation:** Reserve glass for true overlays (modals, toasts, Mithi). Use solid surfaces + 1px border + shadow for content cards. Keep one hero entrance and one or two dealt moments; remove continuous decorative animation. Reduce-gradient layered hero to one intentional composition.
- **Testing:** Perf trace; reduced-motion regression; visual comparison.

### [DS-05] R3F aurora and Spline cost on the home page

- **Severity:** High (performance) · **Status:** Verified in source/build
- **Evidence:** `AuroraBackground.jsx:1-5` eager R3F imports; `:11-53` 600 particles, `:55-101` distorted planes, `:103-164` 30 spheres/40 lines, `:166-211` 100 more particles, continuous `<Canvas>` `:238-260`. `splite.jsx:10-20` lazy import defeated by eager prefetch `App.jsx:243-248`. Build: 3.49 MB index + 2.06 MB spline + 1.99 MB physics.
- **Impact:** Multi-megabyte download and sustained GPU/CPU cost before the user sees product content.
- **Recommendation:** Lazy-load both scenes; defer Spline until hero in view; `frameloop="demand"` or capped DPR; mobile particle budgets; skip under reduced-motion/low-data. Keep the neural identity in a cheaper static treatment when scenes are declined.
- **Testing:** Lighthouse mobile; WebGL context-loss path; reduced-motion.
- **Remediation status (batch 5):** `AuroraBackground` is now lazy-loaded behind a local `Suspense fallback={null}` and the app-shell Spline prefetch was removed. Entry JS fell from 3.49 MB to 1.28 MB. R3F particle budgets, `frameloop="demand"` and reduced-motion gating inside the scene are **not yet changed**; browser/Lighthouse verification is still outstanding.

### [DS-06] Custom cursor hides the native cursor unconditionally

- **Severity:** Low · **Status:** Verified
- **Evidence:** `index.css:187-195` `cursor: none !important` for fine pointers with no JS-ready class; `App.jsx:262` `<NeuralCursor />` outside any error boundary; `neural-cursor.jsx:61-291` continuous rAF canvas.
- **Impact:** If JS is slow/fails or the component throws, mouse users have no cursor; text inputs lose I-beam.
- **Recommendation:** Set `html.custom-cursor-ready` on mount and scope `cursor:none` to it; remove on unmount/error; preserve `cursor:text` on inputs; wrap overlay in `RenderErrorBoundary fallback={null}`.
- **Testing:** Disable JS / block chunk; verify native cursor and input caret.

### [DS-07] One non-resetting error boundary; overlays outside it

- **Severity:** Medium · **Status:** Verified
- **Evidence:** `App.jsx:274-334` single boundary around `<Routes>`; `RenderErrorBoundary.jsx:15-20` never resets on navigation. Overlays at `App.jsx:259-265` sit above it.
- **Impact:** One render error blanks the app until reload; navigation cannot recover.
- **Recommendation:** Key the global boundary on `location.pathname`; add local boundaries around 3D, store and checkout subtrees; wrap each optional overlay with `fallback={null}`.
- **Testing:** Throw in a product detail child, navigate away, assert recovery.

### [DS-08] Unknown URLs redirect to home instead of 404

- **Severity:** Medium · **Status:** Verified
- **Evidence:** `App.jsx:331-332` `<Route path="*" element={<Navigate to="/" replace />} />`.
- **Impact:** Dead/stale URLs silently show home; poor UX and analytics.
- **Recommendation:** Add a `NotFound` route with links to home/store and preserve attempted path.
- **Testing:** `/definitely-missing`, `/offerings/prodcts`.

### [DS-09] Store composition and touch targets

- **Severity:** Low · **Status:** Verified (source observation; no browser check)
- **Evidence:** `ProductDetail.jsx:278-336` stacks five information sections in one column; `:503-514` related products; `StoreShell.jsx:63-71` carousel dots 4×10px with hardcoded English `aria-label`.
- **Impact:** Weak hierarchy; below-target touch controls; untranslated accessible labels.
- **Recommendation:** Anchor/tab the detail sections into one-section-per-view behaviour; enlarge hit areas or remove decorative carousel controls; translate labels.
- **Testing:** Taste `check.mjs`/`consistency.mjs` at 1440/1024/768/390; 320px overflow/tap-size walk.

### [DS-10] Typography/data hygiene

- **Severity:** Low · **Status:** Verified
- **Evidence:** `tailwind.config.js:8` lists `Geist` but never loads it; `index.html:33-35` preconnects Google Fonts while fonts load from Fontshare; `index.css:113-115` declares Satoshi/Cabinet Grotesk/JetBrains Mono.
- **Recommendation:** Remove `Geist` and unused preconnects; self-host or defer Fontshare CSS.

## 4. Recommended token contract (consolidate, do not add a third system)

Keep the editorial tokens already present in `index.css:119-140` as the base. Define one semantic layer consumed everywhere:

- `--surface-page`, `--surface-raised`, `--surface-overlay`
- `--text-primary`, `--text-secondary`, `--text-tertiary` (already defined)
- `--accent` / `--accent-glow` (admin-managed single accent; no hardcoded cyan in components)
- `--radius-sm/md/lg` derived from `--app-radius-scale`
- `--motion-enter` (single hero entrance) and `--motion-hover` (2px lift / step / press)

Status colours stay semantic and local to admin tables. Marquee gradient loses violet. Glass only for overlays.

## 5. Mandatory visual verification before claiming design completion

1. Run Taste `copy-lint.mjs`, `consistency.mjs`, `check.mjs`, `shoot.mjs`, `perf.mjs`, `gate.mjs` against the running app (Chrome + Node 22+ available: Node 26.13.1).
2. Inspect screenshots at 1440×900, 1024×768, 768×1024, 390×844 (and 320px overflow walk).
3. Confirm no FAILs, no violet in the design, equal edges, every visual renders, hero enters once, one/two moments, reduced-motion rests, tap targets ≥44px.
4. Record the `GATE:` line and any waivers in this file.

**Current status: NOT DONE — no rendered interface has been inspected in this audit.**
