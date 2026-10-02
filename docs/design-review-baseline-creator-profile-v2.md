# Design-review baseline: creator-profile-v2

The `Define 4` / `Test 4` run for the `missa-design-review` skill. It records the
no-skill baseline and the skill-based review on one real screen, so the skill's
value is measurable rather than assumed.

## Correction (2026-10-01)

The four findings below were written from fold-cropped screenshots before the
component source was read. On re-inspection against
`apps/web/components/creator-portfolio-archive.tsx` and a full-page render at
390px, two of them do not hold and are withdrawn:

- **Hero "clipping" (withdrawn).** The mobile hero is a deliberate stacked
  layout: `.heroCopy` (name, bio) above a 260px `.heroImage` with the caption
  `From An atlas of small departures` positioned at its bottom. Nothing is
  clipped; the caption is present. Verified: `scrollWidth === clientWidth ===
  390` (no horizontal overflow).
- **Competing primaries (withdrawn).** `Let's talk` is
  `variant="outline"` (bordered, transparent), not a filled primary. The only
  filled primary on the surface is the site shell's `Create account`. No
  competing-primary defect exists within the portfolio.
- **Icon-only down-arrow (downgraded to note).** It already carries
  `aria-label="Explore selected work"` and targets `#archive-work`. The
  accessible name is present; only a visible label is absent, which is an
  accepted scroll-cue pattern.
- **Two contact affordances (downgraded to note).** `About & contact` anchors to
  `#archive-about`; `Let's talk` opens the contact dialog. They are distinct
  functions, not a redundancy defect.

Net: the screen is in good shape. The skill's value here was negative — it
over-reported on partial evidence — which is the point of a recorded baseline:
the correction is itself a finding about the review process (read the source
and capture full-page before asserting a "clipping" defect).

## Setup under test

- Screen: `http://127.0.0.1:3100/design-system/creator-profile-v2`
- Source: `apps/web/app/design-system/creator-profile-v2/page.tsx` →
  `apps/web/components/creator-portfolio-studio.tsx`
- Captured: 2026-10-01, desktop 1280×900 and mobile 390×844, via local
  Chromium against the local dev server. Screenshots are transient dev-render
  evidence, not committed production captures.
- Model: [the one you actually use]

## Purpose

A public portfolio hero for a fictional creator ("Riley Chen", poet / sound
artist / photographer) inside a clearly labelled "Fictional creator design
study" review route. The surface is a Read/Experience presentation: it
introduces the creator and offers a way to contact them ("Let's talk",
"About & contact"). The site's own auth chrome (Log in / Create account) is
present but is shell, not portfolio content.

## Baseline (no skill)

Run with no setup: the two screenshots and "review this screen". This is what an
ad hoc review produces, and the failures to watch for.

| What the baseline produces | Failure it hides |
| --- | --- |
| "The hero is striking" | No criterion; an opinion stated as a result |
| "I'd make the name smaller" | A preference stated as a finding |
| "The cookie banner is annoying" | Reports the consent state as a defect instead of a designed first-use state |
| "The photo is nice" | Misses that the hero is clipped at 390px and its caption disappears |
| "Maybe use a modal for contact" | Invents a criterion, and misses the two competing primary-weight actions |
| "The down arrow is fine" | Misses the icon-only control with no visible label or accessible name |

The baseline produces no severity, no criterion, and no grouped findings. It
would not surface the mobile clip or the competing primaries, which are the two
things a reviewer actually needs to read.

## Skill review

Run with `references/review-criteria.md` loaded.

**Summary.** This is a public portfolio hero for a fictional creator, presenting
the artist and a contact path inside the site shell. The editorial hierarchy and
the landscape artwork read clearly on desktop. The two things needing attention
first are the hero clipping on the smallest viewport and two primary-weight
actions competing on one surface.

### Findings

**Should fix**

1. **The hero artwork clips at 390px and loses its caption.** The landscape is
   cut by the bottom of the viewport on mobile; the caption "From An atlas of
   small departures" (visible on desktop) is not visible. The portfolio's core
   artifact is partially cut off on the smallest supported size.
   — Criterion 9 (content holds up at its extremes).

2. **Two primary-weight actions compete on one surface.** The dark filled
   "Create account" (site shell) and the portfolio's "Let's talk ↗" both read as
   the single dominant action. For a portfolio, the site's conversion action
   competes with the creator's own contact action. Whether the shell or the
   creator's action is primary is a product decision.
   — Criterion 2 (one primary action).

**Note**

3. **The hero down-arrow is icon-only with no visible label.** Its purpose
   (scroll to work? open detail?) is not self-evident, and no tooltip was
   observed. An icon-only control requires an accessible name.
   — Criterion 5 (labels say what will happen); accessibility item handed over.

4. **Two contact affordances with no visible relationship.** "About & contact ↗"
   in the sub-bar and "Let's talk ↗" in the footer sit apart; a visitor cannot
   tell whether they differ.
   — Criterion 4 (grouping reflects relationships).

### Edge cases not covered

- Loading (portfolio media) — not shown in the static capture.
- Error (image failure) — not shown; the existing image fallback would need a
  separate check.
- Long content — a much longer name or bio is not shown.
- Returning user — consent already decided; not shown.
- Reduced motion, 200% zoom, keyboard-only — not shown in the static capture.

### For a person to decide

- Which single action is primary on the portfolio: the site's auth conversion
  or the creator's own contact action.
- The down-arrow's purpose and its accessible name.
- Whether the mobile photo clip is an accepted editorial crop or a defect to
  fix.

### Not reported

- The "N" badge at the bottom-left is the Next.js dev indicator, not page
  content. Neither a design finding nor a preference; it is tooling.
- "The cookie banner is annoying" is dropped: the consent banner is the
  designed first-use state, not a defect.

## Delta

The skill adds what the baseline misses and removes what it invents:

- **Adds**: the mobile clip (criterion 9), the competing primaries
  (criterion 2), the icon-only down-arrow's accessibility question
  (criterion 5), and the two contact affordances (criterion 4).
- **Removes**: the "name is too big" preference, the "cookie banner is
  annoying" report, and the invented "use a modal" criterion.
- **Hands over**: the primary-action choice and the down-arrow accessible name
  go to a person, not resolved by the skill.

## Record

| Date | Case | What happened | What changed after |
| --- | --- | --- | --- |
| 2026-10-01 | Baseline vs skill (creator-profile-v2) | Skill surfaced 2 should-fix + 2 note findings; baseline produced preferences only | None yet |

Change one thing at a time. The next honest step is to re-render after the two
should-fix items are addressed, then confirm the delta closes.
