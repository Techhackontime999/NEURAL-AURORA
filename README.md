# NEURAL AURORA — The Synaptic Portfolio

**A living neural network suspended in an aurora field.** Your work isn't "displayed"—it's *fired* across synaptic pathways. Every project glows, pulses, and connects in real-time.

Built with **React 18**, **Three.js** (via React Three Fiber), **Framer Motion 11**, **Tailwind CSS 3**, and **Vite 6**.

---

## Features

- **AI-Powered Gateway** — Visitors must pass a voice or logic challenge to unlock the portfolio. Features terminal boot sequence, Web SpeechRecognition voice verification (say "Amit"), Gemini API-generated logic puzzles, and celebratory access-granted animation.
- **3D Aurora Background** — Neural particles, aurora waves, floating nodes with synaptic connections, and cursor-following "synaptic fire" particle system (React Three Fiber + Drei)
- **Spline 3D Hero** — Embedded Spline interactive 3D scene in the hero section (preloaded during gateway for instant reveal)
- **Full Portfolio** — Hero, About, Skills (animated bars by category), Projects (expandable cards), Resume download, Contact form
- **Extended Pages** — `/services` (consulting/pricing), `/more` (experience, education, blog, case studies), `/blog` (blog listing + individual posts)
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

## Project Structure

```
NEURAL-AURORA/
├── public/                 # Static assets (images, resume PDF)
├── src/
│   ├── components/         # React components
│   │   ├── StartingLoader.jsx # AI gateway — voice/MCQ challenge before portfolio
│   │   └── ui/             # Reusable UI primitives (Card, Spotlight, etc.)
│   ├── data/
│   │   └── portfolio.js    # All portfolio data (projects, skills, blog, etc.)
│   ├── lib/
│   │   ├── gemini.js       # Gemini API client — dynamic question generation
│   │   └── utils.js        # Utility helpers (cn)
│   ├── App.jsx             # Router setup + Spline preload
│   ├── main.jsx            # Entry point
│   └── index.css           # Tailwind + custom CSS (glassmorphism, themes)
├── .env                    # API keys (gitignored)
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
├── postcss.config.js
└── README.md
```

---

## Configuration

### Adding a Project

Edit `src/data/portfolio.js` and add an object to the `projects` array:

```js
{
  id: "my-project",
  title: "My Project",
  description: "What it does.",
  longDescription: "Detailed description...",
  image: "/images/project-image.png",
  technologies: ["React", "Three.js"],
  liveLink: "https://...",
  githubLink: "https://github.com/...",
  category: "fullstack"
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

### Adding Skills

Add entries to the `skills` array in `src/data/portfolio.js`. Skills are grouped by category (Frontend, Backend, Languages, DevOps, Design).

---

## Tech Stack

- **Framework:** React 18 with Vite 6
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

---

## License

MIT License — see [LICENSE](LICENSE).

---

## Support & Feedback

Open an [issue](https://github.com/Techhackontime999/NEURAL-AURORA/issues) or reach out!
