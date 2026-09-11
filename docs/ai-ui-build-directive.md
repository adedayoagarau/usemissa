# Missa AI UI build directive

Use this directive in any coding assistant, generated task, or system/developer
prompt that will create or modify Missa UI. It points to canonical repository
files; it does not replace them.

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

## Binding build behavior

- Name the interaction or information intent before selecting a component.
- Use the exact policy mapping for that intent. Repeated product meaning must
  use a semantic component under `apps/web/components/missa`.
- Search installed `apps/web/components/ui` components first, then the local
  Studio catalogue. Inspect remote registry source only for a documented gap.
- Treat Shadcn and licensed Studio/Coss code as source material, not a visual
  theme. Adapt it through Missa semantic tokens and preserve its accessible
  behavior.
- Do not build route-local substitutes for an approved primitive or semantic
  component. Do not directly import Studio variants in feature code.
- Use Newsreader for editorial display, Instrument Sans for interface copy,
  and Fragment Mono only for compact data.
- Do not add raw colors, font families, arbitrary radii, shadows, or animation
  in feature code. Static metadata never animates.
- Preserve data truth and conditional meaning: omit inapplicable information;
  distinguish unknown, conflicting, unavailable, and not required states.
- Validate default, hover, focus-visible, disabled, loading, empty, error, and
  success states when applicable, plus keyboard use, reduced motion, 200% zoom,
  long content, desktop, and 390px mobile.
- Run `npm run check:design-system` before handoff. If no approved component can
  satisfy the need, document the sources inspected and the functional or
  accessibility gap before adding a reusable component and policy entry.

## Handoff

Name the intent, selected policy entry, implementation component, token or
behavior adaptations, tested states, and validation result. Never claim that a
registry component or prototype is approved merely because it exists.
