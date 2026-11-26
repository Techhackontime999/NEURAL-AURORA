# NEURAL AURORA — PRODUCT VISION & PLATFORM ARCHITECTURE

- **Generated:** 2026-11-21
- **Status:** Proposal only. No source, route, database or configuration has been changed by this document.
- **Method:** source-verified audit of `src/`, `api/`, `supabase/`, and existing `docs/engineering/*` reports; no production DB, payment or browser testing was performed.
- **Purpose:** establish the architecture **before** adding modules, so the six product ambitions become configurable capabilities of one platform rather than disconnected pages.

---

## 0. Executive summary

Neural Aurora is currently a **single-owner portfolio with an excellent first-party digital store**. It is not yet a multi-user platform: portfolio content and appearance are global singletons (`personal_info id=1`, `admin_settings id=1`), the permission model is binary (`profiles.role = admin | viewer`), and every public navbar is hard-coded separately.

The vision can be reached without a rewrite if we introduce **two foundational primitives** and then make everything else a configurable capability:

1. **A shared identity** — extend `profiles` from a role flag into a real personal identity (handle, headline, bio, avatar, public/private defaults).
2. **A workspace** — a tenant boundary owned by a user, with membership, enabled modules, and scoped settings. The existing site becomes the **founding workspace**, so every current route and feature keeps working.

On top of those primitives, the six ambitions become one system:

| Ambition | Platform capability | Build posture |
|---|---|---|
| Personal portfolio & identity | Presence | Reuse existing portfolio tables |
| Personal branding & professional presence | Presence + Brand | Reuse appearance/blog/case studies |
| Premium first-party digital commerce | Commerce | Reuse the payment core; improve UX only |
| Personal & professional growth | Growth | Projections over existing evidence first |
| Life & productivity management | Console ("Today") | Thin aggregation, not a new suite |
| Career development & recruiter readiness | Career | Curated views of existing achievements |

**Highest-value priorities, in order:** workspace boundary → shared profile/handle → one navigation/module registry → one consumed token system → store UX/SEO completion. Everything else waits.

---

## 1. Verified baseline — what exists today

### 1.1 Working capabilities to preserve

| Domain | Current implementation | Keep? |
|---|---|---|
| Public portfolio | `src/components/Hero.jsx`, `About`, `Skills`, `Projects`, `Resume`, `ReviewsList`, `Contact`, all under `src/App.jsx:340` | Yes — unchanged |
| Extended identity | `/more/*`: timeline, certificates, achievements, gallery, case studies | Yes — becomes Career evidence |
| Content | `/blog`, `/blog/:slug`, `/case-study/:slug`, admin equivalents | Yes |
| Services | `/offerings` + `/services/*` compatibility redirects (`App.jsx:345-361`) | Yes |
| Store | `/offerings/products`, `:slug`, `/library`, `/purchase/success` | Yes — payment core is sound |
| Auth | Supabase auth + `AuthContext`, password, OTP, magic links, `/admin/*` guard | Yes — extend, don't replace |
| Admin CMS | ~29 panels under `AdminDashboard.jsx:35-66` | Yes — becomes first workspace console surface |
| AI companion | Mithi grounded in public content (`api/mithi-chat.js`, `_lib/mithi-knowledge.js`) | Yes — scope to workspace later |
| Internationalisation | 24 locales, RTL, `i18n.js` | Yes — parity debt remains |
| PWA / motion | Service worker, theme system, 3D aurora, curated motion | Yes — govern with a motion budget |

### 1.2 Why it is not yet a platform

| Gap | Evidence | Consequence |
|---|---|---|
| Global content | Portfolio tables have no `user_id`/`workspace_id`; `personal_info` is `id=1` | Cannot host a second person's portfolio |
| Global configuration | `admin_settings` is a single row; `public_site_settings` is a public view of it | One appearance, one site name, one admin email |
| Binary roles | `profiles.role IN ('admin','viewer')` (`supabase-schema.sql:16`) | No editor, manager, analyst, client distinctions |
| Five navbars | `Navbar`, `BlogNavbar`, `ServiceNavbar`, `MoreNavbar`, `SupportNavbar`, plus `AdminLayout` sidebar | Adding a module means editing several files; nav drifts |
| Three visual systems | `DESIGN_SYSTEM_AUDIT.md:11-19`: neon aurora, editorial tokens, admin glass | One platform cannot feel coherent |
| Owner identity is implicit | Name/language in static data, `site-brand.js`, Mithi prompts | A second user would inherit another person's identity |
| Store is ownerless | `products` has no seller/owner column (`supabase-schema.sql:1186-1221`) | Store cannot yet belong to a workspace |
| Legal/trademark | `TRADEMARK.md`, `COMMERCIAL-LICENSE.md` assume one brand owner | Multi-user branding needs explicit licensing decision |

### 1.3 Guardrails inherited from existing audits

- **Do not rewrite commerce.** `DIGITAL_STORE_ROADMAP.md:21` — payment/fulfilment core is verified in source; only UX, SEO and scoped ownership need work.
- **First-party products only.** `DIGITAL_STORE_ROADMAP.md:89-91` — no vendor registration, commissions or payouts this cycle.
- **Migrations are canonical.** `ARCHITECTURE.md:98` conflicts with `DIGITAL-STORE.md:158`; treat `supabase/migrations/` as source of truth and regenerate the consolidated snapshot.
- **Two 2026-11-21 hardening migrations are source-complete but deployment-unverified.** Verify before any schema work.
- **Visual gate is NOT DONE.** `DESIGN_SYSTEM_AUDIT.md:117-124` — no rendered inspection has been recorded.

---

## 2. Updated product vision

> **Neural Aurora is the Personal Digital Platform: one identity, one professional presence, one first-party store, and one growth system — configured around the person, not around a page.**

### 2.1 What this means

- A user establishes **one verified professional identity** and chooses which parts are public, recruiter-facing or private.
- That identity publishes **one coherent presence** — portfolio, writing, proof and products — rather than a scattering of profiles.
- **Commerce is a native capability**, not a separate shop: a product can be attached to a case study, a creator article, a freelancer service or a founder's launch.
- **Growth and career are projections of the same evidence.** A certificate entered once serves the portfolio, the learning goal and the recruiter pack.
- **Users opt into modules.** A student's workspace has no store; a creator's has no application tracker. The system adapts to the person.

### 2.2 Product principles

1. **One identity, many surfaces.** One profile record feeds public site, console, store receipts, Mithi and recruiter share page.
2. **Workspace is the unit of ownership.** Content, settings, products and permissions belong to a workspace, never to a page.
3. **Modules are capabilities, not pages.** A module declares data, permissions, nav slots and UI slots; it can be enabled, disabled or reordered.
4. **Preserve the founding site.** `/` and every existing route remain valid; migration is additive and backwards-compatible.
5. **One system, one design language.** Semantic tokens and shared components across public, commerce and console surfaces.
6. **Evidence over decoration.** Achievements, projects and proof items are first-class; immersive aurora effects remain a restrained brand moment.
7. **No feature bloat.** New modules must reuse existing entities or prove new data is required.

### 2.3 Definition of done for the vision

A student, freelancer and founder can each sign in, get a different workspace in under ten minutes, publish a credible presence, and — where relevant — sell a first-party digital product without touching code or duplicating content.

---

## 3. Audience analysis

The archetype is a **starting template**, not a permanent label. Any user can enable any module later.

| Audience | Primary job to be done | Must-have modules | Optional modules | Default emphasis | Explicitly *not* needed |
|---|---|---|---|---|---|
| **Students** | "Prove capability before I have job history" | Identity, Presence (projects/certificates/achievements), Career (recruiter card), Growth (learning goals) | Library (free resources) | Evidence-first profile; resume-ready framing | Store selling, team management, revenue analytics |
| **Working professionals** | "Make my progression and credibility visible without broadcasting everything" | Identity, Presence, Career, Growth | Brand/content, Library | Private-by-default with selective publish; role-readiness goals | Public storefront, vanity commerce |
| **Freelancers** | "Win trust and get paid for my work" | Identity, Presence, Services/case studies, Reviews, Commerce | Growth, Career | Case study → service → product path | Team spaces, complex org structures |
| **Creators** | "Turn audience attention into owned products and durable proof" | Identity, Brand/content (blog, gallery, YouTube), Commerce | Career, Growth | Publish → attach product → measure | Application tracking |
| **Founders / entrepreneurs** | "Present company and personal credibility, launch and iterate" | Identity, Brand, Commerce, Growth, Console, Members | Career | Launch surface, metrics, team roles | Heavy recruiter tooling unless hiring |

### 3.1 Cross-audience needs that must be shared

- **Verified identity** (email verified; handle unique; display name controlled).
- **Visibility controls** per item: private / public / recruiter-only / customer-only.
- **Reusable evidence**: skill, project, certificate, achievement, review, case study.
- **One library**: purchases follow the person across workspaces.
- **One design system**: personal theme changes must not break usability of the console.

---

## 4. Core user journeys

J1 — **Student builds first credibility**
Sign in → choose "Student" → workspace created with Presence + Career + Growth → add a course certificate and a project → mark both "recruiter-visible" → generate shareable recruiter card → share link on an application. *Reuses: certificates, achievements, projects, profiles.*

J2 — **Working professional upgrades presence**
Claim existing founding workspace or create one → import/enable existing achievements, experience, skills → set default to private → publish selected proof → set a next-role growth goal → review "Today" for goal and profile completion prompts. *Reuses: education, experience, skills, achievements.*

J3 — **Freelancer turns proof into revenue**
Enable Commerce + Services → publish a case study built from an existing project → publish a first-party template/toolkit attached to it → client discovers via public profile → server-priced checkout → entitlement in Library → secure download → order appears in console. *Reuses: case_studies, products, orders, entitlements.*

J4 — **Creator converts content into owned commerce**
Publish article/video → attach relevant product and an achievement proof point → audience arrives via `/@handle` → product detail with file manifest and JSON-LD → purchase → customer gets Library access → creator sees conversion in console. *Reuses: blog_posts, gallery, products.*

J5 — **Founder operates a small team**
Create workspace → set brand/appearance and handle → invite an editor and a commerce manager with scoped permissions → publish founder profile + company case studies → launch a product → review growth metrics. *Requires: workspace_members, permission checks.*

J6 — **One item, many contexts** (the unification journey)
Add a project once → tag it as portfolio proof, career evidence and case-study source → update its description once → public site, recruiter card and case study all reflect the change. *Requires: visibility/surface flags on existing entities; no duplicate entry.*

J7 — **Customer stays a customer, not a tenant**
Buy a product → magic-link or password sign-in → land in `/library` → download → optionally claim a personal workspace later. **No onboarding questionnaire is forced on a buyer.**

---

## 5. Module architecture

### 5.1 Layered model

```
L3  INTELLIGENCE   Mithi companion · grounded answers · site actions · future assistant
L2  SURFACES       Public site (/ and /@handle) · Customer library · Workspace console (/studio, legacy /admin)
L1  CAPABILITIES   Presence · Brand/Content · Commerce · Growth · Career · Console(Today)
L0  FOUNDATION     Auth · Profiles · Workspaces & memberships · Permissions · Settings
                   Navigation/module registry · Design tokens · i18n · Storage · APIs
```

Rules:

- **L0 knows nothing about modules.** It resolves identity, workspace, permissions, theme, locale.
- **L1 modules declare capabilities** to L0: nav slots, permission keys, dataset keys, settings schema. Disabled modules contribute nothing to nav or routes.
- **L2 surfaces render L1 output.** The public site publishes workspace data; the console edits it; the library is buyer-facing.
- **L3 reads only published, permitted context.** Private goals and drafts must never enter the AI context.

### 5.2 Module catalogue

| Module | Responsibility | Existing assets reused | New data needed | Phase |
|---|---|---|---|---|
| **Identity** | Profile, handle, headline, bio, avatar, visibility defaults, social links | `auth.users`, `profiles`, `social_links`, `personal_info` | Profile extension fields; handle uniqueness | 1–2 |
| **Workspace** | Tenant, members, roles, enabled modules, settings, domains | `profiles`, `admin_settings` | `workspaces`, `workspace_members`, `workspace_modules` | 1 |
| **Presence** | Portfolio sections, projects, skills, proof, reviews, "about" | All current portfolio tables and admin panels | `workspace_id`, visibility flags | 2 |
| **Brand & Content** | Appearance, site name, blog, case studies, gallery, media, Mithi persona | `admin_settings.appearance`, `blog_posts`, `case_studies`, `gallery` | Workspace-scoped settings | 2 |
| **Commerce** | Products, checkout, entitlements, library, orders, downloads | Full store stack — keep payment core | Seller `workspace_id`, storage prefix | 3–4 |
| **Growth** | Goals, skill roadmaps, learning/progress tied to evidence | Certificates, achievements, projects, blog | Minimal `goals`/`goal_items` only if projections insufficient | 3 |
| **Career** | Recruiter-ready profile, evidence vault, resume variants, application tracker | `resume.pdf`, experience, education, skills, achievements | `resume_variants`, `applications` (late) | 3 |
| **Console (Today)** | Aggregated status: orders, drafts, goal progress, profile completeness | Existing admin overview + module data | No new domain table; composition only | 2 |
| **Assistance (Mithi)** | Grounded Q&A and navigation over the active workspace | `mithi-chat`, knowledge loader, capability allowlist | Workspace context filter | 5 |

### 5.3 Reuse rules (how bloat is prevented)

1. **No new table for a view.** Career and Growth first render existing tables with different filters, ordering and visibility.
2. **No duplicate content entry.** Add `visibility`/`surfaces` metadata to an entity; do not copy it into another module's table.
3. **No module-local auth.** All modules call the same permission resolver, client and server.
4. **No module-local nav.** Modules register nav items in one registry.
5. **New table threshold:** only when the data has a distinct lifecycle and no existing entity can carry it (e.g. `applications` has status, dates and follow-ups — a project record cannot).

---

## 6. Navigation & information architecture

### 6.1 Surfaces

| Surface | Audience | Purpose | Current equivalent |
|---|---|---|---|
| **Public projection** | Everyone | Read-only published identity, content and products | `/`, `/more/*`, `/offerings/*`, `/blog/*` |
| **Personal handle site** | Everyone | Same projection for any workspace | New: `/@:handle` |
| **Customer library** | Buyers | Entitlements and downloads | `/library`, `/purchase/success` |
| **Workspace console** | Owner/members | Create, configure, measure | `/admin/*` |

### 6.2 Route plan (existing first, additive after)

**Preserve exactly as-is:** `/`, `/more(/certificates|achievements|gallery)`, `/offerings(/products|products/:slug|:serviceId)`, `/library`, `/purchase/success`, `/checkout/:orderId`, `/blog(/:slug)`, `/case-study/:slug`, `/support`, `/services/*` redirects, `/login`, `/register`, `/forgot-password`, `/admin/*`.

**Add progressively:**

| Route | Phase | Note |
|---|---|---|
| `/@:handle` | 2 | Published workspace projection; `/u/:handle` alias if needed |
| `/studio` | 2 | Workspace home ("Today"); `/admin` keeps working and can later redirect |
| `/studio/profile` | 2 | Identity editor |
| `/studio/presence/*` | 2 | Reuse existing admin content panels; no reimplementation |
| `/studio/content/*` | 2 | Blog, case studies, gallery, appearance |
| `/studio/commerce/*` | 4 | Products, orders, customers — reuse `AdminProducts`, `AdminOrders` |
| `/studio/growth` | 3 | Goals and progress |
| `/studio/career` | 3 | Recruiter readiness |
| `/studio/settings/*` | 2,5 | Appearance, navigation, members, domains |

**Compatibility rule:** `/admin/*` becomes a permanent alias of the owner workspace console. Never break existing bookmarks, emails or external links.

### 6.3 Proposed console IA (module-driven)

```
Workspace
├── Today                 aggregation, completion prompts, activity
├── Profile                identity, handle, visibility defaults, socials
├── Presence               about · skills · projects · achievements · certificates · reviews
├── Content                blog · case studies · gallery · media
├── Commerce               products · orders · customers · payments · library
├── Growth                 goals · skill progress · learning log
├── Career                 recruiter card · evidence vault · resume variants · applications
└── Settings               appearance · navigation · members & roles · domains · integrations
```

Only enabled modules appear. A student console shows Profile, Presence, Growth, Career, Settings — no Commerce.

### 6.4 Navigation registry (replaces five hard-coded navbars)

A single declarative registry, seeded per archetype, defines:

- `id`, `labelKey` (i18n), `path`, `surface` (public/console/library), `icon`, `requiredModule`, `requiredPermission`, `order`, `visibleWhen`.

Migration path without visual regression:

1. Create the registry and a shared `useNavigation(surface)` hook.
2. Feed the **existing** navbar components from the registry first; keep their markup and classes.
3. Collapse duplicated shell behaviour (scroll state, mobile overlay, focus trap, language/theme controls) into one `SiteHeader`.
4. Let `AdminLayout` become the first `WorkspaceShell` instance.
5. Replace the `*` → `/` catch-all with a real `NotFound` (`DESIGN_SYSTEM_AUDIT.md` DS-08).

---

## 7. User onboarding strategy

### 7.1 Entry points (different first screens)

| Entry | Landing | Onboarding |
|---|---|---|
| Returning owner | `/` or `/admin` | None — automatic founding-workspace backfill |
| New platform user | `/register` → `/welcome` | Archetype flow |
| Buyer from checkout/library | `/library` | None beyond sign-in; offer workspace creation later |
| Invited member | `/invite/:token` → accepting workspace | Role-scoped, no archetype quiz |
| Public visitor | `/` or `/@handle` | No gate unless the owner keeps the existing verification gateway |

### 7.2 Archetype flow (maximum 3 required steps)

1. **Choose a starting point** — Student / Professional / Freelancer / Creator / Founder. "Not sure" creates a minimal workspace. Changeable at any time.
2. **Claim identity** — handle (unique), display name, one-line headline. Avatar and socials are optional.
3. **Add one proof item** — certificate, project or case study. This is the activation event.

Then show a tailored checklist with optional tasks: publish presence, set visibility, connect/store products, set first growth goal, build recruiter card. Empty states carry the guidance — no fake sample data presented as real.

### 7.3 Archetype templates

| Template | Enabled modules | Nav emphasis | First suggestion |
|---|---|---|---|
| Student | Presence, Growth, Career | Profile → Proof → Recruiter card | "Add your strongest project" |
| Professional | Identity, Presence, Growth, Career | Profile → Evidence → Goals | "Choose what's public vs recruiter-only" |
| Freelancer | Presence, Brand/Content, Commerce | Proof → Services → Products | "Publish a case study" |
| Creator | Identity, Brand/Content, Commerce | Content → Audience → Products | "Attach a product to your latest post" |
| Founder | All except applications by default | Today → Brand → Commerce | "Invite a teammate" |

### 7.4 Activation metrics

- Time to first published proof item (target < 10 min).
- Profile completion → first share → (optional) first order.
- Module enablement rate by archetype; modules never enabled are candidates for removal, not more UI.

---

## 8. Shared design-system strategy

### 8.1 Goal

One token contract and one component set used by public site, store, console and admin. This implements the existing `DESIGN_SYSTEM_AUDIT.md` recommendation rather than creating a fourth visual language.

### 8.2 Token contract (single source of truth)

Consume and extend the editorial tokens already in `src/index.css:119-180`:

| Group | Tokens | Consumer rule |
|---|---|---|
| Surfaces | `--surface-page`, `--surface-raised`, `--surface-overlay` | All cards/pages; no hardcoded black/white pairs |
| Text | `--text-primary`, `--text-secondary`, `--text-tertiary` | All copy; replaces `text-black/… dark:text-white/…` |
| Accent | `--accent`, `--accent-glow` | One admin/workspace-managed accent; no hardcoded cyan in components |
| Shape | `--radius-sm/md/lg` from `--app-radius-scale` | Makes the existing radius control real (DS-01) |
| Type | `--app-font-scale` | Makes the font-scale control real |
| Depth | `--app-blur` | Glass only for overlays, never content cards (DS-04) |
| Motion | `--motion-enter`, `--motion-hover` | One entrance; 2px hover lift/step/press; respect reduced motion |

Remove violet from the default identity (DS-03), keep status colours semantic and local to admin tables.

### 8.3 Component tiers

1. **Primitives:** Button, IconButton, Input, Select, Textarea, Checkbox, Badge, Avatar, Tabs, Dialog, Tooltip, EmptyState, Skeleton, Toast, DataTable.
2. **Patterns:** SectionHeader, ContentCard, StatTile, PublishBar, MediaPicker, EntityForm, FilterBar, ConfirmDialog, WorkspaceSwitcher.
3. **Shells:** `SiteHeader`, `SiteFooter`, `StoreShell`, `WorkspaceShell`, `PublicProfileShell`.
4. **Modules:** composed from 1–3 only. A module must not define its own colours or navigation.

### 8.4 Theming boundaries

- **Public projection** uses the workspace's appearance configuration.
- **Workspace console** uses platform-neutral chrome with only a small workspace accent; it must stay usable under any personal theme.
- **Commerce surfaces** use workspace tokens plus accessible status colours; price and trust elements stay high contrast.

### 8.5 Governance / verification

- Fix DS-06 (native cursor), DS-07 (error boundary resets on route change), DS-08 (404), DS-09 (44px targets), DS-10 (font hygiene) with the token work.
- Run the Taste gate (copy-lint, consistency, check, shoot, perf, gate) at 1440/1024/768/390 plus a 320px overflow walk **before** claiming design completion.
- Add a lightweight `npm run check:ui` that fails on raw hex colours and `text-black dark:text-white` pairs outside the token layer.
- Reduce R3F/Spline cost per DS-05: capped DPR, demand-driven frames, mobile budgets, reduced-motion fallback.

---

## 9. Database & permission implications

### 9.1 New foundational tables (Phase 1)

| Table | Key fields | Purpose |
|---|---|---|
| `workspaces` | `id`, `owner_id → profiles.id`, `handle` (unique), `display_name`, `type` (personal/studio), `status` (active/suspended), `published` | Tenant + public projection switch |
| `workspace_members` | `workspace_id`, `user_id`, `role`, `status`, `invited_by`, unique(workspace,user) | Membership; owner seeded automatically |
| `workspace_modules` | `workspace_id`, `module_id`, `enabled`, `config jsonb`, `order` | Per-user modular experience |
| `workspace_domains` *(later)* | `workspace_id`, `domain`, `verified` | Custom domain support — Phase 5 |

### 9.2 Additive changes to existing tables

- Add `workspace_id UUID NOT NULL DEFAULT <founding-workspace-id>` to portfolio/content/config tables: `personal_info`, `social_links`, `skills`, `projects`, `education`, `experience`, `blog_posts`, `case_studies`, `certificates`, `achievements`, `gallery`, `services`, `service_page`, `reviews`, `products`, `product_categories`.
- Add `visibility TEXT DEFAULT 'public' CHECK (...)` and `sort_order INT` where publishing control is needed; values: `private`, `public`, `recruiter`, `customer`.
- Extend `profiles` with `handle`, `headline`, `bio`, `avatar_url` (exists), `locale`, `onboarding_complete`, `persona`, `email_verified_at`.
- Add `seller_workspace_id` to `products`/`orders`/`entitlements` (server-resolved from product slug, never from the client).
- Namespace private storage paths: `workspaces/{workspace_id}/products/{product_id}/…`; public: `workspaces/{workspace_id}/portfolio/…`.

### 9.3 Compatibility strategy (no big-bang migration)

1. Create `workspaces`; insert the **founding workspace** owned by the existing admin email.
2. Backfill every existing row with the founding `workspace_id`.
3. Keep `admin_settings` as the founding workspace's compatibility layer; build a `workspace_settings` view/table and have `public_site_settings` resolve the public projection.
4. Keep all current routes rendering founding-workspace data by default.
5. Only then introduce `/@handle` and the console.

### 9.4 Permission model

| Scope | Roles | Notes |
|---|---|---|
| Platform | `admin`, `viewer` (existing) | Keep for site operations and legacy `/admin`; do not overload |
| Workspace | `owner`, `editor`, `commerce_manager`, `analyst`, `viewer` | Start with owner/editor/viewer + commerce_manager; add analyst later |

Permission keys, checked in both UI and RLS/API: `workspace.view`, `workspace.manage`, `content.draft`, `content.publish`, `commerce.manage`, `commerce.fulfil`, `finance.view`, `members.manage`, `settings.manage`.

- Replace ad-hoc `is_admin()` checks on content with `workspace_has_permission(workspace_id, key)`, a `SECURITY DEFINER` helper with fixed `search_path`.
- Keep `is_admin()` for platform-only operations; never grant workspace access through it implicitly.
- Public reads must require both `workspaces.published = true` and `visibility = 'public'`; use views to keep public policy simple.
- Server APIs must resolve workspace and permission from the session, not from request body. Apply the same pattern already used by `api/_lib/adminAuth.js` and `api/create-order.js`.

### 9.5 Commerce, library and AI specifics

- **Orders/entitlements:** continue to scope by `user_id` + verified `customer_email`; add workspace/seller scoping for reporting. Never weaken the amount/signature checks in `_lib/fulfilment.js`.
- **Downloads:** keep 10-minute signed URLs, hashed grants and rate limits; update path checks for the workspace prefix. Do not treat signed URLs as reusable capability tokens (STORE-001).
- **Storage:** RLS policies must check workspace membership for private paths; public bucket objects must be readable only for published workspaces.
- **Mithi:** knowledge loader must accept `workspace_id` and filter to published content; site-action allowlist must check the enabled-module registry so an assistant cannot navigate to a disabled feature.
- **Telemetry:** every module event carries `workspace_id` and `module_id`; private goal/content data is never sent to AI providers.

### 9.6 Migration risks

| Risk | Mitigation |
|---|---|
| Two hardening migrations unverified in production | Verify applied state before adding policies; keep existing rollbacks |
| Consolidated schema drift | Treat `supabase/migrations/` as canonical; regenerate `supabase-schema.sql` after each phase |
| Global singletons used by public cache (`usePortfolioData`, `useSiteAppearance`) | Introduce a workspace-aware fetch layer behind the same hook API; keep founding fallback |
| Email-based ownership (email changes/shared mailboxes) | Prefer `user_id`; verified email remains a recovery path only |
| RLS policy explosion | Helper functions + views; one policy pattern per table class |
| Trademark/licensing per workspace | Legal decision required before multi-user launch (see §11) |

---

## 10. Phased implementation roadmap

> No new user-facing modules are implemented in Phase 0–1. The first three phases build seams and coherence; module work follows only after the foundation is verified.

| Phase | Scope | Exit criteria | New modules? |
|---|---|---|---|
| **0 — Verify & stabilise** (1–2 wks) | Verify both 2026-11-21 migrations; run `npm run check`, `npm test`, build; execute the 13-step store acceptance journey on staging; establish visual/perf baseline | Deployment state known; store journey signed off; baseline recorded | No |
| **1 — Platform seams** (3–4 wks) | `workspaces`, `workspace_members`, `workspace_modules`, founding backfill; profile extension; permission helpers; module + navigation registry; `NotFound`; error-boundary reset; token contract adopted by primitives | Two workspaces can exist with different enabled modules and settings; all existing routes still pass checks; no second navbar | No |
| **2 — First coherent experience** (4–6 wks) | `/studio` shell + Today; identity editor; `workspace_settings` compatibility view; archetype onboarding; public `/@handle` projection; workspace-scoped appearance; one `WorkspaceShell` replacing `AdminLayout` | All five archetypes onboard; public profile renders from workspace data; `/admin/*` still works | Minimal (console/Today is composition) |
| **3 — Career & Growth projections** (4–6 wks) | Recruiter card and evidence views over existing achievements; resume variants; goal tracking tied to existing proof; cross-surface visibility flags | One item appears in portfolio + career without duplication; students/professionals reach value | Yes, evidence-first only |
| **4 — Premium commerce in-ecosystem** (4–6 wks) | Seller workspace scoping; store UX gaps ST-U01/02/04/06/08/10/11/16; per-route metadata and Product JSON-LD; one-section-per-screen detail; per-currency KPIs; token-driven store | Store feels like the same product; payment core untouched; E2E journey passes | No new commerce engine |
| **5 — Collaboration & intelligence** (6+ wks) | Member/role management UI; content workflow; Mithi workspace context; analytics; custom domains; i18n parity | Team workflows and scoped AI verified | Optional |
| **6 — Validate before expanding** | Bundles/coupons, memberships, application tracking depth, public API — only from evidence | Each has a validated demand signal and a reused data model | Optional / not committed |

### 10.1 Highest-value priorities

1. **Workspace + membership boundary** — without it, no other ambition is multi-user.
2. **Shared profile with handle and public projection** — the core promise of one identity.
3. **One navigation/module registry and one workspace shell** — the mechanism of modularity; removes five navbars.
4. **One consumed token system** — the mechanism of a unified premium feel; fixes DS-01–04.
5. **Store UX/SEO completion on the existing engine** — commerce is the closest to market-ready capability.

### 10.2 Explicitly out of scope for this cycle

Multi-vendor marketplace, vendor payouts/commissions, courses/LMS, social feed or follower graph, a general-purpose project-management suite, autonomous AI agents, separate databases per tenant, and a root-domain platform homepage that would displace the founding portfolio.

---

## 11. Decisions needed from stakeholders

1. **Root domain:** does `/` remain the founding owner's published site (recommended for preservation), or become a platform landing page with the portfolio moved to `/@founder`?
2. **Handle format and namespace:** `/@handle` vs `/u/:handle`; reservation and collision policy.
3. **Legal model:** each workspace needs its own branding and license terms. Current `TRADEMARK.md` prohibits use of the NEURAL AURORA name/logo in users' own branding. Decide whether workspaces are white-label, platform-branded, or licensed per seat.
4. **Tenancy:** shared database with RLS (recommended MVP) vs separate schemas per workspace.
5. **Commerce ownership:** is first-party store per workspace, or platform-operated with workspace-curated catalogue? Recommendation: per-workspace seller, still first-party only.
6. **Role set:** confirm minimal starting roles (owner, editor, commerce_manager, viewer) before schema is written.
7. **Visibility vocabulary:** confirm `public | private | recruiter | customer` semantics and default per archetype.

---

## 12. Preservation checklist

Every item below must still work after each phase:

- `/` gateway, 3D aurora, mood music, auto-traverse, live counters, NeuralCursor.
- All `/more/*` sections and their admin CRUD panels.
- Blog, case studies, reviews, contact messages, services and legacy `/services/*` redirects.
- Full store: discovery, detail, server-priced Razorpay checkout, webhook fulfilment, entitlements, library, signed downloads, admin orders/payments.
- 24-language switching and RTL.
- PWA install/update/offline behaviour.
- Mithi companion and its allow-listed site actions.
- Admin access links, customer sign-in links, existing admin routes and role checks.

---

## 13. Traceability

| This plan builds on | File |
|---|---|
| Current architecture and known debt | `docs/engineering/ARCHITECTURE.md`, `docs/engineering/PROJECT_AUDIT.md` |
| Design-token contract and findings DS-01–DS-10 | `docs/engineering/DESIGN_SYSTEM_AUDIT.md` |
| Commerce preservation and UX gaps ST-U01–U16 | `docs/engineering/DIGITAL_STORE_ROADMAP.md`, `docs/DIGITAL-STORE.md` |
| Security model and hardening status | `docs/engineering/SECURITY_AUDIT.md`, `supabase/migrations/20261121*` |
| Licensing and brand constraints | `LICENSE`, `COMMERCIAL-LICENSE.md`, `TRADEMARK.md`, `docs/LICENSING-FAQ.md` |
| Baseline schema | `supabase-schema.sql` (canonical source: `supabase/migrations/`) |
