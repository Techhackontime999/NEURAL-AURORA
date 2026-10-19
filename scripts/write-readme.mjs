import fs from 'fs';
const readme = `# NEURAL AURORA — The Synaptic Portfolio

<div align="center">

**v3.0.0** — *A living neural network suspended in an aurora field*

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r170-000000?logo=three.js&logoColor=white)](https://threejs.org)
[![Supabase](https://img.shields.io/badge/Supabase-2-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

**Source-Available Software** • Not OSI-Approved "Open Source"

</div>

---

## ⚖️ License & Usage Rights

NEURAL AURORA is **source-available** software. The source code is publicly visible, but general commercial usage is **not** free.

- ✅ **Free for Contributors** – If you have **at least one Pull Request merged** into the official repo [Techhackontime999/NEURAL-AURORA](https://github.com/Techhackontime999/NEURAL-AURORA), you may use, run, modify, self-host this software for **personal, educational or commercial** use **without** purchasing a commercial license.
- ✅ **Free for Verified Students** – Students who have meaningfully contributed to this project may qualify for the same benefit. Email proof to **techhackontime999@gmail.com**.
- ✅ **Free for Evaluation** – You may clone, read, modify and run locally **strictly for evaluation/testing** purposes.
- ❌ **Commercial Use by Others** – If you do **not** meet the above criteria, you **must** obtain a valid [Commercial License](COMMERCIAL-LICENSE.md) before using NEURAL AURORA in production, client work, agency projects, SaaS, white-label, or any revenue-generating context.
- ✅ **Forking for Contribution** – You are encouraged to fork this repo and submit PRs to improve it.

> Read [docs/LICENSING-FAQ.md](docs/LICENSING-FAQ.md) for a simple breakdown.

**Legal Files:** [LICENSE](LICENSE) • [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md) • [TERMS_OF_USE.md](TERMS_OF_USE.md) • [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

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

---

## 🚀 Quick Start

\`\`\`bash
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
\`\`\`

Open [http://localhost:5173](http://localhost:5173)

## ⚙️ Environment Variables

See \`.env.example\` for full list. Key ones include \`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_ANON_KEY\`, \`SUPABASE_SERVICE_ROLE_KEY\`, \`RAZORPAY_*\`, \`RAZORPAY_WEBHOOK_SECRET\`.

## 🧪 Scripts

\`\`\`bash
npm run dev      # Dev server
npm run build    # Production build
npm run preview  # Preview build
npm run check    # Routes + i18n + SQL lint
npm test         # Pricing + API guard tests
\`\`\`

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). **Having >=1 merged PR makes you eligible for the free contributor license.**

## 💼 Commercial Licensing

Need to use this commercially without contributing? Read [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md) or email **techhackontime999@gmail.com** with subject \`NEURAL AURORA COMMERCIAL LICENSE\`.

## 📚 Documentation

- [Digital Store Setup](docs/DIGITAL-STORE.md)
- [Licensing FAQ](docs/LICENSING-FAQ.md)
- [Production Release Checklist](docs/PRODUCTION-RELEASE-CHECKLIST.md)

## 🔐 Legal

- [LICENSE](LICENSE)
- [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md)
- [TERMS_OF_USE.md](TERMS_OF_USE.md)
- [PRIVACY_POLICY.md](PRIVACY_POLICY.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md)
- [TRADEMARK.md](TRADEMARK.md)

## 👤 Credits

**Founder & Lead Developer:** Amit Kumar ([@Techhackontime999](https://github.com/Techhackontime999))

> *Built with synapses, not just syntax.*
`;
fs.writeFileSync('README.md', readme);
console.log('ok');