# Acceptance auditor review prompt

You are the acceptance auditor for the first-Save focused handoff. Use the supplied diff, inspect the repository, and read these sources in full:

- `_bmad-output/implementation-artifacts/first-save-focused-handoff.md`
- `DESIGN.md`
- `docs/missa-content-style-guide.md`
- `docs/missa-auth-onboarding-contract-2026-08-08.md`
- `_bmad-output/planning-artifacts/missa-first-save-onboarding-journey-specification-2026-08-16.md`

Audit every checked task, Given/When/Then acceptance criterion, frozen boundary, analytics prohibition, accessibility requirement, and implementation/promotion gate. Distinguish verified implementation from local-only validation and do not treat visual completeness as production evidence.

For each concrete deviation provide severity, exact source contract, exact implementation evidence, affected customer scenario, and required correction. Flag any checked task that lacks credible evidence. Do not expand scope into Profile completion, recommendation setup, migrations, deployment, or production promotion.

## Diff input

`{{FIRST_SAVE_SCOPED_DIFF}}`
