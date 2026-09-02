# Coss UI adoption assessment

**Status:** Approved as a design and component reference; selective pilot required before repository-wide adoption.

**Primary sources:**

- https://coss.com/ui/docs
- https://coss.com/ui/docs/get-started
- https://coss.com/ui/docs/styling
- https://coss.com/ui/docs/radix-migration
- https://coss.com/ui/docs/roadmap
- https://coss.com/ui/llms.txt

## Why it fits Missa

Coss UI is built on Base UI, React, Tailwind CSS 4, and the shadcn copy-and-own registry model. Missa already uses those foundations. Coss also distinguishes primitives, particles, and API-connected atoms, which maps well to Missa's intended layers of accessible controls, composed product patterns, and domain-connected workflows.

Its strengths are most relevant to Missa's operational surfaces: compact controls, consistent states, form composition, tables, drawers, sheets, dialogs, commands, sidebars, validation, and production-oriented patterns.

## Boundaries

Coss is early access, and Base UI is still described by Coss as beta. Breaking changes are therefore an active adoption risk.

`@coss/ui` expands to the complete primitive registry and would overlap many files already present under `apps/web/components/ui`. It must not be added wholesale to the shared component directory without a file-level diff and migration ledger.

`@coss/style` is a complete neutral theme. It adds the entire UI registry, fonts, sidebar variables, base styles, Inter, and Geist Mono. It would overwrite or compete with Missa's current global tokens and pre-empt the open visual-identity decision. Do not install it into the main application before the visual-foundation gate.

`@coss/ui @coss/colors-neutral` also changes global semantic colors. Treat the neutral palette as a visual-direction input and possible operational foundation, not an approved Missa identity.

Coss's default controls are deliberately compact. Its default button is 32px and its large button is 36px. Public and creator touch layouts still require 44px targets; compact sizes are candidates for desktop organization and admin surfaces only.

Coss semantic badges and alerts do not replace Missa's evidence model. Verified, source-reported, inferred, inherited, conflicting, stale, unknown, and superseded information require Missa-owned anatomy, labels, provenance, freshness, and disclosure.

## Adoption model

1. Keep Base UI as the shared primitive foundation.
2. Use Coss documentation and `llms.txt` as implementation intelligence.
3. Evaluate individual Coss primitives and particles in an isolated component workshop.
4. Import selected source files only after reviewing API differences, dependencies, accessibility, responsive behavior, and token usage.
5. Wrap or adapt selected components behind Missa-owned semantic components and canonical view models.
6. Preserve 44px touch behavior for public and creator surfaces; allow documented compact variants for mouse/keyboard operational surfaces.
7. Keep typography, brand color, evidence states, object anatomy, and product patterns under the product-wide visual-foundation decision.
8. Record replacements and compatibility behavior in the route/component migration ledger.

## First pilot set

The first evaluation should cover high-value particles and primitives that exercise both creator and operational needs without imposing a visual identity:

- Field, Fieldset, Form, Input Group, and Number Field;
- Drawer and Sheet;
- Dialog and Alert Dialog;
- Select, Combobox, and Autocomplete;
- Table, Toolbar, Pagination, and Sidebar;
- Empty, Skeleton, Progress, and Toast;
- Group and Segmented Control.

Do not begin with Card, Badge, or the full style preset. Those components would prematurely bias the new visual language and evidence treatment.

## Decision

Coss UI becomes an approved reference and selective component source. It does not become Missa's design system, theme, or product semantics. The initial adoption mechanism is an isolated pilot followed by named, reviewed imports—not a whole-registry installation into the current shared component directory.
