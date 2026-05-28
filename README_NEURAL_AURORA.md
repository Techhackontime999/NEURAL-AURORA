# NEURAL AURORA — The Synaptic Portfolio <br> <sup>v2.0.0 — Neural Reverie Release</sup>

**A living neural network suspended in an aurora field.** Your work isn't "displayed"—it's *fired* across synaptic pathways. Every project glows, pulses, and connects in real-time.

Built with **React 18**, **Three.js** (via React Three Fiber), **Framer Motion 11**, **Tailwind CSS 3**, **Vite 6**, and **Supabase**.

---

## What's New in v2.0.0

| Feature | Description |
|---------|-------------|
| **Watch Dev Ads** | Alternative gateway — visitors watch Google AdSense ads or YouTube videos (landscape/Short) to unlock the portfolio. Ad queue system with animated transitions and view tracking. |
| **Auto Traverse** | One-click full-site demo tour. A glowing cyan cursor autonomously navigates through all pages with spring-based smooth scrolling. |
| **Live Visitor Count** | Real-time visitor counter synced to Supabase, glowing in the footer with animated number transitions. |
| **Taste-Skill Aesthetics** | Liquid Glass design language — `cubic-bezier(0.16, 1, 0.3, 1)` easing, perpetual micro-interactions, cyan/purple/gold accent palette. |
| **SEO & Discoverability** | Google Search Console verified, sitemap.xml, robots.txt, OG/Twitter cards, canonical URLs, and Vercel deployment. |
| **Admin Ads Panel** | Full CRUD for Dev Ads at `/admin/ads` — manage Google AdSense + YouTube ads with configurable aspect ratios and duration. |
| **Admin User Roles** | User management at `/admin/users` — promote/demote between admin and user roles. |
| **Enhanced Supabase Migrations** | New migrations for `dev_ads`, `visitor_stats`, contact RLS fixes — all managed via `supabase db push`. |
| **Vercel Deployment** | Migrated from Netlify to Vercel with auto CI/CD on every push. |
| **CRM Dashboard Link** | Navbar login dropdown offers both Admin Dashboard and CRM Dashboard options. CRM URL is configurable from the admin panel. |
| **BrandLogo on Auth Pages** | Neural Aurora animated logo appears on Login and Register pages. |
| **CRM URL Configuration** | New admin panel page at `/admin/crm-config` to set the hosted wacrm CRM URL. Saved to both localStorage and Supabase. |
| **Taste-Skill Login Dropdown** | Premium login dropdown with lucide-react icons, Liquid Glass refraction, spring physics, and tactile feedback. |

[Full Changelog](#changelog)

---

## Features

- **AI-Powered Gateway** — Visitors must pass a voice or logic challenge to unlock the portfolio. Features terminal boot sequence, Web SpeechRecognition voice verification (say "Amit"), AI-generated logic puzzles (OpenRouter/OpenAI-compatible API), and celebratory access-granted animation.
- **Watch Dev Ads** — Alternative gateway method: watch Google AdSense ads or custom YouTube videos (landscape or Shorts format) to unlock the site. Ads are queued and played sequentially with animated transitions.
- **Auto Traverse** — One-click full-site demo tour. A visual cursor automatically navigates through all pages (`/` → `/services` → `/more` → `/blog`) with configurable dwell time, spring-based smooth scrolling, and a glowing cyan cursor that follows the reading position.
- **3D Aurora Background** — Neural particles, aurora waves, floating nodes with synaptic connections, and cursor-following "synaptic fire" particle system (React Three Fiber + Drei)
- **Spline 3D Hero** — Embedded Spline interactive 3D scene in the hero section (preloaded during gateway for instant reveal)
- **Full Portfolio** — Hero, About, Skills (animated bars by category), Projects (expandable cards), Resume download, Contact form
- **Extended Pages** — `/services` (consulting/pricing), `/more` (experience, education, blog, case studies), `/blog` (blog listing + individual posts)
- **Dynamic Data** — All portfolio content is loaded from **Supabase** (PostgreSQL), with automatic fallback to static data when Supabase is not configured.
- **Admin Dashboard** — Full CRUD admin panel at `/admin` to manage personal info, skills, projects, education, experience, blog posts, case studies, social links, reviews, contact messages, user roles, and dev ads.
- **Authentication & Authorization** — Email/password auth via Supabase Auth. First user to register gets the `admin` role; subsequent registrations are blocked from admin routes.
- **Reviews & Feedback** — Public visitors can submit reviews with star ratings. Reviews appear after admin approval in the admin panel.
- **Dark/Light Theme** — Custom curtain-animation theme toggle
- **Glassmorphism Design** — Glass panels, diffusion shadows, noise overlay, animated gradients
- **Taste-Skill Aesthetics** — Liquid Glass design language with `cubic-bezier(0.16, 1, 0.3, 1)` easing, spring physics, perpetual micro-interactions, and cyan/purple/gold accent palette
- **CRM Dashboard Integration** — Navbar login dropdown with Admin Dashboard and CRM Dashboard options; CRM URL configurable from admin panel
- **BrandLogo Component** — Animated neural SVG logo used across auth pages and sidebar
- **Responsive** — Fully responsive with mobile hamburger navigation

---

## Quick Start

```bash
git clone https://github.com/Techhackontime999/NEURAL-AURORA.git
cd NEURAL-AURORA
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## Supabase Setup

The app uses Supabase for dynamic data storage, authentication, and file storage.

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the database schema

Open the Supabase SQL Editor and paste the contents of `supabase-schema.sql`, or apply migrations via the Supabase CLI:

```bash
# Login and link your project
supabase login
supabase link --project-ref your-project-ref

# Apply all pending migrations
supabase db push
```

Migrations are stored in `supabase/migrations/` and are applied in order. The full schema is also available in `supabase-schema.sql` for manual execution.

### 3. Seed initial data (optional)

```bash
node scripts/seed.cjs
```

Test data can also be generated from the admin dashboard Overview page (supports projects, skills, blog, reviews, education, experience, case studies). Test projects automatically receive unique placeholder images via picsum.photos.

### 4. Configure environment

Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_AI_API_BASE=https://openrouter.ai/api/v1
VITE_AI_API_KEY=your_api_key_here
VITE_AI_MODEL=openai/gpt-4o-mini
```

### 5. Create your admin account

1. Start the dev server and navigate to `/login`
2. Click the **Register** tab
3. Create an account — the first user is automatically assigned the `admin` role
4. Sign in and visit `/admin` to manage your portfolio
5. Forgot your password? Visit `/forgot-password` to reset it

---

## Admin Dashboard

| Route | Description |
|---|---|
| `/admin` | Overview with counts of all portfolio items + Test Data Generator |
| `/admin/personal-info` | Edit name, title, bio, avatar, resume link |
| `/admin/skills` | Add/edit/delete skills with category and level |
| `/admin/projects` | Manage project entries with technologies, links, image |
| `/admin/education` | Manage education history |
| `/admin/experience` | Manage work experience |
| `/admin/blog` | Create/edit blog posts |
| `/admin/case-studies` | Manage case studies |
| `/admin/social-links` | Manage social media links |
| `/admin/reviews` | Approve/reject public reviews |
| `/admin/messages` | View and manage visitor contact submissions |
| `/admin/ads` | Manage Dev Ads (Google AdSense + YouTube with Short/Video format, configurable aspect ratio) |
| `/admin/users` | Manage user roles (promote/demote) |
| `/admin/crm-config` | Configure the hosted wacrm CRM dashboard URL |

## Dev Ads (Gateway Verification)

Dev Ads provide an alternative gateway verification method — visitors watch ads to unlock the portfolio.

### Ad Types

| Type | Source | Format | Description |
|------|--------|--------|-------------|
| **Google AdSense** | Auto-served by Google | Responsive auto-display | Generates ad revenue while unlocking the site |
| **YouTube Video** | Custom URL | Landscape (16:9, 4:3, 21:9, 1:1, 3:2, 16:10) | Specific YouTube video with configurable aspect ratio |
| **YouTube Short** | Custom URL | Vertical 9:16 | Phone-style Shorts player with animated side progress bar |

### Ad Queue System

- Active ads are loaded from Supabase and played sequentially
- Each ad has its own timer based on `duration_seconds`
- Animated slide transitions between ads with "Ad X / Y" counter
- View count is incremented after each ad completes
- After all ads finish, the visitor gains access to the portfolio

### Managing Ads

Admins can manage ads at `/admin/ads`:
- Add/Edit/Delete ad entries
- Choose ad type (Google AdSense or YouTube)
- For YouTube: choose format (Landscape/Short) and aspect ratio
- Toggle active status, set duration, track view counts

## Reviews

- Visitors can submit a review (name, email, rating, message) at the bottom of the homepage
- Reviews are stored in Supabase and require admin approval before public display
- Admins approve/reject reviews in the `/admin/reviews` panel
- Approved reviews appear in the "What People Say" section on the homepage

---

## Project Structure

```
NEURAL-AURORA/
├── public/                  # Static assets (images, resume PDF)
├── scripts/
│   ├── migrate.cjs          # Supabase schema migration runner
│   ├── seed.cjs             # Initial portfolio data seeder
│   ├── complete-migration.sql  # Schema additions
│   ├── fix-contact-rls.sql     # Contact message RLS fix
│   └── fix-contact-rls-v2.sql  # Contact message RLS v2 fix
├── src/
│   ├── components/
│   │   ├── admin/           # Admin dashboard CRUD pages
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── AdminPersonalInfo.jsx
│   │   │   ├── AdminSkills.jsx
│   │   │   ├── AdminProjects.jsx
│   │   │   ├── AdminEducation.jsx
│   │   │   ├── AdminExperience.jsx
│   │   │   ├── AdminBlog.jsx
│   │   │   ├── AdminCaseStudies.jsx
│   │   │   ├── AdminSocialLinks.jsx
│   │   │   ├── AdminReviews.jsx
│   │   │   ├── AdminContactMessages.jsx
│   │   │   ├── AdminAds.jsx # Dev Ads CRUD
│   │   │   ├── AdminUsers.jsx
│   │   │   ├── AdminOverview.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── AdminCrmConfig.jsx # CRM URL configuration
│   │   │   ├── RichTextEditor.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── ui/              # Reusable UI primitives
│   │   │   ├── auto-traverse-effect.jsx # Auto Traverse visual cursor & navigation
│   │   │   ├── BrandLogo.jsx # Animated neural SVG logo
│   │   │   └── AdVideoPlayer.jsx # Ad player (Google AdSense + YouTube Short/Video)
│   │   ├── ReviewForm.jsx   # Public review submission form
│   │   ├── ReviewsList.jsx  # Public approved reviews display
│   │   ├── StartingLoader.jsx # AI gateway with voice, puzzle, and ad verification
│   │   └── ...              # Portfolio section components
│   ├── context/
│   │   ├── AuthContext.jsx  # Supabase Auth provider + role management
│   │   └── AutoTraverseContext.jsx # Auto Traverse toggle state
│   ├── lib/
│   │   ├── supabase.js      # Supabase client + all CRUD functions (incl. dev_ads)
│   │   ├── crm-config.js    # localStorage utility for CRM URL
│   │   ├── usePortfolioData.js # Dynamic data hooks with static fallback
│   │   ├── gemini.js        # AI question generator (OpenRouter/OpenAI-compatible)
│   │   └── utils.js         # Utility helpers
│   ├── App.jsx              # Router setup + AuthProvider + AutoTraverseProvider
│   ├── main.jsx             # Entry point
│   └── index.css            # Tailwind + custom CSS
├── supabase/                # Supabase CLI configuration
│   ├── config.toml
│   └── migrations/          # Database migrations
│       ├── 20260522150218_create_dev_ads.sql
│       ├── 20260522152424_add_ad_type_to_dev_ads.sql
│       └── 20260522153455_add_aspect_ratio_to_dev_ads.sql
├── .env                     # API keys (gitignored)
├── .env.example             # Environment variable template
├── supabase-schema.sql      # Full database schema with RLS policies
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
├── postcss.config.js
└── README.md
```

---

## Configuration

### Adding a Project (Static Fallback)

If Supabase is not configured, edit `src/data/portfolio.js` and add an object to the `projects` array:

```js
{
  id: "my-project",
  title: "My Project",
  description: "What it does.",
  technologies: ["React", "Three.js"],
  image: "/images/project-image.png",
  github: "https://github.com/...",
  link: "https://..."
}
```

### Customizing Colors

Edit the CSS custom properties in `src/index.css` (the `:root` and `.dark` blocks) to adjust the light/dark theme palette. The Tailwind config in `tailwind.config.js` extends the `neural` color family.

### AI Gateway Setup (Dynamic Puzzles)

The puzzle generator uses any OpenAI-compatible API (OpenRouter, OpenAI, Groq, Together, etc). To enable it:

1. Get an API key from your preferred provider (e.g. [OpenRouter](https://openrouter.ai))
2. Create a `.env` file in the project root:
   ```
   VITE_AI_API_BASE=https://openrouter.ai/api/v1
   VITE_AI_API_KEY=your_api_key_here
   VITE_AI_MODEL=openai/gpt-4o-mini
   ```
3. Restart the dev server

If no key is provided, the app falls back to a built-in pool of 12 static questions.

### Adding Skills (Static Fallback)

Add entries to the `skills` array in `src/data/portfolio.js`. Skills are grouped by category (Frontend, Backend, Languages, DevOps, Design).

---

## Deployment

### Option 1: Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FTechhackontime999%2FNEURAL-AURORA)

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Vercel auto-detects Vite — no build config needed
4. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_AI_API_BASE` (optional)
   - `VITE_AI_API_KEY` (optional)
   - `VITE_AI_MODEL` (optional)
5. Deploy — your site is live with automatic CI/CD on every push

### Option 2: Netlify

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com) and import your repository
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables as above
6. Deploy

### Option 3: Cloudflare Pages

1. Push to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com) and connect your repo
3. Build command: `npm run build`
4. Build output: `dist`
5. Add environment variables as above
6. Deploy

### Environment Variables

All three platforms require these in your deployment dashboard:

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Your Supabase anon/public key |
| `VITE_AI_API_BASE` | No | OpenAI-compatible API base URL (default: `https://api.openai.com/v1`) |
| `VITE_AI_API_KEY` | No | API key for AI puzzle generation |
| `VITE_AI_MODEL` | No | Model name (default: `gpt-4o-mini`) |

**Never commit your `.env` file.** The `.env.example` file serves as a template.

---

## Tech Stack

- **Framework:** React 18 with Vite 6
- **Backend & Auth:** Supabase (PostgreSQL, Auth, Storage)
- **CLI:** Supabase CLI (`supabase db push` for migrations)
- **AI:** OpenAI-compatible API (OpenRouter, OpenAI, Groq, etc.) — dynamic puzzle generation
- **Speech:** Web SpeechRecognition API — voice verification
- **Ads:** Google AdSense (auto-served) + YouTube IFrame Player API
- **3D Graphics:** React Three Fiber, Drei, Three.js
- **3D Embed:** Spline (`@splinetool/react-spline`)
- **Animation:** Framer Motion 11
- **Styling:** Tailwind CSS 3, PostCSS, Autoprefixer
- **Routing:** React Router DOM 7
- **Icons:** Lucide React
- **Utilities:** clsx

---

## Performance Notes

- The 3D background (AuroraBackground) uses **GPU-accelerated** Three.js rendering
- Spline scene is **lazy-loaded** with React Suspense and **preloaded** during the AI gateway for instant hero reveal
- All animations use Framer Motion's spring physics for optimal frame rate
- Auto Traverse cursor uses `useMotionValue` + `useSpring` (zero re-renders during 60fps animation)
- Google AdSense script is loaded only when the ad-watching phase is entered (not on page load)
- Tailwind CSS is purged in production builds
- AI API calls use `temperature: 1.0` with random topic rotation for diverse questions
- Admin routes are lazy-loadable and separate from the public site

---

## License

MIT License — see [LICENSE](LICENSE).

---

## Changelog

### v2.0.0 (Neural Reverie Release)

**Added**
- Dev Ads gateway — Google AdSense + YouTube (landscape/Short) with ad queue, timers, view counting
- Auto Traverse — full-site autonomous tour with spring cursor
- Live Visitor Count — real-time Supabase-backed visitor counter in footer
- Taste-Skill design language — Liquid Glass aesthetics with custom easing
- SEO metadata — Google Search Console verification, sitemap.xml, robots.txt, OG/Twitter cards
- Admin Ads CRUD panel (`/admin/ads`) — manage ads with type, format, aspect ratio, duration
- Admin User Roles panel (`/admin/users`) — role management (admin/user)
- Vercel deployment configuration with SPA rewrites
- Supabase migrations: `dev_ads`, `visitor_stats`, contact RLS fixes
- `_redirects` file for Netlify SPA fallback
- CRM Dashboard link in navbar login dropdown — configurable CRM URL from admin panel
- BrandLogo component on Login and Register pages
- CRM URL Configuration page (`/admin/crm-config`) — saves to localStorage + Supabase
- Premium taste-skill styled login dropdown with lucide-react icons and Liquid Glass design

**Changed**
- Migrated hosting from Netlify to Vercel with auto CI/CD
- Updated all OG/Twitter URLs to Vercel domain
- Enhanced admin overview with Test Data Generator
- Improved theme toggle with curtain animation
- Navbar lock icon replaced with dropdown (Admin Dashboard + optional CRM Dashboard)
- Mobile menu updated with Admin + CRM dashboard icons

### v1.0.0

**Initial release** — AI-powered gateway, 3D aurora background, Spline hero, full portfolio with Supabase CRUD admin, authentication, reviews, dark/light theme, glassmorphism design.

---

## Support & Feedback

Open an [issue](https://github.com/Techhackontime999/NEURAL-AURORA/issues) or reach out!
