# Mithi — the portfolio companion 🦜

Mithi is a floating green-parrot companion on the public portfolio pages. She
has two jobs:

1. **Talk to Mithi AI** — an assistant that answers questions about Amit, the
   NEURAL AURORA project, projects, the stack, services and the docs.
2. **Choose for it 📚** — opens the documentation site.

She is deliberately **grounded**: her answers come from the portfolio's own
admin-managed content, and she says "I don't know" instead of inventing facts.

---

## Where Mithi appears

`MithiWidget` renders on every public route. She is hidden on:

- `/admin/*`
- `/login`, `/register`, `/forgot-password`

She is a fixed, bottom-right floating launcher. The panel opens upward, is
clamped to `78dvh`, and respects `env(safe-area-inset-bottom)` so it never sits
under mobile browser chrome. `prefers-reduced-motion` disables every animation —
the bird simply stays still.

---

## The AI (`/api/mithi-chat`)

### Why it is server-side

The older AI features in this repo call a provider **from the browser** using
`VITE_AI_API_KEY`. That key is bundled into the client, so it is not a secret.
Mithi does **not** do this. Her endpoint runs on the server and reads the key
from `process.env` only. The browser never receives a key, and no `VITE_*`
variable is consulted.

### Configure a provider

Set **one** of the following in your deployment environment and redeploy.

**Option A — Google Gemini** (simplest)

```bash
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-2.0-flash        # optional
```

**Option B — any OpenAI-compatible provider** (OpenRouter, OpenAI, …)

```bash
AI_API_KEY=your_key
AI_API_BASE=https://openrouter.ai/api/v1   # optional
AI_MODEL=openai/gpt-4o-mini                # optional
```

If neither is set, the widget shows an honest "AI is not configured for this
deployment" card, and **the docs option still works**.

### Endpoints

| Method | Result |
| --- | --- |
| `GET /api/mithi-chat` | `{ configured: boolean, provider: "gemini" \| "openai" \| null }` |
| `POST /api/mithi-chat` | `{ reply: string }` or `{ error, code }` |

`POST` body: `{ "messages": [{ "role": "user" \| "assistant", "content": "…" }] }`

Limits: 12 messages, 1200 characters each, 8000 characters total, last message
must be from the user. Violations return `400` before any provider call. When no
provider is configured the response is `503` with `code: "unconfigured"`.

### Grounding

`api/_lib/mithi-knowledge.js` reads **public** portfolio content only
(personal info, site/docs settings, skills, projects, experience, services,
published products, case studies, blog posts, social links) with the public-read
Supabase key, then hands it to the model as the source of truth. Contact
messages, orders, users and entitlements are never read.

The prompt forbids inventing features, prices, guarantees, links or docs
details, and forbids revealing configuration.

---

## Documentation destination

The widget **reuses the existing admin setting** `admin_settings.docs_url` —
the same value the navbar and the verification loader already use. No new
configuration is introduced.

- `src/lib/mithi/configService.js` selects **only** the `docs_url` column (never
  the whole settings row). The table is intentionally public-read.
- The result is cached in-memory for 60 seconds and in `localStorage`, so a
  change made in the admin panel takes effect on the next page load **without a
  redeploy**.
- `src/lib/docs-config.js` validates the URL: HTTPS only, no credentials, no
  private/localhost hosts.
- If the admin has genuinely never configured a URL, the fallback is
  `https://docs-neural-aurora.vercel.app`.
- If the configured URL is invalid, Mithi does **not** guess — she shows a
  retry affordance.

Docs open in a **new tab** (`target="_blank"`, `rel="noopener noreferrer"`), so
the portfolio stays put. Nothing is iframed.

---

## Component map

| File | Responsibility |
| --- | --- |
| `src/components/mithi/MithiWidget.jsx` | Launcher, panel lifecycle, portal, focus/Escape handling |
| `src/components/mithi/MithiCharacter.jsx` | Original vector parrot + subtle animations |
| `src/components/mithi/MithiMenu.jsx` | The two primary options |
| `src/components/mithi/MithiAssistant.jsx` | Chat UI (lazy-loaded) |
| `src/components/mithi/mithiMessages.js` | Personality and contextual copy |
| `src/lib/mithi/configService.js` | Docs URL retrieval + validation |
| `src/lib/mithi/api.js` | Client transport for `/api/mithi-chat` |
| `src/lib/mithi/analytics.js` | Consent-friendly `mithi:event` DOM events |
| `api/mithi-chat.js` | Server handler |
| `api/_lib/mithi-ai.js` | Provider abstraction (Gemini / OpenAI-compatible) |
| `api/_lib/mithi-knowledge.js` | Grounding content loader |

---

## Analytics

The site has no third-party analytics provider configured, so nothing was
added. Instead, Mithi dispatches DOM events an existing or future
consent-aware analytics layer can listen for:

```
mithi_opened, mithi_closed, mithi_ai_selected, mithi_ai_message_sent,
mithi_docs_selected, mithi_docs_opened
```

Events carry **no message content, prompts, URLs or identifiers**.

---

## Accessibility

- Launcher is a real `<button>` with an `aria-label`; the panel is a
  `role="dialog"` with a label.
- Escape closes the panel; clicking outside closes it; the first action in the
  panel receives focus when it opens.
- Touch targets are at least 44 px; the composer is a labelled textarea with
  `Enter` to send and `Shift+Enter` for a new line.
- Reduced-motion users get a static character and no panel transitions.
- AI errors are shown inline and never break the docs option.
