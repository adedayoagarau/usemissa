---
version: "0.1"
name: "Missa"
status: "draft"
description: "A white-canvas submission platform that combines calm, approachable discovery with precise, high-density operational workflows. Missa should feel editorial without looking like paper, capable without feeling enterprise-heavy, and trustworthy without relying on alarm colors."

references:
  color_direction: "docs/missa-color-direction.md"
  notion: "design-references/notion/DESIGN.md"
  linear: "design-references/linear/DESIGN.md"
  sanity: "design-references/sanity/DESIGN.md"

tokens:
  primitive:
    color:
      white: "#ffffff"
      neutral-25: "#fcfcfc"
      neutral-50: "#f7f7f7"
      neutral-100: "#f1f1f0"
      neutral-200: "#e7e7e5"
      neutral-300: "#d4d3d0"
      neutral-500: "#74716d"
      neutral-700: "#45413d"
      neutral-900: "#171418"
      forest-50: "#edf3f0"
      forest-100: "#e3ece8"
      forest-300: "#9fb8ae"
      forest-500: "#397060"
      forest-600: "#285649"
      forest-700: "#1d4037"
      lichen-50: "#eef1e8"
      lichen-600: "#657547"
      ochre-50: "#f5ecd9"
      ochre-600: "#a8762a"
      ochre-700: "#78551e"
      red-50: "#fceceb"
      red-700: "#b3261e"
      mineral-blue-50: "#e7eff2"
      mineral-blue-600: "#426b7a"
    space:
      "0": "0"
      "0-5": "2px"
      "1": "4px"
      "2": "8px"
      "3": "12px"
      "4": "16px"
      "5": "20px"
      "6": "24px"
      "8": "32px"
      "10": "40px"
      "12": "48px"
      "16": "64px"
      "20": "80px"
      "24": "96px"
    radius:
      xs: "4px"
      sm: "6px"
      md: "8px"
      lg: "12px"
      xl: "16px"
      full: "9999px"
    duration:
      fast: "120ms"
      normal: "180ms"
      slow: "280ms"

  semantic:
    color:
      canvas: "{tokens.primitive.color.white}"
      canvas-subtle: "{tokens.primitive.color.neutral-25}"
      surface: "{tokens.primitive.color.white}"
      surface-subtle: "{tokens.primitive.color.neutral-50}"
      surface-muted: "{tokens.primitive.color.neutral-100}"
      ink: "{tokens.primitive.color.neutral-900}"
      ink-secondary: "{tokens.primitive.color.neutral-700}"
      ink-muted: "{tokens.primitive.color.neutral-500}"
      border: "{tokens.primitive.color.neutral-200}"
      border-strong: "{tokens.primitive.color.neutral-300}"
      primary: "{tokens.primitive.color.forest-600}"
      primary-hover: "{tokens.primitive.color.forest-700}"
      primary-subtle: "{tokens.primitive.color.forest-100}"
      success: "{tokens.primitive.color.lichen-600}"
      success-subtle: "{tokens.primitive.color.lichen-50}"
      warning: "{tokens.primitive.color.ochre-700}"
      warning-subtle: "{tokens.primitive.color.ochre-50}"
      destructive: "{tokens.primitive.color.red-700}"
      destructive-subtle: "{tokens.primitive.color.red-50}"
      information: "{tokens.primitive.color.mineral-blue-600}"
      information-subtle: "{tokens.primitive.color.mineral-blue-50}"
      focus: "{tokens.primitive.color.forest-600}"
      overlay: "rgba(28, 24, 21, 0.46)"
    shadow:
      none: "none"
      subtle: "0 1px 2px rgba(28, 24, 21, 0.05)"
      overlay: "0 16px 48px rgba(28, 24, 21, 0.14)"
    easing:
      standard: "cubic-bezier(0.2, 0, 0, 1)"
      enter: "cubic-bezier(0.16, 1, 0.3, 1)"

  component:
    button:
      height-default: "44px"
      height-compact: "36px"
      radius: "{tokens.primitive.radius.md}"
      primary-background: "{tokens.semantic.color.primary}"
      primary-background-hover: "{tokens.semantic.color.primary-hover}"
      primary-foreground: "{tokens.primitive.color.white}"
      secondary-background: "{tokens.semantic.color.surface}"
      secondary-foreground: "{tokens.semantic.color.ink}"
      secondary-border: "{tokens.semantic.color.border-strong}"
    input:
      height: "44px"
      background: "{tokens.semantic.color.surface}"
      foreground: "{tokens.semantic.color.ink}"
      border: "{tokens.semantic.color.border-strong}"
      focus-ring: "{tokens.semantic.color.focus}"
      radius: "{tokens.primitive.radius.md}"
    card:
      background: "{tokens.semantic.color.surface}"
      border: "{tokens.semantic.color.border}"
      radius: "{tokens.primitive.radius.lg}"
      padding-default: "{tokens.primitive.space.6}"
      shadow: "{tokens.semantic.shadow.subtle}"
    table:
      background: "{tokens.semantic.color.surface}"
      border: "{tokens.semantic.color.border}"
      row-height: "48px"
      row-hover: "{tokens.semantic.color.surface-subtle}"
    badge:
      radius: "{tokens.primitive.radius.full}"
      padding: "2px 8px"
---

# Missa Design System

This file is the visual source of truth for Missa. It governs new interface work and should be consulted before changing layout, type, color, component styling, interaction, or motion.

For user-facing language, use [`docs/missa-content-style-guide.md`](./docs/missa-content-style-guide.md) as the voice and editorial source of truth and [`docs/missa-content-quick-reference.md`](./docs/missa-content-quick-reference.md) for daily drafting. Canonical product nouns remain governed by [`docs/missa-naming-decisions.md`](./docs/missa-naming-decisions.md). The current cross-surface findings and design priorities are recorded in [`docs/missa-content-and-design-audit-2026-08-07.md`](./docs/missa-content-and-design-audit-2026-08-07.md).

The three installed systems are references, not themes to copy:

- **Notion contributes approachability:** white surfaces, clear hierarchy, readable cards, restrained chrome, and progressive disclosure.
- **Linear contributes operational precision:** compact controls, dense tables, keyboard-first actions, hairline separation, and fast feedback.
- **Sanity contributes contrast discipline:** strong focus states, technical metadata treatment, and depth built with surfaces and borders rather than decorative shadow.

When a reference conflicts with this file, this file wins.

## 1. Product Character

Missa joins opportunity discovery with the full submission lifecycle. It serves individual submitters, organization administrators, and occasional reviewers. The interface must therefore support two different working rhythms without splitting into two brands.

The desired character is:

- calm, not sleepy;
- precise, not mechanical;
- editorial, not nostalgic;
- capable, not enterprise-heavy;
- human, not whimsical;
- trustworthy, not alarmist.

### Foundation decision

The primary canvas is **true white (`#ffffff`)**. Do not tint the page background cream, beige, parchment, or paper. Character should come from typography, imagery, writing, and the Aubergine accent—not from the canvas.

Subtle neutral surfaces may be used to group controls or distinguish selected and hovered states, but a page should still read as white first.

## 2. Three Interface Registers

### Marketing

Marketing is the most expressive register. Use generous white space, strong editorial composition, restrained motion, real product views, and occasional photographic or moving imagery. Ysabeau may carry major statements without turning the page into a literary journal facsimile.

### Creator product

The creator product covers Opportunities, Inbox, Tracker, saved searches, following, calendar, and creator-facing status views. It should feel calm and legible:

- prefer cards, grouped lists, and progressive disclosure;
- keep touch targets at least 44px;
- show the reason behind every match, change, or status;
- allow more white space than the organization product;
- make mobile a first-class layout.

### Organization product

The organization product covers organization setup, open calls, submissions, review, decisions, delivery, and insights. It should feel compact and operational:

- prefer tables when information is genuinely tabular;
- support command search and keyboard navigation;
- keep actions available without leaving the current view;
- use 36px compact controls where the audience is a frequent desktop user;
- reveal secondary detail in drawers, sheets, expandable rows, or side panels;
- optimize for scanning and throughput without making occasional reviewers learn a power-user interface.

## 3. Color

### Roles

- **White canvas:** every primary page background.
- **White surface:** cards, tables, dialogs, popovers, and inputs.
- **Subtle neutral surface:** hover, selection, secondary sections, skeletons, and grouped controls.
- **Near-black ink:** primary text and high-emphasis icons.
- **Forest:** the primary action, active navigation, focus, and selected emphasis. Use sparingly.
- **Green:** verified, accepted, completed, and other genuinely positive states.
- **Amber:** deadlines, watchouts, and time-sensitive attention states.
- **Red:** destructive actions, invalid input, or genuine failures only.
- **Mineral blue:** neutral information when Aubergine would incorrectly imply an action or warning.

### Color rules

1. A normal view should have at most one Forest-filled primary action.
2. Never use semantic color without a text label or icon that conveys the same meaning.
3. Declined, withdrawn, archived, and closed are neutral states unless action is required.
4. Do not create rainbow dashboards. Semantic colors communicate meaning; they are not decoration.
5. Prefer borders and spacing over tinted card backgrounds.
6. Large Aubergine or Lichen background sections are off-brand.

## 4. Typography

Missa uses one primary family with a dedicated technical companion. The
typography loaded by `apps/web/app/layout.tsx` is authoritative: Ysabeau carries
display and product UI, while Fragment Mono is reserved for technical and
tabular metadata.

### Families

- **Ysabeau:** marketing display, page-level headings, opportunity titles, navigation, UI, body copy, forms, buttons, cards, tables, sentences, and actions. Use the variable family across 100–900; display weights are intentionally strong.
- **Ysabeau Office treatment:** UI, forms, deadlines, fees, and counts. Use `font-optical-sizing: auto` and tabular numerals for changing values.
- **Ysabeau SC treatment:** small labels and category markers through small-caps OpenType styling.
- **Fragment Mono:** dates, deadlines, IDs, counts, measurements, handles, durations, and compact technical or tabular metadata. Do not use it for sentences, button labels, or actions.

### Type scale

| Role | Family | Size | Weight | Line height | Tracking |
|---|---|---:|---:|---:|---:|
| Marketing display | Ysabeau | 64px | 850 | 0.92 | -0.045em |
| Page display | Ysabeau | 48px | 700 | 1.05 | -0.035em |
| App page title | Ysabeau Office | 32px | 650 | 1.15 | -0.03em |
| Section title | Ysabeau Office | 24px | 650 | 1.20 | -0.025em |
| Card title | Ysabeau | 18px | 650 | 1.30 | -0.015em |
| Body large | Ysabeau Office | 18px | 400 | 1.55 | -0.01em |
| Body | Ysabeau Office | 16px | 400 | 1.50 | -0.005em |
| UI text | Ysabeau Office | 14px | 500 | 1.40 | 0 |
| Caption | Ysabeau SC | 12px | 600 | 1.40 | 0.01em |
| Data | Fragment Mono | 13px | 400 | 1.40 | 0 |

### Typography rules

1. Ysabeau display weights are for emphasis; use the Office treatment for dense product copy.
2. Never set full paragraphs or table content at display weights.
3. Use sentence case for buttons, navigation, table headings, and badges.
4. Uppercase is reserved for very small taxonomy labels; never use it for primary navigation.
5. Use tabular numerals for changing counts, dates, money, and scores.
6. Headings should be short and direct. Do not compensate for vague copy with oversized type.

## 5. Spacing and Layout

The primary spacing rhythm is 8px. The 4px and 12px values exist for compact internal alignment; page structure should land on the 8px scale.

### Containers

- Marketing maximum width: 1360px.
- Creator product content maximum width: 1120px.
- Organization product content maximum width: 1440px or fluid within a sidebar shell.
- Desktop page gutter: 32px.
- Tablet page gutter: 24px.
- Mobile page gutter: 16px.

### Density

- Creator product cards normally use 24px padding and 16–24px gaps.
- Organization product panels normally use 16px padding and 8–16px gaps.
- Table rows target 48px; use 56–64px only when a row contains explanation or multi-line identity.
- Separate major sections with space before adding a box or background.
- Do not wrap every block in a card.

## 6. Spacing System

Spacing is a system, not a per-region judgement call. Every spacing decision
names one of four types, follows the two laws below, and uses the assigned
density mode for the surface family.

### Spacing types

| Type | What it is | Example |
|---|---|---|
| **Inset** | Padding inside a container | Card padding, page gutter |
| **Stack** | Vertical space between stacked elements | Row to row, group to group, section to section |
| **Inline** | Horizontal space between adjacent elements | Button to button, label to control |
| **Gap** | Space between grid or flex children | Card grid, sample-mode columns |

Name the type in code comments and review discussion.

### Spacing laws

**Law 1 — Internal is tighter than external.** A component's inset is smaller
than the stack between that component and its neighbour. When they are equal,
the interface stops signalling what is a group.

**Law 2 — Between-group is at least twice within-group.** If rows inside a
group sit at 12, groups sit at 24 or more, and sections at 48 or more. This is
arithmetic, not taste; a reviewer checks it by doubling.

### Density modes

Each mode is a doubling ladder anchored at a different base. Every value already
exists in the scale above.

| Mode | Base | Row | Group | Section | Inset | Gap |
|---|---:|---:|---:|---:|---:|---:|
| **Compact** | 8 | 8 | 16 | 32 | 16 | 16 |
| **Comfortable** | 12 | 12 | 24 | 48 | 24 | 24 |
| **Spacious** | 16 | 16 | 32 | 64 | 32 | 32 |

Spacious may use **96** for a major break between top-level page sections on
marketing surfaces. This is the only permitted value outside the ladder, and
it is a Stack value only.

Borderless grid children use the next step up for Gap, because space is the
only boundary. Bordered or filled children use the ladder value.

### Surface family assignment

| Family | Mode | Routes |
|---|---|---|
| Public / marketing | Spacious | `/`, `/guides`, `/guides/*`, `/about`, `/methodology`, `/discover/*` |
| Public record | Comfortable | `/opportunities`, `/opportunities/*`, `/journals/*`, `/@handle`, `/profile/*` |
| Creator product | Comfortable | `/profile`, `/settings/*`, `/tracker`, `/library/*`, `/inbox`, `/calendar` |
| Organization | Compact | Organization workspace, builder, submissions, reviews, decisions, messages, delivery, insights, people, settings |
| Reviewer | Compact | Reviewer queue and work surfaces |
| Platform Admin | Compact | All admin routes |

A surface does not mix modes. A dense table inside a Comfortable surface may
keep Comfortable stacks around it and use Compact internally only within the
table itself; declare that explicitly.

### Fixed relationship tokens

These concern hit targets and attachment, not reading rhythm, so they do not
vary by mode.

| Relationship | Value |
|---|---:|
| Label to its control | 8 |
| Helper text to the thing it qualifies | 8 |
| Adjacent bordered or filled controls | 12 |
| Adjacent borderless controls | 24 |
| Unrelated control groups | 24 minimum, and at least 2× the intra-group inline gap |
| Minimum control height and hit target | 44 (Profile/public), 36 (Compact surfaces), never below 44 on touch |

### Page gutters

| Mode | < 640 | 640–1024 | > 1024 |
|---|---:|---:|---:|
| Compact | 16 | 24 | 24 |
| Comfortable | 24 | 32 | 48 |
| Spacious | 24 | 40 | 64 |

Every top-level section on a page shares one gutter. A section that sets its
own horizontal inset is a bug.

### Alignment and responsive rules

- Use one shared leading edge per column. Pick a small set of anchors and reuse them.
- A title above a card takes the card's content inset, not its outer edge. Store the inset once and read it from both.
- Use one indent step per level of nesting: the mode's Group value.
- Numbers right-align with tabular figures; text left-aligns.
- Use logical properties only: `ms-*`, `pe-*`, `text-start`, and `border-e`. Never `ml-*`, `pr-*`, `text-left`, or `border-r`.
- Use container queries for components and viewport queries for the page shell only.
- Break where content stops fitting, not at device widths.
- Test the smallest and largest supported sizes first.
- Use `scrollbar-gutter: stable` on the scroll container.
- Add safe-area insets to fixed or sticky controls, with `viewport-fit=cover` on the viewport meta.

### Failure modes

| Failure | What it looks like | Missa example |
|---|---|---|
| Sloppy spacing | Repeated relationships use different gaps | ~150px void above an audio player from grid stretch |
| Border bloat | Every group gets another outline | Credits boxed instead of hairline-separated |
| Broken continuity | The eye bounces; content sits off the obvious path | Profile name detached from the body column |
| Content cramming | The layout uses every pixel | Video still overflowing its card |
| Overlap | Absolute positioning without a container guard | Fixture labels printed on top of fixtures at 390px |

## 7. Shape, Borders, and Depth

Missa uses sober rectangular geometry:

- 4px: tiny tags and utility controls;
- 8px: buttons, inputs, segmented controls, menus;
- 12px: cards, dialogs, sheets, and larger panels;
- 16px: media and rare feature containers;
- full radius: badges, avatars, and compact status pills only.

Primary buttons are not pills. Cards are not floating bubbles.

Depth is mostly created by white surfaces, neutral surface changes, hairline borders, and clear spacing. Use the subtle shadow only where a white object would otherwise disappear. Reserve the overlay shadow for dialogs, popovers, command menus, and sheets.

## 8. Core Components

### Buttons

**Primary** — Aubergine fill, white text, 8px radius. One dominant primary action per view.

**Secondary** — white background, near-black text, neutral border. Used for supporting actions such as Edit, Copy link, or Preview.

**Ghost** — transparent background. On hover, use the subtle neutral surface. Used for low-emphasis and repeated row actions.

**Destructive** — red is reserved for the final destructive action. The trigger that opens a confirmation dialog may remain neutral.

All buttons need default, hover, active, focus-visible, loading, and disabled states. Loading preserves width. Disabled controls must remain legible and must not rely on opacity below 50%.

### Inputs

- 44px default height; 36px compact organization-product variant.
- White background, strong neutral border, 8px radius.
- Focus uses a 2px Aubergine ring with sufficient separation from the border.
- Validation appears inline beneath the field.
- Validate on blur or submit, not on every keystroke.
- Labels remain visible; placeholders never replace labels.

### Cards

Creator product cards use white, a hairline border, 12px radius, and 24px padding. Cards should lead with the object or action—not a decorative icon.

The organization product uses cards only for summaries, grouped controls, review tasks, and non-tabular modules. Submission inventories, assignments, and decision queues belong in tables or structured lists.

### Tables and structured lists

- Keep column labels visible.
- Align dates, counts, fees, and scores consistently.
- Use Fragment Mono selectively for scan-critical data.
- Highlight row hover with a neutral surface, not a shadow.
- Keep the primary row action discoverable without exposing every secondary action.
- On narrow screens, convert to labelled rows or cards; never shrink a desktop table until it becomes unreadable.

### Navigation

Marketing navigation is light and spacious. Creator navigation prioritizes Opportunities, Inbox, and Tracker. Organization navigation prioritizes Opportunities, Submissions, Reviews, Decisions, Messages, Delivery, Insights, and Settings.

Active navigation uses Aubergine text, icon, or a restrained indicator—not a large colored capsule. Organization navigation supports `Cmd/Ctrl + K`. Keyboard shortcuts must always have a visible non-keyboard equivalent.

### Explained Score

Every Fit Score, Trust Score, or confidence result includes its explanation.

- Collapsed: plain-language tier label plus a “Why?” affordance.
- Expanded: short reasons, watchouts, and disqualifiers.
- Never show a bare numeric score.
- Never rely on green, amber, or red alone.
- Use `aria-expanded` and a real button.

### Status

Statuses use a compact text label, optional icon, and quiet surface tint. Urgent states may use stronger color only when they require timely action.

Do not render Declined as a failure alert. Do not render Submitted as success green; it is a neutral process state.

### Change Diff

Show “was” and “now” explicitly. Use muted text and typographic emphasis rather than red/green code-diff styling. Deadline changes may add amber only when the new date requires attention.

### Feedback

- Toast: transient confirmation after a mutation.
- Inline message: validation or a local recoverable failure.
- Persistent banner: account-level, permission, billing, or session problem.
- Dialog: consequential confirmation, not routine feedback.
- Skeleton: loading structure for lists and cards; avoid layout shift.

## 9. Interaction and Motion

Motion explains change and confirms response. It is not ambient decoration inside the product.

- Hover and press: 120ms.
- Menus, tooltips, and small disclosures: 180ms.
- Dialogs, sheets, and page-level reveals: 280ms maximum.
- Use standard easing for state changes and enter easing for new surfaces.
- Never delay an action so an animation can finish.
- Respect `prefers-reduced-motion`.
- Avoid springy cards, parallax in app views, looping gradients, and celebratory motion for routine actions.

## 10. Responsive Behaviour

- Mobile: below 768px; single-column creator product, drawer navigation, labelled list rows.
- Tablet: 768–1023px; two-column card layouts where appropriate.
- Desktop: 1024px and above; organization product tables and multi-panel views.
- Wide desktop: 1280px and above; persistent organization navigation and optional detail panels.

The creator product must be fully usable on mobile. Organization mobile must remain functional, but dense administration may recommend desktop without blocking essential actions. Review tasks should remain straightforward on tablet and mobile because reviewers may be occasional users.

## 11. Accessibility

WCAG 2.1 AA is the minimum.

1. Body text and essential controls require at least 4.5:1 contrast.
2. Large text and non-text interface boundaries require at least 3:1.
3. Every interactive control has a visible focus state.
4. Touch targets are at least 44×44px on touch layouts.
5. Meaning is never conveyed by color alone.
6. Icon-only controls require accessible names and tooltips when their meaning is not universal.
7. Dialogs and sheets trap focus, announce their title, and restore focus on close.
8. Tables use semantic headers; reordered or filtered results are announced when necessary.
9. Motion honors reduced-motion preferences.
10. Error copy explains how to recover.

## 12. Content and Interface Voice

Use plain industry nouns and direct actions. Personality belongs in supportive microcopy, onboarding, and empty states—not in navigation labels or critical instructions.

- Say “Submission,” not “submission package.”
- Say “Work,” not “submission item.”
- Say “Team,” not “entity.”
- Say what changed and why.
- Avoid robotic confidence language, unexplained scores, punitive rejection language, and generic “No data” empty states.

## 13. Do and Do Not

### Do

- Start every primary surface on white.
- Preserve visible hierarchy with spacing, type, and hairline borders.
- Use cards for creator flows and tables for genuinely tabular organization data.
- Keep primary actions scarce and obvious.
- Expose reasons behind recommendations and changes.
- Show immediate feedback after every mutation.
- Use real product content in examples and marketing mockups.

### Do not

- Do not restore an off-white or paper-colored page canvas.
- Do not turn Missa into a dark-first developer tool.
- Do not copy Notion blue, Linear purple, or Sanity coral as Missa’s brand color. Legacy Aubergine is not a current action token.
- Do not use gradients as a substitute for hierarchy.
- Do not put every control in a pill or every block in a rounded card.
- Do not make organization workflows spacious at the expense of scanning speed.
- Do not make creator workflows dense at the expense of calm comprehension.
- Do not introduce new colors, fonts, radii, or spacing values inside a component.

## 14. Implementation Contract

1. Use the existing shadcn/ui primitives as the base component layer.
2. Map implementation variables to the semantic tokens in this file.
3. Components reference semantic or component tokens, never primitive hex values directly.
4. New variants must document their purpose, states, responsive behaviour, and accessibility requirements.
5. Existing business logic and product vocabulary must not be changed as part of visual restyling.
6. Validate desktop, 390px mobile, keyboard navigation, focus order, loading, empty, error, and populated states.
7. Treat this file as a living draft until the major representative screens have been reviewed together.

## 15. Open Decisions

The following remain intentionally provisional:

- whether the same Ysabeau variable file should be split into separately named Office and SC font assets;
- the final strength of Forest in active navigation;
- the exact organization navigation shell: top navigation, sidebar, or adaptive hybrid;
- whether dark mode becomes a supported product theme;
- the final border contrast after reviewing real white-canvas screens.

Resolve these through representative screens, then update this file rather than accumulating one-off exceptions in code.
