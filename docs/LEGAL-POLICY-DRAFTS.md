# Legal & Policy Drafts (Requires Review)

> **DRAFT — NOT LEGAL ADVICE.** All documents in this file are technical/policy
> drafts for implementation planning. They require review and approval by the
> copyright holder and a qualified Indian software licensing lawyer before use.

## 1. Legacy Rights Preservation

The repository previously contained `LICENSE` with the "NEURAL AURORA
SOURCE-AVAILABLE LICENSE" (2026). That text is preserved in
`LICENSE.LEGACY-2026-SOURCE-AVAILABLE.md`.

**Policy:** Do not revoke, withdraw, or retroactively modify rights already
granted under the legacy license. Any new proprietary licensing model must be
applied prospectively and only where legally possible. Before enforcing new
restrictions against any user/contributor, obtain legal review of:

- Whether legacy grants were perpetual/irrevocable for already-distributed copies.
- Whether contributors accepted any CLA/DCO or relied on the legacy terms.
- Whether specific commercial/contributor uses were already authorized.
- How version/release boundaries affect legacy rights.

## 2. Approved Contributor Personal-Use Policy (Draft)

### Eligibility

- Applicant submits an application through the official channel.
- Maintainers/admins evaluate contribution quality, relevance, and trust.
- An authorized admin explicitly approves or rejects; decision is recorded.
- An authorized admin explicitly issues a grant; issuance is recorded.

### No Auto-Grant Rule

No right or license is granted by: PR creation/merge alone, GitHub account,
stars/forks/watchers, commits, issues, discussions, registration, or public
repo visibility. Only an explicit recorded admin approval + issuance creates an
`APPROVED_CONTRIBUTOR_PERSONAL` grant.

### Grant Scope

- Personal use only by the named approved individual.
- No organisation/company-wide use.
- No commercial use or client deployment.
- No resale, redistribution, sublicensing, assignment, or transfer.
- No paid/enterprise entitlements unless separately purchased.
- No IP ownership transfer.
- Term/expiry/product scope as recorded in the grant.

### Enforcement

- Server-side entitlement checks are authoritative.
- Grants may be suspended/revoked for misuse, policy violation, fraud, security
  risk, or legal/compliance reasons.
- All admin actions must be auditable (actor, time, reason, old/new state).

## 3. Commercial Licensing Policy (Draft)

- Commercial/organisational/client/SaaS/agency use requires a valid commercial
  license purchased through official channels.
- Pricing, scope, seats, deployment, support, and term are defined by the order
  or written agreement.
- Payment success reported by client/browser is never trusted for entitlement
  issuance. Verified server-side payment confirmation is required.

## 4. Contributor Submission Policy (Draft)

Before accepting external code contributions under the proprietary model, legal
review should decide whether to require:

- A Contributor License Agreement (CLA) or DCO.
- Representations that the contributor has rights to submit the work.
- Patent/license grants needed for project maintenance.
- Handling of third-party code, AI-generated code, and license compatibility.

## 5. Third-Party / Dependency Review

- Audit all dependencies for license compatibility with proprietary distribution.
- Identify copyleft/AGPL/network-copyleft/source-disclosure obligations.
- Review fonts, icons, media, sample assets, and generated content.
- Maintain `THIRD_PARTY_NOTICES.md` as part of release process.

## 6. Required Legal Review Checklist

- [ ] Qualified Indian software licensing lawyer review.
- [ ] Legacy grant preservation/revocation risk analysis.
- [ ] Contributor CLA/DCO decision.
- [ ] Commercial license terms, GST/tax, invoicing, refund/cancellation terms.
- [ ] Consumer/privacy/data protection compliance (as applicable).
- [ ] Trademark and branding usage policy.
- [ ] Export/sanctions/compliance review if distributing internationally.
- [ ] Third-party license compatibility audit.