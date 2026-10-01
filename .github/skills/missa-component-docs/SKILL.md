---
name: missa-component-docs
description: Writes a Missa component spec in the house template from supplied sources only, and updates the ledger, policy, and catalogue. Use when documenting a new or changed Missa component.
---

# Missa component documentation

A Missa component is finished or has changed, and it needs its specification.
The workflow ends at the draft spec: it documents what exists from supplied
sources and does not decide whether the component is any good.

Not for the system overview pages, and not for the marketing-only or
experimental `/design-system/*` previews unless they have graduated to a
`component-policy.json` semantic entry. A component with no variants and no
states usually belongs inside another entry rather than having its own, but ask
before excluding one rather than deciding it here.

## Output

**Done means.**

Checkable: every documented detail is supported by the supplied sources, the
entry follows the field order in `references/doc-format.md`, anything missing or
unresolved is listed rather than filled in, and the component ledger, policy, or
catalogue has been updated in the same change where the spec records one.

Needs a person: everything marked `NEEDS REVIEW`, everything under **Guessed
at**, and any source conflict no precedence rule settles.

One component specification in the Missa house template from
`references/doc-format.md`, ready to paste into the component ledger.

Below it, outside the entry, a short list titled **Guessed at**.

**If it stops.** When a required input is missing, hand back which input is
missing and the rule that stops on it, anything you have already settled from
the supplied material so the next message is the last one needed, and the
shortest thing that would unblock it. Name what a usable answer looks like
rather than asking again in the same words.

## Inputs

- Component name and its variant list (REQUIRED)
- Where it lives: `apps/web/components/ui`, `apps/web/components/missa`, or a
  pasted spec (REQUIRED)
- Two real usage situations from shipped screens (REQUIRED, two being the
  default minimum)
- The token names it uses, from `DESIGN.md` or `apps/web/app/globals.css`
  (OPTIONAL)
- Behaviour notes from whoever built it (OPTIONAL)
- Accessibility notes (OPTIONAL)

Different gaps get different treatment. Follow this rather than generalising
from any one row.

| Missing | Do this |
| --- | --- |
| Fewer than two real usage situations | Stop and ask. Do not continue |
| Variant list | Stop and ask. An entry without variants documents a different component |
| Token names | Write the entry, section reads `NOT SUPPLIED`. Never read a token off the way something looks |
| Behaviour notes | Write only what follows from the supplied parts and states. List the rest under Guessed at |
| Accessibility notes | Write the keyboard path only if the parts make it certain. Otherwise `NEEDS REVIEW`, and list it |

This table is the whole rule for missing inputs. Boundaries below covers
decisions and conflicts, and does not repeat any of these.

Usage situations are the gap that stops the work. Invented examples read exactly
like real ones, and they are the part readers copy.

A usage situation is one place in the product where this component is on
screen: which screen, what put it there, and which variant appeared. A rule
about where the component may or may not be used is not one, however well
written. Neither is a description of what the component is for. If it does not
name a screen, it does not count.

Design-complete but unshipped counts, as long as the screen is real and you say
it has not shipped. What does not count is a situation reconstructed from the
variant list.

## Procedure

1. Read `references/doc-format.md` and use that field order exactly, including
   fields that end up one line long.
2. Draft each field from the supplied material only.
3. List token names exactly as they appear in the source. Never infer one from a
   colour, a pixel value, or a similar component. Follow the source precedence
   in `.github/skills/README.md`.
4. Write the do and don't pairs last. Each pair covers one decision someone
   could realistically get wrong on this component. Delete any pair that states
   the obvious.
5. Run the checklist at the end of `references/doc-format.md` and fix what
   fails.
6. If the spec records a new, replaced, or deprecated component or variant,
   update `apps/web/component-catalogue.json` and, where the meaning recurs,
   `apps/web/component-policy.json`, in the same change.
7. Run `npm run check:design-system` before handoff.

## Boundaries

**The Skill may decide.** Fully determined by the supplied material, so decide
these without asking:

- Which field a supplied detail belongs in
- Whether a required input is present
- Whether a state or variant was supplied or is absent
- Which do and don't pairs are non-obvious enough to keep
- Whether a component is `experimental`, `approved`, or `deprecated` when the
  supplied sources state it

**Stop and ask.**

- Two sources name the same token differently. Follow the source precedence in
  `.github/skills/README.md` if one applies, and say that you did. If none
  applies, report both and do not choose.
- Two sources give different variant lists. Do not settle this with a token
  precedence rule: check whether the rule's stated reason holds here. A rule
  that says one source wins because the other lags behind does not apply when
  the other source is ahead. A wrong variant list is worse than a wrong token,
  because a reader builds against it.
- The request covers more than one component. Do the first and list the rest.
- A component has no variants and no states. Ask whether it gets its own entry,
  rather than applying the default exclusion silently.
- A `status` change is claimed but not supported by a shipped screen or a
  documented decision. Do not mark a component `approved` on sight.

**Never.**

- Invent a token name, a variant, or a usage example.
- Rename or reorder the fields away from `references/doc-format.md`. That file
  defines them; this workflow follows it.
- Describe how something looks where the template asks how it behaves.
- Claim a registry component or prototype is approved merely because it exists.
- Introduce a raw color, font family, arbitrary radius, or animation into the
  spec's token guidance.

## Final checks

- Every token name appears in the supplied source
- Every usage situation came from the supplied material
- `do_not_use_when` is not empty
- Every state describes behaviour rather than appearance
- The catalogue and policy were updated where the spec records a new, replaced,
  or deprecated component or variant
- `npm run check:design-system` passed
- **Guessed at** lists every place a gap was filled with judgement, so it can be
  corrected rather than absorbed
