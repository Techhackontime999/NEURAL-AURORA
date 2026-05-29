# Project Monorepo — NEURAL AURORA + wacrm

This repository contains two independent projects:

| Project | Directory | Type | Stack |
|---------|-----------|------|-------|
| **NEURAL AURORA** | `NEURAL-AURORA/` | SPA Portfolio | React 18, Vite 6, JavaScript, Tailwind v3, Three.js, Supabase |
| **wacrm** | `wacrm/` | Full-Stack CRM | Next.js 16, React 19, TypeScript 6, Tailwind v4, Supabase |

> **Detailed documentation:**
> - [NEURAL AURORA README](./NEURAL-AURORA/README_NEURAL_AURORA.md) — full project docs, features, architecture
> - [wacrm README](./NEURAL-AURORA/README_WACRM.md) — CRM setup, WhatsApp integration, deployment

---

## Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10
- **Supabase** account (free tier) — [supabase.com](https://supabase.com)
- **Git** (optional, for version control)

---

## NEURAL AURORA — Setup

Immersive 3D portfolio with AI-powered gateway (OpenRouter/OpenAI-compatible puzzles), Neural Aurora CMD interactive terminal, Mood Swing vibe selector with Jamendo API background music, auto-traverse site tour, and full admin dashboard.

### Quick Start

```bash
cd NEURAL-AURORA
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Environment Variables

Copy `.env.example` to `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_AI_API_BASE=https://openrouter.ai/api/v1   # optional — any OpenAI-compatible API
VITE_AI_API_KEY=your_api_key                     # optional — AI puzzle generation
VITE_AI_MODEL=openai/gpt-4o-mini                 # optional — model name
VITE_JAMENDO_CLIENT_ID=your_jamendo_client_id    # optional — free Jamendo API key for mood-based background music (get at https://devportal.jamendo.com)
```

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the schema in `NEURAL-AURORA/supabase-schema.sql` via SQL Editor
3. Or apply migrations via Supabase CLI:
   ```bash
   cd NEURAL-AURORA
   supabase login
   supabase link --project-ref your-project-ref
   supabase db push
   ```
4. (Optional) Seed test data:
   ```bash
   node NEURAL-AURORA/scripts/seed.cjs
   ```

### Build for Production

```bash
cd NEURAL-AURORA
npm run build
npm run preview
```

### Key Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (Vite) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

### Deployment

Deploy `NEURAL-AURORA/` to Vercel (recommended), Netlify, or Cloudflare Pages.

- **Vercel:** Import repo — Vite is auto-detected. Add env vars in dashboard.
- The `vercel.json` includes SPA rewrites: `/* → /index.html`

---

## wacrm — Setup

Self-hostable CRM template for WhatsApp Business API — shared inbox, contacts, sales pipelines, broadcasts, and no-code automations.

### Quick Start

```bash
cd wacrm
npm install
cp .env.local.example .env.local   # fill in credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Required in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ENCRYPTION_KEY=your_64_hex_char_key    # AES-256-GCM — generate: openssl rand -hex 32
META_APP_SECRET=your_meta_app_secret
VITE_AI_API_BASE=https://openrouter.ai/api/v1   # optional — any OpenAI-compatible API
VITE_AI_API_KEY=your_api_key                     # optional — Neural Aurora CRM Assistant for AI - Automation
VITE_AI_MODEL=openai/gpt-4o-mini                 # optional — model name
```

Recommended:

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### Supabase Setup

1. Create a Supabase project
2. Apply migrations in order:
   ```bash
   cd wacrm
   supabase login
   supabase link --project-ref your-project-ref
   supabase db push
   ```
3. Migrations live in `wacrm/supabase/migrations/001` through `012`

### Key Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (Next.js Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type check |
| `npm test` | Run tests (Vitest) |

### Deployment

- **Hostinger** (recommended) — click the "Deploy on Hostinger" badge in the wacrm README
- **Vercel** — create a separate project, set root directory to `wacrm/`
- Full deployment docs at [wacrm.tech/docs](https://wacrm.tech/docs)

---

## Combined Development Workflow

Run both projects simultaneously from the root:

```bash
# Terminal 1 — NEURAL AURORA
cd NEURAL-AURORA
npm run dev        # → http://localhost:5173

# Terminal 2 — wacrm
cd wacrm
npm run dev        # → http://localhost:3000
```

Or set up npm workspaces at root level for combined commands (see [Integration Guide](#integration)).

---

## Integration Approaches

Since the two projects use **different frameworks, React versions, and build tools**, a full code-level merge is not recommended.

### Option A: Subdomain Link (Recommended)

Deploy each project independently and link them:

```
NEURAL-AURORA → neural-aurora.vercel.app
wacrm         → crm.neural-aurora.vercel.app
```

Add a CRM link in NEURAL AURORA's navbar or admin panel.

### Option B: Iframe Embed

Embed wacrm inside NEURAL AURORA under a `/crm` route with SSO via token exchange.

### Option C: Monorepo Workspaces

Use npm workspaces for shared tooling:

```json
{
  "workspaces": ["NEURAL-AURORA", "wacrm"],
  "scripts": {
    "dev:portfolio": "npm run dev --workspace=NEURAL-AURORA",
    "dev:crm": "npm run dev --workspace=wacrm",
    "build": "npm run build --workspace=NEURAL-AURORA && npm run build --workspace=wacrm"
  }
}
```

> For detailed integration steps (auth, theming, schema merge, CI/CD), refer to the original integration guide in the git history or see the individual project docs.

---

## Project Structure

```
root/
├── README.md                       ← this file
├── NEURAL-AURORA/                  ← Portfolio SPA
│   ├── README_NEURAL_AURORA.md     ← full project docs
│   ├── README_WACRM.md             ← wacrm info within portfolio context
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── supabase-schema.sql
│   ├── supabase/
│   │   └── migrations/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── admin/              ← Admin dashboard CRUD
│   │   │   └── ui/                 ← Reusable UI components
│   │   ├── context/                ← Auth, AutoTraverse, MoodContext
│   │   ├── lib/                    ← Supabase client, AI gateway, moodMusic, musicApi, hooks
│   │   └── data/                   ← Static fallback data
│   ├── scripts/
│   ├── public/
│   └── vercel.json
│
└── wacrm/                          ← WhatsApp CRM
    ├── README.md                   ← full project docs
    ├── package.json
    ├── next.config.ts
    ├── postcss.config.mjs
    ├── tsconfig.json
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/             ← Login, Signup, Forgot Password
    │   │   ├── (dashboard)/        ← Dashboard, Inbox, Contacts, Pipelines, etc.
    │   │   └── api/                ← WhatsApp, Automations, Flows API
    │   ├── components/
    │   │   ├── inbox/
    │   │   ├── pipelines/
    │   │   ├── broadcasts/
    │   │   ├── automations/
    │   │   ├── flows/
    │   │   ├── contacts/
    │   │   ├── settings/
    │   │   ├── dashboard/
    │   │   └── ui/                 ← shadcn-style components
    │   ├── lib/
    │   │   ├── supabase/           ← Server & client clients
    │   │   ├── whatsapp/           ← Meta API, encryption
    │   │   ├── automations/        ← Engine, validation
    │   │   ├── flows/              ← Engine, validation
    │   │   └── dashboard/          ← Queries, types
    │   ├── hooks/                  ← useAuth, useTheme, useRealtime
    │   └── types/                  ← Data model interfaces
    ├── supabase/
    │   └── migrations/             ← 001 through 012
    └── .github/
        └── workflows/ci.yml
```

---

## Comparison

| Aspect | NEURAL AURORA | wacrm |
|--------|---------------|-------|
| **Framework** | Vite + React 18 | Next.js 16 + React 19 |
| **Language** | JavaScript (JSX) | TypeScript 6 |
| **Styling** | Tailwind v3 (JS config) | Tailwind v4 (CSS `@theme`) |
| **Auth** | `@supabase/supabase-js` (browser) | `@supabase/ssr` (cookie) |
| **Routing** | React Router v7 (SPA) | Next.js App Router (SSR) |
| **Testing** | None | Vitest (unit tests) |
| **Hosting** | Vercel / Netlify / CF Pages | Hostinger / Vercel |

---

## Shared Supabase Instance

Both projects can share a single Supabase project with separate schemas or table prefixes.

| Project | Key Tables |
|---------|------------|
| **NEURAL AURORA** | `profiles`, `personal_info`, `skills`, `projects`, `education`, `experience`, `blog_posts`, `case_studies`, `contact_messages`, `reviews`, `social_links`, `admin_settings`, `dev_ads`, `visitor_stats` |
| **wacrm** | `profiles`, `contacts`, `tags`, `conversations`, `messages`, `pipelines`, `deals`, `broadcasts`, `automations`, `flows`, `whatsapp_config` |

> **Note:** Both use a `profiles` table. Merge by using wacrm's profile schema as base and adding NEURAL AURORA's `role` column.

---

## License

- **NEURAL AURORA** — MIT © 2026 Amit Kumar - Techhackontime999
- **wacrm** — MIT © 2026 Amit Kumar - Techhackontime999

See individual project `LICENSE` files for details.
