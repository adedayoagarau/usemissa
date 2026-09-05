# Missa agent interface contract

These instructions apply to every AI-authored UI change in this repository.

## Canonical references

| Need                                      | File                                |
| ----------------------------------------- | ----------------------------------- |
| Visual, interaction, and typography rules | `DESIGN.md`                         |
| Machine-readable component choice         | `apps/web/component-policy.json`    |
| Installed Studio inventory                | `apps/web/component-catalogue.json` |
| Reusable AI UI directive                  | `docs/ai-ui-build-directive.md`     |
| Directory filters and creator portfolio integration | `docs/directory-portfolio-integration-handoff.md` |

## Before building UI

1. Read `DESIGN.md` and `apps/web/component-policy.json`.
2. Name the user intent before naming a component: action, selection,
   disclosure, navigation, status, feedback, data display, or composition.
3. Check `apps/web/components/ui` and the local Studio catalogue at
   `apps/web/components/shadcn-studio` before writing component markup.
4. If the needed pattern is not installed, inspect the configured registries in
   `apps/web/components.json` in this order:
   - standard shadcn;
   - licensed `@ss-components`;
   - licensed `@ss-blocks`;
   - licensed `@ss-pages` for reference or selective extraction;
   - a selectively reviewed Coss component.
5. View a registry item and its source before installing it. Never install a
   full vendor theme or overwrite Missa tokens, fonts, or component files
   without an explicit migration decision.
6. Use the component selected by `component-policy.json`. When a recurring
   domain meaning exists, use its Missa semantic wrapper rather than importing
   the primitive directly.
7. Style only with the approved primitive → semantic → component token chain.
   Do not introduce raw colors, font families, arbitrary radii, shadows, or
   animations in feature code.
8. If no approved component works, record the registries and local variants
   inspected plus the functional or accessibility gap before creating custom UI.

## Required handoff evidence

- Component intent and selected policy entry.
- Registry/source component and local implementation path.
- Any adaptation made for Missa tokens or product semantics.
- Default, hover, focus-visible, disabled, loading, empty, error, and success
  states where applicable.
- Desktop, 390px mobile, keyboard, 200% zoom, long-content, and reduced-motion
  validation where applicable.
- An update to the component catalogue and policy whenever a component or
  approved variant is added, replaced, or deprecated.

Run `npm run check:design-system` before handing off UI work. Existing legacy
exceptions are migration debt, not examples to copy; the validator rejects new
exceptions.
