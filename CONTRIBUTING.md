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
4. Ensure `npm test` passes (pricing, API, store, UI and route guards)
5. Open a PR with a clear title, description, and screenshots if UI-related
6. Link any related issue(s)
7. Be responsive to review feedback

---

## Contributor Access Policy (Draft - Legal Review Required)

Contributions are welcome, but **no pull request, commit, GitHub account, star,
fork, registration, or issue activity automatically grants any license or product
access**.

### Approved Contributor Personal-Use Program

The project may, at its sole discretion, grant an
`APPROVED_CONTRIBUTOR_PERSONAL` license to explicitly approved contributors.

This requires:

1. An application submitted through the official channel.
2. Maintainer/admin evaluation.
3. Explicit admin approval recorded in the system.
4. Explicit admin issuance recorded in the system.

If issued, the grant is:

- **Personal use only** for the named approved individual.
- **Not** organisation/company-wide.
- **Not** for commercial or client deployment.
- **Not** redistributable, resellable, sublicensable, or transferable.
- **Not** a paid/enterprise entitlement.
- **Not** a transfer of IP ownership.

All grants are auditable and may be suspended/revoked for misuse or policy
violation.

### Legacy Rights Preservation

Previously granted rights under `LICENSE.LEGACY-2026-SOURCE-AVAILABLE.md` are not
revoked by this policy update. Where legacy rights apply, they remain preserved
to the extent validly granted. Final legal interpretation requires qualified
Indian software licensing lawyer review.

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