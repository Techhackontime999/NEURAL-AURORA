# NEURAL AURORA — The Synaptic Portfolio

**A living neural network suspended in an aurora field.** Your work isn't "displayed"—it's *fired* across synaptic pathways. Every project glows, pulses, and connects in real-time.

Built with **React 18**, **Three.js** (via React Three Fiber), **Framer Motion 11**, **Tailwind CSS 3**, **Vite 6**, and **Supabase**.

---

## Features

- **AI-Powered Gateway** — Visitors must pass a voice or logic challenge to unlock the portfolio. Features terminal boot sequence, Web SpeechRecognition voice verification (say "Amit"), Gemini API-generated logic puzzles, and celebratory access-granted animation.
- **3D Aurora Background** — Neural particles, aurora waves, floating nodes with synaptic connections, and cursor-following "synaptic fire" particle system (React Three Fiber + Drei)
- **Spline 3D Hero** — Embedded Spline interactive 3D scene in the hero section (preloaded during gateway for instant reveal)
- **Full Portfolio** — Hero, About, Skills (animated bars by category), Projects (expandable cards), Resume download, Contact form
- **Extended Pages** — `/services` (consulting/pricing), `/more` (experience, education, blog, case studies), `/blog` (blog listing + individual posts)
- **Dynamic Data** — All portfolio content is loaded from **Supabase** (PostgreSQL), with automatic fallback to static data when Supabase is not configured.
- **Admin Dashboard** — Full CRUD admin panel at `/admin` to manage personal info, skills, projects, education, experience, blog posts, case studies, social links, reviews, contact messages, and user roles.
- **Authentication & Authorization** — Email/password auth via Supabase Auth. First user to register gets the `admin` role; subsequent registrations are blocked from admin routes.
- **Reviews & Feedback** — Public visitors can submit reviews with star ratings. Reviews appear after admin approval in the admin panel.
- **Dark/Light Theme** — Custom curtain-animation theme toggle
- **Glassmorphism Design** — Glass panels, diffusion shadows, noise overlay, animated gradients
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

Open the Supabase SQL Editor and paste the contents of `supabase-schema.sql`, or run the migration script:

```bash
node scripts/migrate.cjs
```

For existing projects, apply any pending migrations in order:
- `scripts/complete-migration.sql` — adds contact_messages, admin_settings, test generation functions
- `scripts/fix-contact-rls.sql` / `scripts/fix-contact-rls-v2.sql` — contact message RLS policy fixes

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
VITE_GEMINI_API_KEY=your_gemini_api_key
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
| `/admin/contact-messages` | View and manage visitor contact submissions |
| `/admin/users` | Manage user roles (promote/demote) |

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
│   ├── complete-migration.sql  # Schema additions (contact_messages, admin_settings, test data)
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
│   │   │   ├── AdminUsers.jsx
│   │   │   ├── AdminOverview.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── RichTextEditor.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── ui/              # Reusable UI primitives
│   │   ├── ReviewForm.jsx   # Public review submission form
│   │   ├── ReviewsList.jsx  # Public approved reviews display
│   │   ├── StartingLoader.jsx # AI gateway
│   │   └── ...              # Portfolio section components
│   ├── context/
│   │   └── AuthContext.jsx  # Supabase Auth provider + role management
│   ├── lib/
│   │   ├── supabase.js      # Supabase client + all CRUD functions
│   │   ├── usePortfolioData.js # Dynamic data hooks with static fallback
│   │   ├── gemini.js        # Gemini API client
│   │   └── utils.js         # Utility helpers (cn)
│   ├── App.jsx              # Router setup + AuthProvider wrapper
│   ├── main.jsx             # Entry point
│   └── index.css            # Tailwind + custom CSS
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

### Gemini API Setup (Dynamic Puzzles)

The puzzle generator uses Google Gemini API. To enable it:

1. Get an API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Create a `.env` file in the project root:
   ```
   VITE_GEMINI_API_KEY=your_key_here
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
   - `VITE_GEMINI_API_KEY` (optional)
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
| `VITE_GEMINI_API_KEY` | No | Gemini API key for dynamic puzzles |

**Never commit your `.env` file.** The `.env.example` file serves as a template.

---

## Tech Stack

- **Framework:** React 18 with Vite 6
- **Backend & Auth:** Supabase (PostgreSQL, Auth, Storage)
- **AI:** Google Gemini API (`gemini-2.0-flash`) — dynamic puzzle generation
- **Speech:** Web SpeechRecognition API — voice verification
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
- Tailwind CSS is purged in production builds
- Gemini API calls use `temperature: 1.0` with random topic rotation for diverse questions
- Admin routes are lazy-loadable and separate from the public site

---

## License

MIT License — see [LICENSE](LICENSE).

---

## Support & Feedback

Open an [issue](https://github.com/Techhackontime999/NEURAL-AURORA/issues) or reach out!
