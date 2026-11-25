# NEURAL AURORA — The Synaptic Portfolio

<div align="center">

**v3.1.0** — *Released 2026-11-26 (draft licensing transition, commerce, partner, and contributor-grant updates)*

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r170-000000?logo=three.js&logoColor=white)](https://threejs.org)
[![Supabase](https://img.shields.io/badge/Supabase-2-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

**Proprietary Transition (Draft)** • Legacy rights preserved • Legal review required

</div>

---

## ⚖️ License & Usage Rights (Draft Transition)

**Status:** licensing/policy transition in progress. **DRAFT — requires qualified
Indian software licensing lawyer review before final adoption.**

- **Legacy rights preserved:** Rights already granted under the prior
  [NEURAL AURORA Source-Available License](LICENSE.LEGACY-2026-SOURCE-AVAILABLE.md)
  are **not revoked** by this repository update. Where legacy rights were validly
  granted, they remain preserved to the extent applicable.
- **Proprietary by default for new use:** Except for preserved legacy rights or a
  separate written agreement from the copyright holder, Neural Aurora is
  proprietary. Public repository visibility does **not** make the code free to use
  commercially or privately.
- **No auto-grant:** PRs, commits, GitHub accounts, stars, forks, registration,
  or issue activity do **not** automatically grant licenses or product access.
- **Approved Contributor Personal Use:** The project may issue a free
  `APPROVED_CONTRIBUTOR_PERSONAL` license only after application, evaluation,
  explicit admin approval, and recorded issuance. It is personal-use only; no
  commercial/client/organisation-wide deployment, no resale/redistribution/
  sublicensing/transfer, and no paid/enterprise entitlements.
- **Commercial use:** Requires a valid commercial license/purchase through
  official channels. See [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).

**Legal Files:** [LICENSE](LICENSE) • [Legacy License (preserved)](LICENSE.LEGACY-2026-SOURCE-AVAILABLE.md) • [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md) • [Legal/Policy Drafts](docs/LEGAL-POLICY-DRAFTS.md) • [Third-Party Notices](THIRD_PARTY_NOTICES.md) • [TERMS_OF_USE.md](TERMS_OF_USE.md) • [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

---

## 🧭 Product direction

Neural Aurora is evolving from a single-owner portfolio into a **Personal Digital Platform** — one identity, one professional presence, one first-party store and one growth system, configured per person. The architecture, personas, journeys and phased roadmap are documented in [docs/PRODUCT-VISION-ARCHITECTURE.md](docs/PRODUCT-VISION-ARCHITECTURE.md). This is a plan only; existing features and routes are preserved.

---

## ✨ Key Features

- **AI-Powered Gateway** – Voice, MCQ, Neural Pattern Lock & YouTube Channel Stream verification
- **Neural Aurora CMD** – AI-powered terminal with full portfolio context
- **Mood Swing** – Mood-based ambient music system
- **Digital Store** – Razorpay checkout + secure downloads + password/link sign-in + phone capture
- **Admin Dashboard** – Manage products, orders, entitlements, users & settings
- **Internationalization** – 24 languages with RTL support
- **PWA Ready** – Installable, offline-aware service worker
- **Certificates, Achievements & Gallery** – Dedicated sections with admin panels
- **Auto-Traverse Tour** – Interactive site walkthrough
- **3D Aurora Background** – React Three Fiber powered immersive UI
- **Reviews, Blog, Case Studies & Services**
- **Mithi 🦜** – Floating parrot companion with a grounded AI assistant and an admin-configured docs launcher

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/Techhackontime999/NEURAL-AURORA.git
cd NEURAL-AURORA

# Install
npm install

# Setup env
cp .env.example .env
# Fill required values in .env

# Dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## ⚙️ Environment Variables

See `.env.example` for the authoritative list. Key ones include `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_*`, `RAZORPAY_WEBHOOK_SECRET`.

All AI features run server-side. Set one server-only provider key:
`OPENROUTER_API_KEY` (recommended), `AI_API_KEY`/`OPENAI_API_KEY`, or
`GEMINI_API_KEY` — never a `VITE_` prefix. Without one, AI features show an
honest unconfigured state and the docs button keeps working.

## 🧪 Scripts

```bash
npm run dev      # Dev server
npm run build    # Production build
npm run preview  # Preview build
npm run check    # Routes + i18n + SQL lint
npm test         # Pricing, API, store, UI and route guards
```

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Contributions are welcome, but **no PR,
commit, GitHub account, star, fork, or registration auto-grants a license**.
Approved contributors may apply for a free `APPROVED_CONTRIBUTOR_PERSONAL`
license after evaluation, explicit admin approval, and recorded issuance
(personal use only).

## 💼 Commercial Licensing

Need commercial, client, organisation-wide, or enterprise use? Purchase a valid
commercial license through official channels. Read
[COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md) or email
**amitkumarkh01012006@gmail.com** with subject `NEURAL AURORA COMMERCIAL LICENSE`.

## 📚 Documentation

- [Digital Store Setup](docs/DIGITAL-STORE.md)
- [Mithi Companion](docs/mithi.md)
- [Licensing FAQ](docs/LICENSING-FAQ.md)
- [Legal/Policy Drafts](docs/LEGAL-POLICY-DRAFTS.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)
- [Production Release Checklist](docs/PRODUCTION-RELEASE-CHECKLIST.md)

## 🔐 Legal

- [LICENSE (Draft - Legal Review Required)](LICENSE)
- [Legacy License (Preserved Rights)](LICENSE.LEGACY-2026-SOURCE-AVAILABLE.md)
- [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md)
- [Legal/Policy Drafts](docs/LEGAL-POLICY-DRAFTS.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)
- [TERMS_OF_USE.md](TERMS_OF_USE.md)
- [PRIVACY_POLICY.md](PRIVACY_POLICY.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md)
- [TRADEMARK.md](TRADEMARK.md)

## 👤 Credits

**Founder & Lead Developer:** Amit Kumar ([@Techhackontime999](https://github.com/Techhackontime999))

> *Built with synapses, not just syntax.*
