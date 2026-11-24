# Third-Party Notices (Draft)

This file is a **draft inventory** for third-party software and services used by
Neural Aurora. It is **not legal advice** and requires review by project
maintainers and qualified counsel before being treated as complete or final.

## Scope

- Lists direct dependencies declared in `package.json` at the time of drafting.
- Does **not** fully enumerate transitive dependencies, bundled assets, fonts,
  icons, CDN content, external APIs, or service terms.
- License metadata should be verified against the installed package/license files
  and upstream repositories before release or commercial distribution.

## Direct Runtime Dependencies (`package.json`)

| Package | Declared Version | Notes / Verify License |
|---|---:|---|
| @google/generative-ai | ^0.24.1 | Verify upstream license/terms before redistribution |
| @react-three/drei | ^9.114.0 | Verify upstream license |
| @react-three/fiber | ^8.17.0 | Verify upstream license |
| @splinetool/react-spline | ^4.1.0 | Verify upstream license and Spline asset/runtime terms |
| @splinetool/runtime | ^1.12.94 | Verify upstream license and runtime distribution terms |
| @supabase/supabase-js | ^2.106.1 | Verify upstream license; Supabase service terms are separate |
| clsx | ^2.1.1 | Verify upstream license |
| dompurify | ^3.4.14 | Verify upstream license |
| framer-motion | ^11.15.0 | Verify upstream license |
| i18next | ^26.4.2 | Verify upstream license |
| lucide-react | ^1.16.0 | Verify upstream icon/license terms |
| pdfkit | 0.20.2 | Verify upstream license and bundled font terms |
| pg | ^8.21.0 | Verify upstream license |
| razorpay | ^2.9.6 | Verify upstream license; Razorpay service terms are separate |
| react | ^18.3.1 | Verify upstream license |
| react-dom | ^18.3.1 | Verify upstream license |
| react-i18next | ^17.0.13 | Verify upstream license |
| react-router-dom | ^7.15.1 | Verify upstream license |
| three | ^0.170.0 | Verify upstream license |

## Direct Development Dependencies

| Package | Declared Version | Notes / Verify License |
|---|---:|---|
| @tailwindcss/postcss | ^4.3.3 | Verify upstream license |
| @types/react | ^18.3.12 | Verify upstream license |
| @types/react-dom | ^18.3.1 | Verify upstream license |
| @vercel/nft | ^1.11.12 | Verify upstream license |
| @vitejs/plugin-react | ^4.3.4 | Verify upstream license |
| autoprefixer | ^10.4.20 | Verify upstream license |
| postcss | ^8.4.49 | Verify upstream license |
| sharp | ^0.35.5 | Verify upstream license and libvips/native binary notices |
| tailwindcss | ^4.3.3 | Verify upstream license |
| vite | ^6.0.0 | Verify upstream license |
| vite-plugin-pwa | ^1.3.0 | Verify upstream license |

## External Services / Platforms (Terms Separate From Package Licenses)

- **Supabase** - auth/database/storage/service terms apply.
- **Razorpay** - payment processing, KYC, compliance, and service terms apply.
- **Vercel** - hosting/serverless deployment terms apply.
- **Google AI / Gemini APIs** - API/service terms apply if enabled.
- **GitHub** - repository hosting and platform terms apply.

## Required Follow-Up Before Final Release

1. Generate a full transitive dependency notice report (including licenses).
2. Review copied/modified third-party code snippets, fonts, icons, images, and shaders.
3. Confirm no GPL/AGPL/copyleft obligations conflict with intended proprietary distribution.
4. Obtain qualified legal review for distribution, SaaS, and commercial licensing terms.
5. Keep this file updated with release process changes.