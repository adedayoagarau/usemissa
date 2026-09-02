# Missa Homepage Design-Engineering Specification

Status: local review concept; not production-promoted

Route: `/design-system/homepage-future`

## Product direction

The future Missa homepage is a public access doorway into a source-first Opportunity product. It borrows Melius's narrative rhythm and progressive reveal, but its promise is Missa-specific: help a creator see what is open, understand what a call asks, and keep the next action visible.

The page must never use fabricated Opportunities, popularity metrics, unsupported freshness claims, testimonials, pricing, or decorative product dashboards. Public Opportunity reading is open only when the access policy says it is open. Authentication is reserved for private persistence such as Save-to-Tracker.

## Reference synthesis

| Reference                | Reusable pattern                                                        | Missa adaptation                                                          | Boundary                                                               |
| ------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Melius                   | Narrative pacing, progressive showcase, clear category transitions      | Move from doorway to evidence to Opportunity horizon to next action       | Do not copy AI canvas language, imagery, or product theatre            |
| The Content Architecture | Editorial authority, black-and-white restraint, statement-led hierarchy | Give evidence and methodology visual weight                               | Do not imply editorial authority that the source data does not support |
| Ploy                     | Feature grouping and energetic product rhythm                           | Use grouped principles and a connected Inspect → Decide → Keep → Act path | Avoid motion as a substitute for usable information                    |
| Fixa                     | Conversion structure and service explanation                            | Make the access state and next action explicit                            | Do not add a generic SaaS pricing or lead-generation funnel            |
| Railway                  | Technical clarity and trust through precise explanation                 | Name the public/private boundary and source relationship plainly          | Do not expose internal infrastructure as product proof                 |
| Lassie                   | Warm, human entry point and approachable access language                | Make waitlist and closed states feel clear rather than punitive           | Do not use emotional pressure or scarcity claims                       |

The current Flim Mobbin record is excluded because its supplied section URL returns a 404. It is not used as evidence.

## Homepage anatomy

1. Local review banner with the promotion boundary.
2. Public navigation: Opportunities, Guides, For organizations, Methodology, Sign in, and the current access action.
3. Hero: “See what’s open. Know what it asks. Keep moving.”
4. Access doorway reflecting `closed`, `waitlist`, or `open`.
5. Principle rail: official source attached, unknowns visible, decisions private, global field.
6. Opportunity horizon using repository records only when public access is open.
7. Connected path: Inspect → Decide → Keep → Act.
8. Creator and Organization entry points.
9. Evidence ledger and methodology link.
10. Final access CTA and footer.

## Access contract

The shared public access type is:

```ts
type PublicAccessMode = "closed" | "waitlist" | "open";
```

The review route accepts `?access=closed`, `?access=waitlist`, or `?access=open` to inspect each state without changing production routing. The configured `MISSA_PUBLIC_ACCESS_MODE` value is used when no review override is supplied. Local review defaults to `open`; production defaults to the current waitlist-gated composition.

| Mode       | Hero action       | Doorway action       | Opportunity horizon          |
| ---------- | ----------------- | -------------------- | ---------------------------- |
| `closed`   | Understand access | Read methodology     | No records or browse CTA     |
| `waitlist` | Understand access | Join waitlist        | No records or browse CTA     |
| `open`     | Explore horizon   | Browse Opportunities | Real repository records only |

The existing production proxy remains the production access gate. This local route does not replace the root page, alter proxy behavior, or deploy a new access policy.

## Component and state requirements

### Public shell and navigation

- Use the existing Missa wordmark, typography tokens, Button, Sheet, and CSS Modules.
- Preserve a visible keyboard focus ring and a logical desktop/mobile reading order.
- The mobile sheet must expose the same links and access action as desktop.
- The review banner must remain visible on the local route and state that it is not production.

### Access doorway

- Render one policy state at a time.
- Use plain language for closed, waitlist, and open states.
- Link to the existing `/waitlist` flow; do not collect new preferences or Profile fields.
- Never present Browse Opportunities in `closed` or `waitlist`.

### Opportunity horizon and cards

- Query the existing repository with `openNow: true`, soonest deadline ordering, and a limit of three.
- Display title, organization, type, practice, deadline, fee, source state, and detail link.
- Render missing organization, fee, deadline, and source information as unknown/not listed.
- Link to `/opportunities/[slug]` for inspection.
- Empty and unavailable states must explain why records are absent without inventing examples.

### Principle rail, pathway, audience cards, and evidence ledger

- Keep public evidence separate from private Tracker state.
- Explain that a Save is a private decision signal, not eligibility or submission intent.
- Link creator actions to Opportunities or the current access state.
- Keep Organization capability labels bounded to the existing product contract.

## Responsive and accessibility engineering

- Desktop layout uses the editorial two-column and three-card compositions already established by the local route.
- At tablet widths, collapse navigation and reduce multi-column sections without changing content order.
- At mobile widths, use one-column cards, full-width primary actions, a stacked access doorway, and a usable filter console.
- Every section has a semantic heading or labelled landmark.
- Icon-only controls have accessible names; decorative icons use `aria-hidden`.
- Search status and empty/unavailable results use live status or alert semantics appropriately.
- Native links remain links; buttons remain buttons; the mobile Sheet is keyboard operable.
- The page has no required hover-only information.
- `prefers-reduced-motion: reduce` disables the pulse animation and card movement.
- No image or animation is required for the primary content, so the route remains usable without media.
- Copy must tolerate longer organization names, translated labels, and missing optional fields.

## Verification

Focused browser coverage should verify:

- all three access modes show the correct action and never expose a contradictory browse CTA;
- open mode contains no fabricated records and handles empty/unavailable repository results;
- search and filters update the repository-backed cards;
- detail links use the canonical Opportunity slug path;
- mobile and desktop layouts have no horizontal overflow;
- the local review route passes WCAG A/AA automated checks for the supported fixture states;
- reduced-motion behavior removes nonessential animation;
- the root page and production proxy remain unchanged.

## Promotion boundary

The implemented files are limited to the local design-system route, its CSS Module, the shared access-mode helper, this specification, and focused route tests. Production root promotion, proxy changes, data migrations, deployment, and unrelated dirty-tree work require a separate approval.
