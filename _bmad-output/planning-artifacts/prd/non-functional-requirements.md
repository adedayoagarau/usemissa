# Non-Functional Requirements

## Performance

- Radar's own tick pipeline must remain fast enough for interactive admin use (`Run Radar tick` / "Check for updates" — currently synchronous and returns counts to the caller); as the seed registry scales toward its full 1,042 sources, ticking needs a background/async execution path rather than blocking an HTTP request. **[Gap — not addressed in current implementation]**
- User-facing tracker/inbox/discover views should respond within normal web interactivity budgets (sub-second) — not yet load-tested at any real data scale.

## Security

- Session cookies must remain HMAC-signed and tamper-evident (implemented and tested — `a tampered or expired session cookie is rejected`).
- Passwords must be hashed with a memory-hard function (scrypt — implemented) with minimum length enforcement (8 characters — implemented).
- Payment handling (once built) must never store raw card data — Stripe Elements/Checkout only, PCI scope minimized by design.
- All admin actions must remain in the append-only audit log as new admin capabilities (Workspace decisions, Delivery, Enterprise role changes) are added — the existing `audit.ts` pattern should extend, not be reinvented per feature.

## Scalability

- The current `RadarStore` is in-memory + JSON-file for the built-in adapter, with a Postgres adapter already implemented as a port swap (`radar-adapters/postgresStore.ts`). Before any real seed-registry-scale ingestion runs in production, the Postgres adapter must be the default runtime store — the JSON file approach does not scale past demo/dev use and has a known race risk under concurrent writers (see Scope Boundaries & Risks, item 6).
- Multi-tenancy (Organization → Team → Program) must be modeled with proper row-level scoping from the start of Workspace development, not retrofitted.

## Accessibility

- Given the strategy doc's explicit target of serving a broad creative community across ages and technical comfort levels, and eventual education-sector Enterprise customers (universities often have accessibility procurement requirements), Workspace and Passport UI work should target WCAG 2.1 AA as a baseline once real frontend work begins — no accessibility work exists to audit yet, since no production frontend exists yet beyond the minimal server-rendered `ui.ts`.

## Compliance & Trust

- Anti-fraud signal detection (suspicious payment language) must never regress as new extraction adapters are added — already covered by shared validation, must remain a hard architectural invariant.
- Every claim/verification/audit action must remain attributable (who did what, when) — already true today; must extend to Review/Decision actions once that subsystem is built (see Domain-Specific Requirements).
- No regulatory compliance regime (HIPAA, SOC2, etc.) currently applies, but Enterprise customers (universities, foundations) will likely require SOC2 Type II eventually — **[decision]** flag this as a pre-enterprise-sales-motion requirement, not an MVP one.

---
