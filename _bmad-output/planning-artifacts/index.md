# Planning Artifacts Index

Read `prd/index.md` first if you're new to this project — it links every PRD section in order, starting with the Authorship Note explaining how this was produced.

## Files

- **[epics.md](./epics.md)** - 13 epics, 37 detailed MVP stories + 3 Growth stubs, with FR coverage map
- **[ux-design-specification.md](./ux-design-specification.md)** - Design system, components, journeys, and provisional answers to the handoff doc's open design questions

## Subdirectories

### prd/

Sharded Product Requirements Document (14 files) — brownfield PRD covering Missa's full two-sided platform vision, synthesized from `docs/missa-strategy.md`.

- **[index.md](./prd/index.md)** - Table of contents for the sharded PRD
- **[authorship-note.md](./prd/authorship-note.md)** - How this PRD was produced without a live stakeholder interview
- **[executive-summary.md](./prd/executive-summary.md)** - Vision, differentiators, project classification
- **[success-criteria.md](./prd/success-criteria.md)** - User/business/technical success, measurable outcomes
- **[product-scope.md](./prd/product-scope.md)** - MVP / Growth / Vision scope tiers
- **[user-journeys.md](./prd/user-journeys.md)** - 5 primary user journeys across submitter, org, and admin roles
- **[domain-specific-requirements.md](./prd/domain-specific-requirements.md)** - Anti-fraud, fairness, payments, accessibility, data portability
- **[innovation-differentiation.md](./prd/innovation-differentiation.md)** - What's genuinely novel vs. innovation-theater
- **[platform-technical-classification.md](./prd/platform-technical-classification.md)** - Stack recommendation vs. what's actually built
- **[scope-boundaries-risks.md](./prd/scope-boundaries-risks.md)** - What's explicitly in scope, and the 6 key risks carried forward
- **[functional-requirements.md](./prd/functional-requirements.md)** - FR1–FR58 by capability area, each tagged Built/Partial/Not built
- **[non-functional-requirements.md](./prd/non-functional-requirements.md)** - Performance, security, scalability, accessibility, compliance
- **[terminology-reference.md](./prd/terminology-reference.md)** - Binding vocabulary mapping (internal names vs. user-facing names)
- **[implementation-status-what-exists-today.md](./prd/implementation-status-what-exists-today.md)** - The single most important scoping fact: intelligence layer done, Workspace product is the remaining build

### architecture/

Sharded Architecture Document (7 files) — brownfield architecture reconciling the existing `radar-engine`/`radar-adapters` packages with the target system.

- **[index.md](./architecture/index.md)** - Table of contents for the sharded architecture doc
- **[project-context-analysis.md](./architecture/project-context-analysis.md)** - Requirements overview, constraints, cross-cutting concerns
- **[starter-template-technical-preferences.md](./architecture/starter-template-technical-preferences.md)** - Stack choices with versions verified 2026-07-07 (Next.js 16.2.10, Drizzle 0.44.x, stripe-node v22.2.0)
- **[core-architectural-decisions.md](./architecture/core-architectural-decisions.md)** - Critical/Important/Deferred decisions, data/auth/API architecture
- **[implementation-patterns-consistency-rules.md](./architecture/implementation-patterns-consistency-rules.md)** - Naming and structure patterns for AI-agent-consistent code
- **[project-structure-boundaries.md](./architecture/project-structure-boundaries.md)** - Full target directory tree and one-way dependency rule
- **[architecture-validation-results.md](./architecture/architecture-validation-results.md)** - Coherence check, FR coverage, what's blocked on user-owned external accounts
