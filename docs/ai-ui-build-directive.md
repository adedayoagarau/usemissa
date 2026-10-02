# Missa AI UI build directive

Use this directive in any coding assistant, generated task, or system/developer
prompt that will create or modify Missa UI. It points to canonical repository
files; it does not replace them.

`AGENTS.md` is the authoritative build contract; `DESIGN.md` owns the visual and
token rules. This directive is the pasteable pointer and the validation command.

## Required context

Before proposing or changing UI, read:

1. `DESIGN.md` for the visual, typography, spacing, interaction, responsive,
   accessibility, and content contract.
2. `apps/web/component-policy.json` for the machine-readable mapping from user
   intent to approved primitives, semantic components, and compositions.
3. `apps/web/component-catalogue.json` to confirm which licensed Shadcn Studio
   variants are installed locally.
4. `apps/web/components.json` only when a required component is not installed
   and a configured registry must be inspected.
5. `docs/design-system-source-map.md` when a token name, role, or value is
   ambiguous across `DESIGN.md`, `component-policy.json`, and the compiled CSS.

## Skills

Three installable skills operationalise specific design workflows. Invoke them
by name rather than re-deriving their procedure inline.

- `missa-component-docs` (`.github/skills/missa-component-docs/`) — write the
  Missa component spec for a new or changed component and update the ledger,
  policy, and catalogue.
- `missa-token-mapping` (`.github/skills/missa-token-mapping/`) — map existing
  values or legacy styles onto Missa tokens and report gaps without inventing
  names.
- `missa-design-review` (`.github/skills/missa-design-review/`) — review a
  screen against `DESIGN.md` review criteria and report findings by severity.

These skills reference `DESIGN.md`, `component-policy.json`, and
`component-catalogue.json`; they do not replace them. They follow the source
precedence documented in `.github/skills/README.md`.

## Binding build behavior

Follow the full build procedure and handoff evidence in `AGENTS.md`; do not
re-derive them here. The binding constraints in one line: name the intent,
select the component through the policy, style only through the primitive →
semantic → component token chain, and introduce no raw colors, fonts, radii,
shadows, or animation.

Route token or component compliance questions through `missa-token-mapping` and
`missa-component-docs` rather than resolving them ad hoc. Run
`npm run check:design-system` before handoff.

## Handoff

Name the intent, selected policy entry, implementation component, token or
behavior adaptations, tested states, and validation result, per `AGENTS.md`.
Never claim that a registry component or prototype is approved merely because it
exists.
