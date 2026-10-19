# Contributing to NEURAL AURORA

First off, thank you for considering contributing to **NEURAL AURORA** — *The Synaptic Portfolio*. This project thrives because of people like you.

---

## Ways to Contribute

- **Code** – Bug fixes, new features, performance improvements, refactoring
- **Documentation** – Improve README, fix typos, add guides or examples
- **Bug Reports** – Open an issue with clear steps to reproduce
- **Feature Requests** – Share ideas with reasoning and use cases
- **Testing** – Test flows (digital store, auth, admin) and report issues

---

## Getting Started

1. **Fork** the repository: [github.com/Techhackontime999/NEURAL-AURORA](https://github.com/Techhackontime999/NEURAL-AURORA)
2. **Clone** your fork
   ```bash
   git clone https://github.com/your-username/NEURAL-AURORA.git
   cd NEURAL-AURORA
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Set up environment** – Copy `.env.example` to `.env` and fill values as needed
5. **Run locally**
   ```bash
   npm run dev
   ```
6. **Create a branch** – Use descriptive, kebab-case names

---

## Branch Naming

| Prefix | Example |
|--------|---------|
| `feature/` | `feature/digital-store-improvements` |
| `fix/` | `fix/library-signin-issue` |
| `docs/` | `docs/update-setup-guide` |
| `refactor/` | `refactor/admin-orders-table` |
| `chore/` | `chore/update-deps` |

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(digital-store): add phone validation
fix(library): handle missing password gracefully
docs(readme): update license section
```

---

## Pull Request Process

1. Keep your branch up to date with `main`
2. Ensure `npm run build` passes without errors
3. Ensure `npm run check` passes (routes + i18n + SQL lint)
4. Ensure `npm test` passes (pricing + API guards)
5. Open a PR with a clear title, description, and screenshots if UI-related
6. Link any related issue(s)
7. Be responsive to review feedback

---

## Contributor Benefit

**Having at least one Pull Request merged** into the official repository makes you a **verified Contributor**.

As a verified Contributor, you receive a **perpetual, royalty-free license** to use NEURAL AURORA for **personal, educational, or commercial** purposes under the terms of the [LICENSE](LICENSE) — **no commercial license purchase required**.

**Verified Students** who meaningfully contribute may also qualify for the same benefit. Reach out to `amitkumarkh01012006@gmail.com` with proof if needed.

---

## Code Guidelines

- **React** – Functional components + hooks only
- **Styling** – Tailwind CSS utility classes; minimal custom CSS in `index.css`
- **Structure** – Keep components small, reusable, and colocated logically
- **Naming** – Clear, descriptive names
- **TypeScript mindset** – Write readable, predictable JS
- **Security** – Never commit secrets, keys, or credentials
- **i18n** – Add keys to `src/locales/en.json` if adding user-facing text
- **API safety** – Respect existing validation, auth, and RLS patterns

---

## Code of Conduct

By participating, you agree to abide by our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## Questions?

Feel free to open an issue or reach out via the repository discussions.

**Thank you for helping make NEURAL AURORA better!**