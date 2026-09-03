---
version: "0.2"
name: "Missa"
status: "draft"
description: "The binding visual and component-construction contract for Missa. It combines editorial public experiences with precise operational workflows and requires approved shadcn or Coss components to be adapted through Missa tokens and product semantics."

references:
  agent_contract: "AGENTS.md"
  ai_ui_directive: "docs/ai-ui-build-directive.md"
  color_direction: "docs/missa-color-direction.md"
  coss_adoption: "docs/design-references/coss-ui-adoption-2026-08-31.md"
  shadcn_config: "apps/web/components.json"
  component_policy: "apps/web/component-policy.json"
  component_catalogue: "apps/web/component-catalogue.json"
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
    typography:
      editorial: "Newsreader"
      interface: "Instrument Sans"
      data: "Fragment Mono"

  semantic:
    typography:
      display-editorial: "{tokens.primitive.typography.editorial}"
      heading-editorial: "{tokens.primitive.typography.editorial}"
      heading-interface: "{tokens.primitive.typography.interface}"
      body: "{tokens.primitive.typography.interface}"
      label: "{tokens.primitive.typography.interface}"
      action: "{tokens.primitive.typography.interface}"
      data: "{tokens.primitive.typography.data}"
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

AI-authored changes must also follow [`AGENTS.md`](./AGENTS.md) and the reusable
[`AI UI build directive`](./docs/ai-ui-build-directive.md). Those entrypoints
reference this file; they do not redefine it. The machine-readable selection
rules in [`apps/web/component-policy.json`](./apps/web/component-policy.json)
must remain equivalent to the human-readable component contract below.

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

The primary canvas is **true white (`#ffffff`)**. Do not tint the page background cream, beige, parchment, or paper. Character should come from typography, imagery, writing, and the restrained Forest accent—not from the canvas.

Subtle neutral surfaces may be used to group controls or distinguish selected and hovered states, but a page should still read as white first.

## 2. Three Interface Registers

### Marketing

Marketing is the most expressive register. Use generous white space, strong editorial composition, restrained motion, real product views, and occasional photographic or moving imagery. Newsreader may carry major statements without turning the page into a literary journal facsimile; Instrument Sans keeps navigation and actions contemporary and legible.

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
- **Mineral blue:** neutral information when Forest would incorrectly imply an action or warning.

### Color rules

1. A normal view should have at most one Forest-filled primary action.
2. Never use semantic color without a text label or icon that conveys the same meaning.
3. Declined, withdrawn, archived, and closed are neutral states unless action is required.
4. Do not create rainbow dashboards. Semantic colors communicate meaning; they are not decoration.
5. Prefer borders and spacing over tinted card backgrounds.
6. Large Forest or Lichen background sections are exceptional editorial treatments, not routine product surfaces.

## 4. Typography

Missa uses an editorial family, an interface family, and a narrowly scoped data
companion. The font tokens loaded by `apps/web/app/layout.tsx` are authoritative.
Typography follows the role of the content, not the route on which it appears.

### Families

- **Newsreader:** editorial display, public page headlines, opportunity and Work titles, portfolio identity, introductions, quotations, and authored work. Do not use it for controls, navigation, forms, dense tables, or operational status text.
- **Instrument Sans:** navigation, UI headings, body copy, forms, buttons, labels, explanations, cards, tables, and actions. It is the default whenever the text helps a person operate the product.
- **Fragment Mono:** scan-critical dates, deadlines, money, percentages, counts, IDs, versions, measurements, and compact technical metadata. Do not use it for sentences, button labels, badges, or decorative editorial effect.

### Type scale

| Role                 | Family          | Size | Weight | Line height | Tracking |
| -------------------- | --------------- | ---: | -----: | ----------: | -------: |
| Marketing display    | Newsreader      | 64px |    500 |        0.98 | -0.035em |
| Page display         | Newsreader      | 48px |    500 |        1.02 | -0.025em |
| Editorial page title | Newsreader      | 40px |    500 |        1.08 |  -0.02em |
| App page title       | Instrument Sans | 32px |    650 |        1.15 | -0.025em |
| Section title        | Instrument Sans | 24px |    650 |        1.20 |  -0.02em |
| Editorial card title | Newsreader      | 20px |    550 |        1.22 | -0.012em |
| Interface card title | Instrument Sans | 18px |    650 |        1.30 | -0.012em |
| Body large           | Instrument Sans | 18px |    400 |        1.55 | -0.005em |
| Body                 | Instrument Sans | 16px |    400 |        1.50 |        0 |
| UI text              | Instrument Sans | 14px |    500 |        1.40 |        0 |
| Caption              | Instrument Sans | 12px |    600 |        1.40 |   0.01em |
| Data                 | Fragment Mono   | 13px |    400 |        1.40 |        0 |

### Typography rules

1. Newsreader supplies editorial voice; Instrument Sans supplies interface clarity. Do not simulate this contrast with arbitrary weight changes.
2. Never set full paragraphs or table content at display weights.
3. Use sentence case for buttons, navigation, table headings, and badges.
4. Uppercase is reserved for very small taxonomy labels; never use it for primary navigation.
5. Use tabular numerals for changing counts, dates, money, and scores.
6. Headings should be short and direct. Do not compensate for vague copy with oversized type.
7. Product code uses `--font-editorial`, `--font-interface`, or `--font-data`; do not declare a font family directly in a feature stylesheet.
8. Public portfolios may use Newsreader more extensively for authored work, but their controls and navigation remain Instrument Sans.

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

| Type       | What it is                                 | Example                                        |
| ---------- | ------------------------------------------ | ---------------------------------------------- |
| **Inset**  | Padding inside a container                 | Card padding, page gutter                      |
| **Stack**  | Vertical space between stacked elements    | Row to row, group to group, section to section |
| **Inline** | Horizontal space between adjacent elements | Button to button, label to control             |
| **Gap**    | Space between grid or flex children        | Card grid, sample-mode columns                 |

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

| Mode            | Base | Row | Group | Section | Inset | Gap |
| --------------- | ---: | --: | ----: | ------: | ----: | --: |
| **Compact**     |    8 |   8 |    16 |      32 |    16 |  16 |
| **Comfortable** |   12 |  12 |    24 |      48 |    24 |  24 |
| **Spacious**    |   16 |  16 |    32 |      64 |    32 |  32 |

Spacious may use **96** for a major break between top-level page sections on
marketing surfaces. This is the only permitted value outside the ladder, and
it is a Stack value only.

Borderless grid children use the next step up for Gap, because space is the
only boundary. Bordered or filled children use the ladder value.

### Surface family assignment

| Family             | Mode        | Routes                                                                                                           |
| ------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| Public / marketing | Spacious    | `/`, `/guides`, `/guides/*`, `/about`, `/methodology`, `/discover/*`                                             |
| Public record      | Comfortable | `/opportunities`, `/opportunities/*`, `/journals/*`, `/@handle`, `/profile/*`                                    |
| Creator product    | Comfortable | `/profile`, `/settings/*`, `/tracker`, `/library/*`, `/inbox`, `/calendar`                                       |
| Organization       | Compact     | Organization workspace, builder, submissions, reviews, decisions, messages, delivery, insights, people, settings |
| Reviewer           | Compact     | Reviewer queue and work surfaces                                                                                 |
| Platform Admin     | Compact     | All admin routes                                                                                                 |

A surface does not mix modes. A dense table inside a Comfortable surface may
keep Comfortable stacks around it and use Compact internally only within the
table itself; declare that explicitly.

### Fixed relationship tokens

These concern hit targets and attachment, not reading rhythm, so they do not
vary by mode.

| Relationship                          |                                                               Value |
| ------------------------------------- | ------------------------------------------------------------------: |
| Label to its control                  |                                                                   8 |
| Helper text to the thing it qualifies |                                                                   8 |
| Adjacent bordered or filled controls  |                                                                  12 |
| Adjacent borderless controls          |                                                                  24 |
| Unrelated control groups              |              24 minimum, and at least 2× the intra-group inline gap |
| Minimum control height and hit target | 44 (Profile/public), 36 (Compact surfaces), never below 44 on touch |

### Page gutters

| Mode        | < 640 | 640–1024 | > 1024 |
| ----------- | ----: | -------: | -----: |
| Compact     |    16 |       24 |     24 |
| Comfortable |    24 |       32 |     48 |
| Spacious    |    24 |       40 |     64 |

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

| Failure           | What it looks like                                 | Missa example                                       |
| ----------------- | -------------------------------------------------- | --------------------------------------------------- |
| Sloppy spacing    | Repeated relationships use different gaps          | ~150px void above an audio player from grid stretch |
| Border bloat      | Every group gets another outline                   | Credits boxed instead of hairline-separated         |
| Broken continuity | The eye bounces; content sits off the obvious path | Profile name detached from the body column          |
| Content cramming  | The layout uses every pixel                        | Video still overflowing its card                    |
| Overlap           | Absolute positioning without a container guard     | Fixture labels printed on top of fixtures at 390px  |

## 7. Shape, Borders, and Depth

Missa uses sober rectangular geometry:

- 4px: tiny tags and utility controls;
- 8px: buttons, inputs, segmented controls, menus;
- 12px: cards, dialogs, sheets, and larger panels;
- 16px: media and rare feature containers;
- full radius: badges, avatars, and compact status pills only.

Primary buttons are not pills. Cards are not floating bubbles.

Depth is mostly created by white surfaces, neutral surface changes, hairline borders, and clear spacing. Use the subtle shadow only where a white object would otherwise disappear. Reserve the overlay shadow for dialogs, popovers, command menus, and sheets.

## 8. Component Construction Contract

Missa uses the copy-and-own shadcn model. Shadcn, Shadcn Studio, and selectively
approved Coss components are the default construction kit. They provide
accessible structure and implementation quality; Missa tokens and product
semantics provide the visual identity.

Do not create a local substitute merely because a registry component needs
styling. Adapt the registry component with Missa semantic and component tokens.
Custom implementation is the last option, not the starting point.

### Required component workflow for humans and AI

Before implementing any interface element:

1. Name the user intent: action, selection, disclosure, navigation, status,
   feedback, data display, or product composition.
2. Check `apps/web/components/ui` for an installed component that satisfies it.
3. Search and inspect the configured registries in `apps/web/components.json`:
   shadcn first, then the licensed `@ss-components`, `@ss-blocks`, and
   `@ss-pages` catalogues. Use Coss only through the selective-adoption rules in
   `docs/design-references/coss-ui-adoption-2026-08-31.md`.
4. View the registry item before installing it. Review its source, dependencies,
   keyboard behavior, ARIA behavior, responsive behavior, and overwrite diff.
5. Prefer an existing installed primitive; otherwise import the smallest
   suitable component or block. Never import a full vendor theme.
6. Map all styling to Missa primitive, semantic, and component tokens. Remove
   bundled fonts, raw colors, arbitrary radii, shadows, and motion that conflict
   with this document.
7. Wrap domain meaning in a Missa semantic component when the same meaning will
   recur across routes.
8. Record the source, installed path, approved variants, and product usages in
   the component ledger below.
9. Validate populated, empty, loading, error, disabled, keyboard, 390px mobile,
   200% zoom, and reduced-motion states as applicable.

If no registry component fits, document what was searched and which functional,
accessibility, or semantic requirement failed before authoring a custom component.

### Component layers and import boundary

```text
Missa foundations and tokens
        ↓
shadcn / licensed Studio / selected Coss source
        ↓
installed primitives in components/ui
        ↓
Missa semantic components
        ↓
Missa product compositions
        ↓
routes and features
```

- **Installed primitives** own base interaction, focus, disabled behavior, and
  structural accessibility. They may be used directly only for generic UI.
- **Semantic components** own recurring Missa meaning, including its label,
  icon, color role, density, motion permission, and accessible output.
- **Product compositions** own domain anatomy and conditional fields. They are
  reusable across public and authenticated presentations.
- Feature code must not recreate an existing semantic component with raw
  primitives and utility classes.
- A registry block may accelerate composition, but it never overrides Missa
  content hierarchy, tokens, or information policy.

### Source precedence

| Need                                      | Preferred source                          | Rule                                                                                 |
| ----------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Standard accessible control               | Installed shadcn/Base UI primitive        | Reuse before installing another implementation                                       |
| Missing standard control                  | shadcn registry                           | Inspect, then install the smallest item                                              |
| Polished composition or pattern           | Licensed `@ss-components` or `@ss-blocks` | Keep structure; replace vendor styling with Missa tokens                             |
| Complete page reference                   | Licensed `@ss-pages`                      | Reference or selectively extract; never paste a whole page into production unchanged |
| Operational particle unavailable above    | Selected Coss item                        | Pilot and diff; do not install `@coss/style` or the full registry                    |
| Missa domain meaning                      | Missa semantic wrapper                    | Required when meaning repeats or has product-specific states                         |
| Novel interaction absent from all sources | Custom component                          | Requires documented search, rationale, and full state coverage                       |

### Installed component ledger

Presence in `apps/web/components/ui` means available for evaluation, not blanket
approval. The status below controls new usage.

| Status           | Meaning                                                          |
| ---------------- | ---------------------------------------------------------------- |
| `approved`       | May be used for the documented intent                            |
| `approved-adapt` | Use only after composing with Missa tokens or semantics          |
| `internal`       | Dependency of another component; not a feature-level choice      |
| `experimental`   | Prototype/gallery use until interaction and accessibility review |
| `deprecated`     | Do not introduce; migrate existing usage                         |

| Family                  | Installed components                                                                                                            | Status and permitted use                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Actions                 | `button`, `button-group`                                                                                                        | `approved`; actions and grouped actions                                                                       |
| Form foundation         | `field`, `label`, `input`, `textarea`, `checkbox`, `radio-group`, `switch`, `slider`, `input-group`, `input-otp`, `phone-input` | `approved`; use `Field` composition and visible labels                                                        |
| Choice and search       | `native-select`, `select`, `combobox`, `autocomplete`, `multi-select`, `command`                                                | `approved-adapt`; choose by option count and interaction need, not visual preference                          |
| Navigation              | `breadcrumb`, `navigation-menu`, `menubar`, `sidebar`, `tabs`, `pagination`                                                     | `approved-adapt`; route, peer-view, and shell semantics must remain distinct                                  |
| Disclosure              | `accordion`, `collapsible`                                                                                                      | `approved`; in-flow progressive disclosure                                                                    |
| Overlays                | `tooltip`, `popover`, `dropdown-menu`, `context-menu`, `dialog`, `alert-dialog`, `sheet`, `drawer`, `hover-card`                | `approved-adapt`; select using the overlay decision matrix; `hover-card` cannot contain essential content     |
| Content structure       | `card`, `item`, `separator`, `aspect-ratio`, `scroll-area`, `resizable`                                                         | `approved-adapt`; never use as decoration-only wrappers                                                       |
| Identity and metadata   | `avatar`, `badge`, `kbd`, `code-block`, `rating`                                                                                | `approved-adapt`; Badge requires a semantic wrapper for domain states                                         |
| Data and workflow       | `table`, `calendar`, `kanban`, `sortable`, `stepper`, `chart`, `circular-progress`                                              | `approved-adapt`; validate keyboard, reordering, mobile, and data semantics per use                           |
| Feedback                | `alert`, `empty`, `sonner`, `progress`, `spinner`, `skeleton`, `shimmer-skeleton`                                               | `approved`; shimmer only for loading structure                                                                |
| Motion controls         | `motion-toggle`, `motion-toggle-group`, `motion-switch`, `motion-carousel`, `ripple-button`                                     | `experimental`; do not use in production until the component-specific motion and reduced-motion review passes |
| Base selection controls | `toggle`, `toggle-group`                                                                                                        | `approved-adapt`; use through named view-mode or filter compositions                                          |
| Media browsing          | `carousel`                                                                                                                      | `approved-adapt`; use only when sequence is meaningful and all items remain keyboard accessible               |

When a new registry item is installed, add it to this ledger in the same change.
An AI-generated component that duplicates an approved item fails review.

### Product composition map

| Product need                   | Composition                   | Required building blocks                                                                       |
| ------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Browse opportunities           | `OpportunityBrowseToolbar`    | `Field`, `InputGroup`, `Button`, `FilterChip`, `Select`, responsive `Sheet`                    |
| Display an opportunity result  | `OpportunityCard`             | `Item` or `Card`, semantic badges, dedicated title link, `SaveAction`, optional official media |
| Decide whether to apply        | `OpportunityDecisionSummary`  | structured list, `Separator`, semantic state components; omit irrelevant unknown fields        |
| Explain organization authority | `OrganizationAuthorityPanel`  | `Avatar`, structured facts, `AuthorityBadge`, organization link                                |
| Explain a recommendation       | `MatchExplanationTrigger`     | `Button` trigger, score treatment, `Popover`, reasons and watchouts                            |
| Save an opportunity            | `SaveAction`                  | `Button`; signed-out intent preservation, loading, saved, and failure feedback                 |
| Add to Tracker                 | `TrackerAction`               | `Button`, optional `DropdownMenu` for stage, `Sonner` or inline recovery                       |
| Filter on mobile               | `OpportunityFilterSheet`      | same filter model as desktop, `Sheet`, `Field`, selection controls, result count               |
| Track applications             | `TrackerBoard` / `TrackerRow` | `Kanban` or `Table` by view, `Badge` semantics, menus and dialogs                              |
| Edit a Work                    | `WorkEditor`                  | `Field`, form controls, `Sortable`, media blocks, `Dialog`/`Sheet`, process feedback           |
| Manage calendar                | `OpportunityCalendar`         | `Calendar`, labelled events, `Popover` or side panel, provider sync status                     |
| Configure Profile              | `ProfileSettingsForm`         | `Tabs` only for same-route peer sections, `Field`, form controls, inline feedback              |
| Present an artist              | `PortfolioIdentityHeader`     | editorial typography, `Avatar`/media, restrained actions; no dashboard chrome                  |
| Present portfolio work         | `PortfolioWorkCard`           | media with aspect ratio, editorial title, credits, accessible captions                         |
| Operate submissions            | `SubmissionTable`             | `Table`, semantic workflow states, row actions, responsive labelled records                    |
| Confirm destructive work       | `DestructiveConfirmation`     | `AlertDialog`, explicit object name and consequence, destructive final action                  |

### Component specification template

Every approved semantic component and product composition documents:

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

### Primitive decision matrix

| User intent                            | Required component                            | Do not substitute                                  |
| -------------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| Trigger an action                      | `Button`                                      | Badge, clickable `div`, or text with click handler |
| Enter short free text                  | `Field` + `Input`                             | Placeholder-only input                             |
| Enter long text                        | `Field` + `Textarea`                          | Contenteditable without editor requirements        |
| Choose one short option list           | `RadioGroup`                                  | Multiple checkboxes                                |
| Choose one compact menu option         | `Select` or `NativeSelect`                    | Popover with handmade listbox                      |
| Search a long option list              | `Combobox` or `Autocomplete`                  | Select with hundreds of items                      |
| Toggle a persistent setting            | `Switch`                                      | Badge or checkbox styled as a switch               |
| Select multiple items                  | `Checkbox` group or `MultiSelect`             | Toggle buttons without group semantics             |
| Switch peer views in one context       | `Tabs`                                        | Route navigation or badges                         |
| Apply a removable filter               | Missa `FilterChip` built on `Toggle`/`Button` | Read-only Badge                                    |
| Brief supplementary explanation        | `Popover`                                     | Dialog or essential Tooltip content                |
| Explain an unfamiliar icon             | `Tooltip`                                     | Hidden essential instructions                      |
| Small action list                      | `DropdownMenu`                                | Select used for commands                           |
| Consequential confirmation             | `AlertDialog`                                 | Toast or browser confirm                           |
| Focused task blocking page interaction | `Dialog`                                      | Popover for multi-field workflows                  |
| Mobile filters or edge workflow        | `Sheet`                                       | Separate filtering implementation                  |
| Mobile bottom action chooser           | `Drawer`                                      | Desktop dialog forced onto mobile                  |
| In-flow single disclosure              | `Collapsible`                                 | Modal overlay                                      |
| In-flow disclosure group               | `Accordion`                                   | Multiple unrelated dialogs                         |
| Transient mutation confirmation        | `Sonner` toast                                | Persistent banner                                  |
| Local recoverable problem              | `Alert` or inline field message               | Destructive toast only                             |
| Loading shape                          | `Skeleton`                                    | Spinner replacing an entire structured page        |
| Active indeterminate process           | `Spinner` + text                              | Animated static badge                              |
| Measurable process                     | `Progress` + text value                       | Decorative animation                               |
| Tabular comparison                     | `Table`                                       | Grid of cards                                      |
| Calendar/date choice                   | `Calendar`                                    | Handmade date grid                                 |
| No available content                   | `Empty`                                       | Blank panel or “No data”                           |

### Buttons

Use the installed `Button` primitive. Approved variants are semantic:

| Variant       | Use                                                                        |
| ------------- | -------------------------------------------------------------------------- |
| `default`     | The single dominant forward action in a region; Forest fill                |
| `outline`     | Supporting or reversible local action                                      |
| `secondary`   | Quiet action on a grouped or tinted surface                                |
| `ghost`       | Repeated row, toolbar, or navigation action                                |
| `destructive` | The final destructive action, normally inside confirmation                 |
| `link`        | Inline navigation that must visually read as a link                        |
| `shine`       | Not approved for routine product UI; experimental marketing-only treatment |

Primary buttons use Forest, white text, and an 8px radius. All buttons need
default, hover, active, focus-visible, loading, and disabled states. Loading
preserves width and sets `aria-busy`. Icon-only buttons require an accessible
name; provide a tooltip when the action is not universally understood.

### Inputs and form controls

- Compose form controls with `Field`; keep visible labels and associated helper
  or error text.
- Use 44px controls on public and creator surfaces. A documented 36px compact
  variant is allowed for pointer/keyboard organization workflows, but touch
  targets remain 44px.
- Use white background, strong neutral border, 8px radius, and a separated 2px
  Forest focus ring.
- Validate on blur or submit unless immediate validation prevents invalid input.
- Place recovery guidance with the error. Placeholders never replace labels.

### Cards, items, tables, and structured lists

Use `Card` only when content is a bounded object, summary, or actionable module.
Use `Item` for repeated list records and `Table` for genuinely comparable rows.
Do not use a card merely to create spacing or a border.

Creator cards use white, a hairline border, 12px radius, and 24px padding.
Organization cards are reserved for summaries, grouped controls, and review
tasks. Submission inventories and decision queues use tables or structured lists.
Do not make an entire card interactive when it contains nested Save, menu, or
other controls; use a dedicated title or primary-action link.

Tables keep headers visible, align dates/counts/fees consistently, and use
Fragment Mono only for scan-critical values. Narrow presentations become
labelled records; they do not compress until unreadable.

### Badge and compact-state contract

A `Badge` is compact, read-only metadata. It is not a button, filter, tab,
navigation item, or decoration. Product code should use a semantic badge rather
than selecting the primitive variant or color directly.

| Meaning                        | Missa component                               | Treatment                                           | Motion                                         |
| ------------------------------ | --------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| Opportunity type or discipline | `CategoryBadge`                               | Neutral outline or quiet neutral surface            | Never                                          |
| Opens soon                     | `OpportunityStatusBadge state="opening-soon"` | Mineral information                                 | Never                                          |
| Open or always open            | `OpportunityStatusBadge state="open"`         | Quiet Forest; explicit label                        | Never                                          |
| Closing soon                   | `UrgencyBadge`                                | Ochre warning; exact date or days remaining         | Never                                          |
| Closed or archived             | `OpportunityStatusBadge state="closed"`       | Neutral muted                                       | Never                                          |
| Free to submit                 | `FeeBadge amount={0}`                         | Quiet Lichen when scan value warrants it            | Never                                          |
| Confirmed organization         | `AuthorityBadge`                              | Forest or Mineral with scoped text                  | Never                                          |
| Personalized fit               | `MatchExplanationTrigger`                     | Mineral/Forest score; real button opening `Popover` | Badge itself never animates                    |
| Draft/published/archived       | `PublicationStateBadge`                       | Restrained workflow token                           | Only while actively transitioning              |
| Uploading/syncing/processing   | `ProcessBadge`                                | Information state with animated indicator           | Only while process is active                   |
| Failed process                 | `ProcessBadge state="failed"`                 | Destructive icon and text with nearby recovery      | Never pulse                                    |
| Unread or selected count       | `CountBadge`                                  | Compact neutral/accent                              | Optional finite entrance when becoming nonzero |
| Paid or restricted feature     | `PlanBadge`                                   | Neutral premium treatment                           | Never                                          |

Badge copy uses customer language, never backend enums: `Closes in 6 days`,
`Opens Sep 14`, `Always open`, `Free to submit`, `Organization confirmed`,
`96% match`, `Publishing…`, and `Sync failed`.

Unknown data is not automatically a badge. Show an unknown or conflict state
only when the absence changes a decision. For example, omit location when an
opportunity does not require location; do not display `Location not listed`.

### Navigation and selection

Marketing navigation is light and spacious. Creator navigation prioritizes
Opportunities, Inbox, and Tracker. Organization navigation prioritizes
Opportunities, Submissions, Reviews, Decisions, Messages, Delivery, Insights,
and Settings.

Active navigation uses Forest text, icon, or a restrained indicator—not a large
colored capsule. Use `aria-current` for route navigation. Use `Tabs` only for
peer views whose content changes in place. Use `aria-pressed` for toggles and
filter chips. Keyboard shortcuts always have a visible non-keyboard equivalent.

### Explained scores

Every Fit Score, Trust Score, or confidence result includes its explanation.
A `MatchExplanationTrigger` is a real `Button` with compact score presentation;
it opens a `Popover` containing reasons, watchouts, and disqualifiers. It uses
`aria-expanded` and `aria-controls`. Never show a bare numeric score and never
rely on semantic color alone.

### Feedback and changing state

| Situation                                      | Component                                                |
| ---------------------------------------------- | -------------------------------------------------------- |
| Successful local mutation                      | `Sonner` toast; short and transient                      |
| Field validation                               | Inline `Field` error                                     |
| Local recoverable failure                      | Inline `Alert` with recovery action                      |
| Account, permission, billing, or session issue | Persistent `Alert` banner                                |
| Consequential confirmation                     | `AlertDialog`                                            |
| Structural loading                             | `Skeleton` or `ShimmerSkeleton` with stable dimensions   |
| Active measurable work                         | `Progress` with textual value                            |
| Active unmeasurable work                       | `Spinner` with textual status                            |
| Empty collection                               | `Empty` with specific explanation and useful next action |

Declined is not a failure alert. Submitted is a neutral process state, not
success green. Change diffs show “was” and “now” explicitly; deadline changes
add Ochre only when the new value requires attention.

## 9. Interaction and Motion

Motion explains change and confirms response. It is not ambient decoration inside the product.

- Hover and press: 120ms.
- Menus, tooltips, and small disclosures: 180ms.
- Dialogs, sheets, and page-level reveals: 280ms maximum.
- Use standard easing for state changes and enter easing for new surfaces.
- Never delay an action so an animation can finish.
- Respect `prefers-reduced-motion`.
- Avoid springy cards, parallax in app views, looping gradients, and celebratory motion for routine actions.

An animated component must pass all four gates:

1. The underlying state is currently changing or has just changed.
2. Motion materially improves comprehension of that change.
3. The motion stops when the state stops, or completes once after the change.
4. Text, iconography, and accessible state provide an equivalent without motion.

Indefinite motion is permitted only for a confirmed active process such as
uploading, syncing, processing, or publishing. Animate the indicator rather
than the whole badge. Deadlines, fees, eligibility, verification, match scores,
premium labels, categories, and persistent warnings never pulse, bounce,
shimmer, or glow. Skeleton shimmer is limited to unresolved loading structure.
No list may contain multiple independently looping attention animations.

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

1. Use installed shadcn/Base UI primitives first. Search and view configured
   shadcn and licensed Studio registries before authoring a missing component.
2. Import selected Coss components only through the approved selective pilot;
   never install `@coss/style`, a vendor font stack, or a complete registry over
   the Missa application.
3. Treat imported source as owned code: inspect its diff, dependencies,
   accessibility, interaction states, and upgrade risk before accepting it.
4. Map implementation variables to the primitive → semantic → component token
   chain in this file. Components reference semantic or component tokens, never
   primitive hex values directly.
5. Feature code selects product meaning, not styling. Repeated meanings use
   semantic components such as `UrgencyBadge`, `SaveAction`, or `FilterChip`.
6. Do not create custom variants in route code. A new variant must document an
   unmet product intent, source search, states, responsive behavior,
   accessibility, tokens, tests, and owner.
7. Maintain a component gallery with every approved semantic state and a ledger
   marking components `experimental`, `approved`, or `deprecated`.
8. Restrict direct primitive imports where a semantic component exists. Add
   lint rules against arbitrary colors, font families, radii, shadows, and
   animation utilities in feature code.
9. Existing business logic and product vocabulary must not change as part of
   visual restyling.
10. Validate desktop, 390px mobile, 200% zoom, keyboard navigation, focus order,
    loading, empty, error, disabled, long-content, and populated states.
11. Validate `prefers-reduced-motion`; animation must never be the only state
    signal and must not change layout.
12. A registry block is a starting structure, not approval to bypass Missa’s
    information hierarchy, privacy, authority, or conditional-field rules.
13. Treat this file as binding for new UI. Existing non-compliant components
    enter the migration ledger and must not be copied into new work.

## 15. Open Decisions

The following remain intentionally provisional:

- the exact Newsreader optical-size and weight tuning after representative public, creator, organization, and portfolio screens are reviewed;
- the final strength of Forest in active navigation;
- the exact organization navigation shell: top navigation, sidebar, or adaptive hybrid;
- whether dark mode becomes a supported product theme;
- the final border contrast after reviewing real white-canvas screens.

Resolve these through representative screens, then update this file rather than accumulating one-off exceptions in code.
