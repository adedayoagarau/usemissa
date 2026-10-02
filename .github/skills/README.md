# Missa design skills

Three AI workflows, adapted from the
[Design Agents Toolkit](https://designsystems.surf) to Missa's real contracts.
Each skill is a single repeatable job with a clear output, inputs, procedure,
boundaries, and final checks, plus a test set.

The source-of-truth documents these skills read and update are unchanged:

- `DESIGN.md` — visual, typography, spacing, interaction, accessibility, and
  content rules.
- `apps/web/component-policy.json` — machine-readable intent to component map.
- `apps/web/component-catalogue.json` — installed component ledger.
- `docs/ai-ui-build-directive.md` — the reusable AI UI directive.
- `docs/design-system-source-map.md` — the canonical source and name
  reconciliation map (role noun → product name → CSS variable).
- `apps/web/app/globals.css` — the compiled primitive, semantic, and component
  token variables.
- `scripts/check-design-system.mjs` — the mechanical validator, run as
  `npm run check:design-system`.

## The three skills

| Skill | Directory | Use it to |
| --- | --- | --- |
| `missa-component-docs` | `missa-component-docs/` | Write the Missa component spec for a new or changed component, from supplied sources only, and update the ledger, policy, and catalogue. |
| `missa-token-mapping` | `missa-token-mapping/` | Map existing values or legacy styles onto Missa tokens (color roles, spacing, type, radius, motion) and report gaps without inventing names. |
| `missa-design-review` | `missa-design-review/` | Review a screen against `DESIGN.md` review criteria and return findings by severity, keeping judgement and preferences separate. |

## Shared project instructions

The toolkit's "shared project instructions" role is already filled by `AGENTS.md`
plus the entrypoints it points to (`.cursor/rules/missa-ui.mdc`,
`.github/copilot-instructions.md`, `docs/ai-ui-build-directive.md`). These skills
do not restate those rules; they reference them and rely on the source
precedence below.

## Source precedence

The canonical precedence and the role → product-name → CSS-variable
reconciliation live in `docs/design-system-source-map.md`. When two sources
disagree, resolve in that order and say which one you followed. Where no rule
reaches the disagreement, surface both sources and stop; do not choose. The
`npm run check:design-system` validator is enforcement, not a rule source: a
passing check does not override `DESIGN.md`.

## Building and maintaining these skills

The 30-prompt library that produced these skills is captured in
`docs/design-agents-toolkit-handoff.md`. Use the `Define`, `Architect`,
`Connect`, `Build`, `Test`, and `Improve` prompts when a workflow changes or a
skill stops behaving correctly, one section at a time.
