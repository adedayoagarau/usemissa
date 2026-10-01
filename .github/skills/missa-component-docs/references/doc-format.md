# Missa component specification format

## Contents

- Field order
- What each field contains
- Worked example
- Review checklist

This is the house format a component spec uses. It is the template in `DESIGN.md`
section 8 ("Component specification template"), fixed here so a spec is
comparable across components. The field names and order are canonical for this
skill; do not rename or reorder them.

## Field order

Every spec uses these keys, in this order, with no additions and no renaming. A
field with nothing to say gets `NOT SUPPLIED`.

```yaml
name:
status: experimental | approved | deprecated
intent:
base_source: installed | shadcn | ss-component | ss-block | coss | custom
registry_item:
implementation:
use_when:
do_not_use_when:
anatomy:
variants:
states:
tokens:
content_rules:
icon_rules:
motion_rules:
responsive_behavior:
accessibility:
tests:
used_by:
replacement_for:
```

## What each field contains

**name.** The Missa component name, matching its directory or file under
`apps/web/components/missa` or `apps/web/components/ui`.

**status.** `experimental`, `approved`, or `deprecated`, exactly as `DESIGN.md`
defines them. Do not promote a component to `approved` from the spec alone.

**intent.** The user intent this component satisfies, named in Missa terms:
action, selection, disclosure, navigation, status, feedback, data display, or
product composition.

**base_source.** The construction source: an installed shadcn/Base UI primitive,
the shadcn registry, a licensed Studio component or block, a selected Coss item,
or custom. Must match `DESIGN.md` section 8.

**registry_item.** The specific registry identifier where one applies, for
example `button-01` from the Studio catalogue. `none` for a pure installed
primitive or custom component.

**implementation.** The file path under `apps/web/components`.

**use_when / do_not_use_when.** Two to four bullets each, phrased as situations
rather than properties. "The action completes without leaving the screen" is a
situation. "It is a modal" is not. The `do_not_use_when` list is never empty.

**anatomy.** The named parts, in order, each marked required or optional.

**variants.** One line per variant: name, and the situation it exists for. If two
variants cannot be told apart by situation, say so. That is a design problem
worth surfacing.

**states.** One line per state, describing behaviour rather than appearance.
Cover at minimum default, hover, focus, active, disabled, loading and error,
omitting any that genuinely do not exist. Follow the motion rules in `DESIGN.md`
section 9: states do not animate unless the underlying state is changing.

**tokens.** Token names only, grouped by what they control, exactly as they
appear in the source. If not supplied, the single line `NOT SUPPLIED`.

**content_rules.** Length limits, capitalisation, tone, and what the text must
not do. Use customer language, never backend enums.

**icon_rules.** Which icons, at what size, with what accessible name, and when a
tooltip is required.

**motion_rules.** Which of the four motion gates in `DESIGN.md` section 9 the
component passes, or `never`.

**responsive_behavior.** What changes at 390px, tablet, and desktop; how labelled
rows stack; where touch targets stay 44px.

**accessibility.** Keyboard path, what a screen reader announces, focus
handling, contrast, and anything a designer must specify per use. Flag anything
uncertain for review rather than deciding it.

**tests.** The test file or Playwright spec that exercises this component.

**used_by.** Which product compositions or routes consume this component.

**replacement_for.** Components this one supersedes, or `none`.

## Worked example

```yaml
name: SaveAction
status: approved
intent: action.save-to-tracker
base_source: installed
registry_item: none
implementation: apps/web/components/missa/... (SaveToTrackerButton)
use_when:
  - A signed-in creator wants to keep an opportunity in their Tracker
  - A signed-out visitor should have their intent preserved across sign-in
do_not_use_when:
  - The action is applying or submitting. Use a primary Button instead
  - The action is purely calendar-based. Use AddOpportunityToCalendarButton
anatomy:
  - Label (required)
  - Leading bookmark icon (required)
  - Saved indicator (optional, replaces the bookmark while saved)
variants:
  - default: a bordered supporting action alongside the primary
  - saved: a quiet filled state confirming the record is tracked
states:
  - default: actionable, reads "Save"
  - hover: signals actionability, no change in meaning
  - focus: visible focus ring, never removed
  - active: held during the press
  - disabled: not actionable, reason visible nearby
  - loading: not actionable, label stays, width does not change
  - saved: neutral process state, not success green
tokens:
  Surface: color.surface, color.primary (Forest), color.on-primary
  Spacing: space.inset, space.control-inline
  Radius: radius.action (8px)
content_rules:
  - One or two words, sentence case, starting with a verb
  - Never "Click here", never backend enum text
icon_rules:
  - Bookmark outline for unsaved, filled bookmark for saved
  - Accessible name carries the opportunity title, not just "Save"
motion_rules:
  - Finite state transition on save; no pulse, no celebration
responsive_behavior:
  - Full 44px touch target on mobile
  - Label does not truncate; a label that does not fit is too long
accessibility:
  - Reachable by Tab, activated by Enter and Space
  - Announces the saved or busy state
  - Icon plus label is the accessible name; never icon-only here
tests:
  - e2e save-to-tracker flow, signed-in and signed-out intent preservation
used_by:
  - OpportunityBrowseProjectCard
  - OpportunityDetailStickyActions
replacement_for: none
```

## Review checklist

- [ ] Every field in the order above is present, in order, unrenamed
- [ ] `do_not_use_when` is not empty
- [ ] Every state describes behaviour rather than appearance
- [ ] Every token name appears in the supplied source
- [ ] Every usage example came from supplied material
- [ ] Every do and don't pair covers one decision and is non-obvious
- [ ] Accessibility names the keyboard path and what is announced
- [ ] `status` matches a shipped screen or documented decision, not the spec alone
- [ ] The catalogue and policy were updated where the spec records a change
- [ ] `npm run check:design-system` passed
- [ ] Anything uncertain is listed under **Guessed at** rather than smoothed over
