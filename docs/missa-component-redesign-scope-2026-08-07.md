# Missa component-by-component redesign scope

**Date:** 7 August 2026  
**Repository:** `@missa/web`  
**Purpose:** Inventory every current UI primitive, shared product component, composite, and route surface that should be audited or redesigned against the Missa design system and any selected shadcn-compatible reference library.

## Scope summary

The current web app contains:

- **53 UI primitives** in `apps/web/components/ui/`.
- **63 shared component files** in `apps/web/components/` outside the primitive folder.
- **59 route and layout surfaces** in `apps/web/app/`.
- Several important nested composites inside chat, library, forms, platform admin, and queue components.

This is a redesign and normalization scope. Existing behavior, tenant boundaries, evidence status, submission state, and accessibility requirements remain authoritative. A reference library supplies patterns and craft; it does not replace Missa’s product semantics or design tokens.

## Design constraints for every component

- Keep the true-white canvas and Missa semantic tokens.
- Preserve the three registers: Marketing, Profile, and Organization.
- Use Ysabeau across display and UI roles, with Office-style optical sizing and tabular numerals for product data; retain Fragment Mono for technical metadata.
- Preserve 44px touch targets in Profile and compact 36px controls where Organization density calls for them.
- Preserve keyboard behavior, focus visibility, reduced motion, loading/error/empty states, and WCAG AA expectations.
- Do not turn evidence, freshness, uncertainty, fee, deadline, or submission state into purely decorative badges.
- Keep canonical taxonomy IDs and URL/API state intact while changing presentation.
- Prefer one shared component with explicit variants over route-specific visual forks.

## Priority and work labels

- **P0 — foundation:** shared primitives or patterns that affect most of the product.
- **P1 — core product:** Creator profile and organization flows used by the main customer journeys.
- **P2 — public and marketing:** public discovery, marketing, authentication, and conversion surfaces.
- **P3 — operations:** internal platform admin and support surfaces.
- **Audit only:** verify behavior/accessibility and tune tokens; do not replace without a demonstrated problem.

## Phase 0 — foundation primitives

These are the 53 existing shadcn/Base UI primitives. The first pass should align their geometry, tokens, states, motion, focus treatment, and density variants. They should not all be rewritten wholesale.

| Primitive | Priority | Redesign focus |
|---|---:|---|
| Accordion | P0 | Disclosure rhythm, heading hierarchy, open/closed motion |
| Alert Dialog | P0 | Destructive confirmation, focus trap, action hierarchy |
| Alert | P0 | Evidence/status messaging, semantic tone, icon and text pairing |
| Aspect Ratio | Audit only | Media behavior and responsive crop defaults |
| Avatar | P0 | Identity fallback, sizes, accessible labels |
| Badge | P0 | Status taxonomy, neutral vs semantic states, compact density |
| Breadcrumb | P0 | Public/organization hierarchy and responsive collapse |
| Button Group | P0 | Primary/secondary action grouping and keyboard behavior |
| Button | P0 | 44px/36px sizes, icon-only states, loading, destructive restraint |
| Calendar | P1 | Deadline clarity, selected date, range states, keyboard navigation |
| Card | P0 | True-white surface, border hierarchy, density variants |
| Carousel | P2 | Marketing/media use, controls, reduced motion |
| Chart | P1 | Analytics colors, legends, empty/unknown data states |
| Checkbox | P0 | Labels, indeterminate state, focus, touch target |
| Collapsible | P0 | Progressive disclosure and mobile behavior |
| Command | P1 | Keyboard-first search, grouped results, empty/loading states |
| Context Menu | P3 | Operational actions, keyboard and touch fallback |
| Dialog | P0 | Content width, overlay, close behavior, mobile adaptation |
| Drawer | P1 | Detail and action workflows, responsive side/bottom variants |
| Dropdown Menu | P0 | Action hierarchy, destructive actions, keyboard behavior |
| Empty | P0 | Reusable product-specific empty states with next action |
| Field | P0 | Consistent label/help/error/required structure |
| Hover Card | P2 | Replace hover-only information where touch access is needed |
| Input Group | P0 | Search, prefix/suffix actions, validation, compact controls |
| Input OTP | Audit only | Authentication usability and paste behavior |
| Input | P0 | 44px/36px sizes, borders, focus, errors, placeholder contrast |
| Item | P0 | List-row anatomy and interactive states |
| Kbd | P1 | Command hints and keyboard affordances |
| Label | P0 | Form semantics and typography |
| Menubar | P2 | Public navigation only if needed; avoid unnecessary complexity |
| Native Select | P0 | Mobile-safe selection and consistent visual treatment |
| Navigation Menu | P2 | Marketing/public header and responsive navigation |
| Pagination | P1 | Opportunity/admin list pagination and URL state |
| Popover | P0 | Filter, picker, and anchored-panel geometry |
| Progress | P1 | Submission/checklist progress and accessible labels |
| Radio Group | P0 | Single-choice forms and visible selection |
| Resizable | P1 | Admin/organization split panes and minimum widths |
| Scroll Area | P1 | Dialog/drawer/list scrolling without trapped focus |
| Select | P0 | Taxonomy/status/role selection and searchability |
| Separator | P0 | Hairline hierarchy without over-sectioning |
| Sheet | P1 | Mobile detail panels, filters, and action surfaces |
| Sidebar | P1 | Profile, Organization, and admin shell variants |
| Skeleton | P0 | Route-specific loading shapes and motion restraint |
| Slider | P1 | Analytics/filter ranges if retained |
| Sonner | P0 | Action feedback, undo, error, and non-blocking status |
| Spinner | P0 | Inline vs page loading; never use as the only state explanation |
| Switch | P0 | Preference/toggle semantics and state labels |
| Table | P1 | Organization/admin density, row actions, responsive fallback |
| Tabs | P1 | Library, admin, and detail sub-navigation |
| Textarea | P0 | Long-form content, helper text, validation |
| Toggle Group | P1 | View modes and mutually exclusive filters |
| Toggle | P1 | Save/follow/filter controls and pressed state |
| Tooltip | P0 | Keyboard-accessible supplementary information; no essential content |

## Phase 1 — shared product primitives and composites

### Brand, shell, and cross-cutting

| Component | File | Priority | Scope |
|---|---|---:|---|
| Missa wordmark | `components/missa-wordmark.tsx` | P2 | Marketing/app sizes, inverse treatment, focus state |
| Public/app navigation | `components/app-nav.tsx` | P1/P2 | Shared responsive header, auth state, active section, organization switcher |
| Organization shell navigation | `components/workspace-shell-nav.tsx` | P1 | Organization information architecture, density, mobile drawer |
| Platform admin navigation | `components/platform-admin-nav.tsx` | P3 | Admin shell, active state, grouped operations, responsive collapse |
| Platform admin operation action | `components/platform-admin-actions.tsx` | P3 | Queue/action button states, confirmation, pending, success, and failure feedback |
| Theme provider | `components/theme-provider.tsx` | Audit only | Confirm theme behavior and avoid introducing an unplanned visual register |
| Analytics provider | `components/analytics-provider.tsx` | Audit only | No visual redesign; preserve event behavior |
| Public discovery event | `components/public-discovery-event.tsx` | Audit only | No visible UI; preserve attribution behavior |
| Hero video | `components/hero-video.tsx` | P2 | Poster, motion, controls, reduced-motion fallback |
| Final video | `components/final-video.tsx` | P2 | Media frame, playback controls, responsive behavior |

### Authentication and account

| Component | File | Priority | Scope |
|---|---|---:|---|
| Auth form | `components/auth-form.tsx` | P2 | Login/signup modes, error state, password controls, responsive split layout |
| Profile props | `components/profile-props.tsx` | P1 | Profile attribute display, taxonomy grouping, edit affordance |
| Profile form | `app/profile/profile-form.tsx` | P1 | Form sections, taxonomy picker, save/error states |
| Profile export buttons | `app/profile/export-buttons.tsx` | P1 | Export actions and feedback |
| Email forwarding card | `components/email-forwarding-card.tsx` | P1 | Setup, active/paused/revoked states, copy action, privacy explanation |
| Gmail sync card | `components/gmail-sync-card.tsx` | P1 | Connected/disconnected/syncing/error states, review/autopilot choice |

### Opportunity discovery

| Component | File | Priority | Scope |
|---|---|---:|---|
| Opportunity card | `components/opportunity-card.tsx` | P1 | Card hierarchy, source/freshness/deadline/fee evidence, save and selection |
| Opportunity detail panel | `components/opportunity-detail-panel.tsx` | P1 | Desktop side panel and mobile sheet, fact order, source action |
| Opportunity search | `components/opportunity-search.tsx` | P1 | Search field, query persistence, loading/clear states |
| Opportunity filters | `components/opportunity-filters.tsx` | P1 | Taxonomy, location, date, fee, filter count, mobile filter sheet |
| Taxonomy browse picker | `components/taxonomy-browse-picker.tsx` | P1 | Discipline/genre/style hierarchy, include/prefer/exclude states |
| Opportunity results refresh | `components/opportunity-results-refresh.tsx` | P1 | Refresh/loading transition and stale-result handling |
| Save opportunity button | `components/save-opportunity-button.tsx` | P1 | Saved/unsaved/loading/error/unauthenticated states |
| Save search button | `components/save-search-button.tsx` | P1 | Save dialog, naming, duplicate/error states |
| Follow button | `components/follow-button.tsx` | P1 | Following state and optimistic feedback |
| Track button | `components/track-button.tsx` | P1 | Tracker state and status selection entry point |
| Status select | `components/status-select.tsx` | P1 | Canonical status choices, neutral/positive/destructive semantics |
| List picker | `components/list-picker.tsx` | P1 | Saved-list selection and creation |
| Opportunity issue report | `components/opportunity-issue-report.tsx` | P1 | Bounded report flow, reason selection, confirmation |
| Fit score badge | `components/explained-score.tsx` | P1 | Fit level, evidence explanation, unknown state |
| Trust badge | `components/explained-score.tsx` | P1 | Source freshness/trust explanation without overclaiming |
| Prepare checklist | `components/prepare-checklist.tsx` | P1 | Requirement states, progress, linked library assets, next action |

### Profile tracking, library, and submissions

| Component | File | Priority | Scope |
|---|---|---:|---|
| Tracker view switcher | `components/tracker-view-switcher.tsx` | P1 | Pipeline/deadline/work/type/organization/list modes |
| Tracker item row | `components/tracker-item-row.tsx` | P1 | Deadline, status, work link, actions, responsive row/card fallback |
| Tracker work link | `components/tracker-work-link.tsx` | P1 | Link work to tracker item, empty state, selection |
| Tracker import stepper | `components/tracker-import-stepper.tsx` | P1 | Upload/mapping/review/result states, table preview, decisions |
| Calendar feed button | `components/calendar-feed-button.tsx` | P1 | Copy/download action and security explanation |
| Library client | `components/library-client.tsx` | P1 | Works/files/saved answers tabs, upload/delete, taxonomy assignments |
| Saved searches | `components/saved-searches.tsx` | P1 | Search cards, run/edit/delete, empty state |
| Following list | `components/following-list.tsx` | P1 | Followed organizations/opportunities, empty/loading/error |
| Submission card | `components/submission-card.tsx` | P1 | Submission state, review/decision/delivery summaries, next action |
| Submit form | `components/submit-form.tsx` | P1 | Dynamic fields, upload, fee, confirmation, validation |
| Withdraw submission button | `components/withdraw-submission-button.tsx` | P1 | Confirmation and irreversible-action warning |
| Status pipeline board | `components/status-pipeline-board.tsx` | P1 | Pipeline columns, counts, cards, keyboard/mobile fallback |
| Prepare/checklist states | `components/prepare-checklist.tsx` | P1 | Shared requirement state vocabulary and progress treatment |

### Ask Missa and messaging

| Component | File | Priority | Scope |
|---|---|---:|---|
| Ask Missa shell | `components/chat/ask-missa.tsx` | P1 | Conversation layout, composer, suggestions, loading/error |
| Chat message | nested in `chat/ask-missa.tsx` | P1 | User/assistant message anatomy, citations, limitations |
| Evidence list | nested in `chat/ask-missa.tsx` | P1 | Source links, checked time, evidence boundaries |
| Profile messages surface | `app/(passport)/messages/page.tsx` | P1 | Thread list, thread detail, unread state, composer |
| Organization messages surface | `app/(workspace)/workspace/messages/page.tsx` | P1 | Organization communication, filters, thread state |
| Email review queue | `components/email-review-queue.tsx` | P1 | Candidate filters, candidate card, review decisions, warnings |
| Email candidate card | nested in `email-review-queue.tsx` | P1 | Classification, match, confidence, attachment warnings, action group |

### Organization configuration and operations

| Component | File | Priority | Scope |
|---|---|---:|---|
| Create team form | `components/workspace-forms.tsx` | P1 | Form layout, validation, success/error feedback |
| Create program form | `components/workspace-forms.tsx` | P1 | Form layout and relationship context |
| Create open call form | `components/workspace-forms.tsx` | P1 | Open-call setup, linked radar opportunity, validation |
| Publish button | `components/workspace-forms.tsx` | P1 | Fail-closed publish action, confirmation, status feedback |
| Form builder | `components/form-builder.tsx` | P1 | Field list, reorder, field editor, preview, save states |
| Open-call controls | `components/open-call-controls.tsx` | P1 | Draft/published/closed actions and source/guideline content |
| Review form | `components/review-form.tsx` | P1 | Reviewer assignment, score/notes, save/submission state |
| Organization seats | `components/organization-seats.tsx` | P1 | Member table, role selection, invite/remove, seat limits |
| Organization billing | `components/organization-billing.tsx` | P1 | Plan/status/payment state and safe admin actions |

### Platform administration

| Component | File | Priority | Scope |
|---|---|---:|---|
| Admin page frame | `components/platform-admin.tsx` | P3 | Page shell, header, provenance, responsive layout |
| Data area header | `components/platform-admin.tsx` | P3 | Area title, status, last observed time, actions |
| Section heading | `components/platform-admin.tsx` | P3 | Consistent admin section hierarchy |
| Metric card | `components/platform-admin.tsx` | P3 | Metric, detail, link, neutral/warning semantics |
| Queue card | `components/platform-admin.tsx` | P3 | Attention count and route action |
| Maturity badge | `components/platform-admin.tsx` | P3 | Operational maturity/provenance status |
| Provenance note | `components/platform-admin.tsx` | P3 | Source, observed time, limitations |
| Warning list | `components/platform-admin.tsx` and queue files | P3 | Warning hierarchy, empty state, actionability |
| Source health table | `components/platform-admin.tsx` | P3 | Source status, freshness, failure state |
| Lifecycle table | `components/platform-admin.tsx` | P3 | Counts by lifecycle state |
| Pipeline | `components/platform-admin.tsx` | P3 | Operations pipeline visualization |
| Worker status | `components/platform-admin.tsx` | P3 | Worker state and last-success information |
| Worker lane table | `components/platform-admin.tsx` | P3 | Lane status, schedule, recent activity |
| Durable job table | `components/platform-admin.tsx` | P3 | Review/enrichment job rows and state |
| Outbox table | `components/platform-admin.tsx` | P3 | Outbound events, delivery state, retry information |
| Handoff table | `components/platform-admin.tsx` | P3 | Agent handoff state, human-needed status |
| Agent graph table | `components/platform-admin.tsx` | P3 | Agent/worker relationship and handoff evidence |
| Durable table list | `components/platform-admin.tsx` | P3 | System data list wrapper and responsive fallback |
| Audit table | `components/platform-admin.tsx` | P3 | Audit entries, actor, time, action, target |
| Platform admin control room | `components/platform-admin-control-room.tsx` | P3 | Admin home overview and attention routing |
| Platform admin analytics | `components/platform-admin-analytics.tsx` | P3 | Analytics cards/charts/tables and empty data |
| Platform admin billing | `components/platform-admin-billing.tsx` | P3 | Billing records and status states |
| Platform admin content | `components/platform-admin-content.tsx` | P3 | Content records, observed data, review state |
| Platform admin CRM | `components/platform-admin-crm.tsx` | P3 | Customer/account activity and detail presentation |
| Platform admin customers | `components/platform-admin-customers.tsx` | P3 | Customer list, search, activity, drill-down |
| Platform admin governance | `components/platform-admin-governance.tsx` | P3 | Governance metrics and evidence |
| Platform admin messaging | `components/platform-admin-messaging.tsx` | P3 | Message/event operations and status |
| Platform admin organizations | `components/platform-admin-organizations.tsx` | P3 | Organization list, status, detail links |
| Platform admin operations queue | `components/platform-admin-queue.tsx` | P3 | Filters, table, lane health, row detail, queue actions |
| Platform admin agent controls | `components/platform-admin-agent-controls.tsx` | P3 | Target/action selection, confirmation, result feedback |
| Platform admin support | `components/platform-admin-support.tsx` | P3 | Support records, status select, dates, actions |
| Platform admin taxonomy proposals | `components/platform-admin-taxonomy-proposals.tsx` | P3 | Proposal review, evidence, approve/reject actions |

## Phase 2 — route-level surfaces

These are the screens that consume the components above. Each route gets a visual pass after its shared components are stabilized.

### Marketing and public discovery — P2

- `/` — marketing homepage, hero, evidence/product story, CTA, footer.
- `/about` — about/mission page.
- `/for-organizations` — organization marketing page and showcase.
- `/guides` — guide index.
- `/guides/[slug]` — guide detail/content page.
- `/methodology` — methodology/evidence page.
- `/discover/[slug]` — public organization/discovery record.
- `/discover/opportunities/[id]` — public opportunity detail.
- `/opportunities-preview` — public opportunity browse preview.
- `/org/[organizationId]` — organization public page.
- `/org/[organizationId]/[openCallId]` — public open-call detail and submit entry point.
- `/profile/[userId]` — public profile page.
- `/waitlist` — waitlist landing and form.

### Authentication and account — P2/P1

- `/login` — login surface.
- `/signup` — signup surface.
- `/profile` — authenticated profile dashboard and settings.
- `/profile/profile-form` — profile edit form.
- `/profile/export-buttons` — profile export actions.

### Profile — P1

- `/home` — Profile home/overview.
- `/opportunities` — browse shell, filters, cards, results, selected detail panel.
- `/opportunities/[id]` — authenticated opportunity detail, evidence, fit, checklist, save/list/follow/track actions.
- `/ask` — Ask Missa conversation.
- `/inbox` — email/review inbox.
- `/calendar` — calendar/deadline surface.
- `/import` — tracker import wizard.
- `/tracker` — tracker views and item rows.
- `/library` — works/files/saved answers library.
- `/messages` — Profile messages.
- `/insights` — Profile insights.
- `/my-submissions` — submission list.
- `/my-submissions/[submissionId]` — submission receipt/status/detail.

### Organization — P1

- `/workspace` — organization overview/setup, team/program/open-call creation, form builder, seats, billing.
- `/workspace/people` — organization members and roles.
- `/workspace/settings` — organization billing/settings.
- `/workspace/reviews` — reviews queue/list.
- `/workspace/decisions` — decisions surface.
- `/workspace/delivery` — delivery tasks/status.
- `/workspace/insights` — organization analytics/insights.
- `/workspace/messages` — organization messages.
- `/submissions` — organization submission list and cards.
- `/reviewer` — reviewer assignment/review form.
- `/admin/taxonomy` — organization taxonomy proposal administration.

### Platform admin — P3

- `/admin` — control room.
- `/admin/agents` — agent controls.
- `/admin/analytics` — platform analytics.
- `/admin/audit` — audit log.
- `/admin/billing` — platform billing.
- `/admin/content` — content operations.
- `/admin/crm` — CRM.
- `/admin/customers` — customer operations.
- `/admin/governance` — governance.
- `/admin/messaging` — messaging operations.
- `/admin/operations` — operations queue.
- `/admin/organizations` — organization operations.
- `/admin/radar` — radar/source operations.
- `/admin/support` — support operations.
- `/admin/system` — system/durable data operations.

## Cross-surface patterns to extract before visual redesign

These patterns currently appear in multiple routes and should become canonical components before each route is individually polished.

1. **Page frame** — eyebrow, title, description, metadata, primary action, secondary action.
2. **Public header/footer** — one shared responsive public shell with small contextual variations.
3. **Authenticated shell** — shared navigation, organization context, mobile navigation, pending state.
4. **Evidence strip** — evidence status, checked time, official source, limitation, source action.
5. **Opportunity fact block** — deadline, fee, eligibility/location, materials, benefit, rights, official source.
6. **Fit explanation** — observable profile detail, observable requirement, limitation/next check.
7. **State panel** — exact current state, actor/time, what it proves, next action.
8. **Status badge/state legend** — one semantic vocabulary across Profile, Organization, and admin.
9. **Metric card** — value, label, detail, timestamp/provenance, link/action.
10. **Data table** — desktop table, mobile list/card fallback, row actions, empty/loading/error states.
11. **Filter bar** — search, taxonomy, location/date/status controls, filter count, reset/save actions.
12. **Detail drawer/sheet** — desktop side panel and mobile full-height sheet with shared content anatomy.
13. **Form field** — label, hint, required state, error, validation, save state.
14. **Async action feedback** — pending, success, failure, retry/undo, durable status explanation.
15. **Empty state** — why empty, what can be done next, primary action, optional secondary action.
16. **Loading state** — route-appropriate skeleton rather than generic spinner-only feedback.
17. **Confirmation dialog** — action consequence, scope, cancel/confirm, pending/error state.
18. **Source/provenance note** — source, observation time, freshness, limitations.
19. **Timeline/activity row** — actor, event, time, status, linked entity, evidence.
20. **Mobile action bar** — persistent next action where desktop actions move into a sheet or bottom bar.

## Recommended redesign order

### Sprint 1 — visual foundation

Button, input, field, label, select, badge, card, table, tabs, dialog, sheet, drawer, empty, skeleton, spinner, toast, typography, spacing, focus, and shell navigation.

### Sprint 2 — Profile discovery

Opportunity card, filters, search, taxonomy picker, detail panel, evidence strip, fact block, fit explanation, save/follow/track controls, status select, and checklist.

### Sprint 3 — Profile lifecycle

Tracker item/board/views, library, saved searches, following list, submission card/detail, submit form, import stepper, calendar, inbox, messages, and Ask Missa.

### Sprint 4 — Organization operations

Organization shell, page frame, tables, submission list, review form, decision/delivery states, form builder, open-call controls, people/seats, billing, insights, and messages.

### Sprint 5 — public and marketing

Shared public header/footer, homepage sections, discovery cards/detail, guides, methodology, organization pages, auth, profile, and waitlist.

### Sprint 6 — platform operations

Admin shell, page frames, metric cards, provenance, tables, queue/detail drawer, worker/system tables, content, CRM, billing, support, governance, messaging, taxonomy proposals, and agent controls.

## Definition of done for each component

- It has a documented purpose, variant set, and owning register.
- It uses the canonical Missa tokens and typography.
- It has default, hover, focus-visible, pressed, disabled, loading, empty, error, and responsive behavior where applicable.
- It has an accessible name and keyboard path.
- It has a mobile treatment where the surface is user-facing.
- It is used by at least one real route, not left as an isolated demo.
- It does not weaken evidence, provenance, uncertainty, tenant, or submission-state meaning.
- It passes the relevant typecheck, lint, accessibility, and route/e2e checks.

## First implementation target

Start with the shared foundation and the Profile opportunity journey:

`Button → Input/Field → Badge → Card → Table/List → Dialog/Sheet/Drawer → Empty/Skeleton/Toast → App shell → Opportunity card → Opportunity filters/search → Opportunity detail panel → Evidence strip → Fact block → Fit explanation → Save/Follow/Track → Prepare checklist`.

This sequence gives Missa a visible improvement quickly while creating the reusable primitives needed for every later surface.
